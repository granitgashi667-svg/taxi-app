'use strict';

const express = require('express');
const router = express.Router();

// Importo routes
router.use('/orders', require('./orders'));
router.use('/drivers', require('./drivers'));
router.use('/vehicles', require('./vehicles'));
// routes të tjera do t'i shtojmë më vonë:
// router.use('/clients', require('./clients'));
// router.use('/zones', require('./zones'));
// router.use('/stands', require('./stands'));
// router.use('/locations', require('./locations'));
// router.use('/tariffs', require('./tariffs'));
// router.use('/messages', require('./messages'));
// router.use('/otp', require('./otp'));
// router.use('/stats', require('./stats'));

module.exports = router;
