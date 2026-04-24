const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createInvoice,
  getInvoice,
  searchInvoices,
  updateInvoiceStatus,
  getStatusHistory,
  deleteDraftInvoice,
  updateInvoice,
} = require('./invoices.controller');

router.use(authenticate);

router.post('/',                        createInvoice);
router.get('/',                         searchInvoices);
router.get('/:invoice_id',              getInvoice);
router.put('/:invoice_id',              updateInvoice);
router.patch('/:invoice_id/status',     updateInvoiceStatus);
router.get('/:invoice_id/history',      getStatusHistory);
router.delete('/:invoice_id',           deleteDraftInvoice);

module.exports = router;