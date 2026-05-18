const pool = require('../../config/db');
const { logActivity } = require('../activity/activity.service');
 
async function getCompany(workspaceId, requestingUserId) {
  const result = await pool.query(
    `SELECT c.*, w.name as workspace_name, w.type
     FROM companies c
     JOIN workspaces w ON w.id = c.workspace_id
     WHERE c.workspace_id = $1`,
    [workspaceId]
  );
  if (!result.rows.length) throw new Error('Company not found');
  const company = result.rows[0];
 
  // Check if requesting user is a Director — if so, include subscription info
  if (requestingUserId) {
    const roleCheck = await pool.query(
      `SELECT r.name as role FROM memberships m
       JOIN roles r ON r.id = m.role_id
       WHERE m.user_id = $1 AND m.workspace_id = $2`,
      [requestingUserId, workspaceId]
    );
    const role = roleCheck.rows[0]?.role;
 
    if (role === 'Director') {
      const subResult = await pool.query(
        `SELECT s.status, s.trial_ends_at, s.current_period_end, s.credits,
                sp.name as plan_name, sp.price, sp.max_invoices, sp.max_users
         FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.plan_id
         WHERE s.company_id = $1
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [company.id]
      );
      company.subscription = subResult.rows[0] ?? null;
    }
 
    // For any member, include their own contract dates
    if (role && role !== 'Director') {
      const contractResult = await pool.query(
        `SELECT contract_start, contract_end FROM memberships
         WHERE user_id = $1 AND workspace_id = $2`,
        [requestingUserId, workspaceId]
      );
      company.myContract = contractResult.rows[0] ?? null;
    }
 
    company.myRole = role;
  }
 
  return company;
}
 
async function updateCompany(userId, workspaceId, { name, email, phone, address }) {
  const memberCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );
 
  if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can update company information');
  }
 
  const result = await pool.query(
    `UPDATE companies
     SET name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         address = COALESCE($4, address),
         updated_at = NOW()
     WHERE workspace_id = $5
     RETURNING *`,
    [name, email, phone, address, workspaceId]
  );
 
  if (!result.rows.length) throw new Error('Company not found');
  const company = result.rows[0];
 
  await logActivity(pool, {
    workspace_id: workspaceId,
    user_id: userId,
    action: 'company.updated',
    entity_type: 'company',
    entity_id: company.id,
    metadata: { company_name: company.name },
  });
 
  return company;
}
 
async function getMembers(workspaceId) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, r.name as role, m.joined_at,
            m.contract_start, m.contract_end
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     JOIN roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1
     ORDER BY m.joined_at ASC`,
    [workspaceId]
  );
  return result.rows;
}
 
async function getInvitations(userId, workspaceId) {
  const memberCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId]
  );
 
  if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can view invitations');
  }
 
  const result = await pool.query(
    `SELECT i.*, r.name as role_name
     FROM invitations i
     JOIN roles r ON r.id = i.role_id
     WHERE i.workspace_id = $1
     ORDER BY i.created_at DESC`,
    [workspaceId]
  );
  return result.rows;
}
 
async function getAllCompanies() {
  const result = await pool.query(
    `SELECT 
      c.*,
      w.created_at as workspace_created_at,
      COUNT(DISTINCT m.user_id) as member_count,
      COUNT(DISTINCT i.id) as invoice_count
     FROM companies c
     JOIN workspaces w ON w.id = c.workspace_id
     LEFT JOIN memberships m ON m.workspace_id = c.workspace_id
     LEFT JOIN invoices i ON i.workspace_id = c.workspace_id
     GROUP BY c.id, w.created_at
     ORDER BY w.created_at DESC`
  );
  return result.rows;
}

async function adminUpdateCompany(workspaceId, { name, email, phone, address }) {
  const result = await pool.query(
    `UPDATE companies
     SET name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         address = COALESCE($4, address),
         updated_at = NOW()
     WHERE workspace_id = $5
     RETURNING *`,
    [name || null, email || null, phone || null, address || null, workspaceId]
  );
  if (!result.rows.length) throw new Error('Company not found');
  return result.rows[0];
}

module.exports = { getCompany, updateCompany, adminUpdateCompany, getMembers, getInvitations, getAllCompanies };
 