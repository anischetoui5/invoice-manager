const subscriptionService = require('./subscription.service');

const getPlans = async (req, res) => {
    const { type } = req.query; // 'personal' or 'company'
    
    try {
        if (!type) {
            return res.status(400).json({ error: "Plan type is required" });
        }
        const plans = await subscriptionService.getPlansByType(type);
        res.status(200).json(plans);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { getPlans };