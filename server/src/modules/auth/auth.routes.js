// auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, switchWorkspace, verifyEmail, forgotPassword, resetPassword } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/register',         register);
router.get('/test-email', async (req, res) => {
  const { sendVerificationCode } = require('../../config/email');
  try {
    await sendVerificationCode(req.query.to || 'easyfact.app@gmail.com', '123456');
    res.json({ ok: true, msg: 'Email sent successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, detail: String(err) });
  }
});
router.post('/verify-email',     verifyEmail);
router.post('/login',            login);
router.post('/forgot-password',  forgotPassword);
router.post('/reset-password',   resetPassword);
router.patch('/switch-workspace', authenticate, switchWorkspace);

module.exports = router;