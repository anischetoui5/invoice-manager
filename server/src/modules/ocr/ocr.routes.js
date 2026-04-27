const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  triggerOCR,
  getExtractedFields,
  updateField,
} = require('./ocr.controller.js');

router.use(authenticate);

router.post('/invoices/:invoiceId/ocr', triggerOCR);
router.get('/invoices/:invoiceId/fields', getExtractedFields);
router.patch('/invoices/:invoiceId/fields/:fieldName', updateField);

module.exports = router;