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

module.exports = { getPlansByType };