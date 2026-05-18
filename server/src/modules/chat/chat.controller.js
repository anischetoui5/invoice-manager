const {
  getConversations, getMessages, createMessage,
  createChannel, createDirectMessage, markAsRead, getWorkspaceMembers,
} = require('./chat.service');
const pool = require('../../config/db');

async function getPlanFeatures(workspace_id, role) {
  // Admins get all features
  if (role === 'Admin') return { has_chat: true, has_dm: true, can_create_channels: true };
  const { rows } = await pool.query(
    `SELECT sp.has_chat, sp.has_dm, sp.can_create_channels
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.id = s.plan_id
     JOIN companies c ON c.id = s.company_id
     WHERE c.workspace_id = $1::uuid
       AND s.status NOT IN ('expired','cancelled')
     ORDER BY s.created_at DESC LIMIT 1`,
    [workspace_id]
  );
  return rows[0] ?? { has_chat: false, has_dm: false, can_create_channels: false };
}

async function listConversations(req, res) {
  try {
    const features = await getPlanFeatures(req.params.workspace_id, req.role);
    if (!features.has_chat) return res.status(403).json({ error: 'Chat is not available on your current plan' });
    const conversations = await getConversations(req.params.workspace_id, req.user.id);
    res.json({ conversations, features });
  } catch (err) {
    console.error('listConversations:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function listMessages(req, res) {
  try {
    const { before, limit } = req.query;
    const messages = await getMessages(req.params.conversation_id, req.user.id, {
      before: before || null,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({ messages });
  } catch (err) {
    if (err.message === 'Not a member') return res.status(403).json({ error: err.message });
    console.error('listMessages:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function createConversation(req, res) {
  try {
    const { type, name, user_id } = req.body;
    const features = await getPlanFeatures(req.params.workspace_id, req.role);

    if (!features.has_chat) return res.status(403).json({ error: 'Chat is not available on your current plan' });

    let conversation;
    if (type === 'channel') {
      if (!features.can_create_channels) return res.status(403).json({ error: 'Custom channels require Professional or Enterprise plan' });
      if (!name?.trim()) return res.status(400).json({ error: 'Channel name is required' });
      conversation = await createChannel(req.params.workspace_id, req.user.id, name.trim());
    } else if (type === 'direct') {
      if (!features.has_dm) return res.status(403).json({ error: 'Direct messages require Professional or Enterprise plan' });
      if (!user_id) return res.status(400).json({ error: 'user_id is required' });
      conversation = await createDirectMessage(req.params.workspace_id, req.user.id, user_id);
    } else {
      return res.status(400).json({ error: 'type must be channel or direct' });
    }

    res.status(201).json({ conversation });
  } catch (err) {
    if (err.message === 'Channel already exists') return res.status(409).json({ error: err.message });
    console.error('createConversation:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function readConversation(req, res) {
  try {
    await markAsRead(req.params.conversation_id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('readConversation:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function listMembers(req, res) {
  try {
    const members = await getWorkspaceMembers(req.params.workspace_id, req.user.id);
    res.json({ members });
  } catch (err) {
    console.error('listMembers:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listConversations, listMessages, createConversation, readConversation, listMembers };
