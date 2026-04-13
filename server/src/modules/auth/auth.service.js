const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

async function register({ name, email, password, registrationType }) {
  if (!name || !email || !password) {
    throw new Error('Name, email and password are required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error('Email already in use');
  }

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

    // 2. Create personal workspace
    const workspaceResult = await client.query(
      `INSERT INTO workspaces (name, type, owner_id)
       VALUES ($1, 'personal', $2)
       RETURNING id`,
      [`${name}'s Workspace`, user.id]
    );
    const workspace = workspaceResult.rows[0];

    // 3. Dynamic Role Assignment
    const roleName = registrationType === 'company' ? 'Director' : 'personal';
    const roleResult = await client.query(
      'SELECT id FROM roles WHERE name = $1',
      [roleName]
    );
    const role = roleResult.rows[0];

    // 4. Create membership link
    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id)
       VALUES ($1, $2, $3)`,
      [user.id, workspace.id, role.id]
    );

    await client.query('COMMIT');

    // 5. Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Map backend role name to frontend UserRole type
    const frontendRole = roleName === 'Director' ? 'director' : 'normal';

    return {
      user: { ...user, role: frontendRole },
      token,
      personalWorkspaceId: workspace.id
    };

  } catch (err) {
    await client.query('ROLLBACK');
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
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Invalid email or password');
  }

  // Fetch workspace ID and role in one query
  const workspaceResult = await pool.query(
    `SELECT w.id as workspace_id, r.name as role_name
     FROM workspaces w
     JOIN memberships m ON m.workspace_id = w.id
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND w.type = 'personal'
     LIMIT 1`,
    [user.id]
  );

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Map backend role name to frontend UserRole type
  const roleMap = {
    'Director': 'director',
    'Personal': 'normal',
    'Employee': 'employee',
    'Accountant': 'accountant',
    'Admin': 'admin',
  };

  const rawRole = workspaceResult.rows[0]?.role_name || 'Personal user';
  const frontendRole = roleMap[rawRole] || 'normal';

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: frontendRole,
    },
    activeWorkspaceId: workspaceResult.rows[0]?.workspace_id,
  };
}

module.exports = { register, login };