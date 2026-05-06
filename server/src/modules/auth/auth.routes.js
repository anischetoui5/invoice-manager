// auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, switchWorkspace, verifyEmail, forgotPassword, resetPassword } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/register',         register);
router.post('/verify-email',     verifyEmail);
router.post('/login',            login);
router.post('/forgot-password',  forgotPassword);
router.post('/reset-password',   resetPassword);
router.patch('/switch-workspace', authenticate, switchWorkspace);

module.exports = router;