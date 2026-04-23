const subscriptionService = require('./subscription.service');

const getPlans = async (req, res) => {
  const { type } = req.query;
  try {
    if (!type) return res.status(400).json({ error: 'Plan type is required' });
    const plans = await subscriptionService.getPlansByType(type);
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || null;
    const subscription = await subscriptionService.getMySubscription(
      req.user.userId,
      workspaceId
    );
    res.status(200).json({ subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const upgradePlan = async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || null;
    const { planId } = req.body;
    const result = await subscriptionService.upgradePlan(
      req.user.userId,
      workspaceId,
      planId
    );

    res.status(200).json({
      message: 'Plan upgraded successfully',
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getPlans, getMySubscription, upgradePlan };