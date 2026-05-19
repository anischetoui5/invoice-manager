// users.routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { authenticate, authorizeInWorkspace, authorizeAdmin } = require('../../middlewares/auth.middleware');
const { requireActiveSubscription } = require('../../middlewares/subscription.middleware');
const {
  getMe, updateMe, updatePassword, uploadAvatar,
  getWorkspaceMembers, updateMemberContract, updateMemberRole, removeMember,
  getAllUsers, getUserById, adminCreateUser, adminUpdateUser, deleteUser,
} = require('./users.controller');

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.use(authenticate);

// ── Personal profile ──────────────────────────────────────────
router.get('/me',          getMe);
router.put('/me', authenticate, requireActiveSubscription, updateMe);
router.put('/me/password', authenticate, requireActiveSubscription, updatePassword);
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), uploadAvatar);

// ── Workspace-scoped ──────────────────────────────────────────
router.get('/workspace/:workspace_id/members',
  authorizeInWorkspace('Admin', 'Director', 'Accountant', 'Employee', 'Personal'),
  getWorkspaceMembers
);
router.patch('/workspace/:workspace_id/members/:userId/contract',
  authorizeInWorkspace('Admin', 'Director'),
  authenticate,
  requireActiveSubscription,
  updateMemberContract
);
router.patch('/workspace/:workspace_id/members/:userId/role',
  authorizeInWorkspace('Admin', 'Director'),
  authenticate,
  requireActiveSubscription,
  updateMemberRole
);
router.delete('/workspace/:workspace_id/members/:userId',
  authorizeInWorkspace('Admin', 'Director'),
  authenticate, 
  requireActiveSubscription, 
  removeMember
);

// ── Admin only ────────────────────────────────────────────────
router.get('/',           authorizeAdmin, getAllUsers);
router.post('/',          authorizeAdmin, adminCreateUser);
router.get('/:userId',    authorizeAdmin, getUserById);
router.put('/:userId',    authorizeAdmin, adminUpdateUser);
router.delete('/:userId', authorizeAdmin, deleteUser);

module.exports = router;