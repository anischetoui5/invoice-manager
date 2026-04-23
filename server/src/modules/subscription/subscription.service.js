const pool = require('../../config/db');

const getPlansByType = async (planType) => {
  const { rows } = await pool.query(
    `SELECT * FROM subscription_plans 
     WHERE plan_type = $1 AND is_active = true 
     ORDER BY price ASC`,
    [planType]
  );
  return rows;
};

const getMySubscription = async (userId, workspaceId) => {
  const { rows } = await pool.query(
    `SELECT s.*, sp.name as plan_name, sp.price, sp.max_invoices, sp.max_users, sp.ocr_accuracy
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.id = s.plan_id
     WHERE s.company_id = $1 OR s.user_id = $2
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [workspaceId || null, userId]
  );
  return rows[0] || null;
};

/**
 * Calculate remaining credit from current plan
 * Formula: (remaining_days / 30) * current_plan_price
 */
const calculateRemainingCredit = (billingStart, currentPlanPrice) => {
  const now = new Date();
  const start = new Date(billingStart);

  // Days elapsed since billing started
  const daysElapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));

  // Remaining days in 30-day cycle
  const remainingDays = Math.max(0, 30 - daysElapsed);

  // Credit = remaining days proportion * plan price
  const credit = (remainingDays / 30) * currentPlanPrice;

  return {
    remainingDays,
    credit: parseFloat(credit.toFixed(2)),
  };
};

/**
 * Upgrade plan logic:
 * - Personal: charge full new price, reset cycle, no credit
 * - Company: calculate unused credit, deduct from new price, reset cycle
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

  // Get current subscription
  const existing = await pool.query(
    `SELECT s.*, sp.price as current_price, sp.name as current_plan_name, sp.plan_type
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.id = s.plan_id
     WHERE s.company_id = $1 OR s.user_id = $2
     ORDER BY s.created_at DESC LIMIT 1`,
    [workspaceId || null, userId]
  );

  // No existing subscription — create fresh
  if (!existing.rows.length) {
    const result = await pool.query(
      `INSERT INTO subscriptions 
       (company_id, user_id, plan_id, status, current_period_end, billing_start, credits)
       VALUES ($1, $2, $3, 'active', NOW() + INTERVAL '30 days', NOW(), 0)
       RETURNING *`,
      [workspaceId || null, userId, planId]
    );
    return {
      subscription: result.rows[0],
      plan: newPlan,
      amountCharged: parseFloat(newPlan.price),
      credit: 0,
      isPersonal: true,
    };
  }

  const current = existing.rows[0];

  // Already on this plan?
  if (current.plan_id === planId) {
    throw new Error('You are already on this plan');
  }

  const isPersonal = current.plan_type === 'personal' || newPlan.plan_type === 'personal';
  const billingStart = current.billing_start || current.created_at;

  let amountCharged = parseFloat(newPlan.price);
  let credit = 0;

  if (!isPersonal) {
    // Company account: calculate and apply credit
    const creditInfo = calculateRemainingCredit(billingStart, parseFloat(current.current_price));
    credit = creditInfo.credit;

    // Deduct credit from new plan price
    amountCharged = Math.max(0, parseFloat(newPlan.price) - credit);
    amountCharged = parseFloat(amountCharged.toFixed(2));
  }
  // Personal account: charge full price, no credit applied

  // Update subscription
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

module.exports = { getPlansByType, getMySubscription, upgradePlan };