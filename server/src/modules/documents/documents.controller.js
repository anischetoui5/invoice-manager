const documentsService = require('./documents.service');
const invoicesService = require('../invoices/invoices.service');
const ocrService = require('../ocr/ocr.service');
const path = require('path');

async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { invoice_id, workspace_id } = req.params;
    const uploaded_by = req.user.id; // ← .id

    await invoicesService.getInvoiceById(invoice_id, workspace_id);

    const document = await documentsService.attachDocument({
      invoice_id,
      file_name: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      storage_path: req.file.path,
      uploaded_by,
      is_primary: req.body.is_primary === 'true' || req.body.is_primary === true,
    });

    res.status(201).json({ message: 'Document uploaded successfully', document });

    // Auto-trigger OCR after response is sent
    try {
      const absolutePath = path.join(__dirname, '../../../', req.file.path);
      ocrService.processInvoice(invoice_id, absolutePath, req.file.mimetype)
        .then(() => console.log(`OCR completed for invoice ${invoice_id}`))
        .catch((err) => console.error('OCR error:', err.message));
    } catch (ocrErr) {
      console.error('OCR setup error:', ocrErr.message);
    }

  } catch (err) {
    console.error('uploadDocument error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

async function getDocuments(req, res) {
  try {
    const { invoice_id } = req.params;
    const documents = await documentsService.getDocumentsByInvoice(invoice_id);
    res.status(200).json({ documents });
  } catch (err) {
    console.error('getDocuments error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

async function downloadDocument(req, res) {
  try {
    const docId = req.params.id || req.params.document_id;
    const doc = await documentsService.getDocumentById(docId);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Build absolute path
    const absolutePath = path.join(__dirname, '../../../', doc.storage_path);

    const fs = require('fs');
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set correct content type
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);

    // Stream the file
    const stream = fs.createReadStream(absolutePath);
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err.message);
      res.status(500).json({ error: 'Failed to stream file' });
    });

  } catch (err) {
    console.error('downloadDocument error:', err.message);
    res.status(404).json({ error: err.message });
  }
}

async function deleteDocument(req, res) {
  try {
    const { document_id } = req.params;
    const userId = req.user.id;  // ← pass user info for ownership check
    const role = req.role;       // ← from authorizeInWorkspace

    await documentsService.deleteDocument(document_id, userId, role);
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('deleteDocument error:', err.message);
    const status = err.message.includes('not found') ? 404
      : err.message.includes('permission') ? 403
      : 400;
    res.status(status).json({ error: err.message });
  }
}

module.exports = {
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument,
};