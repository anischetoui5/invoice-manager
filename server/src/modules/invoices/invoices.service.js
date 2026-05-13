const pool = require('../../config/db');
const { createNotification } = require('../notifications/notifications.service');
const { logActivity } = require('../activity/activity.service');

async function createInvoice({ workspace_id, created_by, invoice_number, vendor_name, amount, currency, invoice_date, due_date, notes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check invoice quota for this workspace's subscription plan
    const quotaRes = await client.query(
      `SELECT
         w.type AS workspace_type,
         sp.max_invoices,
         sp.name AS plan_name,
         (
           CASE WHEN w.type = 'personal' THEN
             (SELECT COUNT(*) FROM invoices i2
              JOIN workspaces w2 ON w2.id = i2.workspace_id
              WHERE w2.owner_id = w.owner_id AND w2.type = 'personal')
           ELSE
             (SELECT COUNT(*) FROM invoices i2 WHERE i2.workspace_id = w.id)
           END
         ) AS invoice_count
       FROM workspaces w
       LEFT JOIN companies c ON c.workspace_id = w.id
       LEFT JOIN subscriptions s ON (
         (w.type = 'personal' AND s.user_id = w.owner_id AND s.company_id IS NULL)
         OR (w.type = 'company' AND s.company_id = c.id)
       ) AND s.status IN ('trialing', 'active')
       LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
       WHERE w.id = $1`,
      [workspace_id]
    );

    let maxInvoices = null;
    if (quotaRes.rows.length > 0) {
      const { max_invoices, invoice_count } = quotaRes.rows[0];
      maxInvoices = max_invoices;
      if (max_invoices !== null && max_invoices !== -1 && parseInt(invoice_count) >= parseInt(max_invoices)) {
        throw Object.assign(
          new Error('Invoice limit reached for your current plan. Upgrade your plan to continue. Your account data may be removed after 30 days of inactivity.'),
          { statusCode: 403 }
        );
      }
    }

    const invoiceResult = await client.query(
      `INSERT INTO invoices
        (workspace_id, created_by, invoice_number, vendor_name, amount, currency, invoice_date, due_date, notes, current_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
       RETURNING *`,
      [workspace_id, created_by, invoice_number || null, vendor_name, amount || null, currency || 'USD', invoice_date || null, due_date || null, notes]
    );

    const invoice = invoiceResult.rows[0];

    await client.query(
      `INSERT INTO status_history (invoice_id, status, changed_by, comment)
       VALUES ($1, 'draft', $2, 'Invoice created')`,
      [invoice.id, created_by]
    );

    await logActivity(client, {
      workspace_id,
      user_id: created_by,
      action: 'invoice.created',
      entity_type: 'invoice',
      entity_id: invoice.id,
      metadata: { invoice_number: invoice.invoice_number, vendor_name: invoice.vendor_name, created_by },
    });

    // Send notifications based on usage thresholds
    if (maxInvoices !== null && maxInvoices !== -1) {
      const isPersonal = quotaRes.rows[0]?.workspace_type === 'personal';
      const newCountRes = await client.query(
        isPersonal
          ? `SELECT COUNT(*) FROM invoices i
             JOIN workspaces w ON w.id = i.workspace_id
             WHERE w.owner_id = (SELECT owner_id FROM workspaces WHERE id = $1)
               AND w.type = 'personal'`
          : `SELECT COUNT(*) FROM invoices WHERE workspace_id = $1`,
        [workspace_id]
      );
      const newCount = parseInt(newCountRes.rows[0].count);
      const planName = quotaRes.rows[0]?.plan_name ?? 'your current plan';

      if (newCount >= maxInvoices) {
        // Limit just reached — critical warning
        await createNotification(client, {
          user_id: created_by,
          type: 'error',
          title: 'Invoice Limit Reached',
          message: `You've used all ${maxInvoices} invoices on the ${planName} plan. Upgrade now to keep uploading. If no action is taken, your account data may be removed after 30 days.`,
          action_url: '/dashboard/personal-subscription',
        });
      } else if (newCount >= Math.ceil(maxInvoices * 0.8) && newCount < maxInvoices) {
        // 80% threshold warning
        await createNotification(client, {
          user_id: created_by,
          type: 'warning',
          title: 'Approaching Invoice Limit',
          message: `You've used ${newCount} of ${maxInvoices} invoices on the ${planName} plan. Consider upgrading before you reach the limit.`,
          action_url: '/dashboard/personal-subscription',
        });
      }
    }

    await client.query('COMMIT');
    return invoice;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getInvoiceById(invoice_id, workspace_id) {
  const result = await pool.query(
    `SELECT i.*, u.name AS created_by_name
     FROM invoices i
     LEFT JOIN users u ON u.id = i.created_by
     WHERE i.id = $1 AND i.workspace_id = $2`,
    [invoice_id, workspace_id]
  );
  if (result.rows.length === 0) throw new Error('Invoice not found');
  return result.rows[0];
}

async function searchInvoices({ workspace_id, userId, role, status, vendor_name, invoice_date_from, invoice_date_to, page = 1, limit = 20 }) {
  const r = role?.toLowerCase();
  const conditions = ['i.workspace_id = $1'];
  const values = [workspace_id];
  let idx = 2;

  // employees only see their own invoices
  if (r === 'employee' || r === 'normal') {
    conditions.push(`i.created_by = $${idx++}`);
    values.push(userId);
  }

  if (status) {
    conditions.push(`i.current_status = $${idx++}`);
    values.push(status);
  }
  if (vendor_name) {
    conditions.push(`i.vendor_name ILIKE $${idx++}`);
    values.push(`%${vendor_name}%`);
  }
  if (invoice_date_from) {
    conditions.push(`i.invoice_date >= $${idx++}`);
    values.push(invoice_date_from);
  }
  if (invoice_date_to) {
    conditions.push(`i.invoice_date <= $${idx++}`);
    values.push(invoice_date_to);
  }

  const offset = (page - 1) * limit;
  const where = conditions.join(' AND ');

  const result = await pool.query(
    `SELECT i.*, u.name AS created_by_name
     FROM invoices i
     LEFT JOIN users u ON u.id = i.created_by
     WHERE ${where}
     ORDER BY i.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM invoices i WHERE ${where}`,
    values
  );

  return {
    invoices: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}

async function updateInvoiceStatus(invoice_id, status, changed_by, comment = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const statusCheck = await client.query(
      `SELECT code FROM invoice_status WHERE code = $1`,
      [status]
    );
    if (statusCheck.rows.length === 0) throw new Error(`Invalid status: ${status}`);

    const invoiceRes = await client.query(
      `SELECT invoice_number, vendor_name, created_by, workspace_id FROM invoices WHERE id = $1`,
      [invoice_id]
    );
    const invoice = invoiceRes.rows[0];
    const label = invoice?.invoice_number || 'Invoice';

    await client.query(
      `UPDATE invoices SET current_status = $1 WHERE id = $2`,
      [status, invoice_id]
    );

    await client.query(
      `INSERT INTO status_history (invoice_id, status, changed_by, comment)
       VALUES ($1, $2, $3, $4)`,
      [invoice_id, status, changed_by, comment]
    );

    // Notifications
    const actionUrl = `/dashboard/invoices/${invoice_id}`;
    if (invoice) {
      if (status === 'pending_review') {
        // Notify all directors and accountants in the workspace
        const reviewers = await client.query(
          `SELECT m.user_id FROM memberships m
           JOIN roles r ON r.id = m.role_id
           WHERE m.workspace_id = $1 AND r.name IN ('Director', 'Accountant')`,
          [invoice.workspace_id]
        );
        for (const row of reviewers.rows) {
          if (row.user_id !== changed_by) {
            await createNotification(client, {
              user_id: row.user_id,
              type: 'info',
              title: 'Invoice Awaiting Review',
              message: `${label}${invoice.vendor_name ? ` (${invoice.vendor_name})` : ''} has been submitted for review.`,
              action_url: actionUrl,
            });
          }
        }
      } else if (['approved', 'rejected', 'paid'].includes(status) && invoice.created_by !== changed_by) {
        const typeMap = { approved: 'success', rejected: 'error', paid: 'success' };
        const titleMap = { approved: 'Invoice Approved', rejected: 'Invoice Rejected', paid: 'Invoice Marked as Paid' };
        const msgMap = {
          approved: `${label} has been approved.`,
          rejected: `${label} has been rejected.${comment ? ` Reason: ${comment}` : ''}`,
          paid: `${label} has been marked as paid.`,
        };
        await createNotification(client, {
          user_id: invoice.created_by,
          type: typeMap[status],
          title: titleMap[status],
          message: msgMap[status],
          action_url: actionUrl,
        });
      }

      await logActivity(client, {
        workspace_id: invoice.workspace_id,
        user_id: changed_by,
        action: 'invoice.status_changed',
        entity_type: 'invoice',
        entity_id: invoice_id,
        metadata: { invoice_number: invoice.invoice_number, vendor_name: invoice.vendor_name, status, comment, created_by: invoice.created_by },
      });
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getStatusHistory(invoice_id) {
  const result = await pool.query(
    `SELECT sh.*, u.name AS changed_by_name
     FROM status_history sh
     LEFT JOIN users u ON u.id = sh.changed_by
     WHERE sh.invoice_id = $1
     ORDER BY sh.changed_at ASC`,
    [invoice_id]
  );
  return result.rows;
}

async function updateInvoice(invoice_id, workspace_id, { invoice_number, vendor_name, amount, invoice_date, due_date }) {
  const result = await pool.query(
    `UPDATE invoices
     SET invoice_number = COALESCE($1, invoice_number),
         vendor_name    = COALESCE($2, vendor_name),
         amount         = COALESCE($3, amount),
         invoice_date   = COALESCE($4, invoice_date),
         due_date       = COALESCE($5, due_date)
     WHERE id = $6 AND workspace_id = $7
     RETURNING *`,
    [invoice_number, vendor_name, amount, invoice_date, due_date, invoice_id, workspace_id]
  );
  if (!result.rows.length) throw new Error('Invoice not found');
  return result.rows[0];
}

async function deleteInvoice(invoice_id, workspace_id, userId) {
  const check = await pool.query(
    `SELECT i.*, r.name as role
     FROM invoices i
     JOIN memberships m ON m.workspace_id = i.workspace_id AND m.user_id = $3
     JOIN roles r ON r.id = m.role_id
     WHERE i.id = $1 AND i.workspace_id = $2`,
    [invoice_id, workspace_id, userId]
  );

  if (!check.rows.length) throw new Error('Invoice not found');

  const invoice = check.rows[0];

  if (!['Director', 'Employee', 'Personal'].includes(invoice.role)) {
    throw new Error('Only Directors, Employees and Personal users can delete invoices');
  }

  // Director can delete anything not yet approved/paid/archived
  if (invoice.role === 'Director' && ['approved', 'paid', 'archived'].includes(invoice.current_status)) {
    throw new Error('Cannot delete an invoice that has already been approved');
  }

  // Employee can only delete their own draft invoices
  if (invoice.role === 'Employee') {
    if (invoice.current_status !== 'draft') {
      throw new Error('Employees can only delete draft invoices');
    }
    if (invoice.created_by !== userId) {
      throw new Error('You can only delete your own invoices');
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM extracted_fields WHERE invoice_id = $1`, [invoice_id]);
    await client.query(`DELETE FROM status_history WHERE invoice_id = $1`, [invoice_id]);
    await client.query(`DELETE FROM documents WHERE invoice_id = $1`, [invoice_id]);
    await client.query(`DELETE FROM invoices WHERE id = $1`, [invoice_id]);

    await logActivity(client, {
      workspace_id,
      user_id: userId,
      action: 'invoice.deleted',
      entity_type: 'invoice',
      entity_id: invoice_id,
      metadata: { invoice_number: invoice.invoice_number, vendor_name: invoice.vendor_name },
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getDashboardStats(workspaceId, userId, role) {
  const r = role?.toLowerCase();

  if (r === 'personal' || r === 'normal') {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ocr_status = 'processing' OR ocr_status = 'pending') as ocr_pending,
        COUNT(*) FILTER (WHERE ocr_status = 'completed') as ocr_done,
        COUNT(*) FILTER (WHERE ocr_status = 'failed') as ocr_failed,
        COUNT(*) FILTER (WHERE current_status = 'paid') as paid,
        COUNT(*) FILTER (WHERE current_status = 'draft') as draft,
        COALESCE(SUM(amount), 0) as total_amount
      FROM invoices
      WHERE workspace_id = $1 AND created_by = $2`,
      [workspaceId, userId]
    );
    return result.rows[0];
  }

  if (r === 'employee') {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE current_status = 'pending_review') as pending,
        COUNT(*) FILTER (WHERE current_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE current_status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE current_status = 'paid') as paid,
        COALESCE(SUM(amount) FILTER (WHERE current_status NOT IN ('draft','rejected')), 0) as total_amount
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
        COUNT(*) FILTER (WHERE current_status = 'paid') as paid,
        (
          SELECT COUNT(DISTINCT sh.invoice_id)
          FROM status_history sh
          JOIN invoices i2 ON i2.id = sh.invoice_id
          WHERE i2.workspace_id = $1
            AND sh.status = 'approved'
            AND sh.changed_at >= date_trunc('day', NOW())
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
        COUNT(*) FILTER (WHERE current_status = 'paid') as paid,
        COALESCE(SUM(amount) FILTER (WHERE current_status NOT IN ('draft','rejected')), 0) as total_amount,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE current_status = 'approved') * 100.0 / COUNT(*), 1)
          ELSE 0
        END as approval_rate
       FROM invoices
       WHERE workspace_id = $1`,
      [workspaceId]
    );

    const memberStats = await pool.query(
      `SELECT COUNT(*) as total_members FROM memberships WHERE workspace_id = $1`,
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
      total_users:     users.rows[0].total_users,
      total_companies: companies.rows[0].total_companies,
      total_invoices:  invoices.rows[0].total_invoices,
      role_counts:     roleCounts,
    };
  }

  return {};
}

async function getAllInvoices({
  status, vendor_name, workspace_name, company_name,
  invoice_date_from, invoice_date_to,
  page = 1, limit = 20,
}) {

  let safePage = Math.max(1, parseInt(page));
  let safeLimit = Math.min(100, Math.max(1, parseInt(limit)));
  
  const conditions = [];
  const values = [];
  let idx = 1;

  if (status) {
    conditions.push(`i.current_status = $${idx++}`);
    values.push(status);
  }
  if (vendor_name) {
    conditions.push(`i.vendor_name ILIKE $${idx++}`);
    values.push(`%${vendor_name}%`);
  }
  if (workspace_name) {
    conditions.push(`w.name ILIKE $${idx++}`);
    values.push(`%${workspace_name}%`);
  }
  if (company_name) {
    conditions.push(`c.name ILIKE $${idx++}`);
    values.push(`%${company_name}%`);
  }
  if (invoice_date_from) {
    conditions.push(`i.invoice_date >= $${idx++}`);
    values.push(invoice_date_from);
  }
  if (invoice_date_to) {
    conditions.push(`i.invoice_date <= $${idx++}`);
    values.push(invoice_date_to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (safePage - 1) * safeLimit;

  // single query for both data and count using a window function
  // avoids running two separate queries against the same filtered dataset
  const result = await pool.query(
    `SELECT
       i.id,
       i.invoice_number,
       i.vendor_name,
       i.amount,
       i.currency,
       i.invoice_date,
       i.due_date,
       i.current_status,
       i.created_at,
       u.name        AS created_by_name,
       w.name        AS workspace_name,
       w.id          AS workspace_id,
       c.name        AS company_name,
       COUNT(*) OVER() AS total_count
     FROM invoices i
     LEFT JOIN users u       ON u.id = i.created_by
     LEFT JOIN workspaces w  ON w.id = i.workspace_id
     LEFT JOIN companies c   ON c.workspace_id = i.workspace_id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, safeLimit, offset]
  );

  const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

  return {
    invoices: result.rows.map(({ total_count, ...row }) => row), // strip total_count from each row
    total,
    safePage,
    safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  };
}

async function getReportsData(workspaceId, userId, role, period = '30d') {
  const periodMap = {
    '30d':  '30 days',
    '90d':  '90 days',
    '180d': '180 days',
    '1y':   '1 year',
  };
  const interval = periodMap[period] || '30 days';
  const r = role?.toLowerCase();
  const isPersonal = r === 'personal' || r === 'normal';

  // ── Personal ──────────────────────────────────────────────────────────────
  if (isPersonal) {
    const [summary, monthly, statusDist, topVendors] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                 AS total,
          COALESCE(SUM(amount), 0)                                 AS total_amount,
          COALESCE(AVG(amount), 0)                                 AS avg_amount,
          COUNT(*) FILTER (WHERE current_status = 'paid')          AS paid,
          COUNT(*) FILTER (WHERE ocr_status = 'completed')         AS ocr_done,
          COUNT(*) FILTER (
            WHERE ocr_status = 'processing' OR ocr_status = 'pending'
          )                                                        AS ocr_pending
        FROM invoices i
        WHERE i.created_at >= NOW() - $1::interval
          AND i.workspace_id = $2
          AND i.created_by = $3
      `, [interval, workspaceId, userId]),

      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', i.created_at), 'Mon YY') AS month,
          DATE_TRUNC('month', i.created_at)                    AS month_date,
          COUNT(*)                                             AS count,
          COALESCE(SUM(amount), 0)                             AS amount
        FROM invoices i
        WHERE i.created_at >= NOW() - $1::interval
          AND i.workspace_id = $2
          AND i.created_by = $3
        GROUP BY DATE_TRUNC('month', i.created_at)
        ORDER BY month_date ASC
      `, [interval, workspaceId, userId]),

      pool.query(`
        SELECT current_status AS status, COUNT(*) AS count
        FROM invoices i
        WHERE i.created_at >= NOW() - $1::interval
          AND i.workspace_id = $2
          AND i.created_by = $3
        GROUP BY current_status
      `, [interval, workspaceId, userId]),

      pool.query(`
        SELECT
          COALESCE(vendor_name, 'Unknown') AS vendor,
          COUNT(*)                         AS count,
          COALESCE(SUM(amount), 0)         AS total_amount
        FROM invoices i
        WHERE i.created_at >= NOW() - $1::interval
          AND i.workspace_id = $2
          AND i.created_by = $3
          AND vendor_name IS NOT NULL
        GROUP BY vendor_name
        ORDER BY total_amount DESC
        LIMIT 5
      `, [interval, workspaceId, userId]),
    ]);

    return {
      summary: summary.rows[0],
      monthly_trend: monthly.rows,
      status_distribution: statusDist.rows,
      top_vendors: topVendors.rows,
      total_members: 0,
      employee_leaderboard: [],
    };
  }

  // ── Company ───────────────────────────────────────────────────────────────
  const summary = await pool.query(`
    SELECT
      COUNT(*)                                                              AS total,
      COUNT(*) FILTER (WHERE current_status = 'approved')                  AS approved,
      COUNT(*) FILTER (WHERE current_status = 'rejected')                  AS rejected,
      COUNT(*) FILTER (WHERE current_status = 'pending_review')            AS pending,
      COALESCE(SUM(amount) FILTER (WHERE current_status = 'approved'), 0)  AS total_amount,
      COALESCE(AVG(amount) FILTER (WHERE current_status = 'approved'), 0)  AS avg_amount
    FROM invoices i
    WHERE i.created_at >= NOW() - $1::interval
      AND i.workspace_id = $2
  `, [interval, workspaceId]);

  const monthly = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', i.created_at), 'Mon YY') AS month,
      DATE_TRUNC('month', i.created_at)                    AS month_date,
      COUNT(*)                                             AS count,
      COALESCE(SUM(amount) FILTER (WHERE current_status = 'approved'), 0) AS amount
    FROM invoices i
    WHERE i.created_at >= NOW() - $1::interval
      AND i.workspace_id = $2
    GROUP BY DATE_TRUNC('month', i.created_at)
    ORDER BY month_date ASC
  `, [interval, workspaceId]);

  const statusDist = await pool.query(`
    SELECT current_status AS status, COUNT(*) AS count
    FROM invoices i
    WHERE i.created_at >= NOW() - $1::interval
      AND i.workspace_id = $2
    GROUP BY current_status
  `, [interval, workspaceId]);

  const topVendors = await pool.query(`
    SELECT
      COALESCE(vendor_name, 'Unknown') AS vendor,
      COUNT(*)                         AS count,
      COALESCE(SUM(amount), 0)         AS total_amount
    FROM invoices i
    WHERE i.created_at >= NOW() - $1::interval
      AND i.workspace_id = $2
      AND vendor_name IS NOT NULL
    GROUP BY vendor_name
    ORDER BY total_amount DESC
    LIMIT 5
  `, [interval, workspaceId]);

  const members = await pool.query(`
    SELECT COUNT(*) AS total_members
    FROM memberships
    WHERE workspace_id = $1
  `, [workspaceId]);

  const employeeLeaderboard = await pool.query(`
    SELECT
      u.name,
      COUNT(*)                   AS count,
      COALESCE(SUM(i.amount), 0) AS total_amount
    FROM invoices i
    JOIN users u ON u.id = i.created_by
    WHERE i.created_at >= NOW() - $1::interval
      AND i.workspace_id = $2
    GROUP BY u.id, u.name
    ORDER BY count DESC
    LIMIT 8
  `, [interval, workspaceId]);

  return {
    summary: summary.rows[0],
    monthly_trend: monthly.rows,
    status_distribution: statusDist.rows,
    top_vendors: topVendors.rows,
    total_members: members.rows[0].total_members,
    employee_leaderboard: employeeLeaderboard.rows,
  };
}

async function getWorkspaceHistory(workspace_id, { page = 1, limit = 30, status } = {}) {
  const offset = (page - 1) * limit;
  const conditions = ['i.workspace_id = $1'];
  const params = [workspace_id];

  if (status) {
    params.push(status);
    conditions.push(`sh.status = $${params.length}`);
  }

  const where = conditions.join(' AND ');

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT sh.id, sh.status, sh.changed_at, sh.comment,
              u.name  AS changed_by_name,
              i.id    AS invoice_id,
              i.invoice_number,
              i.vendor_name
       FROM status_history sh
       JOIN invoices i ON i.id = sh.invoice_id
       LEFT JOIN users u ON u.id = sh.changed_by
       WHERE ${where}
       ORDER BY sh.changed_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM status_history sh
       JOIN invoices i ON i.id = sh.invoice_id
       WHERE ${where}`,
      params
    ),
  ]);

  return {
    history: rows.rows,
    total: parseInt(count.rows[0].count),
    page,
    limit,
  };
}

module.exports = {
  createInvoice,
  getInvoiceById,
  updateInvoiceStatus,
  getStatusHistory,
  getWorkspaceHistory,
  searchInvoices,
  getAllInvoices,
  updateInvoice,
  deleteInvoice,
  getDashboardStats,
  getReportsData,
};