const express = require('express');
const router = express.Router();
const { getPlans, getMySubscription, previewPersonalUpgrade, upgradePlan } = require('./subscription.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/plans', getPlans);
router.get('/my', authenticate, getMySubscription);
router.get('/preview-upgrade', authenticate, previewPersonalUpgrade);
router.patch('/upgrade', authenticate, upgradePlan);

module.exports = router;