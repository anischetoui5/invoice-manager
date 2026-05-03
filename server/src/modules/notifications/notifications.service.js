const pool = require('../../config/db');

async function createNotification(client_or_pool, { user_id, type = 'info', title, message, action_url = null }) {
  await client_or_pool.query(
    `INSERT INTO notifications (user_id, type, title, message, action_url)
     VALUES ($1, $2, $3, $4, $5)`,
    [user_id, type, title, message, action_url]
  );
}

async function getNotificationsForUser(user_id, { limit = 30 } = {}) {
  const result = await pool.query(
    `SELECT id, type, title, message, action_url, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [user_id, limit]
  );
  return result.rows;
}

async function markAsRead(user_id, notification_id) {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND user_id = $2`,
    [notification_id, user_id]
  );
}

async function markAllAsRead(user_id) {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
    [user_id]
  );
}

module.exports = { createNotification, getNotificationsForUser, markAsRead, markAllAsRead };
