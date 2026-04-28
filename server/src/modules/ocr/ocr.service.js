const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pool = require('../../config/db');

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

<<<<<<< HEAD
  console.log('OCR RAW TEXT:', text); // temporary debug

  // Invoice number — US-001, INV-001, #12345
  const invoiceNumberMatch = text.match(
    /(?:invoice\s*#|invoice\s*no|invoice\s*number|inv\s*#)[\s:]*([A-Z0-9][-A-Z0-9/]*)/i
=======
  const invoiceNumberMatch = text.match(
    /(?:invoice\s*(?:no|number|num|#|n°)[\s.:]*)([\w][\w\-\/\.]{2,20})/i
>>>>>>> 887a2d6c0c465be16fdf48a8e8887723a296a338
  );
  fields.invoice_number = {
    value: invoiceNumberMatch ? invoiceNumberMatch[1].trim() : null,
    confidence: invoiceNumberMatch ? Math.min(ocrConfidence, 90) : 20,
  };

<<<<<<< HEAD
  // Date — DD/MM/YYYY or MM/DD/YYYY
  const dateMatch = text.match(
    /(?:invoice\s*date|date)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
=======
  const dateMatch = text.match(
    /(?:date[\s.:]*)?(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4}|\d{4}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,]+\d{1,2}[\s.,]+\d{4})/i
>>>>>>> 887a2d6c0c465be16fdf48a8e8887723a296a338
  );
  fields.invoice_date = {
    value: dateMatch ? dateMatch[1].trim() : null,
    confidence: dateMatch ? Math.min(ocrConfidence, 85) : 20,
  };

<<<<<<< HEAD
  // Total amount — TOTAL $154.06
  const totalMatch = text.match(
    /\bTOTAL\b[\s$€£DT]*([0-9,]+\.?[0-9]{0,2})/i
=======
  const totalMatch = text.match(
    /(?:total\s*(?:amount|due|ttc|net|price|à\s*payer)?[\s.:]*)([\d\s,]+\.?\d{0,3})\s*(?:EUR|USD|TND|DT|€|\$|dt)?/i
>>>>>>> 887a2d6c0c465be16fdf48a8e8887723a296a338
  );
  fields.total_amount = {
    value: totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : null,
    confidence: totalMatch ? Math.min(ocrConfidence, 88) : 20,
  };

<<<<<<< HEAD
  // Tax — Sales Tax / VAT / TVA
  const taxMatch = text.match(
    /(?:sales\s*tax|tax|tva|vat)[^0-9$]*[$€£]?\s*([0-9,]+\.?[0-9]{0,2})/i
=======
  const taxMatch = text.match(
    /(?:(?:tax|tva|vat|t\.v\.a)[\s.:]*(?:\d{1,2}%)?[\s.:]*)([\d\s,]+\.?\d{0,3})\s*(?:EUR|USD|TND|DT|€|\$)?/i
>>>>>>> 887a2d6c0c465be16fdf48a8e8887723a296a338
  );
  fields.tax_amount = {
    value: taxMatch ? parseFloat(taxMatch[1].replace(/,/g, '')) : null,
    confidence: taxMatch ? Math.min(ocrConfidence, 80) : 20,
  };

<<<<<<< HEAD
  // Supplier — first bold/capitalized company name
  const supplierMatch = text.match(
    /(?:from|supplier|vendor|issued\s*by|company|bill\s*from)[\s:]*([A-Z][A-Za-z0-9\s&.,]+(?:Inc|LLC|Ltd|Corp|Co)?\.?)/i
  ) || text.match(
    /^([A-Z][A-Za-z0-9\s&.]+(?:Inc|LLC|Ltd|Corp|Co)\.?)/m
  );
=======
  const supplierMatch = text.match(
    /(?:(?:from|supplier|vendor|fournisseur|société|company|raison\s*sociale|issued\s*by)[\s.:]+)([A-ZÀ-Ü][^\n]{2,60})/i
  ) || text.match(/^([A-ZÀ-Ü][A-Za-zÀ-ü\s&,.-]{5,50})\n/m);
>>>>>>> 887a2d6c0c465be16fdf48a8e8887723a296a338
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


const getExtractedFields = async (invoiceId) => {
  const { rows } = await pool.query(
    `SELECT * FROM extracted_fields WHERE invoice_id = $1 ORDER BY field_name`,
    [invoiceId]
  );
  return rows;
};

const updateExtractedFields = async (invoiceId, fieldsObj, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const queries = Object.entries(fieldsObj).map(([fieldName, value]) => {
      return client.query(
        `UPDATE extracted_fields 
         SET field_value = $1, 
             manually_corrected = true, 
             corrected_by = $2, 
             needs_review = false,
             updated_at = NOW()
         WHERE invoice_id = $3 AND field_name = $4`,
        [value, userId, invoiceId, fieldName]
      );
    });
    const results = await Promise.all(queries);
    await client.query('COMMIT');
    return results;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

module.exports = {
  processInvoice,
  getExtractedFields,
  updateExtractedFields,
};