'use strict';

/**
 * pump.routes.js
 *
 * GET  /api/pump/state       — ESP32 polling perintah pompa (Device Token)
 * POST /api/pump/status      — ESP32 laporkan status aktual relay pompa (Device Token)
 * GET  /api/pump             — Frontend baca seluruh state pompa
 * POST /api/pump/command     — Frontend kirim perintah ON/OFF
 * PUT  /api/pump/mode        — Frontend ubah mode auto/manual
 * PUT  /api/pump/auto-config — Frontend update setting auto pump
 */

const express = require('express');
const router  = express.Router();

const { authenticateDevice } = require('../middleware/auth');
const { validatePumpCommand, validatePumpMode } = require('../middleware/validate');
const {
  getPumpState,
  getPumpStatus,
  sendPumpCommand,
  setPumpMode,
  updateAutoConfig,
} = require('../controllers/pump.controller');
const { reportPumpStatus } = require('../controllers/sensor.controller');

// ESP32: Polling perintah pompa
router.get('/state', authenticateDevice, getPumpState);

// ESP32: Lapor status relay aktual setelah eksekusi
router.post('/status', authenticateDevice, reportPumpStatus);

// Frontend: Baca status pompa
router.get('/', getPumpStatus);

// Frontend: Kirim perintah ON/OFF
router.post('/command', validatePumpCommand, sendPumpCommand);

// Frontend: Ganti mode auto/manual
router.put('/mode', validatePumpMode, setPumpMode);

// Frontend: Ubah setting auto pump
router.put('/auto-config', updateAutoConfig);

module.exports = router;
