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

const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const preprocessImage = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .grayscale()
    .normalize()
    .sharpen()
    .resize({ width: 2000, withoutEnlargement: false })
    .median(1)
    .gamma(1.5)
    .toFile(outputPath);
  return outputPath;
};

const extractTextFromImage = async (imagePath) => {
  const { data } = await Tesseract.recognize(imagePath, 'eng', {
    logger: () => {},
  });
  return {
    text: data.text,
    confidence: data.confidence,
  };
};

const parseInvoiceFields = (text, ocrConfidence) => {
  const fields = {};

  const invoiceNumberMatch = text.match(
    /(?:invoice\s*(?:no|number|num|#|n°)[\s.:]*)([\w][\w\-\/\.]{2,20})/i
  );
  fields.invoice_number = {
    value: invoiceNumberMatch ? invoiceNumberMatch[1].trim() : null,
    confidence: invoiceNumberMatch ? Math.min(ocrConfidence, 90) : 20,
  };

  const dateMatch = text.match(
    /(?:date[\s.:]*)?(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4}|\d{4}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,]+\d{1,2}[\s.,]+\d{4})/i
  );
  fields.invoice_date = {
    value: dateMatch ? dateMatch[1].trim() : null,
    confidence: dateMatch ? Math.min(ocrConfidence, 85) : 20,
  };

  const totalMatch = text.match(
    /(?:total\s*(?:amount|due|ttc|net|price|à\s*payer)?[\s.:]*)([\d\s,]+\.?\d{0,3})\s*(?:EUR|USD|TND|DT|€|\$|dt)?/i
  );
  fields.total_amount = {
    value: totalMatch ? parseFloat(totalMatch[1].replace(',', '')) : null,
    confidence: totalMatch ? Math.min(ocrConfidence, 88) : 20,
  };

  const taxMatch = text.match(
    /(?:(?:tax|tva|vat|t\.v\.a)[\s.:]*(?:\d{1,2}%)?[\s.:]*)([\d\s,]+\.?\d{0,3})\s*(?:EUR|USD|TND|DT|€|\$)?/i
  );
  fields.tax_amount = {
    value: taxMatch ? parseFloat(taxMatch[1].replace(',', '')) : null,
    confidence: taxMatch ? Math.min(ocrConfidence, 80) : 20,
  };

  const supplierMatch = text.match(
    /(?:(?:from|supplier|vendor|fournisseur|société|company|raison\s*sociale|issued\s*by)[\s.:]+)([A-ZÀ-Ü][^\n]{2,60})/i
  ) || text.match(/^([A-ZÀ-Ü][A-Za-zÀ-ü\s&,.-]{5,50})\n/m);
  fields.supplier_name = {
    value: supplierMatch ? supplierMatch[1].trim() : null,
    confidence: supplierMatch ? Math.min(ocrConfidence, 75) : 20,
  };

  return fields;
};

const processInvoice = async (invoiceId, filePath, fileType) => {
  let processedImagePath = null;

  try {
    await pool.query(
      `UPDATE invoices SET ocr_status = 'processing' WHERE id = $1`,
      [invoiceId]
    );

    let imagePath = filePath;

    if (fileType === 'application/pdf' || filePath.endsWith('.pdf')) {
      const pdfPoppler = require('pdf-poppler');
      const outputDir = path.dirname(filePath);
      const opts = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: `ocr_${invoiceId}`,
        page: 1,
      };
      await pdfPoppler.convert(filePath, opts);
      imagePath = path.join(outputDir, `ocr_${invoiceId}-1.png`);
      processedImagePath = imagePath;
    }

    const preprocessedPath = filePath.replace(/(\.[^.]+)$/, '_processed$1');
    await preprocessImage(imagePath, preprocessedPath);
    processedImagePath = preprocessedPath;

    const { text, confidence } = await extractTextFromImage(preprocessedPath);
    const fields = parseInvoiceFields(text, confidence);

    for (const [fieldName, fieldData] of Object.entries(fields)) {
      if (fieldData.value !== null) {
        await pool.query(
          `INSERT INTO extracted_fields 
           (invoice_id, field_name, field_value, confidence, needs_review)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (invoice_id, field_name) 
           DO UPDATE SET field_value = $3, confidence = $4, needs_review = $5`,
          [
            invoiceId,
            fieldName,
            String(fieldData.value),
            fieldData.confidence,
            fieldData.confidence < 70,
          ]
        );
      }
    }

    const allConfidences = Object.values(fields)
      .filter((f) => f.value !== null)
      .map((f) => f.confidence);

    const avgConfidence =
      allConfidences.length > 0
        ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
        : 0;

    // ✅ Only update OCR fields — never touch current_status
    // The invoice status flow is handled by the validation workflow
    await pool.query(
      `UPDATE invoices 
       SET ocr_status = 'completed', 
           ocr_confidence = $1
       WHERE id = $2`,
      [avgConfidence, invoiceId]
    );

    if (processedImagePath && fs.existsSync(processedImagePath)) {
      fs.unlinkSync(processedImagePath);
    }

    console.log(`OCR completed for invoice ${invoiceId} — confidence: ${avgConfidence.toFixed(1)}%`);
    return { success: true, fields, confidence: avgConfidence };

  } catch (err) {
    await pool.query(
      `UPDATE invoices SET ocr_status = 'failed' WHERE id = $1`,
      [invoiceId]
    );

    if (processedImagePath && fs.existsSync(processedImagePath)) {
      fs.unlinkSync(processedImagePath);
    }

    console.error('OCR error:', err.message);
    throw err;
  }
};

const updateExtractedFields = async (req, res) => {
  const { invoiceId } = req.params;
  const { fields } = req.body; // { "total_amount": 100, "vendor": "ACME" }

  try {
    const result = await ocrService.updateExtractedFields(
      invoiceId,
      fields,
      req.user.userId
    );
    res.status(200).json({ message: 'Updated', count: result.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  triggerOCR,
  processInvoice,
  getExtractedFields,
  updateExtractedFields,
};