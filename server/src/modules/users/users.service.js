const pool = require('../../config/db');

async function getMe(userId) {
  const result = await pool.query(
    `SELECT id, name, email, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0];
}

async function getWorkspaceMembers(requesterId, workspaceId) {
  // Check requester is a member
  const memberCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );

  if (!memberCheck.rows.length) {
    throw new Error('You are not a member of this workspace');
  }

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
  // Check requester is Director
  const requesterCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );

  if (!requesterCheck.rows.length || requesterCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can update roles');
  }

  // Get role id
  const roleResult = await pool.query(
    `SELECT id FROM roles WHERE name = $1`,
    [roleName]
  );

  if (!roleResult.rows.length) {
    throw new Error(`Role '${roleName}' does not exist`);
  }

  const result = await pool.query(
    `UPDATE memberships SET role_id = $1
     WHERE user_id = $2 AND workspace_id = $3
     RETURNING *`,
    [roleResult.rows[0].id, targetUserId, workspaceId]
  );

  if (!result.rows.length) {
    throw new Error('Member not found in this workspace');
  }

  return result.rows[0];
}

async function removeMember(requesterId, workspaceId, targetUserId) {
  // Check requester is Director
  const requesterCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );

  if (!requesterCheck.rows.length || requesterCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can remove members');
  }

  // Can't remove yourself
  if (requesterId === targetUserId) {
    throw new Error('You cannot remove yourself from the workspace');
  }

  await pool.query(
    `DELETE FROM memberships WHERE user_id = $1 AND workspace_id = $2`,
    [targetUserId, workspaceId]
  );
}

module.exports = { getMe, getWorkspaceMembers, updateMemberRole, removeMember };