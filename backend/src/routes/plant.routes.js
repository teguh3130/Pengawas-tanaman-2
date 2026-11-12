'use strict';

/**
 * plant.routes.js
 *
 * POST   /api/plant/configure    — Konfigurasi tanaman baru (onboarding / edit)
 * GET    /api/plant              — Baca data tanaman saat ini
 * DELETE /api/plant              — Hapus profil tanaman aktif (riwayat sensor & pompa tetap aman)
 * GET    /api/plant/requirements — Baca batas parameter kebutuhan
 * POST   /api/plant/requirements — Simpan parameter kebutuhan yang disetujui user (onboarding)
 * PUT    /api/plant/requirements — Update batas parameter manual oleh user
 */

const express = require('express');
const router  = express.Router();

const { validatePlantConfig, validateRequirementsUpdate } = require('../middleware/validate');
const {
  configurePlant,
  getPlant,
  getRequirements,
  updateRequirements,
  saveApprovedRequirements,
  deletePlant,
} = require('../controllers/plant.controller');

router.post('/configure',    validatePlantConfig,        configurePlant);
router.get('/',                                          getPlant);
router.delete('/',                                       deletePlant);
router.get('/requirements',                              getRequirements);
router.post('/requirements', validateRequirementsUpdate, saveApprovedRequirements);
router.put('/requirements',  validateRequirementsUpdate, updateRequirements);

module.exports = router;

