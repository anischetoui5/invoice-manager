const pool = require('../../config/db');

async function ensureGeneralChannel(workspace_id, user_id) {
  const existing = await pool.query(
    `SELECT id FROM chat_conversations WHERE workspace_id = $1 AND type = 'channel' AND name = 'general'`,
    [workspace_id]
  );

  let generalId;
  if (existing.rows.length === 0) {
    const res = await pool.query(
      `INSERT INTO chat_conversations (workspace_id, type, name) VALUES ($1, 'channel', 'general') RETURNING id`,
      [workspace_id]
    );
    generalId = res.rows[0].id;
    await pool.query(
      `INSERT INTO chat_members (conversation_id, user_id)
       SELECT $1, user_id FROM memberships WHERE workspace_id = $2
       ON CONFLICT DO NOTHING`,
      [generalId, workspace_id]
    );
  } else {
    generalId = existing.rows[0].id;
  }

  // Ensure current user is a member of #general
  await pool.query(
    `INSERT INTO chat_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [generalId, user_id]
  );
}

async function getConversations(workspace_id, user_id) {
  await ensureGeneralChannel(workspace_id, user_id);

  const result = await pool.query(
    `SELECT
       c.id,
       c.type,
       c.name,
       c.created_at,
       cm.last_read_at,
       lm.content      AS last_msg_content,
       lm.created_at   AS last_msg_at,
       u_s.name        AS last_msg_sender_name,
       dm_u.id         AS dm_user_id,
       dm_u.name       AS dm_user_name,
       (
         SELECT COUNT(*)::int
         FROM chat_messages m2
         WHERE m2.conversation_id = c.id
           AND m2.deleted_at IS NULL
           AND m2.sender_id != $2
           AND m2.created_at > cm.last_read_at
       ) AS unread_count
     FROM chat_conversations c
     JOIN chat_members cm ON cm.conversation_id = c.id AND cm.user_id = $2
     LEFT JOIN LATERAL (
       SELECT content, created_at, sender_id
       FROM chat_messages
       WHERE conversation_id = c.id AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1
     ) lm ON true
     LEFT JOIN users u_s ON u_s.id = lm.sender_id
     LEFT JOIN LATERAL (
       SELECT u.id, u.name
       FROM chat_members cm2
       JOIN users u ON u.id = cm2.user_id
       WHERE cm2.conversation_id = c.id AND cm2.user_id != $2 AND c.type = 'direct'
       LIMIT 1
     ) dm_u ON true
     WHERE c.workspace_id = $1
     ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
    [workspace_id, user_id]
  );

  return result.rows;
}

async function getMessages(conversation_id, user_id, { limit = 50, before = null } = {}) {
  const membership = await pool.query(
    `SELECT 1 FROM chat_members WHERE conversation_id = $1 AND user_id = $2`,
    [conversation_id, user_id]
  );
  if (membership.rows.length === 0) throw new Error('Not a member');

  const params = [conversation_id, limit];
  let beforeClause = '';
  if (before) {
    params.push(before);
    beforeClause = `AND m.created_at < $${params.length}`;
  }

  const result = await pool.query(
    `SELECT m.id, m.conversation_id, m.sender_id, u.name AS sender_name,
            m.content, m.created_at, m.updated_at
     FROM chat_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1 AND m.deleted_at IS NULL ${beforeClause}
     ORDER BY m.created_at DESC
     LIMIT $2`,
    params
  );

  return result.rows.reverse();
}

async function createMessage(conversation_id, sender_id, content) {
  const membership = await pool.query(
    `SELECT 1 FROM chat_members WHERE conversation_id = $1 AND user_id = $2`,
    [conversation_id, sender_id]
  );
  if (membership.rows.length === 0) throw new Error('Not a member');

  const result = await pool.query(
    `INSERT INTO chat_messages (conversation_id, sender_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, conversation_id, sender_id, content, created_at`,
    [conversation_id, sender_id, content]
  );

  const message = result.rows[0];
  const userRes = await pool.query(`SELECT name FROM users WHERE id = $1`, [sender_id]);
  message.sender_name = userRes.rows[0]?.name ?? 'Unknown';

  return message;
}

async function createChannel(workspace_id, created_by, name) {
  const clean = name.replace(/^#/, '').toLowerCase().replace(/[^a-z0-9-_]/g, '-');

  const existing = await pool.query(
    `SELECT id FROM chat_conversations WHERE workspace_id = $1 AND type = 'channel' AND name = $2`,
    [workspace_id, clean]
  );
  if (existing.rows.length > 0) throw new Error('Channel already exists');

  const result = await pool.query(
    `INSERT INTO chat_conversations (workspace_id, type, name, created_by)
     VALUES ($1, 'channel', $2, $3)
     RETURNING id, type, name, created_at`,
    [workspace_id, clean, created_by]
  );
  const conv = result.rows[0];

  await pool.query(
    `INSERT INTO chat_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [conv.id, created_by]
  );

  return conv;
}

async function createDirectMessage(workspace_id, user_id, other_user_id) {
  const existing = await pool.query(
    `SELECT c.id FROM chat_conversations c
     JOIN chat_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $2
     JOIN chat_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $3
     WHERE c.workspace_id = $1 AND c.type = 'direct'
     LIMIT 1`,
    [workspace_id, user_id, other_user_id]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const result = await pool.query(
    `INSERT INTO chat_conversations (workspace_id, type, created_by)
     VALUES ($1, 'direct', $2)
     RETURNING id, type, created_at`,
    [workspace_id, user_id]
  );
  const conv = result.rows[0];

  await pool.query(
    `INSERT INTO chat_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING`,
    [conv.id, user_id, other_user_id]
  );

  return conv;
}

async function deleteMessage(messageId, userId) {
  const result = await pool.query(
    `UPDATE chat_messages SET deleted_at = NOW() WHERE id = $1 AND sender_id = $2 RETURNING id, conversation_id`,
    [messageId, userId]
  );
  if (!result.rows.length) throw new Error('Message not found or not yours');
  return result.rows[0];
}

async function markAsRead(conversation_id, user_id) {
  await pool.query(
    `UPDATE chat_members SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
    [conversation_id, user_id]
  );
}

async function getWorkspaceMembers(workspace_id, current_user_id) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, r.name AS role
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     JOIN roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1 AND u.id != $2
     ORDER BY u.name`,
    [workspace_id, current_user_id]
  );
  return result.rows;
}

module.exports = {
  getConversations,
  getMessages,
  createMessage,
  deleteMessage,
  createChannel,
  createDirectMessage,
  markAsRead,
  getWorkspaceMembers,
};
