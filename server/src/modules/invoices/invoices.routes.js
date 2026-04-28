// invoices.routes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeInWorkspace } = require('../../middlewares/auth.middleware');
const {
  createInvoice,
  getInvoice,
  searchInvoices,
  updateInvoiceStatus,
  getStatusHistory,
  updateInvoice,
  deleteInvoice,
} = require('./invoices.controller.js');
const ocrController = require('../ocr/ocr.controller.js');

router.use(authenticate);
router.use(authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee', 'Personal'));

// ── All members ───────────────────────────────────────────────
router.post('/',                  createInvoice);
router.get('/',                   searchInvoices);
router.get('/:invoice_id',        getInvoice);
router.get('/:invoice_id/history', getStatusHistory);

// ── Director / Accountant and above ──────────────────────────
router.put('/:invoice_id',
  authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee'),
  updateInvoice
);
router.patch('/:invoice_id/status',
  authorizeInWorkspace('Admin', 'Director', 'Accountant'),
  updateInvoiceStatus
);

// ── Director and above only ───────────────────────────────────
router.delete('/:invoice_id',
  authorizeInWorkspace('Admin', 'Director'),
  deleteInvoice
);

// ── OCR ───────────────────────────────────────────────────────
router.get('/:invoice_id/fields',
  authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee'),
  ocrController.getExtractedFields
);
router.patch('/:invoice_id/fields',
  authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee'),
  ocrController.updateExtractedFields
);
router.post('/:invoice_id/ocr',
  authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee'),
  ocrController.triggerOCR
);

module.exports = router;