// workspace.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorizeInWorkspace } = require('../../middlewares/auth.middleware');
const {
  createWorkspace,
  getMyWorkspaces,
  generateInviteCode,
  getWorkspaceStats,
} = require('./workspace.controller');

router.use(authenticate);

// any authenticated user can create a workspace or view their own
router.post('/', createWorkspace);
router.get('/my', getMyWorkspaces);

// must be a workspace member to access these
router.post('/:workspace_id/invite',
  authorizeInWorkspace('Admin', 'Director'),
  generateInviteCode
);
router.get('/:workspace_id/stats',
  authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee', 'Personal'),
  getWorkspaceStats
);

module.exports = router;