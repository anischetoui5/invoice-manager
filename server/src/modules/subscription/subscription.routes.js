const express = require('express');
const router = express.Router();
const { getPlans } = require('./subscription.controller');

router.get('/plans', getPlans);

module.exports = router;