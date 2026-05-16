const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pool = require('../../config/db');

// ── Image preprocessing ────────────────────────────────────────────────────
const preprocessImage = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .grayscale()
    .normalize()
    .sharpen()
    .resize({ width: 2400, withoutEnlargement: false })
    .median(1)
    .gamma(1.4)
    .toFile(outputPath);
  return outputPath;
};

// ── OCR extraction ─────────────────────────────────────────────────────────
const extractTextFromImage = async (imagePath) => {
  const { data } = await Tesseract.recognize(imagePath, 'eng+fra', {
    logger: () => {},
  });
  return {
    text: data.text,
    confidence: data.confidence,
    words: data.words,
  };
};

// ── Normalize date to YYYY-MM-DD ───────────────────────────────────────────
const normalizeDate = (dateStr) => {
  if (!dateStr) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = dateStr.match(/^(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  // YYYY/MM/DD
  const ymd = dateStr.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;

  // Month name formats: "Jan 01 2024" or "01 January 2024"
  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const named = dateStr.match(/(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{4})/);
  if (named) {
    const month = months[named[2].toLowerCase().slice(0, 3)];
    if (month) return `${named[3]}-${month}-${named[1].padStart(2, '0')}`;
  }
  const namedRev = dateStr.match(/([a-zA-Z]{3,})\s+(\d{1,2}),?\s+(\d{4})/);
  if (namedRev) {
    const month = months[namedRev[1].toLowerCase().slice(0, 3)];
    if (month) return `${namedRev[3]}-${month}-${namedRev[2].padStart(2, '0')}`;
  }

  return dateStr; // return as-is if can't parse
};

// ── Clean amount string to float ───────────────────────────────────────────
const parseAmount = (str) => {
  if (!str) return null;
  let cleaned = str.replace(/[\s\$€£TNDT]/g, '').trim();

  const dotCount   = (cleaned.match(/\./g)  || []).length;
  const commaCount = (cleaned.match(/,/g)   || []).length;

  if (dotCount > 1) {
    // e.g. "1.133.120" — dots are thousands separators
    cleaned = cleaned.replace(/\./g, '');
  } else if (commaCount > 1) {
    // e.g. "1,133,120" — commas are thousands separators
    cleaned = cleaned.replace(/,/g, '');
  } else if (dotCount === 1 && commaCount === 1) {
    // mixed: "1.133,50" or "1,133.50" — last separator is decimal
    const lastDot   = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma > lastDot) {
      // comma is decimal: "1.133,50" → "1133.50"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // dot is decimal: "1,133.50" → "1133.50"
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (commaCount === 1) {
    // single comma as decimal: "1133,50" → "1133.50"
    cleaned = cleaned.replace(',', '.');
  }
  // single dot or no separator — pass through

  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
};

// ── Field extraction ───────────────────────────────────────────────────────
const parseInvoiceFields = (text, ocrConfidence) => {
  const fields = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // ── Invoice Number ────────────────────────────────────────────────────────
  const invoiceNumberPatterns = [
    /(?:invoice\s*(?:#|no\.?|number|num\.?|n°))\s*[:\-]?\s*([A-Z0-9][-A-Z0-9\/\.]{2,20})/i,
    /(?:facture\s*(?:n°|no|num))\s*[:\-]?\s*([A-Z0-9][-A-Z0-9\/\.]{2,20})/i,
    /(?:ref(?:erence)?)\s*[:\-]?\s*([A-Z0-9][-A-Z0-9\/\.]{2,20})/i,
    /\b(INV[-\/]?\d{4,})\b/i,
    /\b(F[-\/]?\d{4,})\b/i,
  ];

  let invoiceNumberMatch = null;
  for (const pattern of invoiceNumberPatterns) {
    invoiceNumberMatch = text.match(pattern);
    if (invoiceNumberMatch) break;
  }

  fields.invoice_number = {
    value: invoiceNumberMatch ? invoiceNumberMatch[1].trim().toUpperCase() : null,
    confidence: invoiceNumberMatch ? Math.min(ocrConfidence, 92) : 15,
  };

  // ── Invoice Date ──────────────────────────────────────────────────────────
  const datePatterns = [
    /(?:invoice\s*date|date\s*(?:of\s*)?invoice|date\s*facturation)\s*[:\-]?\s*(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})/i,
    /(?:^|\s)date\s*[:\-]?\s*(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})/im,
    /(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{4})/,
    /(\d{4}[\-\/]\d{2}[\-\/]\d{2})/,
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
  ];

  let dateMatch = null;
  for (const pattern of datePatterns) {
    dateMatch = text.match(pattern);
    if (dateMatch) break;
  }

  const rawDate = dateMatch ? dateMatch[1].trim() : null;
  fields.invoice_date = {
    value: rawDate ? normalizeDate(rawDate) : null,
    confidence: dateMatch ? Math.min(ocrConfidence, 85) : 15,
  };

  // ── Due Date ──────────────────────────────────────────────────────────────
  const dueDatePatterns = [
    /(?:due\s*date|payment\s*due|échéance|date\s*(?:d[''])?échéance)\s*[:\-]?\s*(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})/i,
    /(?:pay(?:able)?\s*by|payable\s*before)\s*[:\-]?\s*(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})/i,
  ];

  let dueDateMatch = null;
  for (const pattern of dueDatePatterns) {
    dueDateMatch = text.match(pattern);
    if (dueDateMatch) break;
  }

  fields.due_date = {
    value: dueDateMatch ? normalizeDate(dueDateMatch[1].trim()) : null,
    confidence: dueDateMatch ? Math.min(ocrConfidence, 82) : 10,
  };

  // ── Total Amount ──────────────────────────────────────────────────────────
  const subtotalMatch = text.match(
    /sub\s*total\s*[:\-]?\s*[\$€£]?\s*([\d\s,\.]+)/i
  );
  const subtotalValue = subtotalMatch ? parseAmount(subtotalMatch[1]) : null;

  const allTotalMatches = [...text.matchAll(
    /(?<![a-zA-Z])(?:total\s*(?:amount|due|ttc|net|price|général|general|à\s*payer|payable)?)\s*[:\-]?\s*[\$€£]?\s*([\d\s,\.]+)\s*(?:EUR|USD|TND|DT|€|\$|dt)?/gi
  )];

  let totalValue = null;
  let totalConfidence = 15;

  if (allTotalMatches.length > 0) {
    // Prefer last match (grand total is usually at bottom)
    for (let i = allTotalMatches.length - 1; i >= 0; i--) {
      const candidate = parseAmount(allTotalMatches[i][1]);
      // Skip if it equals subtotal (unless it's the only match)
      if (subtotalValue && candidate === subtotalValue && allTotalMatches.length > 1) continue;
      // Skip zero or null
      if (!candidate || candidate === 0) continue;
      totalValue = candidate;
      totalConfidence = Math.min(ocrConfidence, 88);
      break;
    }
    // Fallback to last match if nothing else matched
    if (totalValue === null) {
      totalValue = parseAmount(allTotalMatches[allTotalMatches.length - 1][1]);
      totalConfidence = Math.min(ocrConfidence, 60);
    }
  }

  fields.total_amount = {
    value: totalValue,
    confidence: totalConfidence,
  };

  // ── Tax Amount ────────────────────────────────────────────────────────────
  const taxPatterns = [
    /(?:tax|tva|vat|t\.v\.a)\s*(?:\d{1,2}\s*%\s*)?[:\-]?\s*[\$€£]?\s*([\d\s,\.]+)/i,
    /(?:taxe|impôt)\s*[:\-]?\s*[\$€£]?\s*([\d\s,\.]+)/i,
  ];

  let taxMatch = null;
  for (const pattern of taxPatterns) {
    taxMatch = text.match(pattern);
    if (taxMatch) break;
  }

  fields.tax_amount = {
    value: taxMatch ? parseAmount(taxMatch[1]) : null,
    confidence: taxMatch ? Math.min(ocrConfidence, 80) : 15,
  };

  // ── Supplier Name ─────────────────────────────────────────────────────────
  const supplierPatterns = [
    /(?:from|supplier|vendor|fournisseur|société|company|raison\s*sociale|issued\s*by|bill(?:ed)?\s*from)\s*[:\-]?\s*([A-ZÀ-Ü][^\n]{2,60})/i,
    /(?:^|\n)([A-ZÀ-Ü][A-Za-zÀ-ü\s&,.\-']{4,50}(?:LLC|Ltd|Inc|SAS|SARL|SA|Corp)?)\s*\n/m,
  ];

  let supplierMatch = null;
  for (const pattern of supplierPatterns) {
    supplierMatch = text.match(pattern);
    if (supplierMatch) break;
  }

  // Fallback: first meaningful capitalized line
  if (!supplierMatch) {
    for (const line of lines.slice(0, 8)) {
      if (line.length > 3 && line.length < 60 && /^[A-ZÀ-Ü]/.test(line) && !/^\d/.test(line)) {
        supplierMatch = [null, line];
        break;
      }
    }
  }

  fields.supplier_name = {
    value: supplierMatch ? supplierMatch[1].trim() : null,
    confidence: supplierMatch ? Math.min(ocrConfidence, 75) : 15,
  };

  return fields;
};

// ── Main OCR processor ─────────────────────────────────────────────────────
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
    console.log('OCR PARSED FIELDS:', JSON.stringify(fields, null, 2));

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

    const avgConfidence = allConfidences.length > 0
      ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
      : 0;

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

// ── Field getters/updaters ─────────────────────────────────────────────────
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
    await Promise.all(queries);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const getInvoiceWithDocument = async (invoice_id) => {
  const result = await pool.query(
    `SELECT i.*, d.storage_path, d.mime_type
     FROM invoices i
     LEFT JOIN documents d ON d.invoice_id = i.id
     WHERE i.id = $1
     ORDER BY d.created_at DESC
     LIMIT 1`,
    [invoice_id]
  );
  return result.rows[0] || null;
};

module.exports = {
  processInvoice,
  getExtractedFields,
  updateExtractedFields,
  getInvoiceWithDocument,
};