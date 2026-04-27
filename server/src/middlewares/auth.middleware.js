const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { ...decoded, id: decoded.userId };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorizeInWorkspace(...allowedRoles) {          // ← not async
  return async (req, res, next) => {
    const workspaceId = req.params.workspace_id           // ← URL param first
                     || req.headers['x-workspace-id'];    // ← header fallback

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    try {
      const result = await pool.query(
        `SELECT r.name as role
         FROM memberships m
         JOIN roles r ON r.id = m.role_id
         WHERE m.user_id = $1 AND m.workspace_id = $2`,
        [req.user.id, workspaceId]                        // ← req.user.id
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'You are not a member of this workspace' });
      }

      const role = result.rows[0].role;

      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return res.status(403).json({ error: 'Access denied for your role' });
      }

      req.role = role;
      req.workspaceId = workspaceId;
      next();

    } catch (err) {
      console.error('authorizeInWorkspace error:', err.message);
      return res.status(500).json({ error: 'Authorization error' });
    }
  };
}

async function authorizeAdmin(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT r.name as role
       FROM memberships m
       JOIN roles r ON r.id = m.role_id
       WHERE m.user_id = $1 AND r.name = 'Admin'
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error('authorizeAdmin error:', err.message);
    return res.status(500).json({ error: 'Authorization error' });
  }
}

module.exports = { authenticate, authorizeInWorkspace, authorizeAdmin };