// invitations.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorizeInWorkspace } = require('../../middlewares/auth.middleware');
const {
  createInvitationRequest,
  getPendingInvitations,
  handleInvitation,
} = require('./invitations.controller');

router.use(authenticate);

// any authenticated user can send a join request
router.post('/request', createInvitationRequest);

// Director and above only
router.get('/workspace/:workspace_id',
  authorizeInWorkspace('Admin', 'Director'),
  getPendingInvitations
);
router.patch('/workspace/:workspace_id/invitations/:invitationId',
  authorizeInWorkspace('Admin', 'Director'),
  handleInvitation
);

module.exports = router;