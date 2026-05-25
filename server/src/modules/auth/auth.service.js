// auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
const invitationsService = require('../invitations/invitations.service');
const { sendVerificationCode, sendPasswordResetCode } = require('../../config/email');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function register({ 
  name, email, password, registrationType,
  companyName, industry, companyEmail, companyPhone, companyAddress,
  companyCode, joinRole, plan
}) {
  if (!name || !email || !password) {
    throw new Error('Name, email and password are required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const isCompany  = registrationType === 'company';
  const isJoin     = registrationType === 'join';
  const isPersonal = registrationType === 'personal';
  const password_hash = await bcrypt.hash(password, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, is_verified)
       VALUES ($1, $2, $3, true)
       RETURNING id, name, email`,
      [name, email, password_hash]
    );
    const user = userResult.rows[0];

    const personalWorkspaceResult = await client.query(
      `INSERT INTO workspaces (name, type, owner_id)
       VALUES ($1, 'personal', $2)
       RETURNING id`,
      [`${name}'s Workspace`, user.id]
    );
    const personalWorkspace = personalWorkspaceResult.rows[0];

    const personalRoleResult = await client.query(
      `SELECT id FROM roles WHERE name = 'Personal'`
    );
    if (!personalRoleResult.rows[0]) throw new Error(`Role 'Personal' not found`);

    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id)
       VALUES ($1, $2, $3)`,
      [user.id, personalWorkspace.id, personalRoleResult.rows[0].id]
    );

    await client.query(
      `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
      [personalWorkspace.id, user.id]
    );

    if (isPersonal) {
      const planName = plan || 'free';
      const planResult = await client.query(
        `SELECT id FROM subscription_plans
         WHERE LOWER(name) = LOWER($1)
           AND plan_type = 'personal'
           AND is_active = true
         LIMIT 1`,
        [planName]
      );
      if (!planResult.rows[0]) throw new Error(`Personal plan '${planName}' not found`);

      await client.query(
        `INSERT INTO subscriptions
           (user_id, plan_id, status, billing_start, current_period_end, credits)
         VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days', 0)`,
        [user.id, planResult.rows[0].id]
      );
    }

    let companyWorkspaceId = null;
    let returnedRole = 'Personal'; // ← capitalized to match DB
    let companyCodeResult = null;

if (isCompany) {
  const companyWorkspaceResult = await client.query(
    `INSERT INTO workspaces (name, type, owner_id)
     VALUES ($1, 'company', $2)
     RETURNING id`,
    [`${companyName}'s Workspace`, user.id]
  );
  const companyWorkspace = companyWorkspaceResult.rows[0];
  companyWorkspaceId = companyWorkspace.id;

  const companyInsert = await client.query(
    `INSERT INTO companies (workspace_id, name, email, phone, address, industry)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, code`,                          // ← add id here
    [companyWorkspace.id, companyName, companyEmail || email,
     companyPhone || null, companyAddress || null, industry || null]
  );
  companyCodeResult = companyInsert.rows[0].code;
  const companyId = companyInsert.rows[0].id;      // ← grab the id

  const directorRoleResult = await client.query(
    `SELECT id FROM roles WHERE name = 'Director'`
  );
  if (!directorRoleResult.rows[0]) throw new Error(`Role 'Director' not found`);

  await client.query(
    `INSERT INTO memberships (user_id, workspace_id, role_id)
     VALUES ($1, $2, $3)`,
    [user.id, companyWorkspace.id, directorRoleResult.rows[0].id]
  );

  await client.query(
    `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
    [companyWorkspace.id, user.id]
  );

  // ← add subscription here
  const defaultPlanResult = await client.query(
    `SELECT id FROM subscription_plans 
     WHERE plan_type = 'company' 
     AND is_active = true 
     ORDER BY price ASC 
     LIMIT 1`
  );

  if (defaultPlanResult.rows[0]) {
    await client.query(
      `INSERT INTO subscriptions 
         (company_id, plan_id, status, billing_start, current_period_end, credits)
       VALUES ($1, $2, 'trialing', NOW(), NOW() + INTERVAL '14 days', 0)`,
      [companyId, defaultPlanResult.rows[0].id]
    );
  }

  returnedRole = 'Director';
} else if (isJoin) {
      if (!companyCode) throw new Error('Company code is required to join');
    }

    await client.query('COMMIT');

    if (isJoin) {
      await invitationsService.createInvitationRequest(user.id, companyCode, joinRole);
    }

    return {
      requiresVerification: false,
      email,
      companyCode: companyCodeResult,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      // User already exists — if unverified, resend the code so they can continue
      const existing = await pool.query(
        `SELECT id, is_verified FROM users WHERE email = $1`, [email]
      );
      if (existing.rows[0] && !existing.rows[0].is_verified) {
        const code = generateCode();
        await pool.query(
          `UPDATE users SET verification_code = $1, verification_expires_at = NOW() + INTERVAL '15 minutes' WHERE id = $2`,
          [code, existing.rows[0].id]
        );
        return { requiresVerification: false, email };
      }
      throw new Error('Email already in use');
    }
    throw err;
  } finally {
    client.release();
  }
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const result = await pool.query(
    `SELECT id, name, email, avatar_url, password_hash, last_active_workspace_id, is_verified
     FROM users WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Invalid email or password');
  }

  // Email verification disabled — all users are auto-verified on registration

  const workspaceResult = await pool.query(
    `SELECT w.id AS workspace_id, r.name AS role_name
     FROM workspaces w
     JOIN memberships m ON m.workspace_id = w.id
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1
       AND w.id = COALESCE($2, (
         SELECT id FROM workspaces
         WHERE owner_id = $1 AND type = 'personal'
         LIMIT 1
       ))
     LIMIT 1`,
    [user.id, user.last_active_workspace_id]
  );

  const workspace = workspaceResult.rows[0];

  return {
    token: generateToken(user),
    user: {
      id:         user.id,
      name:       user.name,
      email:      user.email,
      role:       workspace?.role_name ?? 'Personal',
      avatar_url: user.avatar_url ?? null,
    },
    activeWorkspaceId: workspace?.workspace_id ?? null,
  };
}

async function switchWorkspace(userId, workspaceId) {
  // verify user is actually a member of this workspace
  const memberCheck = await pool.query(
    `SELECT m.id, r.name as role
     FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );

  if (!memberCheck.rows.length) {
    throw new Error('You are not a member of this workspace');
  }

  await pool.query(
    `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
    [workspaceId, userId]
  );

  return {
    workspaceId,
    role: memberCheck.rows[0].role,
  };
}

async function verifyEmail(email, code) {
  const result = await pool.query(
    `SELECT id, verification_code, verification_expires_at, last_active_workspace_id
     FROM users WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];
  if (!user) throw new Error('User not found');
  if (user.verification_code !== code) throw new Error('Invalid verification code');
  if (new Date() > new Date(user.verification_expires_at)) throw new Error('Code has expired. Please request a new one.');

  await pool.query(
    `UPDATE users SET is_verified = true, verification_code = NULL, verification_expires_at = NULL WHERE id = $1`,
    [user.id]
  );

  const workspaceResult = await pool.query(
    `SELECT w.id AS workspace_id, r.name AS role_name
     FROM workspaces w
     JOIN memberships m ON m.workspace_id = w.id
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND w.id = $2 LIMIT 1`,
    [user.id, user.last_active_workspace_id]
  );
  const workspace = workspaceResult.rows[0];

  return {
    token: generateToken(user),
    user: { id: user.id, name: (await pool.query('SELECT name, email FROM users WHERE id=$1', [user.id])).rows[0].name, email },
    activeWorkspaceId: workspace?.workspace_id ?? null,
  };
}

async function forgotPassword(email) {
  const result = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (!result.rows.length) return; // silent — don't reveal if email exists
  const code = generateCode();
  await pool.query(
    `UPDATE users SET reset_code = $1, reset_expires_at = NOW() + INTERVAL '15 minutes' WHERE id = $2`,
    [code, result.rows[0].id]
  );
  await sendPasswordResetCode(email, code);
}

async function resetPassword(email, code, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
  const result = await pool.query(
    `SELECT id, reset_code, reset_expires_at FROM users WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];
  if (!user || user.reset_code !== code) throw new Error('Invalid reset code');
  if (new Date() > new Date(user.reset_expires_at)) throw new Error('Code has expired. Please request a new one.');

  const password_hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users SET password_hash = $1, reset_code = NULL, reset_expires_at = NULL WHERE id = $2`,
    [password_hash, user.id]
  );
}

module.exports = { register, login, switchWorkspace, verifyEmail, forgotPassword, resetPassword };