const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  getCompany,
  updateCompany,
  getMembers,
  removeMember,
  getInvitations,
  getAllCompanies,
} = require('./company.controller');

router.use(authenticate);

router.get('/:workspaceId', getCompany);
router.put('/:workspaceId', updateCompany);
router.get('/:workspaceId/members', getMembers);
router.delete('/:workspaceId/members/:memberId', removeMember);
router.get('/:workspaceId/invitations', getInvitations);
router.get('/', getAllCompanies);

module.exports = router;