const pool = require('../../config/db');
const crypto = require('crypto');
const { createNotification } = require('../notifications/notifications.service');
const { logActivity } = require('../activity/activity.service');

// ── Join request ───────────────────────────────────────────────────────────
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

// ── Leave request ──────────────────────────────────────────────────────────
async function createLeaveRequest(userId, workspaceId) {
  const memberResult = await pool.query(
    `SELECT m.id, r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );
  if (!memberResult.rows.length) throw new Error('You are not a member of this company');
  const { role } = memberResult.rows[0];
  if (role === 'Director') throw new Error('Directors cannot submit a leave request');

  const pending = await pool.query(
    `SELECT id FROM invitations
     WHERE user_id = $1 AND workspace_id = $2 AND status = 'pending' AND type = 'leave_request'`,
    [userId, workspaceId]
  );
  if (pending.rows.length > 0) throw new Error('You already have a pending leave request');

  const directorResult = await pool.query(
    `SELECT m.user_id FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1 AND r.name = 'Director'
     LIMIT 1`,
    [workspaceId]
  );
  const directorId = directorResult.rows[0]?.user_id;

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

// ── Renewal request ────────────────────────────────────────────────────────
async function createRenewalRequest(userId, workspaceId) {
  const memberResult = await pool.query(
    `SELECT m.id, r.name as role, r.id as role_id, m.contract_end
     FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );
  if (!memberResult.rows.length) throw new Error('You are not a member of this company');
  const { role, role_id, contract_end } = memberResult.rows[0];
  if (role !== 'Accountant') throw new Error('Only Accountants can request a contract renewal');

  // Enforce 30-day window
  if (contract_end) {
    const daysUntilExpiry = Math.ceil(
      (new Date(contract_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry > 30) {
      const renewableFrom = new Date(new Date(contract_end).getTime() - 30 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      throw new Error(`Renewal is only available within 30 days of contract expiry. You can request from ${renewableFrom}`);
    }
  }

  const pending = await pool.query(
    `SELECT id FROM invitations
     WHERE user_id = $1 AND workspace_id = $2 AND status = 'pending' AND type = 'renewal_request'`,
    [userId, workspaceId]
  );
  if (pending.rows.length > 0) throw new Error('You already have a pending renewal request');

  const directorResult = await pool.query(
    `SELECT m.user_id FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1 AND r.name = 'Director'
     LIMIT 1`,
    [workspaceId]
  );
  const directorId = directorResult.rows[0]?.user_id;

  const userResult = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
  const userName = userResult.rows[0]?.name ?? 'Someone';

  const daysLeft = contract_end
    ? Math.max(0, Math.ceil((new Date(contract_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const uniqueCode = crypto.randomBytes(8).toString('hex');
  const result = await pool.query(
    `INSERT INTO invitations
      (workspace_id, code, role_id, created_by, user_id, requested_role_id, status, type)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'renewal_request')
     RETURNING *`,
    [workspaceId, uniqueCode, role_id, userId, userId, role_id]
  );

  if (directorId) {
    await createNotification(pool, {
      user_id: directorId,
      type: 'info',
      title: 'Contract Renewal Request',
      message: daysLeft === 0
        ? `${userName}'s contract has expired. They are requesting a renewal.`
        : `${userName} has requested a contract renewal. Their contract expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
      action_url: '/dashboard/team',
    });
  }

  return result.rows[0];
}

// ── Get pending invitations ────────────────────────────────────────────────
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

// ── Handle invitation (join, leave, renewal) ───────────────────────────────
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
      `SELECT c.name FROM companies c WHERE c.workspace_id = $1`,
      [inv.workspace_id]
    );
    const companyName = companyResult.rows[0]?.name ?? 'the company';

    const userResult = await client.query(`SELECT name FROM users WHERE id = $1`, [inv.user_id]);
    const userName = userResult.rows[0]?.name ?? 'Unknown';

    const roleResult = await client.query(`SELECT name FROM roles WHERE id = $1`, [inv.requested_role_id]);
    const roleName = roleResult.rows[0]?.name ?? 'Member';

    // ── JOIN REQUEST ──────────────────────────────────────────────────────
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

    // ── LEAVE REQUEST ─────────────────────────────────────────────────────
    if (inv.type === 'leave_request') {
      if (action === 'accept') {
        await client.query(
          `DELETE FROM memberships WHERE user_id = $1 AND workspace_id = $2`,
          [inv.user_id, inv.workspace_id]
        );

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

    // ── RENEWAL REQUEST ───────────────────────────────────────────────────
    if (inv.type === 'renewal_request') {
      if (action === 'accept') {
        if (!contractEnd) throw new Error('A new contract end date is required to approve renewal');

        await client.query(
          `UPDATE memberships
           SET contract_end = $1, contract_start = NOW()
           WHERE user_id = $2 AND workspace_id = $3`,
          [contractEnd, inv.user_id, inv.workspace_id]
        );

        await client.query(
          `UPDATE invitations SET status = 'accepted', accepted_by = $1, accepted_at = NOW() WHERE id = $2`,
          [requesterId, invitationId]
        );

        await createNotification(client, {
          user_id: inv.user_id,
          type: 'success',
          title: 'Contract Renewed',
          message: `Your contract with ${companyName} has been renewed.`,
          action_url: '/dashboard/settings',
        });

        // Log for the director (who performed the action)
        await logActivity(client, {
          workspace_id: inv.workspace_id,
          user_id: requesterId,
          action: 'contract.renewed',
          entity_type: 'membership',
          entity_id: inv.user_id,
          metadata: { user_name: userName, company_name: companyName, new_contract_end: contractEnd },
        });

        // Log for the accountant (who was affected)
        await logActivity(client, {
          workspace_id: inv.workspace_id,
          user_id: inv.user_id,
          action: 'contract.renewed',
          entity_type: 'membership',
          entity_id: inv.user_id,
          metadata: { user_name: userName, company_name: companyName, new_contract_end: contractEnd },
        });
      } else {
        await client.query(
          `UPDATE invitations SET status = 'rejected', rejected_at = NOW() WHERE id = $1`,
          [invitationId]
        );

        await createNotification(client, {
          user_id: inv.user_id,
          type: 'error',
          title: 'Renewal Request Rejected',
          message: `Your contract renewal request for ${companyName} was not approved.`,
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

// ── Check pending leave request ────────────────────────────────────────────
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

// ── Check pending renewal request ─────────────────────────────────────────
async function getMyRenewalRequest(userId, workspaceId) {
  const result = await pool.query(
    `SELECT id, status, created_at FROM invitations
     WHERE user_id = $1 AND workspace_id = $2
       AND type = 'renewal_request' AND status = 'pending'
     LIMIT 1`,
    [userId, workspaceId]
  );
  return result.rows[0] ?? null;
}

// ── Remove expired contracts ───────────────────────────────────────────────
async function removeExpiredContracts() {
  try {
    const expired = await pool.query(
      `SELECT m.user_id, m.workspace_id, u.name, c.name as company_name
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       JOIN roles r ON r.id = m.role_id
       JOIN companies c ON c.workspace_id = m.workspace_id
       WHERE r.name = 'Accountant'
         AND m.contract_end IS NOT NULL
         AND m.contract_end < NOW()`
    );

    for (const row of expired.rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `DELETE FROM memberships WHERE user_id = $1 AND workspace_id = $2`,
          [row.user_id, row.workspace_id]
        );

        await client.query(
          `UPDATE users
           SET last_active_workspace_id = (
             SELECT w.id FROM workspaces w
             JOIN memberships m ON m.workspace_id = w.id
             WHERE m.user_id = $1 AND w.type = 'personal'
             LIMIT 1
           )
           WHERE id = $1`,
          [row.user_id]
        );

        await createNotification(client, {
          user_id: row.user_id,
          type: 'error',
          title: 'Contract Expired',
          message: `Your contract with ${row.company_name} has expired. You have been removed from the company.`,
          action_url: '/dashboard/settings',
        });

        await logActivity(client, {
          workspace_id: row.workspace_id,
          user_id: row.user_id,
          action: 'membership.expired',
          entity_type: 'membership',
          entity_id: row.user_id,
          metadata: { name: row.name, company_name: row.company_name, reason: 'contract_expired' },
        });

        await client.query('COMMIT');
        console.log(`[invitations.job] Removed expired accountant: ${row.name} from ${row.company_name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[invitations.job] Failed to remove ${row.name}:`, err.message);
      } finally {
        client.release();
      }
    }

    return expired.rows.length;
  } catch (err) {
    console.error('[invitations.job] Query failed:', err);
    return 0;
  }
}

module.exports = {
  createInvitationRequest,
  createLeaveRequest,
  createRenewalRequest,
  getPendingInvitations,
  handleInvitation,
  getMyLeaveRequest,
  getMyRenewalRequest,
  removeExpiredContracts,
};