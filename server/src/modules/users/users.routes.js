// users.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorizeInWorkspace, authorizeAdmin } = require('../../middlewares/auth.middleware');
const {
  getMe, updateMe, updatePassword,
  getWorkspaceMembers, updateMemberRole, removeMember,
  getAllUsers, getUserById, adminUpdateUser, deleteUser,
} = require('./users.controller');

router.use(authenticate);

// ── Personal profile ──────────────────────────────────────────
router.get('/me',          getMe);
router.put('/me',          updateMe);
router.put('/me/password', updatePassword);

// ── Workspace-scoped ──────────────────────────────────────────
router.get('/workspace/:workspace_id/members',
  authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee', 'Personal'),
  getWorkspaceMembers
);
router.patch('/workspace/:workspace_id/members/:userId/role',
  authorizeInWorkspace('Admin', 'Director'),
  updateMemberRole
);
router.delete('/workspace/:workspace_id/members/:userId',
  authorizeInWorkspace('Admin', 'Director'),
  removeMember
);

// ── Admin only ────────────────────────────────────────────────
router.get('/',           authorizeAdmin, getAllUsers);
router.get('/:userId',    authorizeAdmin, getUserById);
router.put('/:userId',    authorizeAdmin, adminUpdateUser);
router.delete('/:userId', authorizeAdmin, deleteUser);

module.exports = router;