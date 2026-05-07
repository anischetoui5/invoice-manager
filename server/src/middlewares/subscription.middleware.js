// middlewares/subscription.middleware.js
const pool = require('../config/db');

async function requireActiveSubscription(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.params.workspace_id;
    if (!workspaceId) return next(); // personal workspace, no sub needed

    const result = await pool.query(
      `SELECT s.status FROM subscriptions s
       JOIN companies c ON c.id = s.company_id
       WHERE c.workspace_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [workspaceId]
    );

    const status = result.rows[0]?.status;

    // No subscription found or expired/cancelled → block writes
    if (status === 'expired' || status === 'cancelled') {
      return res.status(403).json({
        error: 'Your subscription has expired. Please renew to continue.',
        code: 'SUBSCRIPTION_EXPIRED',
      });
    }

    next();
  } catch (err) {
    next(); // don't block on error, fail open
  }
}

module.exports = { requireActiveSubscription };