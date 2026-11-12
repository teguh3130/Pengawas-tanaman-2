'use strict';

/**
 * sensor.controller.js
 * Controller untuk endpoint sensor ESP32 / Simulator.
 *
 * Optimasi Performa:
 * - Atomic Multi-Location Update (1 network call menggantikan 4+ sequential round-trips)
 * - In-Memory Caching untuk calibration, plantRequirements, dan pump state
 * - Throttled Background Tasks (pruneHistoryAsync & updateDailyLightAsync)
 * - Logging durasi penyimpanan Firebase (fbDurationMs)
 */

const {
  getDatabase,
  dbGet,
  dbGetCached,
  dbSet,
  dbUpdate,
  dbMultiUpdate,
  dbPush,
  dbRemove,
} = require('../services/firebase.service');

const { validateSensorPayload, convertSoilMoisture, checkThresholds } = require('../utils/sensorValidation');
const { evaluateAutoPump } = require('../services/pump.service');

const MAX_HISTORY = parseInt(process.env.MAX_HISTORY_RECORDS ?? 2016);
const OFFLINE_THRESHOLD_MS = parseInt(process.env.DEVICE_OFFLINE_THRESHOLD_SEC ?? 300) * 1000;

// Throttle timestamps
let lastPruneTimestamp = 0;
let lastLightUpdateTimestamp = 0;
let cachedActiveAlerts = null;
let lastAlertsFetchTime = 0;

/**
 * POST /api/sensor
 * Menerima data sensor dari ESP32 atau Simulator.
 * Memvalidasi, mengonversi ADC, dan menyimpan secara atomik ke Firebase.
 */
async function postSensorData(req, res, next) {
  const reqStart = Date.now();
  try {
    // ── 1. Validasi fisik payload ──────────────────────────────────────────
    const { valid, errors, fields } = validateSensorPayload(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Data sensor tidak valid', details: errors });
    }

    // ── 2. Ambil kalibrasi soil moisture (cached in-memory, 15s TTL) ─────────
    const calibration = await dbGetCached('/device/esp32/calibration', 15000);
    const dryValue    = calibration?.soilDry;
    const wetValue    = calibration?.soilWet;

    const { percent: soilMoisture, warning: calWarning } = convertSoilMoisture(
      fields.soilMoistureRaw, dryValue, wetValue
    );

    if (calWarning && !postSensorData._warnedCal) {
      console.warn(`⚠️  Soil moisture: ${calWarning}`);
      postSensorData._warnedCal = true;
    }

    // ── 3. Susun data record ───────────────────────────────────────────────
    const isSimulator = Boolean(req.body.isSimulator || req.body.source === 'SIMULATOR');
    const sensorRecord = {
      temperature    : fields.temperature,
      airHumidity    : fields.airHumidity,
      soilMoistureRaw: fields.soilMoistureRaw,
      soilMoisture   : soilMoisture,
      lightLux       : fields.lightLux,
      timestamp      : fields.timestamp,
      valid          : soilMoisture !== null,
      isSimulator    : isSimulator,
      source         : isSimulator ? 'SIMULATOR' : 'HARDWARE',
    };

    const historyRecord = {
      temperature : fields.temperature,
      airHumidity : fields.airHumidity,
      soilMoisture: soilMoisture,
      lightLux    : fields.lightLux,
      timestamp   : fields.timestamp,
      isSimulator : isSimulator,
      source      : isSimulator ? 'SIMULATOR' : 'HARDWARE',
    };

    // ── 4. Atomic Multi-Location Update (Satu Kali Kirim ke Firebase) ───────
    const fbStart = Date.now();
    const db = getDatabase();
    // Generate key locally (instant synchronous operation di Firebase Admin SDK)
    const historyKey = db.ref('/sensorData/history').push().key;

    const now = Date.now();
    const updates = {
      '/sensorData/latest'               : sensorRecord,
      [`/sensorData/history/${historyKey}`]: historyRecord,
      '/device/esp32/online'             : true,
      '/device/esp32/lastSeen'           : now,
      '/device/esp32/lastSource'         : isSimulator ? 'SIMULATOR' : 'HARDWARE',
    };

    await dbMultiUpdate(updates);
    const fbDurationMs = Date.now() - fbStart;

    // ── 5. Throttled Background Tasks (Non-blocking) ───────────────────────
    // Prune history maksimal sekali per 30 menit agar tidak membebani network
    pruneHistoryThrottled(MAX_HISTORY);

    // ── 6. Periksa threshold dan evaluasi alerts (Cached 15s) ───────────────
    const requirements = await dbGetCached('/plantRequirements', 15000);

    // Akumulasi durasi cahaya maksimal sekali per 30 detik
    updateDailyLightThrottled(fields.lightLux, fields.timestamp, requirements);
    const alertsTriggered = checkThresholds(sensorRecord, requirements);
    updateAlertsOptimized(alertsTriggered).catch((err) =>
      console.error('⚠️  Gagal update alerts:', err.message)
    );

    // ── 7. Evaluasi pompa otomatis (Cached 5s) ──────────────────────────────
    const pumpData = await dbGetCached('/pump', 5000);
    if (pumpData?.mode === 'auto') {
      evaluateAutoPump(sensorRecord, pumpData, requirements).catch((err) =>
        console.error('⚠️  Gagal evaluasi auto pump:', err.message)
      );
    }

    const totalDurationMs = Date.now() - reqStart;

    return res.json({
      success       : true,
      received      : sensorRecord,
      fbDurationMs  : fbDurationMs,
      totalDurationMs: totalDurationMs,
      calWarning    : calWarning || undefined,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sensor/latest
 */
async function getLatestSensor(req, res, next) {
  try {
    const latest = await dbGetCached('/sensorData/latest', 3000);
    if (!latest) {
      return res.status(404).json({ success: false, error: 'Belum ada data sensor' });
    }

    const dateWIB = new Date(Date.now() + 7 * 3600 * 1000);
    const dateKey = dateWIB.toISOString().slice(0, 10);
    const dailyLight = await dbGetCached(`/sensorData/dailyLight/${dateKey}`, 15000);

    res.json({
      success: true,
      data: {
        ...latest,
        dailyLight: dailyLight || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pump/status
 * ESP32 / Simulator melaporkan status relay aktual setelah eksekusi.
 */
async function reportPumpStatus(req, res, next) {
  try {
    const { relayOn } = req.body;

    if (typeof relayOn !== 'boolean') {
      return res.status(400).json({ success: false, error: 'relayOn harus boolean' });
    }

    const now = Date.now();
    const prevStatus = await dbGetCached('/pump/status', 2000);
    const wasOn = prevStatus?.relayOn ?? false;

    // Update status aktual relay
    await dbSet('/pump/status', { relayOn, reportedAt: now });

    // Jika pompa baru mati, catat ke pumpHistory
    if (wasOn && !relayOn) {
      await dbUpdate('/pump', { lastDeactivated: now });

      const pumpData = await dbGetCached('/pump', 5000);
      const soilData = await dbGetCached('/sensorData/latest', 3000);

      await dbPush('/pumpHistory', {
        startedAt    : pumpData?.lastActivated ?? now,
        stoppedAt    : now,
        durationSec  : Math.round((now - (pumpData?.lastActivated ?? now)) / 1000),
        mode         : pumpData?.mode ?? 'unknown',
        triggerReason: 'relay_off_reported',
        soilBefore   : null,
        soilAfter    : soilData?.soilMoisture ?? null,
      });
    }

    // Jika pompa baru nyala, catat lastActivated
    if (!wasOn && relayOn) {
      await dbUpdate('/pump', { lastActivated: now });
    }

    res.json({ success: true, status: { relayOn, reportedAt: now } });
  } catch (err) {
    next(err);
  }
}

// ─── Throttled Prune History (Maksimal 1 kali per 30 menit) ───────────────────
async function pruneHistoryThrottled(maxRecords) {
  const now = Date.now();
  if (now - lastPruneTimestamp < 30 * 60 * 1000) return;
  lastPruneTimestamp = now;

  try {
    const db   = getDatabase();
    const ref  = db.ref('/sensorData/history');
    // Ambil hanya kunci awal secara terbatas jika jumlah record berlebih
    const snap = await ref.orderByKey().limitToFirst(100).once('value');
    const totalCountSnap = await ref.orderByKey().once('value');
    const total = totalCountSnap.numChildren();

    if (total > maxRecords) {
      const toRemove = total - maxRecords;
      let removed = 0;
      totalCountSnap.forEach((child) => {
        if (removed < toRemove) {
          child.ref.remove();
          removed++;
        }
      });
      if (removed > 0) {
        console.log(`🗑️  [History] Berhasil memangkas ${removed} record lama (total sekarang: ${total - removed})`);
      }
    }
  } catch (err) {
    console.error('⚠️  Gagal prune history:', err.message);
  }
}

// ─── Throttled Daily Light (Maksimal 1 kali per 30 detik) ──────────────────────
async function updateDailyLightThrottled(lightLux, timestamp, requirements) {
  const now = Date.now();
  if (now - lastLightUpdateTimestamp < 30 * 1000) return;
  lastLightUpdateTimestamp = now;

  try {
    const dateWIB = new Date(timestamp + 7 * 3600 * 1000);
    const dateKey = dateWIB.toISOString().slice(0, 10);

    const path = `/sensorData/dailyLight/${dateKey}`;
    const existing = await dbGetCached(path, 60000);

    const INTERVAL_SEC = 30;
    const LIGHT_THRESHOLD_LUX = 100;
    const idealMinLux = requirements?.light?.ideal?.minLux ?? 1000;
    const idealMaxLux = requirements?.light?.ideal?.maxLux ?? Infinity;
    const isIdealLight = lightLux >= idealMinLux && lightLux <= idealMaxLux;

    const prevDuration = existing?.durationAboveThresholdSec ?? 0;
    const newDuration  = lightLux >= LIGHT_THRESHOLD_LUX ? prevDuration + INTERVAL_SEC : prevDuration;

    const prevIdealDuration = existing?.durationIdealSec ?? 0;
    const newIdealDuration  = isIdealLight ? prevIdealDuration + INTERVAL_SEC : prevIdealDuration;

    await dbSet(path, {
      durationAboveThresholdSec: newDuration,
      durationIdealSec         : newIdealDuration,
      idealMinLux              : idealMinLux,
      idealMaxLux              : Number.isFinite(idealMaxLux) ? idealMaxLux : null,
      date                     : dateKey,
      updatedAt                : now,
    });
  } catch (err) {
    console.error('⚠️  Gagal update dailyLight:', err.message);
  }
}

// ─── Optimized Alerts Updater ─────────────────────────────────────────────────
async function updateAlertsOptimized(triggeredAlerts) {
  const now = Date.now();

  // Ambil active alerts dengan cache 15 detik
  if (!cachedActiveAlerts || now - lastAlertsFetchTime > 15000) {
    cachedActiveAlerts = (await dbGet('/alerts/active')) || {};
    lastAlertsFetchTime = now;
  }

  const triggeredTypes = triggeredAlerts.map((a) => a.type);
  let changed = false;

  // 1. Tambah alert baru
  for (const alert of triggeredAlerts) {
    if (!cachedActiveAlerts[alert.type]) {
      const newAlert = {
        type        : alert.type,
        level       : alert.level,
        message     : alert.message,
        value       : alert.value,
        threshold   : alert.threshold,
        createdAt   : now,
        acknowledged: false,
      };
      await dbSet(`/alerts/active/${alert.type}`, newAlert);
      cachedActiveAlerts[alert.type] = newAlert;
      changed = true;
    }
  }

  // 2. Resolve alert yang sudah tidak aktif
  for (const existingType of Object.keys(cachedActiveAlerts)) {
    if (!triggeredTypes.includes(existingType)) {
      const resolved = { ...cachedActiveAlerts[existingType], resolvedAt: now };
      await dbPush('/alerts/history', resolved);
      await dbRemove(`/alerts/active/${existingType}`);
      delete cachedActiveAlerts[existingType];
      changed = true;
    }
  }
}

module.exports = { postSensorData, getLatestSensor, reportPumpStatus };
