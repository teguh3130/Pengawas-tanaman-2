'use strict';

/**
 * pump.controller.js
 * Controller pompa: perintah dari frontend dan polling dari ESP32.
 *
 * PENTING — Pemisahan command vs status:
 * - /pump/command : perintah dari user/sistem (ditulis di sini)
 * - /pump/status  : status relay aktual (ditulis oleh sensor.controller saat ESP32 lapor)
 */

const { dbGet, dbSet, dbUpdate } = require('../services/firebase.service');
const { logPumpStart, logPumpStop } = require('../services/pump.service');

const COOLDOWN_MS    = parseInt(process.env.PUMP_DEFAULT_COOLDOWN_SEC ?? 600) * 1000;
const MAX_ON_MS      = parseInt(process.env.PUMP_MAX_ON_DURATION_SEC   ?? 120) * 1000;

/**
 * GET /api/pump/state
 * ESP32 polling untuk mendapatkan perintah pompa terbaru.
 * Menggunakan Device Token auth.
 */
async function getPumpState(req, res, next) {
  try {
    const pump = await dbGet('/pump');
    if (!pump) {
      return res.json({
        success: true,
        command: { value: false },
        mode   : 'manual',
        auto   : {},
      });
    }

    res.json({
      success: true,
      command: pump.command ?? { value: false },
      mode   : pump.mode    ?? 'manual',
      auto   : pump.auto    ?? {},
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pump
 * Baca seluruh status pompa untuk frontend.
 */
async function getPumpStatus(req, res, next) {
  try {
    const pump = await dbGet('/pump');
    res.json({ success: true, data: pump ?? null });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pump/command
 * Frontend mengirim perintah pompa (nyala/mati).
 * Validasi cooldown dan sensor sebelum menerima perintah.
 */
async function sendPumpCommand(req, res, next) {
  try {
    const commandOn = req.body.command === true || req.body.command === 'true';
    const now       = Date.now();

    // Ambil data pompa dan sensor saat ini
    const [pumpData, sensorData] = await Promise.all([
      dbGet('/pump'),
      dbGet('/sensorData/latest'),
    ]);

    // ── Validasi: mode auto tidak menerima perintah manual langsung ────────
    if (pumpData?.mode === 'auto' && commandOn) {
      return res.status(400).json({
        success: false,
        error  : 'Pompa dalam mode otomatis. Ganti ke mode manual untuk kontrol manual.',
      });
    }

    // ── Validasi: cooldown (hanya untuk nyalakan) ──────────────────────────
    if (commandOn) {
      const lastDeactivated = pumpData?.lastDeactivated ?? 0;
      const pumpAutoConfig  = pumpData?.auto ?? {};
      const cooldownMs      = (pumpAutoConfig.cooldownSec ?? 0) * 1000;

      if (cooldownMs > 0 && (now - lastDeactivated) < cooldownMs) {
        const remainSec = Math.ceil((cooldownMs - (now - lastDeactivated)) / 1000);
        return res.status(429).json({
          success   : false,
          error     : `Cooldown aktif — tunggu ${remainSec} detik sebelum pompa dinyalakan lagi`,
          remainingSec: remainSec,
        });
      }

      // ── Validasi: jangan nyalakan jika sensor tidak valid ─────────────────
      if (sensorData && sensorData.valid === false) {
        return res.status(400).json({
          success: false,
          error  : 'Data sensor tidak valid — pompa tidak dapat dinyalakan untuk keamanan',
        });
      }
    }

    // ── Tulis perintah ke Firebase ─────────────────────────────────────────
    await dbSet('/pump/command', {
      value    : commandOn,
      issuedBy : 'user',
      issuedAt : now,
    });

    // Update lastActivated jika nyala
    if (commandOn) {
      await dbUpdate('/pump', { lastActivated: now });
      await logPumpStart('manual', sensorData?.soilMoisture ?? null, 'manual_on');
    }

    console.log(`🔌 Pump command: ${commandOn ? 'ON' : 'OFF'} (manual, by user)`);

    res.json({
      success : true,
      command : { value: commandOn, issuedAt: now },
      message : commandOn ? 'Perintah menyalakan pompa dikirim' : 'Perintah mematikan pompa dikirim',
    });

  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/pump/mode
 * Ubah mode pompa: 'auto' atau 'manual'.
 * Jika ganti ke manual, matikan pompa jika sedang menyala secara otomatis.
 */
async function setPumpMode(req, res, next) {
  try {
    const { mode } = req.body;

    if (!['auto', 'manual'].includes(mode)) {
      return res.status(400).json({ success: false, error: "mode harus 'auto' atau 'manual'" });
    }

    const pumpData = await dbGet('/pump');
    const prevMode = pumpData?.mode ?? 'manual';

    await dbUpdate('/pump', { mode, updatedAt: Date.now() });

    // Jika beralih dari auto ke manual, matikan perintah auto yang mungkin aktif
    if (prevMode === 'auto' && mode === 'manual') {
      const command = pumpData?.command;
      if (command?.issuedBy === 'auto_system' && command?.value === true) {
        await dbSet('/pump/command', {
          value    : false,
          issuedBy : 'system_mode_change',
          issuedAt : Date.now(),
        });
        console.log('🔌 Mode berubah auto→manual: perintah auto dibatalkan');
      }
    }

    res.json({ success: true, mode, previousMode: prevMode });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/pump/auto-config
 * Update konfigurasi mode otomatis (threshold, cooldown, maxDuration).
 */
async function updateAutoConfig(req, res, next) {
  try {
    const { triggerMoistureMin, targetMoistureMax, maxOnDurationSec, cooldownSec } = req.body;

    const update = {};
    if (triggerMoistureMin !== undefined) update.triggerMoistureMin = Number(triggerMoistureMin);
    if (targetMoistureMax  !== undefined) update.targetMoistureMax  = Number(targetMoistureMax);
    if (maxOnDurationSec   !== undefined) update.maxOnDurationSec   = Number(maxOnDurationSec);
    if (cooldownSec        !== undefined) update.cooldownSec        = Number(cooldownSec);

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada field yang di-update' });
    }

    await dbUpdate('/pump/auto', update);
    const updatedPumpAuto = await dbGet('/pump/auto');

    res.json({ success: true, data: updatedPumpAuto });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPumpState, getPumpStatus, sendPumpCommand, setPumpMode, updateAutoConfig };

