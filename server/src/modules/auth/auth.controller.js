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
    if (err.code === 'EMAIL_NOT_VERIFIED') {
      return res.status(403).json({ error: err.message, code: 'EMAIL_NOT_VERIFIED', email: err.email });
    }
    res.status(401).json({ error: err.message });
  }
}

async function verifyEmail(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });
    const result = await authService.verifyEmail(email, code);
    res.status(200).json({ message: 'Email verified successfully', ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    await authService.forgotPassword(email);
    res.status(200).json({ message: 'If this email exists, a reset code has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Email, code and new password are required' });
    await authService.resetPassword(email, code, newPassword);
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
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

async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    await authService.resendVerification(email);
    res.status(200).json({ message: 'Code resent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, switchWorkspace, verifyEmail, forgotPassword, resetPassword, resendVerification };