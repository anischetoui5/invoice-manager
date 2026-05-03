const pool = require('../../config/db');
const crypto = require('crypto');
const { createNotification } = require('../notifications/notifications.service');

async function createInvitationRequest(userId, companyCode, requestedRole) {
  const roleName = requestedRole === 'accountant' ? 'Accountant' : 'Employee';

  // Find company by code
  const companyResult = await pool.query(
    `SELECT c.workspace_id, r.id as role_id
     FROM companies c
     JOIN roles r ON r.name = $2
     WHERE c.code = $1`,
    [companyCode, roleName]
  );

  console.log('companyResult:', companyResult.rows); // ← add this

  if (!companyResult.rows.length) throw new Error('Invalid company code');

  const { workspace_id, role_id } = companyResult.rows[0];

  // Check not already a member
  const existing = await pool.query(
    `SELECT id FROM memberships WHERE user_id = $1 AND workspace_id = $2`,
    [userId, workspace_id]
  );
  if (existing.rows.length > 0) throw new Error('You are already a member of this company');

  // Check no pending request already
  const pending = await pool.query(
    `SELECT id FROM invitations
     WHERE user_id = $1 AND workspace_id = $2 AND status = 'pending'`,
    [userId, workspace_id]
  );
  if (pending.rows.length > 0) throw new Error('You already have a pending request for this company');

  // Get director
  const directorResult = await pool.query(
    `SELECT m.user_id FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1 AND r.name = 'Director'
     LIMIT 1`,
    [workspace_id]
  );
  const directorId = directorResult.rows[0]?.user_id;

  // Get requesting user's name
  const userResult = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
  const userName = userResult.rows[0]?.name ?? 'Someone';

  // Create pending invitation
  const uniqueCode = crypto.randomBytes(8).toString('hex');
  const result = await pool.query(
    `INSERT INTO invitations
      (workspace_id, code, role_id, created_by, user_id, requested_role_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [workspace_id, uniqueCode, role_id, directorId, userId, role_id]
  );

  // Notify the director
  if (directorId) {
    await createNotification(pool, {
      user_id: directorId,
      type: 'info',
      title: 'New Join Request',
      message: `${userName} wants to join as ${roleName}. Review their request.`,
      action_url: '/dashboard/team',
    });
  }

  return result.rows[0];
}

async function getPendingInvitations(workspaceId, requesterId) {
  // Verify requester is director
  const directorCheck = await pool.query(
    `SELECT r.name FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );
  if (!directorCheck.rows.length || directorCheck.rows[0].name !== 'Director') {
    throw new Error('Only directors can view invitations');
  }

  const result = await pool.query(
    `SELECT i.id, i.status, i.created_at,
            u.id as user_id, u.name, u.email,
            r.name as role
     FROM invitations i
     JOIN users u ON u.id = i.user_id
     JOIN roles r ON r.id = i.requested_role_id
     WHERE i.workspace_id = $1 AND i.status = 'pending'
     ORDER BY i.created_at ASC`,
    [workspaceId]
  );
  return result.rows;
}

async function handleInvitation(requesterId, invitationId, action, contractStart, contractEnd) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get invitation
    const invResult = await client.query(
      `SELECT * FROM invitations WHERE id = $1`,
      [invitationId]
    );
    if (!invResult.rows.length) throw new Error('Invitation not found');
    const inv = invResult.rows[0];

    // Verify requester is director of that workspace
    const directorCheck = await client.query(
      `SELECT r.name FROM memberships m
       JOIN roles r ON r.id = m.role_id
       WHERE m.user_id = $1 AND m.workspace_id = $2`,
      [requesterId, inv.workspace_id]
    );
    if (!directorCheck.rows.length || directorCheck.rows[0].name !== 'Director') {
      throw new Error('Only directors can handle invitations');
    }

    if (action === 'accept') {
      if (!contractStart || !contractEnd) {
        throw new Error('Contract start and end dates are required');
      }

      // Create membership with contract
      await client.query(
        `INSERT INTO memberships
          (user_id, workspace_id, role_id, contract_start, contract_end)
         VALUES ($1, $2, $3, $4, $5)`,
        [inv.user_id, inv.workspace_id, inv.requested_role_id, contractStart, contractEnd]
      );

      // Set company workspace as active for the user
      await client.query(
        `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
        [inv.workspace_id, inv.user_id]
      );

      // Mark as accepted
      await client.query(
        `UPDATE invitations
         SET status = 'accepted', accepted_by = $1, accepted_at = NOW()
         WHERE id = $2`,
        [inv.user_id, invitationId]
      );
    } else {
      // Reject
      await client.query(
        `UPDATE invitations
         SET status = 'rejected', rejected_at = NOW()
         WHERE id = $1`,
        [invitationId]
      );
    }

    // Notify the employee/accountant of the decision
    const companyResult = await client.query(
      `SELECT c.name FROM companies c WHERE c.workspace_id = $1`, [inv.workspace_id]
    );
    const companyName = companyResult.rows[0]?.name ?? 'the company';

    await createNotification(client, {
      user_id: inv.user_id,
      type: action === 'accept' ? 'success' : 'error',
      title: action === 'accept' ? 'Join Request Accepted' : 'Join Request Rejected',
      message: action === 'accept'
        ? `Your request to join ${companyName} has been accepted. Welcome aboard!`
        : `Your request to join ${companyName} has been rejected.`,
      action_url: action === 'accept' ? '/dashboard' : null,
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createInvitationRequest, getPendingInvitations, handleInvitation };