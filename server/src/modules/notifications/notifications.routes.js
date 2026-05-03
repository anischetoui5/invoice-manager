const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { getNotifications, markAsRead, markAllAsRead } = require('./notifications.controller');

router.use(authenticate);

router.get('/',                    getNotifications);
router.patch('/read-all',          markAllAsRead);
router.patch('/:id/read',          markAsRead);

module.exports = router;
