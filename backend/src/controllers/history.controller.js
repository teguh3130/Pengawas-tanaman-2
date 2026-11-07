'use strict';

/**
 * history.controller.js
 * Controller riwayat data sensor dan pompa.
 */

const { getDatabase } = require('../services/firebase.service');

const PERIOD_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d' :  7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

/**
 * GET /api/history/sensor?period=24h|7d|30d
 * Baca riwayat sensor, filter berdasarkan periode.
 */
async function getSensorHistory(req, res, next) {
  try {
    const period = req.query.period || '24h';
    const cutoff = Date.now() - (PERIOD_MS[period] ?? PERIOD_MS['24h']);

    const db   = getDatabase();
    const snap = await db.ref('/sensorData/history')
      .orderByChild('timestamp')
      .startAt(cutoff)
      .once('value');

    const records = [];
    snap.forEach(child => {
      records.push({ key: child.key, ...child.val() });
    });

    // Urutkan ascending berdasarkan timestamp
    records.sort((a, b) => a.timestamp - b.timestamp);

    res.json({
      success: true,
      period,
      count  : records.length,
      data   : records,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/history/pump
 * Baca riwayat aktivasi pompa.
 */
async function getPumpHistory(req, res, next) {
  try {
    const db   = getDatabase();
    const snap = await db.ref('/pumpHistory')
      .orderByChild('startedAt')
      .limitToLast(100)
      .once('value');

    const records = [];
    snap.forEach(child => {
      records.push({ key: child.key, ...child.val() });
    });

    records.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/history/prune
 * Hapus history yang melebihi batas maksimum.
 */
async function pruneHistory(req, res, next) {
  try {
    const maxRecords = parseInt(req.query.max ?? process.env.MAX_HISTORY_RECORDS ?? 2016);

    const db   = getDatabase();
    const snap = await db.ref('/sensorData/history')
      .orderByKey()
      .once('value');

    const count    = snap.numChildren();
    const toRemove = Math.max(0, count - maxRecords);

    if (toRemove === 0) {
      return res.json({ success: true, message: 'Tidak ada yang dihapus', count, maxRecords });
    }

    let removed = 0;
    const promises = [];
    snap.forEach(child => {
      if (removed < toRemove) {
        promises.push(child.ref.remove());
        removed++;
      }
    });

    await Promise.all(promises);

    res.json({ success: true, removed, remaining: count - removed, maxRecords });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSensorHistory, getPumpHistory, pruneHistory };
