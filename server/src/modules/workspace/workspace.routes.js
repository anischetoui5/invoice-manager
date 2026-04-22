const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createWorkspace,
  getMyWorkspaces,
  generateInviteCode,
  getWorkspaceStats,
} = require('./workspace.controller');

router.use(authenticate);

router.post('/', createWorkspace);
router.get('/my', getMyWorkspaces);
router.post('/:id/invite', generateInviteCode);
router.get('/:id/stats', getWorkspaceStats); 

module.exports = router;