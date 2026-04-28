const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  triggerOCR,
  getExtractedFields,
  updateExtractedFields,
} = require('./ocr.controller');

router.use(authenticate);

router.post('/invoices/:invoiceId/ocr', triggerOCR);
router.get('/invoices/:invoiceId/fields', getExtractedFields);
router.patch('/invoices/:invoiceId/fields', updateExtractedFields);

module.exports = router;