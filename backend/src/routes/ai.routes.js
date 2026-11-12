'use strict';

/**
 * ai.routes.js
 *
 * POST /api/ai/analyze         — Minta Gemini menganalisis tanaman dan simpan requirements (atau preview)
 * POST /api/ai/health-analysis — Analisis kesehatan tanaman berbasis sensor aktual + Gemini AI
 * GET  /api/ai/health-analysis — Baca hasil analisis kesehatan tanaman terakhir
 */

const express = require('express');
const router  = express.Router();

const { validatePlantConfig } = require('../middleware/validate');
const { analyzePlant, analyzePlantHealth, getPlantHealth } = require('../controllers/ai.controller');

router.post('/analyze', validatePlantConfig, analyzePlant);
router.post('/health-analysis', analyzePlantHealth);
router.get('/health-analysis', getPlantHealth);

module.exports = router;

