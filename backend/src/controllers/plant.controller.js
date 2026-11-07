'use strict';

/**
 * plant.controller.js
 * Controller konfigurasi tanaman dan parameter kebutuhan.
 */

const { dbGet, dbSet, dbUpdate } = require('../services/firebase.service');

/**
 * POST /api/plant/configure
 * Simpan data tanaman yang diisi user ke Firebase.
 * Tidak memanggil Gemini — Gemini ada di ai.controller.
 */
async function configurePlant(req, res, next) {
  try {
    const { name, type, variety, location, startedAt, additionalInfo } = req.body;

    const plantData = {
      name          : name.trim(),
      type          : type.trim(),
      variety       : variety?.trim() || '',
      location      : location.trim(),
      startedAt     : startedAt ? Number(startedAt) : Date.now(),
      additionalInfo: additionalInfo?.trim() || '',
      createdAt     : Date.now(),
    };

    await dbSet('/plant', plantData);

    return res.status(201).json({ success: true, data: plantData });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/plant
 * Baca data tanaman saat ini.
 */
async function getPlant(req, res, next) {
  try {
    const plant = await dbGet('/plant');
    if (!plant) {
      return res.status(404).json({ success: false, error: 'Data tanaman belum dikonfigurasi' });
    }
    res.json({ success: true, data: plant });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/plant/requirements
 * Baca parameter kebutuhan tanaman (dari Gemini atau manual).
 */
async function getRequirements(req, res, next) {
  try {
    const req_ = await dbGet('/plantRequirements');
    if (!req_) {
      return res.status(404).json({ success: false, error: 'Parameter kebutuhan belum ada — jalankan analisis AI terlebih dahulu' });
    }
    res.json({ success: true, data: req_ });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/plant/requirements
 * Update batas parameter secara manual oleh user.
 * Set verifiedByUser = true agar sistem tahu parameter sudah divalidasi.
 */
async function updateRequirements(req, res, next) {
  try {
    const existing = await dbGet('/plantRequirements');
    if (!existing) {
      return res.status(404).json({
        success: false,
        error  : 'Parameter kebutuhan belum ada — jalankan analisis AI terlebih dahulu',
      });
    }

    // Deep merge: hanya field yang dikirim yang di-update
    const update = {
      ...existing,
      ...buildDeepUpdate(existing, req.body),
      verifiedByUser: true,
      updatedAt     : Date.now(),
      updatedBy     : 'user_manual',
    };

    await dbSet('/plantRequirements', update);

    // Sinkronkan threshold auto pump jika soilMoisture berubah
    if (req.body.soilMoisture) {
      const pumpAutoUpdate = {};
      if (req.body.soilMoisture.warning?.min !== undefined) {
        pumpAutoUpdate.triggerMoistureMin = req.body.soilMoisture.warning.min;
      }
      if (req.body.soilMoisture.ideal?.max !== undefined) {
        pumpAutoUpdate.targetMoistureMax = req.body.soilMoisture.ideal.max;
      }
      if (Object.keys(pumpAutoUpdate).length > 0) {
        await dbUpdate('/pump/auto', pumpAutoUpdate);
      }
    }

    res.json({ success: true, data: update });
  } catch (err) {
    next(err);
  }
}

/** Merge dalam satu level agar tidak overwrite seluruh objek nested */
function buildDeepUpdate(existing, incoming) {
  const result = { ...existing };
  for (const key of Object.keys(incoming)) {
    if (typeof incoming[key] === 'object' && incoming[key] !== null && !Array.isArray(incoming[key])) {
      result[key] = { ...(existing[key] || {}), ...incoming[key] };
      // Satu level lebih dalam untuk ideal/warning
      for (const sub of Object.keys(incoming[key])) {
        if (typeof incoming[key][sub] === 'object' && incoming[key][sub] !== null) {
          result[key][sub] = { ...(existing[key]?.[sub] || {}), ...incoming[key][sub] };
        }
      }
    } else {
      result[key] = incoming[key];
    }
  }
  return result;
}

module.exports = { configurePlant, getPlant, getRequirements, updateRequirements };

