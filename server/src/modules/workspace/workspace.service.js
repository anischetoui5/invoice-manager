const pool = require('../../config/db');
const crypto = require('crypto');

async function createWorkspace(userId, { name, type = 'company' }) {
  if (!name) throw new Error('Workspace name is required');
  if (!['personal', 'company'].includes(type)) {
    throw new Error('Type must be personal or company');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const workspaceResult = await client.query(
      `INSERT INTO workspaces (name, type, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, type, userId]
    );
    const workspace = workspaceResult.rows[0];

    const roleResult = await client.query(
      `SELECT id FROM roles WHERE name = 'Director'`
    );
    const role = roleResult.rows[0];

    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id)
       VALUES ($1, $2, $3)`,
      [userId, workspace.id, role.id]
    );

    await client.query('COMMIT');
    return workspace;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getMyWorkspaces(userId) {
  const result = await pool.query(
    `SELECT w.*, r.name as role
     FROM workspaces w
     JOIN memberships m ON m.workspace_id = w.id
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1
     ORDER BY w.created_at ASC`,
    [userId]
  );
  return result.rows;
}

async function generateInviteCode(userId, workspaceId, { roleId, maxUses, expiresAt }) {
  // Check if user is Director of this workspace
  const memberCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );

  if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can generate invite codes');
  }

  const code = crypto.randomBytes(4).toString('hex').toUpperCase();

  const result = await pool.query(
    `INSERT INTO invitations (workspace_id, code, role_id, max_uses, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [workspaceId, code, roleId, maxUses || null, expiresAt || null, userId]
  );

  return result.rows[0];
}

async function joinWorkspace(userId, code) {
  if (!code) throw new Error('Invite code is required');

  const inviteResult = await pool.query(
    `SELECT * FROM invitations WHERE code = $1`,
    [code]
  );

  const invite = inviteResult.rows[0];

  if (!invite) throw new Error('Invalid invite code');

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    throw new Error('Invite code has expired');
  }

  if (invite.max_uses && invite.used_count >= invite.max_uses) {
    throw new Error('Invite code has reached maximum uses');
  }

  // Check if already a member
  const existing = await pool.query(
    `SELECT id FROM memberships WHERE user_id = $1 AND workspace_id = $2`,
    [userId, invite.workspace_id]
  );

  if (existing.rows.length > 0) {
    throw new Error('You are already a member of this workspace');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const membership = await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, invite.workspace_id, invite.role_id]
    );

    await client.query(
      `UPDATE invitations SET used_count = used_count + 1 WHERE id = $1`,
      [invite.id]
    );

    await client.query('COMMIT');
    return membership.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createWorkspace, getMyWorkspaces, generateInviteCode, joinWorkspace };