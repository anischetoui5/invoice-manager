const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  getWorkspaceMembers,
  updateMemberRole,
  removeMember,
  getMe,
  updateMe,
  updatePassword,
  getUserById, 
  adminUpdateUser,
  deleteUser
} = require('./users.controller');
const usersController = require('./users.controller');

router.use(authenticate);

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/password', updatePassword);
router.get('/workspace/:workspaceId/members', getWorkspaceMembers);
router.get('/', usersController.getAllUsers);
router.get('/:userId', getUserById);
router.put('/:userId', adminUpdateUser);
router.delete('/:userId', deleteUser);
router.patch('/workspace/:workspaceId/members/:userId/role', updateMemberRole);
router.delete('/workspace/:workspaceId/members/:userId', removeMember);

module.exports = router;