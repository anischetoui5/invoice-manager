// auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, switchWorkspace } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.patch('/switch-workspace', authenticate, switchWorkspace);

module.exports = router;