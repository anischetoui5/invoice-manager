// invoices.controller.js
const invoicesService = require('./invoices.service.js');

async function createInvoice(req, res) {
  try {
    const { invoice_number, vendor_name, amount, currency, invoice_date, due_date, notes } = req.body;
    const workspace_id = req.params.workspace_id;
    const created_by = req.user.id;

    const invoice = await invoicesService.createInvoice({
      workspace_id, created_by, invoice_number,
      vendor_name, amount, currency,
      invoice_date, due_date, notes,
    });

    res.status(201).json({ message: 'Invoice created successfully', invoice });
  } catch (err) {
    console.error('createInvoice error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

async function getInvoice(req, res) {
  try {
    const { workspace_id, invoice_id } = req.params;
    const invoice = await invoicesService.getInvoiceById(invoice_id, workspace_id);
    res.status(200).json({ invoice });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

async function searchInvoices(req, res) {
  try {
    const workspace_id = req.params.workspace_id;
    const userId = req.user.id;   // ← .id
    const role = req.role;        // ← from authorizeInWorkspace, not query

    const { status, vendor_name, invoice_date_from, invoice_date_to, page, limit } = req.query;

    const result = await invoicesService.searchInvoices({
      workspace_id, userId, role, status,
      vendor_name, invoice_date_from, invoice_date_to,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.status(200).json(result);
  } catch (err) {
    console.error('searchInvoices error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

async function updateInvoiceStatus(req, res) {
  try {
    const { invoice_id } = req.params;
    const { status, comment } = req.body;
    const changed_by = req.user.id;

    await invoicesService.updateInvoiceStatus(invoice_id, status, changed_by, comment);
    res.status(200).json({ message: `Invoice status updated to '${status}'` });
  } catch (err) {
    console.error('updateInvoiceStatus error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

async function getStatusHistory(req, res) {
  try {
    const { invoice_id } = req.params;
    const history = await invoicesService.getStatusHistory(invoice_id);
    res.status(200).json({ history });
  } catch (err) {
    console.error('getStatusHistory error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

async function updateInvoice(req, res) {
  try {
    const { workspace_id, invoice_id } = req.params;
    const invoice = await invoicesService.updateInvoice(invoice_id, workspace_id, req.body);
    res.status(200).json({ message: 'Invoice updated', invoice });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function deleteInvoice(req, res) {
  try {
    const { workspace_id, invoice_id } = req.params;
    await invoicesService.deleteInvoice(invoice_id, workspace_id, req.user.id); // ← .id
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getAllInvoices(req, res) {
  try {
    const {
      status, vendor_name,
      workspace_name, company_name,
      invoice_date_from, invoice_date_to,
      page, limit,
    } = req.query;

    const result = await invoicesService.getAllInvoices({
      status,
      vendor_name,
      workspace_name,
      company_name,
      invoice_date_from,
      invoice_date_to,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.status(200).json(result);
  } catch (err) {
    console.error('getAllInvoices error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getDashboardStats(req, res) {
  try {
    const { workspace_id } = req.params;
    const { role } = req.query;
    const stats = await invoicesService.getDashboardStats(
      workspace_id,
      req.user.id,
      role
    );
    res.status(200).json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createInvoice, getInvoice, searchInvoices,
  updateInvoiceStatus, getStatusHistory,
  updateInvoice, deleteInvoice, getAllInvoices,
  getDashboardStats,
};