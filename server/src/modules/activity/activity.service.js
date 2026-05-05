const pool = require('../../config/db');

async function logActivity(client_or_pool, { workspace_id, user_id, action, entity_type = null, entity_id = null, metadata = {} }) {
  await client_or_pool.query(
    `INSERT INTO activity_log (workspace_id, user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [workspace_id, user_id, action, entity_type, entity_id, JSON.stringify(metadata)]
  );
}

async function getWorkspaceActivity(workspace_id, { page = 1, limit = 30, role, userId, entity_type } = {}) {
  const offset = (page - 1) * limit;
  const conditions = ['a.workspace_id = $1'];
  const params = [workspace_id];

  const r = role?.toLowerCase();

  if (r === 'personal' || r === 'normal') {
    // Personal users only see their own actions
    params.push(userId);
    conditions.push(`a.user_id = $${params.length}`);

  } else if (r === 'employee') {
    params.push(userId);
    conditions.push(
      `(
        a.user_id = $${params.length}
        OR (a.entity_type = 'company')
        OR (a.entity_type = 'member' AND a.entity_id = $${params.length}::uuid)
      )`
    );

  } else if (r === 'accountant') {
    // Accountants only see actions they performed
    params.push(userId);
    conditions.push(`a.user_id = $${params.length}`);
  }
  // Director and Admin see everything — no extra filter needed

  if (entity_type) {
    params.push(entity_type);
    conditions.push(`a.entity_type = $${params.length}`);
  }

  const where = conditions.join(' AND ');

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata,
              a.created_at, u.name AS user_name
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM activity_log a WHERE ${where}`,
      params
    ),
  ]);

  return {
    activity: rows.rows,
    total: parseInt(count.rows[0].count),
    page,
    limit,
  };
}

module.exports = { logActivity, getWorkspaceActivity };
