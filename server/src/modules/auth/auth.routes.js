// auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, switchWorkspace, verifyEmail, forgotPassword, resetPassword } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/register',         register);
router.get('/test-email', async (req, res) => {
  const { sendVerificationCode } = require('../../config/email');
  // Step 1: test basic outbound HTTPS
  try {
    const ping = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': process.env.BREVO_SMTP_KEY, 'Accept': 'application/json' },
    });
    const pingBody = await ping.text();
    if (!ping.ok) return res.status(500).json({ step: 'auth-check', status: ping.status, body: pingBody });
  } catch (e) {
    return res.status(500).json({ step: 'network', error: e.message });
  }
  // Step 2: send test email
  try {
    await sendVerificationCode(req.query.to || 'easyfact.app@gmail.com', '123456');
    res.json({ ok: true, msg: 'Email sent successfully' });
  } catch (err) {
    res.status(500).json({ step: 'send', ok: false, error: err.message });
  }
});
router.post('/verify-email',     verifyEmail);
router.post('/login',            login);
router.post('/forgot-password',  forgotPassword);
router.post('/reset-password',   resetPassword);
router.patch('/switch-workspace', authenticate, switchWorkspace);

module.exports = router;