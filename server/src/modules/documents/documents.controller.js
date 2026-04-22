const documentsService = require('./documents.service');
const invoicesService = require('../invoices/invoices.service');
const path = require('path');

async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { invoice_id, workspace_id } = req.params;
    const uploaded_by = req.user.id;

    // Verify invoice belongs to this workspace
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
    const { document_id } = req.params;
    const doc = await documentsService.getDocumentById(document_id);

    res.download(doc.storage_path, doc.file_name);
  } catch (err) {
    console.error('downloadDocument error:', err.message);
    res.status(404).json({ error: err.message });
  }
}

async function deleteDocument(req, res) {
  try {
    const { document_id } = req.params;
    await documentsService.deleteDocument(document_id);
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('deleteDocument error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

/*
async function getInvoiceDetail(req, res) {
  try {
    const { invoice_id } = req.params;
    const invoice = await documentsService.getInvoiceFullDetails(invoice_id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.status(200).json(invoice);
  } catch (err) {
    console.error('getInvoiceDetail error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
*/

module.exports = {
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument,
  //getInvoiceDetail,
};