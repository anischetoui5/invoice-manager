const db = require('../../config/db');
const fs = require('fs');
const path = require('path');

async function attachDocument({ invoice_id, file_name, mime_type, file_size, storage_path, uploaded_by, is_primary = true }) {
  // If this is marked primary, demote any existing primary document first
  if (is_primary) {
    await db.query(
      `UPDATE documents SET is_primary = FALSE WHERE invoice_id = $1`,
      [invoice_id]
    );
  }

  const result = await db.query(
    `INSERT INTO documents (invoice_id, file_name, mime_type, file_size, storage_path, is_primary, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [invoice_id, file_name, mime_type, file_size, storage_path, is_primary, uploaded_by]
  );

  return result.rows[0];
}

async function getDocumentsByInvoice(invoice_id) {
  const result = await db.query(
    `SELECT d.*, u.name AS uploaded_by_name
     FROM documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.invoice_id = $1
     ORDER BY d.is_primary DESC, d.uploaded_at ASC`,
    [invoice_id]
  );
  return result.rows;
}

async function getDocumentById(document_id) {
  const result = await db.query(
    `SELECT * FROM documents WHERE id = $1`,
    [document_id]
  );
  if (result.rows.length === 0) throw new Error('Document not found');
  return result.rows[0];
}

async function deleteDocument(document_id) {
  const doc = await getDocumentById(document_id);

  // Delete the physical file from disk
  if (fs.existsSync(doc.storage_path)) {
    fs.unlinkSync(doc.storage_path);
  }

  await db.query(`DELETE FROM documents WHERE id = $1`, [document_id]);
}

/*
async function getInvoiceFullDetails(invoice_id) {
  const query = `
    SELECT 
      i.*,
      u.name as employee_name,
      d.storage_path as document_url,
      d.mime_type,
      o.extracted_text,
      o.extracted_amount,
      o.confidence
    FROM invoices i
    LEFT JOIN users u ON i.created_by = u.id
    LEFT JOIN documents d ON i.id = d.invoice_id AND d.is_primary = TRUE
    LEFT JOIN ocr_data o ON i.id = o.invoice_id
    WHERE i.id = $1
  `;
  
  const result = await db.query(query, [invoice_id]);
  return result.rows[0];
}
*/

module.exports = {
  attachDocument,
  getDocumentsByInvoice,
  getDocumentById,
  deleteDocument,
  //getInvoiceFullDetails,
};