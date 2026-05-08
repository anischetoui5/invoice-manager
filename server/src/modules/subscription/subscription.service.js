const pool = require('../../config/db');
const { createNotification } = require('../notifications/notifications.service');

/**
 * Fetch active subscription plans filtered by type ('personal' or 'company')
 */
const getPlansByType = async (planType) => {
  const { rows } = await pool.query(
    `SELECT * FROM subscription_plans 
     WHERE plan_type = $1 AND is_active = true 
     ORDER BY price ASC`,
    [planType]
  );
  return rows;
};

/**
 * Get current active subscription.
 * - Personal: matched by user_id (company_id IS NULL)
 * - Company:  matched by company_id (workspace_id)
 */
const getMySubscription = async (userId, workspaceId) => {
  const { rows } = workspaceId
    ? await pool.query(
        `SELECT 
           s.*, 
           sp.name as plan_name, 
           sp.price, 
           sp.max_invoices, 
           sp.max_users, 
           sp.ocr_accuracy,
           (
             SELECT COUNT(*) FROM invoices i
             WHERE i.workspace_id = (
               SELECT workspace_id FROM companies WHERE id = s.company_id
             )
             AND i.created_at >= (s.current_period_end - INTERVAL '30 days') -- ← billing period
           ) AS invoice_used,
           (
             SELECT COUNT(*) FROM memberships m
             WHERE m.workspace_id = (
               SELECT workspace_id FROM companies WHERE id = s.company_id
             )
           ) AS user_count
         FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.plan_id
         JOIN companies c ON c.id = s.company_id
         WHERE c.workspace_id = $1::uuid
         ORDER BY s.created_at DESC LIMIT 1`,
        [workspaceId]
      )
    : await pool.query(
        `SELECT 
           s.*, 
           sp.name as plan_name, 
           sp.price, 
           sp.max_invoices, 
           sp.max_users, 
           sp.ocr_accuracy,
           (
             SELECT COUNT(*) FROM invoices i
             WHERE i.created_by = s.user_id
             AND i.created_at >= (s.current_period_end - INTERVAL '30 days') -- ← billing period
           ) AS invoice_used,
           1 AS user_count
         FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.plan_id
         WHERE s.user_id = $1::uuid AND s.company_id IS NULL
         ORDER BY s.created_at DESC LIMIT 1`,
        [userId]
      );
  const sub = rows[0] || null;
  if (sub && sub.current_period_end && !['expired', 'cancelled'].includes(sub.status)) {
    if (new Date(sub.current_period_end) < new Date()) {
      sub.status = 'expired';
    }
  }
  return sub;
};

/**
 * Preview a personal upgrade — returns current plan name, cycle end date, and full new price.
 * Personal accounts never get credit (no proration).
 */
const getPersonalUpgradePreview = async (userId, planId) => {
  if (!planId) throw new Error('Plan ID is required');

  // Get new plan
  const newPlanResult = await pool.query(
    `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`,
    [planId]
  );
  if (!newPlanResult.rows.length) throw new Error('Plan not found');
  const newPlan = newPlanResult.rows[0];

  // Get current personal subscription
  const currentResult = await pool.query(
    `SELECT s.*, sp.name as current_plan_name, sp.price as current_price
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.id = s.plan_id
     WHERE s.user_id = $1::uuid AND s.company_id IS NULL
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId]
  );

  const current = currentResult.rows[0];

  return {
    currentPlanName: current?.current_plan_name || null,
    cycleEndDate: current?.current_period_end || null,
    newPlanName: newPlan.name,
    amountCharged: parseFloat(newPlan.price),
    credit: 0, // Personal accounts never get credit
  };
};

/**
 * Calculate remaining credit from current plan (company only)
 * Formula: (remaining_days / 30) * current_plan_price
 */
const calculateRemainingCredit = (billingStart, currentPlanPrice) => {
  const now = new Date();
  const start = new Date(billingStart);
  const daysElapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, 30 - daysElapsed);
  const credit = (remainingDays / 30) * currentPlanPrice;
  return {
    remainingDays,
    credit: parseFloat(credit.toFixed(2)),
  };
};

/**
 * Upgrade plan logic:
 * - Personal: charge full new price, reset cycle, no credit
 * - Company:  calculate unused credit, deduct from new price, reset cycle
 */
const upgradePlan = async (userId, workspaceId, planId) => {
  if (!planId) throw new Error('Plan ID is required');

  // Get new plan details
  const planResult = await pool.query(
    `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`,
    [planId]
  );
  if (!planResult.rows.length) throw new Error('Plan not found');
  const newPlan = planResult.rows[0];

  const isPersonal = newPlan.plan_type === 'personal';

  // Strict scoping — never let a personal and company subscription interfere
  // Personal: match by user_id WHERE company_id IS NULL
  // Company:  match by company_id only
  const existing = isPersonal
    ? await pool.query(
        `SELECT s.*, sp.price as current_price, sp.name as current_plan_name, sp.plan_type
         FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.plan_id
         WHERE s.user_id = $1::uuid AND s.company_id IS NULL
         ORDER BY s.created_at DESC LIMIT 1`,
        [userId]
      )
    : await pool.query(
        `SELECT s.*, sp.price as current_price, sp.name as current_plan_name, sp.plan_type
         FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.plan_id
         JOIN companies c ON c.id = s.company_id
         WHERE c.workspace_id = $1::uuid
         ORDER BY s.created_at DESC LIMIT 1`,
        [workspaceId]
      );

  // No existing subscription — create fresh row (never overwrites the other type)
  // Constraint: exactly one of company_id or user_id must be set (never both)
  if (!existing.rows.length) {
    const insertResult = isPersonal
      ? await pool.query(
          `INSERT INTO subscriptions
             (user_id, plan_id, status, current_period_end, billing_start, credits)
           VALUES ($1::uuid, $2, 'active', NOW() + INTERVAL '30 days', NOW(), 0)
           RETURNING *`,
          [userId, planId]
        )
      : await (async () => {
          const companyRes = await pool.query(
            `SELECT id FROM companies WHERE workspace_id = $1::uuid LIMIT 1`,
            [workspaceId]
          );
          if (!companyRes.rows[0]) throw new Error('Company not found for this workspace');
          const companyId = companyRes.rows[0].id;
          return pool.query(
            `INSERT INTO subscriptions
               (company_id, plan_id, status, current_period_end, billing_start, credits)
             VALUES ($1::uuid, $2, 'active', NOW() + INTERVAL '30 days', NOW(), 0)
             RETURNING *`,
            [companyId, planId]
          );
        })();
    return {
      subscription: insertResult.rows[0],
      plan: newPlan,
      amountCharged: parseFloat(newPlan.price),
      credit: 0,
    };
  }

  const current = existing.rows[0];

  // Block same-plan "upgrade" only when subscription is still active
  if (current.plan_id === planId && !['expired', 'cancelled'].includes(current.status)) {
    throw new Error('You are already on this plan');
  }

  const billingStart = current.billing_start || current.created_at;

  let amountCharged = parseFloat(newPlan.price);
  let credit = 0;

  if (!isPersonal) {
    // Company: calculate and apply credit
    const creditInfo = calculateRemainingCredit(billingStart, parseFloat(current.current_price));
    credit = creditInfo.credit;
    amountCharged = parseFloat(Math.max(0, parseFloat(newPlan.price) - credit).toFixed(2));
  }
  // Personal: always full price, no credit

  const result = await pool.query(
    `UPDATE subscriptions 
     SET plan_id = $1, 
         status = 'active', 
         billing_start = NOW(),
         current_period_end = NOW() + INTERVAL '30 days',
         credits = $2
     WHERE id = $3
     RETURNING *`,
    [planId, credit, current.id]
  );

  return {
    subscription: result.rows[0],
    plan: newPlan,
    previousPlan: current.current_plan_name,
    amountCharged,
    credit,
    isPersonal,
  };
};

async function checkAndExpireSubscriptions() {
  try {
    const expired = await pool.query(
      `SELECT s.id, s.company_id, c.workspace_id, c.name AS company_name
       FROM subscriptions s
       JOIN companies c ON c.id = s.company_id
       WHERE s.current_period_end < NOW()
         AND s.status NOT IN ('expired', 'cancelled')`
    );

    for (const sub of expired.rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE subscriptions SET status = 'expired' WHERE id = $1`,
          [sub.id]
        );

        const dirRes = await client.query(
          `SELECT m.user_id FROM memberships m
           JOIN roles r ON r.id = m.role_id
           WHERE m.workspace_id = $1 AND r.name = 'Director'
           LIMIT 1`,
          [sub.workspace_id]
        );
        const directorId = dirRes.rows[0]?.user_id;

        if (directorId) {
          const alreadyNotified = await client.query(
            `SELECT id FROM notifications
             WHERE user_id = $1 AND title = 'Subscription Expired'
               AND created_at >= NOW() - INTERVAL '24 hours'`,
            [directorId]
          );
          if (alreadyNotified.rows.length === 0) {
            await createNotification(client, {
              user_id: directorId,
              type: 'error',
              title: 'Subscription Expired',
              message: `Your subscription for ${sub.company_name} has expired. Renew immediately to restore access for all team members.`,
              action_url: '/dashboard/settings',
            });
          }
        }

        await client.query('COMMIT');
        console.log(`[subscription.job] Expired subscription for ${sub.company_name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[subscription.job] Failed to expire ${sub.id}:`, err.message);
      } finally {
        client.release();
      }
    }

    return expired.rows.length;
  } catch (err) {
    console.error('[subscription.job] Query failed:', err.message);
    return 0;
  }
}

module.exports = { getPlansByType, getMySubscription, getPersonalUpgradePreview, upgradePlan, checkAndExpireSubscriptions };