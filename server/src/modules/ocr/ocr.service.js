const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pool = require('../../config/db');

/**
 * Preprocess image for better OCR accuracy
 * - Convert to grayscale
 * - Increase contrast
 * - Remove noise
 */
const preprocessImage = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .grayscale()
    .normalize()
    .sharpen()
    .toFile(outputPath);
  return outputPath;
};

/**
 * Extract text from image using Tesseract
 */
const extractTextFromImage = async (imagePath) => {
  const { data } = await Tesseract.recognize(imagePath, 'eng', {
    logger: () => {},
  });
  return {
    text: data.text,
    confidence: data.confidence,
  };
};

/**
 * Parse key invoice fields from raw OCR text
 * Returns each field with a confidence score
 */
const parseInvoiceFields = (text, ocrConfidence) => {
  const fields = {};

  console.log('OCR RAW TEXT:', text); // temporary debug

  // Invoice number — US-001, INV-001, #12345
  const invoiceNumberMatch = text.match(
    /(?:invoice\s*#|invoice\s*no|invoice\s*number|inv\s*#)[\s:]*([A-Z0-9][-A-Z0-9/]*)/i
  );
  fields.invoice_number = {
    value: invoiceNumberMatch ? invoiceNumberMatch[1].trim() : null,
    confidence: invoiceNumberMatch ? Math.min(ocrConfidence, 90) : 20,
  };

  // Date — DD/MM/YYYY or MM/DD/YYYY
  const dateMatch = text.match(
    /(?:invoice\s*date|date)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  );
  fields.invoice_date = {
    value: dateMatch ? dateMatch[1].trim() : null,
    confidence: dateMatch ? Math.min(ocrConfidence, 85) : 20,
  };

  // Total amount — TOTAL $154.06
  const totalMatch = text.match(
    /\bTOTAL\b[\s$€£DT]*([0-9,]+\.?[0-9]{0,2})/i
  );
  fields.total_amount = {
    value: totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : null,
    confidence: totalMatch ? Math.min(ocrConfidence, 88) : 20,
  };

  // Tax — Sales Tax / VAT / TVA
  const taxMatch = text.match(
    /(?:sales\s*tax|tax|tva|vat)[^0-9$]*[$€£]?\s*([0-9,]+\.?[0-9]{0,2})/i
  );
  fields.tax_amount = {
    value: taxMatch ? parseFloat(taxMatch[1].replace(/,/g, '')) : null,
    confidence: taxMatch ? Math.min(ocrConfidence, 80) : 20,
  };

  // Supplier — first bold/capitalized company name
  const supplierMatch = text.match(
    /(?:from|supplier|vendor|issued\s*by|company|bill\s*from)[\s:]*([A-Z][A-Za-z0-9\s&.,]+(?:Inc|LLC|Ltd|Corp|Co)?\.?)/i
  ) || text.match(
    /^([A-Z][A-Za-z0-9\s&.]+(?:Inc|LLC|Ltd|Corp|Co)\.?)/m
  );
  fields.supplier_name = {
    value: supplierMatch ? supplierMatch[1].trim() : null,
    confidence: supplierMatch ? Math.min(ocrConfidence, 75) : 20,
  };

  return fields;
};

/**
 * Main OCR processing function
 * Called after invoice upload
 */
const processInvoice = async (invoiceId, filePath, fileType) => {
  let processedImagePath = null;

  try {
    // Update status to processing
    await pool.query(
      `UPDATE invoices SET ocr_status = 'processing' WHERE id = $1`,
      [invoiceId]
    );

    let imagePath = filePath;

    // If PDF, convert first page to image
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

    // Preprocess image
    const preprocessedPath = filePath.replace(/(\.[^.]+)$/, '_processed$1');
    await preprocessImage(imagePath, preprocessedPath);
    processedImagePath = preprocessedPath;

    // Run OCR
    const { text, confidence } = await extractTextFromImage(preprocessedPath);

    // Parse fields
    const fields = parseInvoiceFields(text, confidence);

    // Save extracted fields to DB
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

    // Calculate average confidence
    const allConfidences = Object.values(fields)
      .filter((f) => f.value !== null)
      .map((f) => f.confidence);

    const avgConfidence =
      allConfidences.length > 0
        ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
        : 0;

    const hasLowConfidence = Object.values(fields).some(
      (f) => f.value !== null && f.confidence < 70
    );

    // ✅ Fixed: use current_status instead of status
        await pool.query(
        `UPDATE invoices 
        SET ocr_status = 'completed', 
            ocr_confidence = $1,
            current_status = $2
        WHERE id = $3`,
        [
            avgConfidence,
            hasLowConfidence ? 'pending_review' : 'approved',
            invoiceId,
        ]
        );

    // Cleanup temp files
    if (processedImagePath && fs.existsSync(processedImagePath)) {
      fs.unlinkSync(processedImagePath);
    }

    console.log(`OCR completed for invoice ${invoiceId} — confidence: ${avgConfidence.toFixed(1)}%`);
    return { success: true, fields, confidence: avgConfidence };

  } catch (err) {
    // Mark as failed
    await pool.query(
      `UPDATE invoices SET ocr_status = 'failed' WHERE id = $1`,
      [invoiceId]
    );

    if (processedImagePath && fs.existsSync(processedImagePath)) {
      fs.unlinkSync(processedImagePath);
    }

    throw err;
  }
};

/**
 * Get extracted fields for an invoice
 */
const getExtractedFields = async (invoiceId) => {
  const { rows } = await pool.query(
    `SELECT * FROM extracted_fields WHERE invoice_id = $1 ORDER BY field_name`,
    [invoiceId]
  );
  return rows;
};

/**
 * Update a field manually (accountant correction)
 */
const updateExtractedField = async (invoiceId, fieldName, newValue, userId) => {
  const { rows } = await pool.query(
    `UPDATE extracted_fields 
     SET field_value = $1, 
         manually_corrected = true,
         corrected_by = $2,
         needs_review = false
     WHERE invoice_id = $3 AND field_name = $4
     RETURNING *`,
    [newValue, userId, invoiceId, fieldName]
  );
  return rows[0];
};

module.exports = {
  processInvoice,
  getExtractedFields,
  updateExtractedField,
};