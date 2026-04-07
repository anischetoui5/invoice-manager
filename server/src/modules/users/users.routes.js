const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  getWorkspaceMembers,
  updateMemberRole,
  removeMember,
  getMe,
} = require('./users.controller');

router.use(authenticate);

router.get('/me', getMe);
router.get('/workspace/:workspaceId/members', getWorkspaceMembers);
router.patch('/workspace/:workspaceId/members/:userId/role', updateMemberRole);
router.delete('/workspace/:workspaceId/members/:userId', removeMember);

module.exports = router;