const pool = require('../../config/db');
const crypto = require('crypto');
const { createNotification } = require('../notifications/notifications.service');
const { logActivity } = require('../activity/activity.service');

// ── Join request (existing, unchanged logic) ───────────────────────────────
async function createInvitationRequest(userId, companyCode, requestedRole) {
  const roleName = requestedRole === 'accountant' ? 'Accountant' : 'Employee';

  const companyResult = await pool.query(
    `SELECT c.workspace_id, r.id as role_id
     FROM companies c
     JOIN roles r ON r.name = $2
     WHERE c.code = $1`,
    [companyCode, roleName]
  );

  if (!companyResult.rows.length) throw new Error('Invalid company code');

  const { workspace_id, role_id } = companyResult.rows[0];

  const existing = await pool.query(
    `SELECT id FROM memberships WHERE user_id = $1 AND workspace_id = $2`,
    [userId, workspace_id]
  );
  if (existing.rows.length > 0) throw new Error('You are already a member of this company');

  const pending = await pool.query(
    `SELECT id FROM invitations
     WHERE user_id = $1 AND workspace_id = $2 AND status = 'pending' AND type = 'join_request'`,
    [userId, workspace_id]
  );
  if (pending.rows.length > 0) throw new Error('You already have a pending request for this company');

  const directorResult = await pool.query(
    `SELECT m.user_id FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1 AND r.name = 'Director'
     LIMIT 1`,
    [workspace_id]
  );
  const directorId = directorResult.rows[0]?.user_id;

  const userResult = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
  const userName = userResult.rows[0]?.name ?? 'Someone';

  const uniqueCode = crypto.randomBytes(8).toString('hex');
  const result = await pool.query(
    `INSERT INTO invitations
      (workspace_id, code, role_id, created_by, user_id, requested_role_id, status, type)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'join_request')
     RETURNING *`,
    [workspace_id, uniqueCode, role_id, directorId, userId, role_id]
  );

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

// ── Leave request (new) ────────────────────────────────────────────────────
async function createLeaveRequest(userId, workspaceId) {
  // Verify user is a member (Accountant or Employee)
  const memberResult = await pool.query(
    `SELECT m.id, r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );
  if (!memberResult.rows.length) throw new Error('You are not a member of this company');
  const { role } = memberResult.rows[0];
  if (role === 'Director') throw new Error('Directors cannot submit a leave request');

  // Check no pending leave request already
  const pending = await pool.query(
    `SELECT id FROM invitations
     WHERE user_id = $1 AND workspace_id = $2 AND status = 'pending' AND type = 'leave_request'`,
    [userId, workspaceId]
  );
  if (pending.rows.length > 0) throw new Error('You already have a pending leave request');

  // Get director
  const directorResult = await pool.query(
    `SELECT m.user_id FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1 AND r.name = 'Director'
     LIMIT 1`,
    [workspaceId]
  );
  const directorId = directorResult.rows[0]?.user_id;

  // Get role_id for the member
  const roleResult = await pool.query(`SELECT id FROM roles WHERE name = $1`, [role]);
  const roleId = roleResult.rows[0]?.id;

  const userResult = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
  const userName = userResult.rows[0]?.name ?? 'Someone';

  const uniqueCode = crypto.randomBytes(8).toString('hex');
  const result = await pool.query(
    `INSERT INTO invitations
      (workspace_id, code, role_id, created_by, user_id, requested_role_id, status, type)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'leave_request')
     RETURNING *`,
    [workspaceId, uniqueCode, roleId, userId, userId, roleId]
  );

  // Notify director
  if (directorId) {
    await createNotification(pool, {
      user_id: directorId,
      type: 'info',
      title: 'Leave Request',
      message: `${userName} (${role}) has requested to leave the company.`,
      action_url: '/dashboard/team',
    });
  }

  return result.rows[0];
}

// ── Get pending invitations (join + leave, split) ──────────────────────────
async function getPendingInvitations(workspaceId, requesterId) {
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
    `SELECT i.id, i.status, i.created_at, i.type,
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

// ── Handle invitation (join or leave) ─────────────────────────────────────
async function handleInvitation(requesterId, invitationId, action, contractStart, contractEnd) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invResult = await client.query(
      `SELECT * FROM invitations WHERE id = $1`,
      [invitationId]
    );
    if (!invResult.rows.length) throw new Error('Invitation not found');
    const inv = invResult.rows[0];

    // Verify requester is director
    const directorCheck = await client.query(
      `SELECT r.name FROM memberships m
       JOIN roles r ON r.id = m.role_id
       WHERE m.user_id = $1 AND m.workspace_id = $2`,
      [requesterId, inv.workspace_id]
    );
    if (!directorCheck.rows.length || directorCheck.rows[0].name !== 'Director') {
      throw new Error('Only directors can handle invitations');
    }

    const companyResult = await client.query(
      `SELECT c.name, c.id FROM companies c WHERE c.workspace_id = $1`, [inv.workspace_id]
    );
    const companyName = companyResult.rows[0]?.name ?? 'the company';

    const userResult = await client.query(`SELECT name FROM users WHERE id = $1`, [inv.user_id]);
    const userName = userResult.rows[0]?.name ?? 'Unknown';

    const roleResult = await client.query(`SELECT name FROM roles WHERE id = $1`, [inv.requested_role_id]);
    const roleName = roleResult.rows[0]?.name ?? 'Member';

    // ── JOIN REQUEST ──
    if (inv.type === 'join_request' || !inv.type) {
      if (action === 'accept') {
        if (!contractStart || !contractEnd) {
          throw new Error('Contract start and end dates are required');
        }

        await client.query(
          `INSERT INTO memberships
            (user_id, workspace_id, role_id, contract_start, contract_end)
           VALUES ($1, $2, $3, $4, $5)`,
          [inv.user_id, inv.workspace_id, inv.requested_role_id, contractStart, contractEnd]
        );

        await client.query(
          `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
          [inv.workspace_id, inv.user_id]
        );

        await client.query(
          `UPDATE invitations SET status = 'accepted', accepted_by = $1, accepted_at = NOW() WHERE id = $2`,
          [inv.user_id, invitationId]
        );
      } else {
        await client.query(
          `UPDATE invitations SET status = 'rejected', rejected_at = NOW() WHERE id = $1`,
          [invitationId]
        );
      }

      await createNotification(client, {
        user_id: inv.user_id,
        type: action === 'accept' ? 'success' : 'error',
        title: action === 'accept' ? 'Join Request Accepted' : 'Join Request Rejected',
        message: action === 'accept'
          ? `Your request to join ${companyName} has been accepted. Welcome aboard!`
          : `Your request to join ${companyName} has been rejected.`,
        action_url: action === 'accept' ? '/dashboard' : null,
      });

      await logActivity(client, {
        workspace_id: inv.workspace_id,
        user_id: requesterId,
        action: action === 'accept' ? 'member.joined' : 'invitation.rejected',
        entity_type: 'member',
        entity_id: inv.user_id,
        metadata: { user_name: userName, role: roleName, company_name: companyName },
      });
    }

    // ── LEAVE REQUEST ──
    if (inv.type === 'leave_request') {
      if (action === 'accept') {
        // Remove membership
        await client.query(
          `DELETE FROM memberships WHERE user_id = $1 AND workspace_id = $2`,
          [inv.user_id, inv.workspace_id]
        );

        // Reset their active workspace to their personal one
        await client.query(
          `UPDATE users
           SET last_active_workspace_id = (
             SELECT w.id FROM workspaces w
             JOIN memberships m ON m.workspace_id = w.id
             WHERE m.user_id = $1 AND w.type = 'personal'
             LIMIT 1
           )
           WHERE id = $1`,
          [inv.user_id]
        );

        await client.query(
          `UPDATE invitations SET status = 'accepted', accepted_by = $1, accepted_at = NOW() WHERE id = $2`,
          [requesterId, invitationId]
        );

        await createNotification(client, {
          user_id: inv.user_id,
          type: 'success',
          title: 'Leave Request Accepted',
          message: `Your request to leave ${companyName} has been approved.`,
          action_url: '/dashboard',
        });

        await logActivity(client, {
          workspace_id: inv.workspace_id,
          user_id: requesterId,
          action: 'member.left',
          entity_type: 'member',
          entity_id: inv.user_id,
          metadata: { user_name: userName, role: roleName, company_name: companyName },
        });
      } else {
        // Director rejected the leave request — member stays
        await client.query(
          `UPDATE invitations SET status = 'rejected', rejected_at = NOW() WHERE id = $1`,
          [invitationId]
        );

        await createNotification(client, {
          user_id: inv.user_id,
          type: 'error',
          title: 'Leave Request Rejected',
          message: `Your request to leave ${companyName} was not approved.`,
          action_url: null,
        });
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Check if current user has a pending leave request ─────────────────────
async function getMyLeaveRequest(userId, workspaceId) {
  const result = await pool.query(
    `SELECT id, status, created_at FROM invitations
     WHERE user_id = $1 AND workspace_id = $2
       AND type = 'leave_request' AND status = 'pending'
     LIMIT 1`,
    [userId, workspaceId]
  );
  return result.rows[0] ?? null;
}

module.exports = {
  createInvitationRequest,
  createLeaveRequest,
  getPendingInvitations,
  handleInvitation,
  getMyLeaveRequest,
};