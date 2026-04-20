const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

const ROLE_MAP = {
  Admin:      'admin',
  Director:   'director',
  Accountant: 'accountant',
  Employee:   'employee',
  Personal:   'normal',
};

async function register({ 
  name, email, password, registrationType,
  companyName, industry, companyEmail, phone, address,
  companyCode, joinRole, plan
}) {
  if (!name || !email || !password) {
    throw new Error('Name, email and password are required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const isCompany = registrationType === 'company';
  const isJoin = registrationType === 'join';
  const password_hash = await bcrypt.hash(password, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create user
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, password_hash]
    );
    const user = userResult.rows[0];

    // 2. Always create a personal workspace for every user
    const personalWorkspaceResult = await client.query(
      `INSERT INTO workspaces (name, type, owner_id)
       VALUES ($1, 'personal', $2)
       RETURNING id`,
      [`${name}'s Workspace`, user.id]
    );
    const personalWorkspace = personalWorkspaceResult.rows[0];

    // 3. Create personal role membership
    const personalRoleResult = await client.query(
      `SELECT id FROM roles WHERE name = 'Personal'`
    );
    if (!personalRoleResult.rows[0]) {
      throw new Error(`Role 'Personal' not found`);
    }
    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id)
       VALUES ($1, $2, $3)`,
      [user.id, personalWorkspace.id, personalRoleResult.rows[0].id]
    );

    // 4. Set personal workspace as active by default
    await client.query(
      `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
      [personalWorkspace.id, user.id]
    );

    let companyWorkspaceId = null;
    let returnedRole = 'normal';
    let companyCodeResult = null;

    if (isCompany) {
      // 5a. Create company workspace
      const companyWorkspaceResult = await client.query(
        `INSERT INTO workspaces (name, type, owner_id)
         VALUES ($1, 'company', $2)
         RETURNING id`,
        [`${companyName}'s Workspace`, user.id]
      );
      const companyWorkspace = companyWorkspaceResult.rows[0];
      companyWorkspaceId = companyWorkspace.id;

      // 5b. Create companies profile row
      const companyInsert = await client.query(
        `INSERT INTO companies (workspace_id, name, email, phone, address)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING code`,
        [companyWorkspace.id, companyName, companyEmail || email, phone || null, address || null]
      );
      companyCodeResult = companyInsert.rows[0].code;

      // 5c. Create Director membership for company workspace
      const directorRoleResult = await client.query(
        `SELECT id FROM roles WHERE name = 'Director'`
      );
      if (!directorRoleResult.rows[0]) {
        throw new Error(`Role 'Director' not found`);
      }
      await client.query(
        `INSERT INTO memberships (user_id, workspace_id, role_id)
         VALUES ($1, $2, $3)`,
        [user.id, companyWorkspace.id, directorRoleResult.rows[0].id]
      );

      // 5d. Set company workspace as active for directors
      await client.query(
        `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
        [companyWorkspace.id, user.id]
      );

      returnedRole = 'director';

    } else if (isJoin) {
      // 6a. Validate company code
      if (!companyCode) throw new Error('Company code is required to join');

      const roleName = joinRole === 'accountant' ? 'Accountant' : 'Employee';

      const inviteResult = await client.query(
        `SELECT c.workspace_id, r.id as role_id, r.name as role_name
        FROM companies c
        CROSS JOIN roles r
        WHERE c.code = $1 AND r.name = $2`,
        [companyCode, roleName]
      );

      if (!inviteResult.rows[0]) {
        throw new Error('Invalid company code');
      }

      const { workspace_id, role_id, role_name } = inviteResult.rows[0];

      // 6b. Check not already a member
      const existing = await client.query(
        `SELECT id FROM memberships WHERE user_id = $1 AND workspace_id = $2`,
        [user.id, workspace_id]
      );
      if (existing.rows.length > 0) {
        throw new Error('Already a member of this company');
      }

      // 6c. Add membership to company workspace
      await client.query(
        `INSERT INTO memberships (user_id, workspace_id, role_id)
         VALUES ($1, $2, $3)`,
        [user.id, workspace_id, role_id]
      );

      // 6d. Set company workspace as active
      await client.query(
        `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
        [workspace_id, user.id]
      );

      returnedRole = role_name.toLowerCase();
    }

    await client.query('COMMIT');

    return {
      user: { ...user, role: returnedRole },
      token: generateToken(user),
      activeWorkspaceId: companyWorkspaceId ?? personalWorkspace.id,
      companyCode: companyCodeResult,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint === 'users_email_key') {
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
    `SELECT id, name, email, password_hash, last_active_workspace_id
     FROM users WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Invalid email or password');
  }

  // Prefer last active workspace; fall back to personal workspace
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
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  ROLE_MAP[workspace?.role_name] ?? 'normal',
    },
    activeWorkspaceId: workspace?.workspace_id ?? null,
  };
}

module.exports = { register, login };