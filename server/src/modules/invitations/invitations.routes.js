const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createInvitationRequest,
  getPendingInvitations,
  handleInvitation,
} = require('./invitations.controller');

router.use(authenticate);

// POST /api/invitations/request — user sends join request
router.post('/request', createInvitationRequest);

// GET /api/invitations/workspace/:workspaceId — director views pending requests
router.get('/workspace/:workspaceId', getPendingInvitations);

// PATCH /api/invitations/:invitationId — director accepts or rejects
router.patch('/:invitationId', handleInvitation);

module.exports = router;