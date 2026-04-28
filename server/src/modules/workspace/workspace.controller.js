// workspace.controller.js
const workspaceService = require('./workspace.service');

async function createWorkspace(req, res) {
  try {
    const workspace = await workspaceService.createWorkspace(req.user.id, req.body); // ← .id
    res.status(201).json({ message: 'Workspace created', workspace });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getMyWorkspaces(req, res) {
  try {
    const workspaces = await workspaceService.getMyWorkspaces(req.user.id); // ← .id
    res.status(200).json({ workspaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function generateInviteCode(req, res) {
  try {
    const invitation = await workspaceService.generateInviteCode(
      req.user.id,             // ← .id
      req.params.workspace_id, // ← consistent param name
      req.body
    );
    res.status(201).json({ message: 'Invite code generated', invitation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getWorkspaceStats(req, res) {
  try {
    const workspaceId = req.params.workspace_id; // ← consistent param name
    const userId = req.user.id;                  // ← .id
    const role = req.role;                       // ← from authorizeInWorkspace

    const stats = await workspaceService.getWorkspaceStats(workspaceId, userId, role);
    res.json({ stats });
  } catch (err) {
    console.error('Failed to get workspace stats:', err);
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
}

module.exports = { createWorkspace, getMyWorkspaces, generateInviteCode, getWorkspaceStats };