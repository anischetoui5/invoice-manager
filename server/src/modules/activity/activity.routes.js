const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeInWorkspace } = require('../../middlewares/auth.middleware');
const { getActivity } = require('./activity.controller');

router.use(authenticate);
router.use(authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee', 'Personal'));

router.get('/', getActivity);

module.exports = router;
