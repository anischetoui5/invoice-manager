const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const { authenticate, authorizeInWorkspace } = require('../../middlewares/auth.middleware');
const {
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument,
} = require('./documents.controller');

// ── Multer configuration ──────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
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

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
}

// ── Routes ────────────────────────────────────────────────────
router.use(authenticate);
router.use(authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee', 'Personal'));

// all members can view and download documents
router.get('/',                     getDocuments);
router.get('/:id/download', downloadDocument);

// all members can upload (they upload to their own invoices)
router.post('/',
  upload.single('file'),
  handleMulterError,
  uploadDocument
);

// only Director and above can delete documents
router.delete('/:id',
  authorizeInWorkspace('Admin', 'Director', 'Employee', 'Personal'),
  deleteDocument
);

module.exports = router;