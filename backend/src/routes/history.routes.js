'use strict';

/**
 * history.routes.js
 *
 * GET    /api/history/sensor?period=24h|7d|30d — Riwayat data sensor
 * GET    /api/history/pump                     — Riwayat aktivasi pompa
 * DELETE /api/history/prune                    — Prune riwayat lama
 */

const express = require('express');
const router  = express.Router();

const { validateHistoryQuery } = require('../middleware/validate');
const { getSensorHistory, getPumpHistory, pruneHistory } = require('../controllers/history.controller');

router.get('/sensor', validateHistoryQuery, getSensorHistory);
router.get('/pump',                         getPumpHistory);
router.delete('/prune',                     pruneHistory);

module.exports = router;

