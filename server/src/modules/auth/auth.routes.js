const express = require('express');
const router = express.Router();
const { register, login } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const pool = require('../../config/db');

router.post('/register', register);
router.post('/login', login);

router.patch('/switch-workspace', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.body;
    await pool.query(
      `UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`,
      [workspaceId, req.user.userId]
    );
    res.status(200).json({ message: 'Workspace switched' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;