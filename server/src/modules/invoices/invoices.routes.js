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
} = require('./invoices.controller');

// All invoice routes require authentication
router.use(authenticate);

// POST   /api/workspaces/:workspace_id/invoices         — create invoice record
router.post('/', createInvoice);

// GET    /api/workspaces/:workspace_id/invoices         — list & search invoices
router.get('/', searchInvoices);

// GET    /api/workspaces/:workspace_id/invoices/:invoice_id        — get one invoice
router.get('/:invoice_id', getInvoice);

// PATCH  /api/workspaces/:workspace_id/invoices/:invoice_id/status — update status
router.patch('/:invoice_id/status', updateInvoiceStatus);

// GET    /api/workspaces/:workspace_id/invoices/:invoice_id/history — status history
router.get('/:invoice_id/history', getStatusHistory);

// DELETE /api/workspaces/:workspace_id/invoices/:invoice_id        — delete draft only
router.delete('/:invoice_id', deleteDraftInvoice);

module.exports = router;