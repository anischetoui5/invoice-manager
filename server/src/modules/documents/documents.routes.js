const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument,
} = require('./documents.controller');


// const documentsController = require('./documents.controller');

// ── Multer configuration ──────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, JPEG, PNG, TIFF`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Multer error handler
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

// ── Routes ────────────────────────────────────────────────────
router.use(authenticate);

// POST   /api/workspaces/:workspace_id/invoices/:invoice_id/documents         — upload file
router.post('/', upload.single('file'), handleMulterError, uploadDocument);

// GET    /api/workspaces/:workspace_id/invoices/:invoice_id/documents         — list documents
router.get('/', getDocuments);

// GET    /api/workspaces/:workspace_id/invoices/:invoice_id/documents/:document_id/download
router.get('/:document_id/download', downloadDocument);

// DELETE /api/workspaces/:workspace_id/invoices/:invoice_id/documents/:document_id
router.delete('/:document_id', deleteDocument);

// Get invoice : full details
// router.get('/invoice-detail/:invoice_id', documentsController.getInvoiceDetail);

module.exports = router;