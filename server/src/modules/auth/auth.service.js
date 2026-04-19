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
  companyName, industry, companyEmail, phone, address 
}) {
  if (!name || !email || !password) {
    throw new Error('Name, email and password are required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const isCompany = registrationType === 'company';
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

    // 2. Create workspace (type depends on registration)
    const workspaceType = isCompany ? 'company' : 'personal';
    const workspaceResult = await client.query(
      `INSERT INTO workspaces (name, type, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`${name}'s Workspace`, workspaceType, user.id]
    );
    const workspace = workspaceResult.rows[0];

    // 3. Set last_active_workspace_id on the user
    await client.query(
      `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
      [workspace.id, user.id]
    );

    // 4. If company, create the companies profile row
    if (isCompany) {
      await client.query(
        `INSERT INTO companies (workspace_id, name, email, phone, address)
        VALUES ($1, $2, $3, $4, $5)`,
        [workspace.id, companyName, companyEmail || email, phone, address]
      );
    }

    // 5. Resolve role
    const roleName = isCompany ? 'Director' : 'Personal';
    const roleResult = await client.query(
      'SELECT id FROM roles WHERE name = $1',
      [roleName]
    );
    if (!roleResult.rows[0]) {
      throw new Error(`Role '${roleName}' not found`);
    }

    // 6. Create membership
    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id)
       VALUES ($1, $2, $3)`,
      [user.id, workspace.id, roleResult.rows[0].id]
    );

    await client.query('COMMIT');

    return {
      user: { ...user, role: ROLE_MAP[roleName] },
      token: generateToken(user),
      activeWorkspaceId: workspace.id,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    // Translate the unique-violation into a friendly message
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