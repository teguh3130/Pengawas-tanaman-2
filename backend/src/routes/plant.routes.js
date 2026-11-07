'use strict';

/**
 * plant.routes.js
 *
 * POST /api/plant/configure    — Konfigurasi tanaman baru (onboarding)
 * GET  /api/plant              — Baca data tanaman saat ini
 * GET  /api/plant/requirements — Baca batas parameter kebutuhan
 * PUT  /api/plant/requirements — Update batas parameter manual oleh user
 */

const express = require('express');
const router  = express.Router();

const { validatePlantConfig, validateRequirementsUpdate } = require('../middleware/validate');
const { configurePlant, getPlant, getRequirements, updateRequirements } = require('../controllers/plant.controller');

router.post('/configure',    validatePlantConfig,        configurePlant);
router.get('/',                                          getPlant);
router.get('/requirements',                              getRequirements);
router.put('/requirements',  validateRequirementsUpdate, updateRequirements);

module.exports = router;

