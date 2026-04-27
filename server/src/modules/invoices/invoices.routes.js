const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate } = require('../../middlewares/auth.middleware');
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

router.post('/',                                    createInvoice);
router.get('/',                                     searchInvoices);
router.get('/:invoice_id',                          getInvoice);
router.put('/:invoice_id',                          updateInvoice);
router.patch('/:invoice_id/status',                 updateInvoiceStatus);
router.get('/:invoice_id/history',                  getStatusHistory);
router.delete('/:invoice_id',                       deleteInvoice);
router.get('/:invoice_id/fields',                   ocrController.getExtractedFields);
router.patch('/:invoice_id/fields/:fieldName',      ocrController.updateField);
router.post('/:invoice_id/ocr',                     ocrController.triggerOCR);

module.exports = router;