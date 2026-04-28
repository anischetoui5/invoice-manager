const invitationsService = require('./invitations.service');

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

async function getPendingInvitations(req, res) {
  try {
    const invitations = await invitationsService.getPendingInvitations(
      req.params.workspaceId,
      req.user.id
    );
    res.status(200).json({ invitations });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
}

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

module.exports = { createInvitationRequest, getPendingInvitations, handleInvitation };