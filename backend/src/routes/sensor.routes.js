'use strict';

/**
 * sensor.routes.js
 *
 * POST /api/sensor               — ESP32 kirim data sensor (Device Token)
 * GET  /api/sensor/latest        — Frontend baca sensor terbaru
 * POST /api/sensor/pump-status   — ESP32 lapor status relay aktual (Device Token)
 */

const express = require('express');
const router  = express.Router();

const { authenticateDevice } = require('../middleware/auth');
const { validateSensorData }  = require('../middleware/validate');
const { postSensorData, getLatestSensor, reportPumpStatus } = require('../controllers/sensor.controller');

// ESP32: Kirim data sensor berkala
router.post('/', authenticateDevice, validateSensorData, postSensorData);

// Frontend: Baca data sensor terbaru
router.get('/latest', getLatestSensor);

// ESP32: Lapor status relay aktual
router.post('/pump-status', authenticateDevice, reportPumpStatus);

module.exports = router;

