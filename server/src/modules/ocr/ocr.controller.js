const ocrService = require('./ocr.service');
const pool = require('../../config/db');
const path = require('path');

const triggerOCR = async (req, res) => {
  const { invoice_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT i.*, d.storage_path, d.mime_type 
       FROM invoices i
       LEFT JOIN documents d ON d.invoice_id = i.id
       WHERE i.id = $1
       LIMIT 1`,
      [invoice_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    if (!invoice.storage_path) {
      return res.status(400).json({ error: 'No document attached to this invoice' });
    }

    const absolutePath = path.join(
      __dirname,
      '../../../',
      invoice.storage_path
    );

    // Run OCR asynchronously — don't await
    ocrService.processInvoice(invoice_id, absolutePath, invoice.mime_type)
      .catch((err) => console.error('OCR processing error:', err));

    res.status(202).json({
      message: 'OCR processing started',
      invoiceId: invoice_id,
      status: 'processing',
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getExtractedFields = async (req, res) => {
  const { invoice_id } = req.params;
  try {
    const fields = await ocrService.getExtractedFields(invoice_id);
    res.status(200).json({ fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateExtractedFields = async (req, res) => {
  const { invoice_id } = req.params; // ← fixed from invoiceId
  const { fields } = req.body;

  if (!fields || typeof fields !== 'object') {
    return res.status(400).json({ error: 'fields object is required' });
  }

  try {
    await ocrService.updateExtractedFields(invoice_id, fields, req.user.userId);
    res.status(200).json({ message: 'Fields updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  triggerOCR,
  getExtractedFields,
  updateExtractedFields,
};