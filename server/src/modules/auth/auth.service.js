const bcrypt = require('bcryptjs');
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

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, password_hash]
  );

  return result.rows[0];
}

module.exports = { register };