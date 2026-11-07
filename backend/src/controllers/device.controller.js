'use strict';

/**
 * device.controller.js
 * Controller status dan kalibrasi perangkat ESP32.
 */

const { dbGet, dbSet, dbUpdate } = require('../services/firebase.service');

const OFFLINE_THRESHOLD_MS = parseInt(process.env.DEVICE_OFFLINE_THRESHOLD_SEC ?? 300) * 1000;

/**
 * GET /api/device/status
 * Baca status perangkat ESP32 beserta keputusan online/offline.
 */
async function getDeviceStatus(req, res, next) {
  try {
    const device  = await dbGet('/device/esp32');
    const now     = Date.now();
    const lastSeen = device?.lastSeen ?? 0;
    const isOnline = (now - lastSeen) < OFFLINE_THRESHOLD_MS;

    // Update status online di Firebase jika berbeda
    if (device && device.online !== isOnline) {
      await dbUpdate('/device/esp32', { online: isOnline });
    }

    res.json({
      success: true,
      data   : { ...device, online: isOnline, offlineThresholdSec: OFFLINE_THRESHOLD_MS / 1000 },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/device/calibration
 * ESP32 mengirim atau frontend menyimpan nilai kalibrasi soil moisture.
 * Nilai ini harus berasal dari pengukuran aktual, bukan asumsi.
 *
 * Body: { soilDry: number, soilWet: number }
 */
async function saveCalibration(req, res, next) {
  try {
    const { soilDry, soilWet } = req.body;

    // Validasi: DRY harus > WET (ADC kering lebih tinggi dari ADC basah)
    if (Number(soilDry) <= Number(soilWet)) {
      return res.status(400).json({
        success: false,
        error  : 'soilDry harus lebih besar dari soilWet (ADC sensor kering > ADC sensor basah)',
      });
    }

    const calibration = {
      soilDry   : Number(soilDry),
      soilWet   : Number(soilWet),
      savedAt   : Date.now(),
      savedBy   : req.deviceAuthenticated ? 'esp32' : 'user',
    };

    await dbUpdate('/device/esp32/calibration', calibration);

    console.log(`🔧 Kalibrasi soil moisture disimpan: DRY=${soilDry}, WET=${soilWet}`);

    res.json({ success: true, calibration });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/device/calibration
 * Baca nilai kalibrasi soil moisture saat ini.
 */
async function getCalibration(req, res, next) {
  try {
    const calibration = await dbGet('/device/esp32/calibration');
    if (!calibration) {
      return res.status(404).json({
        success: false,
        error  : 'Kalibrasi belum dikonfigurasi — lakukan kalibrasi aktual terlebih dahulu',
      });
    }
    res.json({ success: true, data: calibration });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDeviceStatus, saveCalibration, getCalibration };

