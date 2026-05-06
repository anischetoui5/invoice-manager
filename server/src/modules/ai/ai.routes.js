const express = require('express');
const router = express.Router({ mergeParams: true });
const { chat } = require('./ai.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/chat', authenticate, chat);

module.exports = router;
