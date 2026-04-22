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
  // First get the user's last_active_workspace_id
  const userResult = await pool.query(
    `SELECT last_active_workspace_id FROM users WHERE id = $1`,
    [userId]
  );
  const lastActiveId = userResult.rows[0]?.last_active_workspace_id;

  const result = await pool.query(
    `SELECT w.*, r.name as role, c.name as company_name,
     (w.id = $2) as is_active
     FROM workspaces w
     JOIN memberships m ON m.workspace_id = w.id
     JOIN roles r ON r.id = m.role_id
     LEFT JOIN companies c ON c.workspace_id = w.id
     WHERE m.user_id = $1
     ORDER BY w.created_at ASC`,
    [userId, lastActiveId]
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

async function getWorkspaceStats(workspaceId, userId, role) {
  const r = role.toLowerCase();

  if (r === 'normal' || r === 'employee') {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE current_status = 'pending_review') as pending,
        COUNT(*) FILTER (WHERE current_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE current_status = 'rejected') as rejected,
        COALESCE(SUM(amount) FILTER (WHERE current_status = 'approved'), 0) as total_amount
       FROM invoices
       WHERE workspace_id = $1 AND created_by = $2`,
      [workspaceId, userId]
    );
    return result.rows[0];
  }

  if (r === 'accountant') {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE current_status = 'pending_review') as pending_validation,
        COUNT(*) FILTER (WHERE current_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE current_status = 'rejected') as rejected,
        COUNT(*) FILTER (
          WHERE current_status = 'approved'
          AND updated_at >= date_trunc('day', NOW())
        ) as validated_today
       FROM invoices
       WHERE workspace_id = $1`,
      [workspaceId]
    );
    return result.rows[0];
  }

  if (r === 'director') {
    const invoiceStats = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE current_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE current_status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE current_status = 'pending_review') as pending,
        COALESCE(SUM(amount) FILTER (WHERE current_status = 'approved'), 0) as total_amount,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE current_status = 'approved') * 100.0 / COUNT(*), 1)
          ELSE 0
        END as approval_rate
       FROM invoices
       WHERE workspace_id = $1`,
      [workspaceId]
    );

    const memberStats = await pool.query(
      `SELECT COUNT(*) as total_members
       FROM memberships
       WHERE workspace_id = $1`,
      [workspaceId]
    );

    return {
      ...invoiceStats.rows[0],
      total_members: memberStats.rows[0].total_members,
    };
  }

  if (r === 'admin') {
    const users     = await pool.query(`SELECT COUNT(*) as total_users FROM users`);
    const companies = await pool.query(`SELECT COUNT(*) as total_companies FROM companies`);
    const invoices  = await pool.query(`SELECT COUNT(*) as total_invoices FROM invoices`);
    const roleStats = await pool.query(
      `SELECT r.name as role, COUNT(*) as count
       FROM memberships m
       JOIN roles r ON r.id = m.role_id
       GROUP BY r.name`
    );

    const roleCounts = roleStats.rows.reduce((acc, row) => {
      acc[row.role.toLowerCase()] = parseInt(row.count);
      return acc;
    }, {});

    return {
      total_users:     parseInt(users.rows[0].total_users),
      total_companies: parseInt(companies.rows[0].total_companies),
      total_invoices:  parseInt(invoices.rows[0].total_invoices),
      role_counts:     roleCounts,
    };
  }

  return {};
}


module.exports = { createWorkspace, getMyWorkspaces, generateInviteCode, getWorkspaceStats };