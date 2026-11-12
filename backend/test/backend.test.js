'use strict';

/**
 * backend.test.js
 * Test suite menyeluruh untuk Backend Sistem Pengawas Tanaman.
 * Menguji:
 * - Validasi fisik sensor dan konversi ADC soil moisture
 * - Evaluasi ambang batas (threshold alerts)
 * - Middleware auth ESP32 (token check)
 * - Middleware error handling
 * - Format routes dan endpoints
 * - Mock request ke express app (health check, 404, input validation)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const {
  convertSoilMoisture,
  validateSensorPayload,
  checkThresholds,
  PHYSICAL_RANGES,
} = require('../src/utils/sensorValidation');

const app = require('../src/app');

// ── 1. Unit Tests: Sensor Validation & Soil Moisture Conversion ────────────────
describe('Sensor Validation & Kalibrasi', () => {
  it('convertSoilMoisture menghitung 0% saat ADC kering dan 100% saat ADC basah', () => {
    const dry = 3500;
    const wet = 1500;

    // Saat sensor di udara (kering) -> 0%
    const dryRes = convertSoilMoisture(3500, dry, wet);
    assert.equal(dryRes.percent, 0);
    assert.equal(dryRes.warning, null);

    // Saat sensor di air (basah) -> 100%
    const wetRes = convertSoilMoisture(1500, dry, wet);
    assert.equal(wetRes.percent, 100);
    assert.equal(wetRes.warning, null);

    // Saat di tengah-tengah -> 50%
    const midRes = convertSoilMoisture(2500, dry, wet);
    assert.equal(midRes.percent, 50);

    // Saat nilai melebihi batas -> clamp di 0% atau 100%
    const overDry = convertSoilMoisture(4000, dry, wet);
    assert.equal(overDry.percent, 0);

    const overWet = convertSoilMoisture(1000, dry, wet);
    assert.equal(overWet.percent, 100);
  });

  it('convertSoilMoisture mengembalikan warning jika kalibrasi belum dikonfigurasi', () => {
    const uncal = convertSoilMoisture(2000, undefined, undefined);
    assert.equal(uncal.percent, null);
    assert.ok(uncal.warning.includes('belum dikonfigurasi'));
  });

  it('validateSensorPayload memvalidasi tipe dan rentang fisik sensor', () => {
    const validData = {
      temperature: 28.5,
      airHumidity: 70.2,
      soilMoistureRaw: 2400,
      lightLux: 15400,
      timestamp: 1730000000000,
    };
    const res = validateSensorPayload(validData);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.fields.temperature, 28.5);

    // Data tidak valid: suhu melebihi batas fisik
    const invalidTemp = { ...validData, temperature: 150 };
    const resBad = validateSensorPayload(invalidTemp);
    assert.equal(resBad.valid, false);
    assert.ok(resBad.errors.some(e => e.includes('temperature')));

    // Data tidak valid: missing field
    const missingField = { temperature: 25 };
    const resMissing = validateSensorPayload(missingField);
    assert.equal(resMissing.valid, false);
    assert.ok(resMissing.errors.length >= 3);
  });

  it('checkThresholds memicu alert warning atau danger dengan benar', () => {
    const requirements = {
      soilMoisture: {
        ideal: { min: 60, max: 80 },
        warning: { min: 40, max: 90 },
      },
      temperature: {
        ideal: { min: 22, max: 32 },
        warning: { min: 18, max: 36 },
      },
      light: {
        ideal: { minLux: 5000, maxLux: 30000 },
        warning: { minLux: 2000, maxLux: 50000 },
      },
    };

    // Kondisi normal: tidak ada alert
    const normalSensor = {
      soilMoisture: 70,
      temperature: 27,
      airHumidity: 65,
      lightLux: 10000,
    };
    assert.equal(checkThresholds(normalSensor, requirements).length, 0);

    // Kondisi bahaya: soil moisture < 40
    const dangerSensor = {
      soilMoisture: 35,
      temperature: 27,
      airHumidity: 65,
      lightLux: 10000,
    };
    const alerts = checkThresholds(dangerSensor, requirements);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'soilMoisture_low');
    assert.equal(alerts[0].threshold, 40);
  });
});

// ── 2. Integration Tests: HTTP Endpoints & Middleware ─────────────────────────
describe('HTTP Endpoints & Middleware Security', () => {
  let server;
  let port;

  function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const reqHeaders = { ...headers };
      if (payload) {
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders,
        },
        res => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            let json = null;
            try { json = JSON.parse(data); } catch { json = data; }
            resolve({ status: res.statusCode, body: json });
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  it('Setup test HTTP server', (t, done) => {
    server = app.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      done();
    });
  });

  it('GET /api/health mengembalikan status ok dan diagnosa layanan', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'pengawas-tanaman-backend');
    assert.ok(res.body.firebase !== undefined);
    assert.ok(res.body.gemini !== undefined);
  });

  it('GET /api/nonexistent mengembalikan 404', async () => {
    const res = await makeRequest('GET', '/api/nonexistent');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('POST /api/sensor menolak request tanpa Authorization header (401)', async () => {
    const res = await makeRequest('POST', '/api/sensor', {}, {
      temperature: 25,
      airHumidity: 60,
      soilMoistureRaw: 2000,
      lightLux: 5000,
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Autentikasi diperlukan'));
  });

  it('POST /api/sensor menolak request dengan Device Token salah (401)', async () => {
    process.env.ESP32_DEVICE_TOKEN = 'secret-token-test-12345678901234';
    const res = await makeRequest(
      'POST',
      '/api/sensor',
      { 'Authorization': 'Bearer token-yang-salah' },
      {
        temperature: 25,
        airHumidity: 60,
        soilMoistureRaw: 2000,
        lightLux: 5000,
      }
    );
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Device token tidak valid');
  });

  it('POST /api/sensor dengan token benar tetapi payload tidak lengkap menghasilkan 400', async () => {
    process.env.ESP32_DEVICE_TOKEN = 'secret-token-test-12345678901234';
    const res = await makeRequest(
      'POST',
      '/api/sensor',
      { 'Authorization': 'Bearer secret-token-test-12345678901234' },
      {
        temperature: 'bukan_angka',
      }
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.details.length > 0);
  });

  it('POST /api/plant/configure memvalidasi input tanaman (400 jika kosong)', async () => {
    const res = await makeRequest('POST', '/api/plant/configure', {}, {});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.details.some(d => d.field === 'name'));
    assert.ok(res.body.details.some(d => d.field === 'type'));
  });

  it('POST /api/pump/command memvalidasi input boolean command (400 jika bukan boolean)', async () => {
    const res = await makeRequest('POST', '/api/pump/command', {}, { command: 'invalid' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.details.some(d => d.field === 'command'));
  });

  it('PUT /api/pump/mode memvalidasi pilihan mode auto/manual (400 jika sembarang)', async () => {
    const res = await makeRequest('PUT', '/api/pump/mode', {}, { mode: 'turbo' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('POST /api/device/calibration memvalidasi integer ADC soilDry dan soilWet (400 jika tidak valid)', async () => {
    const res = await makeRequest('POST', '/api/device/calibration', {}, {
      soilDry: -10,
      soilWet: 5000,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('Teardown test HTTP server', (t, done) => {
    server.close(done);
  });
});

