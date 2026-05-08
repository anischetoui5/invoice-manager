const express = require('express');
const { authenticate, authorizeInWorkspace } = require('../../middlewares/auth.middleware');
const {
  listConversations, listMessages, createConversation, readConversation, listMembers,
} = require('./chat.controller');

const router = express.Router({ mergeParams: true });

router.use(authenticate, authorizeInWorkspace());

router.get('/conversations',                                  listConversations);
router.post('/conversations',                                 createConversation);
router.get('/conversations/:conversation_id/messages',        listMessages);
router.post('/conversations/:conversation_id/read',           readConversation);
router.get('/members',                                        listMembers);

module.exports = router;
