const workspaceService = require('./workspace.service');

async function createWorkspace(req, res) {
  try {
    const workspace = await workspaceService.createWorkspace(req.user.userId, req.body);
    res.status(201).json({ message: 'Workspace created', workspace });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getMyWorkspaces(req, res) {
  try {
    const workspaces = await workspaceService.getMyWorkspaces(req.user.userId);
    res.status(200).json({ workspaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function joinWorkspace(req, res) {
  try {
    const membership = await workspaceService.joinWorkspace(req.user.userId, req.body.code);
    res.status(200).json({ message: 'Joined workspace successfully', membership });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function generateInviteCode(req, res) {
  try {
    const invitation = await workspaceService.generateInviteCode(
      req.user.userId,
      req.params.id,
      req.body
    );
    res.status(201).json({ message: 'Invite code generated', invitation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { createWorkspace, getMyWorkspaces, joinWorkspace, generateInviteCode };