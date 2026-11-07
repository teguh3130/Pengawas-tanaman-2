'use strict';

/**
 * ai.routes.js
 *
 * POST /api/ai/analyze — Minta Gemini menganalisis tanaman dan simpan requirements
 */

const express = require('express');
const router  = express.Router();

const { validatePlantConfig } = require('../middleware/validate');
const { analyzePlant }        = require('../controllers/ai.controller');

router.post('/analyze', validatePlantConfig, analyzePlant);

module.exports = router;

