const express = require('express');
const router = express.Router();
const { authenticate, authorizeInWorkspace } = require('../../middlewares/auth.middleware');
const {
  createInvitationRequest,
  getPendingInvitations,
  handleInvitation,
  createLeaveRequest,
  leaveStatus,
} = require('./invitations.controller');

router.use(authenticate);

// Any authenticated member can send a join request
router.post('/request', createInvitationRequest);

// Any authenticated member can submit a leave request
router.post('/leave', createLeaveRequest);

// Any authenticated member can check their own pending leave request
router.get('/leave-status/:workspace_id', leaveStatus);

// Director and above only
router.get(
  '/workspace/:workspace_id',
  authorizeInWorkspace('Admin', 'Director'),
  getPendingInvitations
);
router.patch(
  '/workspace/:workspace_id/invitations/:invitationId',
  authorizeInWorkspace('Admin', 'Director'),
  handleInvitation
);

module.exports = router;