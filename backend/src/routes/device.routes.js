'use strict';

/**
 * device.routes.js
 *
 * GET  /api/device/status      — Status koneksi ESP32 (online/offline)
 * GET  /api/device/calibration — Baca nilai kalibrasi soil moisture
 * POST /api/device/calibration — Simpan nilai kalibrasi aktual
 */

const express = require('express');
const router  = express.Router();

const { validateCalibration } = require('../middleware/validate');
const { getDeviceStatus, saveCalibration, getCalibration } = require('../controllers/device.controller');

router.get('/status',                      getDeviceStatus);
router.get('/calibration',                 getCalibration);
router.post('/calibration', validateCalibration, saveCalibration);

module.exports = router;

