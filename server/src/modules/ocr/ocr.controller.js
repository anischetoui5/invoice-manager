const ocrService = require('./ocr.service');
const pool = require('../../config/db');

/**
 * Trigger OCR processing for an invoice
 */
const triggerOCR = async (req, res) => {
  const { invoiceId } = req.params;

  try {
    // Get invoice document using correct column names
    const result = await pool.query(
      `SELECT i.*, d.storage_path, d.mime_type 
       FROM invoices i
       LEFT JOIN documents d ON d.invoice_id = i.id
       WHERE i.id = $1
       LIMIT 1`,
      [invoiceId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    if (!invoice.storage_path) {
      return res.status(400).json({ error: 'No document attached to this invoice' });
    }

    // Build absolute path
    const path = require('path');
    const absolutePath = path.join(
      __dirname,
      '../../../',
      invoice.storage_path
    );

    // Run OCR asynchronously
    ocrService.processInvoice(invoiceId, absolutePath, invoice.mime_type)
      .catch((err) => console.error('OCR processing error:', err));

    res.status(202).json({
      message: 'OCR processing started',
      invoiceId,
      status: 'processing',
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get extracted fields for an invoice
 */
const getExtractedFields = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const fields = await ocrService.getExtractedFields(invoiceId);
    res.status(200).json({ fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update a field (accountant correction)
 */
const updateField = async (req, res) => {
  const { invoiceId, fieldName } = req.params;
  const { value } = req.body;

  try {
    const field = await ocrService.updateExtractedField(
      invoiceId,
      fieldName,
      value,
      req.user.userId
    );
    res.status(200).json({ message: 'Field updated', field });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Approve invoice after validation
 */
const approveInvoice = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    await pool.query(
      `UPDATE invoices 
       SET status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE id = $2`,
      [req.user.userId, invoiceId]
    );
    res.status(200).json({ message: 'Invoice approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Reject invoice
 */
const rejectInvoice = async (req, res) => {
  const { invoiceId } = req.params;
  const { reason } = req.body;
  try {
    await pool.query(
      `UPDATE invoices 
       SET status = 'rejected', rejection_reason = $1, rejected_by = $2, rejected_at = NOW()
       WHERE id = $3`,
      [reason || 'No reason provided', req.user.userId, invoiceId]
    );
    res.status(200).json({ message: 'Invoice rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { triggerOCR, getExtractedFields, updateField, approveInvoice, rejectInvoice };