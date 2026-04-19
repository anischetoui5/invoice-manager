const pool = require('../../config/db');

async function getCompany(workspaceId) {
  const result = await pool.query(
    `SELECT c.*, w.name as workspace_name, w.type
     FROM companies c
     JOIN workspaces w ON w.id = c.workspace_id
     WHERE c.workspace_id = $1`,
    [workspaceId]
  );
  if (!result.rows.length) throw new Error('Company not found');
  return result.rows[0];
}

async function updateCompany(userId, workspaceId, { name, email, phone, address }) {
  // Only Directors can update company info
  const memberCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );

  if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can update company information');
  }

  const result = await pool.query(
    `UPDATE companies
     SET name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         address = COALESCE($4, address),
         updated_at = NOW()
     WHERE workspace_id = $5
     RETURNING *`,
    [name, email, phone, address, workspaceId]
  );

  if (!result.rows.length) throw new Error('Company not found');
  return result.rows[0];
}

async function getMembers(workspaceId) {
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

async function removeMember(userId, workspaceId, targetUserId) {
  // Only Directors can remove members
  const memberCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );

  if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can remove members');
  }

  // Directors cannot remove themselves
  if (userId === targetUserId) {
    throw new Error('Directors cannot remove themselves');
  }

  const result = await pool.query(
    `DELETE FROM memberships
     WHERE user_id = $1 AND workspace_id = $2
     RETURNING *`,
    [targetUserId, workspaceId]
  );

  if (!result.rows.length) throw new Error('Member not found');
  return result.rows[0];
}

async function getInvitations(userId, workspaceId) {
  const memberCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );

  if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can view invitations');
  }

  const result = await pool.query(
    `SELECT i.*, r.name as role_name
     FROM invitations i
     JOIN roles r ON r.id = i.role_id
     WHERE i.workspace_id = $1
     ORDER BY i.created_at DESC`,
    [workspaceId]
  );
  return result.rows;
}

module.exports = { getCompany, updateCompany, getMembers, removeMember, getInvitations };