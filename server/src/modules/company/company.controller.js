const companyService = require('./company.service');

async function getCompany(req, res) {
  try {
    const company = await companyService.getCompany(req.params.workspaceId);
    res.status(200).json({ company });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

async function updateCompany(req, res) {
  try {
    const company = await companyService.updateCompany(
      req.user.id,
      req.params.workspaceId,
      req.body
    );
    res.status(200).json({ message: 'Company updated', company });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getMembers(req, res) {
  try {
    const members = await companyService.getMembers(req.params.workspaceId);
    res.status(200).json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function removeMember(req, res) {
  try {
    await companyService.removeMember(
      req.user.id,
      req.params.workspaceId,
      req.params.memberId
    );
    res.status(200).json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getInvitations(req, res) {
  try {
    const invitations = await companyService.getInvitations(
      req.user.id,
      req.params.workspaceId
    );
    res.status(200).json({ invitations });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getAllCompanies(req, res) {
  try {
    const companies = await companyService.getAllCompanies();
    res.status(200).json({ companies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getCompany, updateCompany, getMembers, removeMember, getInvitations, getAllCompanies };