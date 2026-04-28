const pool = require('../../config/db');

async function createInvoice({ workspace_id, created_by, invoice_number, vendor_name, amount, currency, invoice_date, due_date, notes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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

    await client.query(
      `UPDATE invoices SET current_status = $1 WHERE id = $2`,
      [status, invoice_id]
    );

    await client.query(
      `INSERT INTO status_history (invoice_id, status, changed_by, comment)
       VALUES ($1, $2, $3, $4)`,
      [invoice_id, status, changed_by, comment]
    );

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
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

module.exports = {
  createInvoice,
  getInvoiceById,
  updateInvoiceStatus,
  getStatusHistory,
  searchInvoices,
  getAllInvoices,
  updateInvoice,
  deleteInvoice,
};