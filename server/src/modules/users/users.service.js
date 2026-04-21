const pool = require('../../config/db');
const bcrypt = require('bcryptjs');

async function getAllUsers() {
  const result = await pool.query(
    `SELECT 
      u.id,
      u.name,
      u.email,
      u.created_at,
      array_remove(array_agg(DISTINCT r.name), NULL) as roles
     FROM users u
     LEFT JOIN memberships m ON m.user_id = u.id
     LEFT JOIN roles r ON r.id = m.role_id
     GROUP BY u.id
     ORDER BY u.created_at ASC`
  );
  return result.rows;
}

async function getMe(userId) {
  const result = await pool.query(
    `SELECT id, name, email, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0];
}

async function updateMe(userId, { name, email }) {
  // Check if email is already taken by another user
  if (email) {
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND id != $2`,
      [email, userId]
    );
    if (existing.rows.length) throw new Error('Email already in use');
  }

  const result = await pool.query(
    `UPDATE users SET
       name  = COALESCE($1, name),
       email = COALESCE($2, email)
     WHERE id = $3
     RETURNING id, name, email`,
    [name || null, email || null, userId]
  );
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0];
}

async function updatePassword(userId, { currentPassword, newPassword }) {
  // Get current hashed password
  const result = await pool.query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId]
  );
  if (!result.rows.length) throw new Error('User not found');

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) throw new Error('Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [hashed, userId]
  );
}

async function getWorkspaceMembers(requesterId, workspaceId) {
  const memberCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );
  if (!memberCheck.rows.length) throw new Error('You are not a member of this workspace');

  const result = await pool.query(
    `SELECT u.id, u.name, u.email, r.name as role, m.joined_at
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     JOIN roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1
     ORDER BY m.joined_at ASC`,
    [workspaceId]
  );
  return result.rows;
}

async function updateMemberRole(requesterId, workspaceId, targetUserId, roleName) {
  const requesterCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );
  if (!requesterCheck.rows.length || requesterCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can update roles');
  }

  const roleResult = await pool.query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
  if (!roleResult.rows.length) throw new Error(`Role '${roleName}' does not exist`);

  const result = await pool.query(
    `UPDATE memberships SET role_id = $1
     WHERE user_id = $2 AND workspace_id = $3
     RETURNING *`,
    [roleResult.rows[0].id, targetUserId, workspaceId]
  );
  if (!result.rows.length) throw new Error('Member not found in this workspace');
  return result.rows[0];
}

async function removeMember(requesterId, workspaceId, targetUserId) {
  const requesterCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );
  if (!requesterCheck.rows.length || requesterCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can remove members');
  }
  if (requesterId === targetUserId) throw new Error('You cannot remove yourself from the workspace');

  await pool.query(
    `DELETE FROM memberships WHERE user_id = $1 AND workspace_id = $2`,
    [targetUserId, workspaceId]
  );
}

async function getUserById(userId) {
  const result = await pool.query(
    `SELECT 
      u.id, u.name, u.email, u.created_at,
      array_remove(array_agg(DISTINCT r.name), NULL) as roles
     FROM users u
     LEFT JOIN memberships m ON m.user_id = u.id
     LEFT JOIN roles r ON r.id = m.role_id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0];
}

async function adminUpdateUser(userId, { name, email }) {
  if (email) {
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND id != $2`,
      [email, userId]
    );
    if (existing.rows.length) throw new Error('Email already in use');
  }

  const result = await pool.query(
    `UPDATE users SET
       name  = COALESCE($1, name),
       email = COALESCE($2, email)
     WHERE id = $3
     RETURNING id, name, email, created_at`,
    [name || null, email || null, userId]
  );
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0];
}

async function deleteUser(targetUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all workspaces owned by this user
    const ownedWorkspaces = await client.query(
      `SELECT id FROM workspaces WHERE owner_id = $1`,
      [targetUserId]
    );

    for (const ws of ownedWorkspaces.rows) {
      // Delete company tied to this workspace (if any)
      await client.query(`DELETE FROM companies WHERE workspace_id = $1`, [ws.id]);
      // Delete all invoices in this workspace
      await client.query(`DELETE FROM invoices WHERE workspace_id = $1`, [ws.id]);
      // Delete all memberships in this workspace
      await client.query(`DELETE FROM memberships WHERE workspace_id = $1`, [ws.id]);
    }

    // Delete all workspaces owned by this user
    await client.query(`DELETE FROM workspaces WHERE owner_id = $1`, [targetUserId]);

    // Delete invoices created by this user in any other workspace
    await client.query(`DELETE FROM invoices WHERE created_by = $1`, [targetUserId]);

    // Delete any remaining memberships of this user
    await client.query(`DELETE FROM memberships WHERE user_id = $1`, [targetUserId]);

    // Finally delete the user
    await client.query(`DELETE FROM users WHERE id = $1`, [targetUserId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}



module.exports = { getMe, updateMe, updatePassword, getWorkspaceMembers, updateMemberRole, removeMember, getAllUsers, getUserById, adminUpdateUser, deleteUser };