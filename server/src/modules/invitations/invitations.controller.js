const invitationsService = require('./invitations.service');

// POST /invitations/request  — join request (existing)
async function createInvitationRequest(req, res) {
  try {
    const { code, role } = req.body;
    if (!code || !role) {
      return res.status(400).json({ error: 'Code and role are required' });
    }
    await invitationsService.createInvitationRequest(req.user.id, code, role);
    res.status(201).json({ message: 'Join request sent. Waiting for director approval.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /invitations/workspace/:workspace_id  — list pending (existing)
async function getPendingInvitations(req, res) {
  try {
    const invitations = await invitationsService.getPendingInvitations(
      req.params.workspace_id,
      req.user.id
    );
    res.status(200).json({ invitations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /invitations/workspace/:workspace_id/invitations/:invitationId  — accept/reject (existing)
async function handleInvitation(req, res) {
  try {
    const { action, contractStart, contractEnd } = req.body;
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be accept or reject' });
    }
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

// POST /invitations/leave  — leave request (new)
async function createLeaveRequest(req, res) {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    await invitationsService.createLeaveRequest(req.user.id, workspaceId);
    res.status(201).json({ message: 'Leave request submitted. Waiting for director approval.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /invitations/leave-status/:workspace_id  — pending leave check (new)
async function leaveStatus(req, res) {
  try {
    const pending = await invitationsService.getMyLeaveRequest(
      req.user.id,
      req.params.workspace_id
    );
    res.status(200).json({ pending });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  createInvitationRequest,
  getPendingInvitations,
  handleInvitation,
  createLeaveRequest,
  leaveStatus,
};