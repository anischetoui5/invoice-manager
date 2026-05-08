// subscription.routes.js
const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  getPlans,
  getMySubscription,
  previewPersonalUpgrade,
  upgradePlan,
} = require('./subscription.controller');
const { checkAndExpireSubscriptions } = require('./subscription.service');

// Run on startup, then every hour
checkAndExpireSubscriptions();
cron.schedule('0 * * * *', () => {
  console.log('[subscription] Checking for expired subscriptions...');
  checkAndExpireSubscriptions();
});

// public
router.get('/plans', getPlans);

// authenticated
router.use(authenticate);
router.get('/my', getMySubscription);
router.get('/preview-upgrade', previewPersonalUpgrade);
router.patch('/upgrade', upgradePlan);

module.exports = router;