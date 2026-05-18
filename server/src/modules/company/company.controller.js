const companyService = require('./company.service');

// GET /company/:workspace_id
async function getCompany(req, res) {
  try {
    const company = await companyService.getCompany(
      req.params.workspace_id,
      req.user.id  // needed to attach subscription (Director) or contract (member)
    );
    res.status(200).json({ company });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

// PUT /company/:workspace_id
async function updateCompany(req, res) {
  try {
    const company = await companyService.updateCompany(
      req.user.id,
      req.params.workspace_id,
      req.body
    );
    res.status(200).json({ message: 'Company updated', company });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /company/:workspace_id/members
async function getMembers(req, res) {
  try {
    const members = await companyService.getMembers(req.params.workspace_id);
    res.status(200).json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /company/:workspace_id/invitations
async function getInvitations(req, res) {
  try {
    const invitations = await companyService.getInvitations(
      req.user.id,
      req.params.workspace_id
    );
    res.status(200).json({ invitations });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /company/  — admin only
async function getAllCompanies(req, res) {
  try {
    const companies = await companyService.getAllCompanies();
    res.status(200).json({ companies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function adminUpdateCompany(req, res) {
  try {
    const company = await companyService.adminUpdateCompany(req.params.workspace_id, req.body);
    res.status(200).json({ message: 'Company updated', company });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  getCompany, updateCompany, adminUpdateCompany, getMembers,
  getInvitations, getAllCompanies,
};