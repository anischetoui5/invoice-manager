const notificationsService = require('./notifications.service');

async function getNotifications(req, res) {
  try {
    const rows = await notificationsService.getNotificationsForUser(req.user.id);
    const notifications = rows.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      actionUrl: n.action_url,
      read: n.is_read,
      timestamp: n.created_at,
    }));
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function markAsRead(req, res) {
  try {
    await notificationsService.markAsRead(req.user.id, req.params.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function markAllAsRead(req, res) {
  try {
    await notificationsService.markAllAsRead(req.user.id);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead };
