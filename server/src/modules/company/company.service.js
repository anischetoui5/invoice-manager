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
    [name || null, email || null, phone || null, address || null, workspaceId]
  );

  if (!result.rows.length) throw new Error('Company not found');
  const company = result.rows[0];

  if (name) {
    await pool.query(`UPDATE workspaces SET name = $1 WHERE id = $2`, [name, workspaceId]);
  }

  await logActivity(pool, {
    workspace_id: workspaceId,
    user_id: userId,
    action: 'company.updated',
    entity_type: 'company',
    entity_id: company.id,
    metadata: { company_name: company.name },
  });

  return { ...company, workspace_name: name || company.name };
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

async function deleteCompany(workspaceId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET last_active_workspace_id = NULL WHERE last_active_workspace_id = $1`, [workspaceId]);
    await client.query(`DELETE FROM invoices WHERE workspace_id = $1`, [workspaceId]);
    await client.query(`DELETE FROM memberships WHERE workspace_id = $1`, [workspaceId]);
    await client.query(`DELETE FROM companies WHERE workspace_id = $1`, [workspaceId]);
    await client.query(`DELETE FROM workspaces WHERE id = $1`, [workspaceId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function adminCreateCompany({ companyName, companyEmail, companyPhone, companyAddress, directorName, directorEmail, directorPassword }) {
  const bcrypt = require('bcryptjs');
  if (!companyName) throw new Error('Company name is required');
  if (!directorName || !directorEmail || !directorPassword) throw new Error('Director name, email and password are required');
  if (directorPassword.length < 8) throw new Error('Password must be at least 8 characters');

  const existingUser = await pool.query(`SELECT id FROM users WHERE email = $1`, [directorEmail]);
  if (existingUser.rows.length) throw new Error('A user with that email already exists');

  const hash = await bcrypt.hash(directorPassword, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, is_verified) VALUES ($1, $2, $3, true) RETURNING id, name, email`,
      [directorName, directorEmail, hash]
    );
    const director = userRes.rows[0];

    const wsRes = await client.query(
      `INSERT INTO workspaces (name, type, owner_id) VALUES ($1, 'company', $2) RETURNING id`,
      [companyName, director.id]
    );
    const wsId = wsRes.rows[0].id;

    const code = companyName.replace(/\s+/g, '').toUpperCase().slice(0, 6) + Math.floor(1000 + Math.random() * 9000);
    const companyRes = await client.query(
      `INSERT INTO companies (workspace_id, name, email, phone, address, code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [wsId, companyName, companyEmail || null, companyPhone || null, companyAddress || null, code]
    );
    const company = companyRes.rows[0];

    const directorRoleRes = await client.query(`SELECT id FROM roles WHERE name = 'Director'`);
    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id) VALUES ($1, $2, $3)`,
      [director.id, wsId, directorRoleRes.rows[0].id]
    );

    const personalWsRes = await client.query(
      `INSERT INTO workspaces (name, type, owner_id) VALUES ($1, 'personal', $2) RETURNING id`,
      [`${directorName}'s Workspace`, director.id]
    );
    const personalWsId = personalWsRes.rows[0].id;
    const personalRoleRes = await client.query(`SELECT id FROM roles WHERE name = 'Personal'`);
    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id) VALUES ($1, $2, $3)`,
      [director.id, personalWsId, personalRoleRes.rows[0].id]
    );

    await client.query(`UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`, [wsId, director.id]);

    await client.query('COMMIT');
    return { company: { ...company, member_count: 1, invoice_count: 0 }, director };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
  const company = result.rows[0];

  if (name) {
    await pool.query(`UPDATE workspaces SET name = $1 WHERE id = $2`, [name, workspaceId]);
  }

  return { ...company, workspace_name: name || company.name };
}

module.exports = { getCompany, updateCompany, adminCreateCompany, adminUpdateCompany, deleteCompany, getMembers, getInvitations, getAllCompanies };
