const invitationsService = require('./invitations.service');

// POST /invitations/request
async function createInvitationRequest(req, res) {
  try {
    const { companyCode, role } = req.body;
    const invitation = await invitationsService.createInvitationRequest(req.user.id, companyCode, role);
    res.status(201).json({ message: 'Join request submitted', invitation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /invitations/leave
async function createLeaveRequest(req, res) {
  try {
    const { workspaceId } = req.body;
    const invitation = await invitationsService.createLeaveRequest(req.user.id, workspaceId);
    res.status(201).json({ message: 'Leave request submitted', invitation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /invitations/renew
async function createRenewalRequest(req, res) {
  try {
    const { workspaceId } = req.body;
    const invitation = await invitationsService.createRenewalRequest(req.user.id, workspaceId);
    res.status(201).json({ message: 'Renewal request submitted', invitation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /invitations/leave-status/:workspace_id
async function leaveStatus(req, res) {
  try {
    const pending = await invitationsService.getMyLeaveRequest(req.user.id, req.params.workspace_id);
    res.status(200).json({ pending: !!pending });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /invitations/renew-status/:workspace_id
async function renewalStatus(req, res) {
  try {
    const pending = await invitationsService.getMyRenewalRequest(req.user.id, req.params.workspace_id);
    res.status(200).json({ pending: !!pending });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /invitations/workspace/:workspace_id
async function getPendingInvitations(req, res) {
  try {
    const invitations = await invitationsService.getPendingInvitations(
      req.params.workspace_id,
      req.user.id
    );
    res.status(200).json({ invitations });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PATCH /invitations/workspace/:workspace_id/invitations/:invitationId
async function handleInvitation(req, res) {
  try {
    const { action, contractStart, contractEnd } = req.body;
    await invitationsService.handleInvitation(
      req.user.id,
      req.params.invitationId,
      action,
      contractStart,
      contractEnd
    );
    res.status(200).json({ message: `Invitation ${action}ed successfully` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /invitations/expire-contracts — admin only
async function runExpireContracts(req, res) {
  try {
    const removed = await invitationsService.removeExpiredContracts();
    res.status(200).json({ message: `Removed ${removed} expired contracts` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createInvitationRequest,
  createLeaveRequest,
  createRenewalRequest,
  leaveStatus,
  renewalStatus,
  getPendingInvitations,
  handleInvitation,
  runExpireContracts,
};