const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  triggerOCR,
  getExtractedFields,
  updateField,
  approveInvoice,
  rejectInvoice,
} = require('./ocr.controller');

router.use(authenticate);

router.post('/invoices/:invoiceId/ocr', triggerOCR);
router.get('/invoices/:invoiceId/fields', getExtractedFields);
router.patch('/invoices/:invoiceId/fields/:fieldName', updateField);
router.post('/invoices/:invoiceId/approve', approveInvoice);
router.post('/invoices/:invoiceId/reject', rejectInvoice);

module.exports = router;