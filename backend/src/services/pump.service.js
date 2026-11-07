'use strict';

/**
 * pump.service.js
 * Logika bisnis pompa: evaluasi mode otomatis dan pencatatan riwayat.
 *
 * Logika auto pump berjalan di BACKEND (saat menerima data sensor baru).
 * ESP32 hanya mengeksekusi perintah — tidak membuat keputusan nyala/mati.
 */

const { dbGet, dbSet, dbUpdate, dbPush } = require('./firebase.service');

const DEFAULT_MAX_ON_SEC  = parseInt(process.env.PUMP_MAX_ON_DURATION_SEC   ?? 120);
const DEFAULT_COOLDOWN_SEC = parseInt(process.env.PUMP_DEFAULT_COOLDOWN_SEC  ?? 600);

/**
 * Evaluasi apakah pompa perlu dinyalakan atau dimatikan dalam mode otomatis.
 * Dipanggil setiap kali data sensor baru masuk (POST /api/sensor).
 *
 * @param {object} sensorData   - { soilMoisture, valid, timestamp }
 * @param {object} pumpData     - Seluruh node /pump dari Firebase
 * @param {object} requirements - /plantRequirements dari Firebase (opsional)
 */
async function evaluateAutoPump(sensorData, pumpData, requirements) {
  if (!pumpData || pumpData.mode !== 'auto') return;

  const now = Date.now();

  // Ambil konfigurasi auto pump
  const autoConfig = pumpData.auto || {};
  const maxOnMs    = (autoConfig.maxOnDurationSec  ?? DEFAULT_MAX_ON_SEC)   * 1000;
  const cooldownMs = (autoConfig.cooldownSec        ?? DEFAULT_COOLDOWN_SEC) * 1000;

  // Ambil threshold — prioritas: pumpData.auto, lalu dari requirements
  const triggerMin = autoConfig.triggerMoistureMin
    ?? requirements?.soilMoisture?.warning?.min
    ?? null;
  const targetMax  = autoConfig.targetMoistureMax
    ?? requirements?.soilMoisture?.ideal?.max
    ?? null;

  if (triggerMin === null || targetMax === null) {
    console.log('⚠️  Auto pump: threshold belum dikonfigurasi, lewati evaluasi');
    return;
  }

  const relayOn          = pumpData.status?.relayOn ?? false;
  const lastActivated    = pumpData.lastActivated    ?? 0;
  const lastDeactivated  = pumpData.lastDeactivated  ?? 0;
  const soilMoisture     = sensorData.soilMoisture;
  const sensorValid      = sensorData.valid;

  // ─── Kondisi MATIKAN pompa ─────────────────────────────────────────────────
  if (relayOn) {
    const durationOn = now - lastActivated;
    let   shouldOff  = false;
    let   reason     = '';

    if (!sensorValid) {
      shouldOff = true;
      reason    = 'sensor_fail';
    } else if (soilMoisture >= targetMax) {
      shouldOff = true;
      reason    = 'target_reached';
    } else if (durationOn > maxOnMs) {
      shouldOff = true;
      reason    = 'max_duration';
    }

    if (shouldOff) {
      console.log(`🚿 Auto pump MATI — alasan: ${reason}, durasi: ${Math.round(durationOn / 1000)}s`);
      await issueAutoPumpCommand(false, reason, soilMoisture);
    }
    return;
  }

  // ─── Kondisi NYALAKAN pompa ────────────────────────────────────────────────
  if (!sensorValid) return;  // Jangan nyalakan jika sensor gagal

  const cooldownElapsed = (now - lastDeactivated) >= cooldownMs;

  if (soilMoisture < triggerMin && cooldownElapsed) {
    const cooldownRemain = Math.max(0, cooldownMs - (now - lastDeactivated));
    if (cooldownRemain > 0) return;  // Masih dalam cooldown

    console.log(`🚿 Auto pump NYALA — soil: ${soilMoisture}% < trigger: ${triggerMin}%`);
    await issueAutoPumpCommand(true, 'soil_low', soilMoisture);
  }
}

/**
 * Tulis perintah pompa otomatis ke Firebase.
 * @param {boolean} commandOn  - true = nyala, false = mati
 * @param {string}  reason     - alasan
 * @param {number}  soilValue  - nilai soil saat perintah dikeluarkan
 */
async function issueAutoPumpCommand(commandOn, reason, soilValue) {
  const now = Date.now();

  await dbSet('/pump/command', {
    value    : commandOn,
    issuedBy : 'auto_system',
    reason   : reason,
    issuedAt : now,
  });

  // Update lastActivated / lastDeactivated
  if (commandOn) {
    await dbUpdate('/pump', { lastActivated: now });
  } else {
    await dbUpdate('/pump', { lastDeactivated: now });
    // Catat ke history
    const pumpNow = await dbGet('/pump');
    await logPumpStop(pumpNow, soilValue, reason);
  }
}

/**
 * Catat peristiwa pompa berhenti ke /pumpHistory.
 * @param {object} pumpData
 * @param {number} soilAfter
 * @param {string} stopReason
 */
async function logPumpStop(pumpData, soilAfter, stopReason) {
  if (!pumpData) return;

  const startedAt    = pumpData.lastActivated    ?? 0;
  const stoppedAt    = pumpData.lastDeactivated  ?? Date.now();
  const durationSec  = Math.round((stoppedAt - startedAt) / 1000);

  await dbPush('/pumpHistory', {
    startedAt,
    stoppedAt,
    durationSec,
    mode        : pumpData.mode   ?? 'auto',
    triggerReason: stopReason,
    soilBefore  : null,     // Tidak disimpan saat start (untuk disederhanakan)
    soilAfter   : soilAfter ?? null,
  });
}

/**
 * Catat peristiwa pompa nyala ke /pumpHistory (partial).
 * Diperbarui ketika pompa mati dengan soilAfter.
 */
async function logPumpStart(mode, soilBefore, reason) {
  const key = await dbPush('/pumpHistory', {
    startedAt   : Date.now(),
    stoppedAt   : null,
    durationSec : null,
    mode,
    triggerReason: reason,
    soilBefore  : soilBefore ?? null,
    soilAfter   : null,
  });
  return key;
}

module.exports = {
  evaluateAutoPump,
  issueAutoPumpCommand,
  logPumpStop,
  logPumpStart,
};

