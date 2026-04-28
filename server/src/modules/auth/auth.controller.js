// auth.controller.js
const authService = require('./auth.service');

async function register(req, res) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ message: 'User created successfully', ...result });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({ message: 'Login successful', ...result });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

async function switchWorkspace(req, res) {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    const result = await authService.switchWorkspace(req.user.id, workspaceId);
    res.status(200).json({ message: 'Workspace switched', ...result });
  } catch (err) {
    const status = err.message.includes('not a member') ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = { register, login, switchWorkspace };