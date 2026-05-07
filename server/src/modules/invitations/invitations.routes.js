const express = require('express');
const cron = require('node-cron');
const router = express.Router();
const { authenticate, authorizeInWorkspace, authorizeAdmin } = require('../../middlewares/auth.middleware');
const { requireActiveSubscription } = require('../../middlewares/subscription.middleware');
const {
  createInvitationRequest,
  createLeaveRequest,
  createRenewalRequest,
  leaveStatus,
  renewalStatus,
  getPendingInvitations,
  handleInvitation,
  runExpireContracts,
} = require('./invitations.controller');
const { removeExpiredContracts } = require('./invitations.service');

// Run once on startup, then daily at midnight
removeExpiredContracts();
cron.schedule('0 0 * * *', () => {
  console.log('[invitations] Running contract expiry check...');
  removeExpiredContracts();
});

router.use(authenticate);

// Any authenticated member
router.post('/request', authenticate, requireActiveSubscription, createInvitationRequest);
router.post('/leave', authenticate, requireActiveSubscription, createLeaveRequest);
router.post('/renew', authenticate, requireActiveSubscription, createRenewalRequest);
router.get('/leave-status/:workspace_id', leaveStatus);
router.get('/renew-status/:workspace_id', renewalStatus);

// Admin only
router.post('/expire-contracts', authorizeAdmin, runExpireContracts);

// Director only
router.get(
  '/workspace/:workspace_id',
  authorizeInWorkspace('Admin', 'Director'),
  getPendingInvitations
);
router.patch(
  '/workspace/:workspace_id/invitations/:invitationId',
  authorizeInWorkspace('Admin', 'Director'),
  authenticate, 
  requireActiveSubscription, 
  handleInvitation
);

module.exports = router;