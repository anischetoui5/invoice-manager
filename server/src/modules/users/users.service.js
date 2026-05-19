const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../activity/activity.service');

async function getAllUsers() {
  const result = await pool.query(
    `SELECT 
      u.id,
      u.name,
      u.email,
      u.created_at,
      array_remove(array_agg(DISTINCT r.name), NULL) as roles
     FROM users u
     LEFT JOIN memberships m ON m.user_id = u.id
     LEFT JOIN roles r ON r.id = m.role_id
     GROUP BY u.id
     ORDER BY u.created_at ASC`
  );
  return result.rows;
}

async function getMe(userId) {
  const result = await pool.query(
    `SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0];
}

async function uploadAvatar(userId, avatarUrl) {
  const result = await pool.query(
    `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, name, email, avatar_url`,
    [avatarUrl, userId]
  );
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0];
}

async function updateMe(userId, { name, email }) {
  // Check if email is already taken by another user
  if (email) {
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND id != $2`,
      [email, userId]
    );
    if (existing.rows.length) throw new Error('Email already in use');
  }

  const result = await pool.query(
    `UPDATE users SET
       name  = COALESCE($1, name),
       email = COALESCE($2, email)
     WHERE id = $3
     RETURNING id, name, email`,
    [name || null, email || null, userId]
  );
  if (!result.rows.length) throw new Error('User not found');
  const user = result.rows[0];

  if (name) {
    await pool.query(
      `UPDATE workspaces SET name = $1 WHERE owner_id = $2 AND type = 'personal'`,
      [`${name}'s Workspace`, userId]
    );
  }

  return user;
}

async function updatePassword(userId, { currentPassword, newPassword }) {
  // Get current hashed password
  const result = await pool.query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId]
  );
  if (!result.rows.length) throw new Error('User not found');

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) throw new Error('Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [hashed, userId]
  );
}

async function getWorkspaceMembers(requesterId, workspaceId) {
  const memberCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );
  if (!memberCheck.rows.length) throw new Error('You are not a member of this workspace');

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

async function updateMemberContract(requesterId, workspaceId, targetUserId, { contractStart, contractEnd }) {
  const requesterCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );
  if (!requesterCheck.rows.length || requesterCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can update contract dates');
  }

  const result = await pool.query(
    `UPDATE memberships
     SET contract_start = COALESCE($1, contract_start),
         contract_end   = COALESCE($2, contract_end)
     WHERE user_id = $3 AND workspace_id = $4
     RETURNING *`,
    [contractStart || null, contractEnd || null, targetUserId, workspaceId]
  );
  if (!result.rows.length) throw new Error('Member not found');
  return result.rows[0];
}

async function updateMemberRole(requesterId, workspaceId, targetUserId, roleName) {
  const requesterCheck = await pool.query(
    `SELECT r.name as role FROM memberships m
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [requesterId, workspaceId]
  );
  if (!requesterCheck.rows.length || requesterCheck.rows[0].role !== 'Director') {
    throw new Error('Only Directors can update roles');
  }

  const roleResult = await pool.query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
  if (!roleResult.rows.length) throw new Error(`Role '${roleName}' does not exist`);

  const result = await pool.query(
    `UPDATE memberships SET role_id = $1
     WHERE user_id = $2 AND workspace_id = $3
     RETURNING *`,
    [roleResult.rows[0].id, targetUserId, workspaceId]
  );
  if (!result.rows.length) throw new Error('Member not found in this workspace');
  return result.rows[0];
}

async function removeMember(requesterId, workspaceId, targetUserId) {
  // role check handled by authorizeInWorkspace middleware
  if (requesterId === targetUserId) {
    throw new Error('You cannot remove yourself from the workspace');
  }

  const memberInfo = await pool.query(
    `SELECT u.name, r.name as role FROM memberships m
     JOIN users u ON u.id = m.user_id
     JOIN roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [targetUserId, workspaceId]
  );

  const result = await pool.query(
    `DELETE FROM memberships WHERE user_id = $1 AND workspace_id = $2 RETURNING *`,
    [targetUserId, workspaceId]
  );

  if (!result.rows.length) throw new Error('Member not found');

  const member = memberInfo.rows[0];
  if (member) {
    await logActivity(pool, {
      workspace_id: workspaceId,
      user_id: requesterId,
      action: 'member.left',
      entity_type: 'member',
      entity_id: targetUserId,
      metadata: { user_name: member.name, role: member.role },
    });
  }
}

async function getUserById(userId) {
  const result = await pool.query(
    `SELECT 
      u.id, u.name, u.email, u.created_at,
      array_remove(array_agg(DISTINCT r.name), NULL) as roles
     FROM users u
     LEFT JOIN memberships m ON m.user_id = u.id
     LEFT JOIN roles r ON r.id = m.role_id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0];
}

async function adminCreateUser({ name, email, password, role = 'Personal', companyCode }) {
  if (!name || !email || !password) throw new Error('Name, email and password are required');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');

  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.rows.length) throw new Error('Email already in use');

  const companyRoles = ['Director', 'Employee', 'Accountant'];
  const needsCompany = companyRoles.includes(role);

  let companyWorkspaceId = null;
  if (needsCompany && companyCode) {
    const companyRes = await pool.query(
      `SELECT c.id, c.workspace_id FROM companies c WHERE c.code = $1`,
      [companyCode.toUpperCase()]
    );
    if (!companyRes.rows.length) throw new Error('Company with that code not found');
    companyWorkspaceId = companyRes.rows[0].workspace_id;
  }

  const hash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, is_verified) VALUES ($1, $2, $3, true) RETURNING id, name, email`,
      [name, email, hash]
    );
    const user = userRes.rows[0];

    const wsRes = await client.query(
      `INSERT INTO workspaces (name, type, owner_id) VALUES ($1, 'personal', $2) RETURNING id`,
      [`${name}'s Workspace`, user.id]
    );
    const personalWsId = wsRes.rows[0].id;

    const personalRoleRes = await client.query(`SELECT id FROM roles WHERE name = 'Personal'`);
    await client.query(
      `INSERT INTO memberships (user_id, workspace_id, role_id) VALUES ($1, $2, $3)`,
      [user.id, personalWsId, personalRoleRes.rows[0].id]
    );

    let activeWsId = personalWsId;
    if (companyWorkspaceId && needsCompany) {
      const roleRes = await client.query(`SELECT id FROM roles WHERE name = $1`, [role]);
      if (!roleRes.rows.length) throw new Error(`Role '${role}' not found`);
      await client.query(
        `INSERT INTO memberships (user_id, workspace_id, role_id) VALUES ($1, $2, $3)`,
        [user.id, companyWorkspaceId, roleRes.rows[0].id]
      );
      activeWsId = companyWorkspaceId;
    } else if (role === 'Admin') {
      const roleRes = await client.query(`SELECT id FROM roles WHERE name = 'Admin'`);
      await client.query(
        `UPDATE memberships SET role_id = $1 WHERE user_id = $2 AND workspace_id = $3`,
        [roleRes.rows[0].id, user.id, personalWsId]
      );
    }

    await client.query(`UPDATE users SET last_active_workspace_id = $1 WHERE id = $2`, [activeWsId, user.id]);
    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function adminUpdateUser(userId, { name, email, role }) {
  if (email) {
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND id != $2`,
      [email, userId]
    );
    if (existing.rows.length) throw new Error('Email already in use');
  }

  const result = await pool.query(
    `UPDATE users SET
       name  = COALESCE($1, name),
       email = COALESCE($2, email)
     WHERE id = $3
     RETURNING id, name, email, created_at`,
    [name ?? null, email ?? null, userId]
  );

  if (!result.rows.length) throw new Error('User not found');

  if (role) {
    const roleRes = await pool.query(`SELECT id FROM roles WHERE name = $1`, [role]);
    if (!roleRes.rows.length) throw new Error(`Role '${role}' not found`);
    await pool.query(
      `UPDATE memberships m
       SET role_id = $1
       FROM workspaces w
       WHERE m.workspace_id = w.id AND w.owner_id = $2 AND w.type = 'personal'`,
      [roleRes.rows[0].id, userId]
    );
  }

  return result.rows[0];
}

async function deleteUser(targetUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all workspaces owned by this user
    const ownedWorkspaces = await client.query(
      `SELECT id FROM workspaces WHERE owner_id = $1`,
      [targetUserId]
    );

    for (const ws of ownedWorkspaces.rows) {
      // Delete company tied to this workspace (if any)
      await client.query(`DELETE FROM companies WHERE workspace_id = $1`, [ws.id]);
      // Delete all invoices in this workspace
      await client.query(`DELETE FROM invoices WHERE workspace_id = $1`, [ws.id]);
      // Delete all memberships in this workspace
      await client.query(`DELETE FROM memberships WHERE workspace_id = $1`, [ws.id]);
    }

    // Delete all workspaces owned by this user
    await client.query(`DELETE FROM workspaces WHERE owner_id = $1`, [targetUserId]);

    // Delete invoices created by this user in any other workspace
    await client.query(`DELETE FROM invoices WHERE created_by = $1`, [targetUserId]);

    // Delete any remaining memberships of this user
    await client.query(`DELETE FROM memberships WHERE user_id = $1`, [targetUserId]);

    // Finally delete the user
    await client.query(`DELETE FROM users WHERE id = $1`, [targetUserId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}



module.exports = { getMe, updateMe, updatePassword, uploadAvatar, getWorkspaceMembers, updateMemberContract, updateMemberRole, removeMember, getAllUsers, getUserById, adminCreateUser, adminUpdateUser, deleteUser };