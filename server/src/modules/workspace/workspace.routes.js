const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createWorkspace,
  getMyWorkspaces,
  joinWorkspace,
  generateInviteCode,
} = require('./workspace.controller');

router.use(authenticate);

router.post('/', createWorkspace);
router.get('/my', getMyWorkspaces);
router.post('/join', joinWorkspace);
router.post('/:id/invite', generateInviteCode);

module.exports = router;