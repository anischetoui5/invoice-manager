const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

async function register({ name, email, password }) {
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

  // Start transaction
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, password_hash]
    );
    const user = userResult.rows[0];

    // Create personal workspace
    const workspaceResult = await client.query(
      `INSERT INTO workspaces (name, type, owner_id)
       VALUES ($1, 'personal', $2)
       RETURNING id`,
      [`${name}'s Workspace`, user.id]
    );
    const workspace = workspaceResult.rows[0];

    // Get Director role
    const roleResult = await client.query(
      `SELECT id FROM roles WHERE name = 'Director'`
    );
    const role = roleResult.rows[0];

    // Create membership
    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id)
       VALUES ($1, $2, $3)`,
      [user.id, workspace.id, role.id]
    );

    await client.query('COMMIT');

    return user;

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

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    }
  };
}

module.exports = { register, login };