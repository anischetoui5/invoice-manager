const db = require('../../config/db');

async function createInvoice({ workspace_id, created_by, invoice_number, vendor_name, amount, currency, invoice_date, due_date, notes }) {
  const client = await db.connect();
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
  const result = await db.query(
    `SELECT * FROM invoices WHERE id = $1 AND workspace_id = $2`,
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

  const result = await db.query(
    `SELECT i.*, u.name AS created_by_name
     FROM invoices i
     LEFT JOIN users u ON u.id = i.created_by
     WHERE ${where}
     ORDER BY i.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  const countResult = await db.query(
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
  const client = await db.connect();
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
  const result = await db.query(
    `SELECT sh.*, u.name AS changed_by_name
     FROM status_history sh
     LEFT JOIN users u ON u.id = sh.changed_by
     WHERE sh.invoice_id = $1
     ORDER BY sh.changed_at ASC`,
    [invoice_id]
  );
  return result.rows;
}

async function deleteDraftInvoice(invoice_id, workspace_id) {
  const check = await db.query(
    `SELECT current_status FROM invoices WHERE id = $1 AND workspace_id = $2`,
    [invoice_id, workspace_id]
  );
  if (check.rows.length === 0) throw new Error('Invoice not found');
  if (check.rows[0].current_status !== 'draft') {
    throw new Error('Only draft invoices can be deleted');
  }
  await db.query(`DELETE FROM invoices WHERE id = $1`, [invoice_id]);
}

async function getAllInvoices({ status, vendor_name, page = 1, limit = 20 }) {
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const result = await db.query(
    `SELECT i.*, u.name AS created_by_name, w.name AS workspace_name, c.name AS company_name
     FROM invoices i
     LEFT JOIN users u ON u.id = i.created_by
     LEFT JOIN workspaces w ON w.id = i.workspace_id
     LEFT JOIN companies c ON c.workspace_id = i.workspace_id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  const countResult = await db.query(
    `SELECT COUNT(*) FROM invoices i ${where}`,
    values
  );

  return {
    invoices: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}

module.exports = {
  createInvoice,
  getInvoiceById,
  updateInvoiceStatus,
  getStatusHistory,
  deleteDraftInvoice,
  searchInvoices,
  getAllInvoices,
};