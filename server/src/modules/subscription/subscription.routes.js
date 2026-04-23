const express = require('express');
const router = express.Router();
const { getPlans, getMySubscription, upgradePlan } = require('./subscription.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/plans', getPlans);
router.get('/my', authenticate, getMySubscription);
router.patch('/upgrade', authenticate, upgradePlan);

module.exports = router;