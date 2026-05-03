// company.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorizeInWorkspace, authorizeAdmin } = require('../../middlewares/auth.middleware');
const {
  getCompany, updateCompany,
  getMembers, getInvitations, 
  getAllCompanies,
} = require('./company.controller');

router.use(authenticate);

// ── Admin only ────────────────────────────────────────────────
router.get('/', authorizeAdmin, getAllCompanies);

// ── Workspace-scoped ──────────────────────────────────────────
router.get('/:workspace_id',
  authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee', 'Normal'),
  getCompany
);
router.put('/:workspace_id',
  authorizeInWorkspace('Admin', 'Director'),
  updateCompany
);
router.get('/:workspace_id/members',
  authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee', 'Normal'),
  getMembers
);
router.get('/:workspace_id/invitations',
  authorizeInWorkspace('Admin', 'Director'),
  getInvitations
);

module.exports = router;