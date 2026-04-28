// subscription.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  getPlans,
  getMySubscription,
  previewPersonalUpgrade,
  upgradePlan,
} = require('./subscription.controller');

// public
router.get('/plans', getPlans);

// authenticated
router.use(authenticate);
router.get('/my', getMySubscription);
router.get('/preview-upgrade', previewPersonalUpgrade);
router.patch('/upgrade', upgradePlan);

module.exports = router;