const ocrService = require('./ocr.service');
const pool = require('../../config/db');

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

    const path = require('path');
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

const updateField = async (req, res) => {
  const { invoice_id, fieldName } = req.params;
  const { value } = req.body;
  try {
    const field = await ocrService.updateExtractedField(
      invoice_id,
      fieldName,
      value,
      req.user.userId
    );
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    res.status(200).json({ message: 'Field updated', field });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { triggerOCR, getExtractedFields, updateField };