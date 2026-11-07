'use strict';

/**
 * sensorValidation.js
 * Validasi fisik data sensor dan konversi ADC soil moisture.
 *
 * CATATAN:
 * - Batas di sini adalah batas FISIK hardware (DHT22, ADC, BH1750).
 * - Bukan threshold tanaman — threshold tanaman ada di /plantRequirements Firebase.
 * - Konversi ADC menggunakan nilai kalibrasi aktual dari /device/esp32/calibration.
 */

// ─── Batas fisik sensor (dari env atau nilai default) ─────────────────────────
const PHYSICAL_RANGES = {
  temperature:     { min: parseFloat(process.env.SENSOR_TEMP_MIN     ?? -40), max: parseFloat(process.env.SENSOR_TEMP_MAX     ?? 80)    },
  airHumidity:     { min: parseFloat(process.env.SENSOR_HUMIDITY_MIN  ?? 0),  max: parseFloat(process.env.SENSOR_HUMIDITY_MAX  ?? 100)  },
  soilMoistureRaw: { min: parseFloat(process.env.SENSOR_SOIL_RAW_MIN  ?? 0),  max: parseFloat(process.env.SENSOR_SOIL_RAW_MAX  ?? 4095) },
  lightLux:        { min: parseFloat(process.env.SENSOR_LUX_MIN       ?? 0),  max: parseFloat(process.env.SENSOR_LUX_MAX       ?? 65535)},
};

/**
 * Konversi nilai ADC mentah menjadi persentase kelembapan tanah.
 * Menggunakan nilai kalibrasi aktual (bukan asumsi).
 *
 * Formula: persen = 100 - ((raw - wet) / (dry - wet) * 100)
 * Clamp hasil ke [0, 100].
 *
 * @param {number} rawADC       - Nilai ADC yang dibaca ESP32
 * @param {number} dryValue     - ADC saat sensor kering (kalibrasi aktual)
 * @param {number} wetValue     - ADC saat sensor di air (kalibrasi aktual)
 * @returns {{ percent: number, warning: string|null }}
 */
function convertSoilMoisture(rawADC, dryValue, wetValue) {
  // Jika kalibrasi belum dilakukan / nilainya identik, kembalikan null + warning
  if (dryValue === undefined || wetValue === undefined) {
    return { percent: null, warning: 'Kalibrasi soil moisture belum dikonfigurasi' };
  }
  if (dryValue === wetValue) {
    return { percent: null, warning: 'Nilai kalibrasi DRY dan WET identik — kalibrasi ulang diperlukan' };
  }

  const range   = dryValue - wetValue;
  let   percent = 100 - ((rawADC - wetValue) / range * 100);

  // Clamp
  percent = Math.max(0, Math.min(100, percent));

  return { percent: parseFloat(percent.toFixed(1)), warning: null };
}

/**
 * Validasi data sensor yang diterima dari ESP32.
 * Mengembalikan { valid, errors, fields } — fields berisi nilai yang sudah divalidasi.
 *
 * @param {object} data - Payload dari ESP32
 * @returns {{ valid: boolean, errors: string[], fields: object }}
 */
function validateSensorPayload(data) {
  const errors = [];
  const fields = {};

  // Fungsi helper: periksa tipe number dan range fisik
  function checkField(name, value, range) {
    if (value === undefined || value === null) {
      errors.push(`Field '${name}' wajib ada`);
      return false;
    }
    const num = Number(value);
    if (isNaN(num)) {
      errors.push(`Field '${name}' harus berupa angka, diterima: ${value}`);
      return false;
    }
    if (num < range.min || num > range.max) {
      errors.push(`Field '${name}' di luar batas fisik (${range.min}–${range.max}), diterima: ${num}`);
      return false;
    }
    fields[name] = num;
    return true;
  }

  checkField('temperature',     data.temperature,     PHYSICAL_RANGES.temperature);
  checkField('airHumidity',     data.airHumidity,     PHYSICAL_RANGES.airHumidity);
  checkField('soilMoistureRaw', data.soilMoistureRaw, PHYSICAL_RANGES.soilMoistureRaw);
  checkField('lightLux',        data.lightLux,        PHYSICAL_RANGES.lightLux);

  // timestamp wajib ada, berupa angka positif, dan realistis (minimal tahun 2020)
  // Menghindari perbedaan epoch MicroPython (tahun 2000) vs Unix (tahun 1970)
  if (data.timestamp && !isNaN(Number(data.timestamp)) && Number(data.timestamp) > 1577836800000) {
    fields.timestamp = Number(data.timestamp);
  } else {
    // Gunakan server timestamp jika tidak ada / tidak valid
    fields.timestamp = Date.now();
  }

  return {
    valid : errors.length === 0,
    errors,
    fields,
  };
}

/**
 * Periksa apakah nilai sensor melampaui threshold tanaman (ideal/warning).
 * Mengembalikan array alert yang perlu ditrigerkan atau di-resolve.
 *
 * @param {object} sensorData   - Data sensor yang sudah dikonversi
 * @param {object} requirements - /plantRequirements dari Firebase
 * @returns {Array<{ type: string, level: 'warning'|'danger', value: number, threshold: number, message: string }>}
 */
function checkThresholds(sensorData, requirements) {
  if (!requirements) return [];

  const alerts = [];

  function checkParam(paramKey, value, label, unit) {
    const req = requirements[paramKey];
    if (!req || value === null || value === undefined) return;

    const { ideal, warning } = req;

    if (warning) {
      if (value < warning.min) {
        alerts.push({
          type     : `${paramKey}_low`,
          level    : value < (ideal?.min ?? warning.min) ? 'danger' : 'warning',
          value,
          threshold: warning.min,
          message  : `${label} terlalu rendah: ${value}${unit} (batas: ${warning.min}${unit})`,
        });
      } else if (value > warning.max) {
        alerts.push({
          type     : `${paramKey}_high`,
          level    : value > (ideal?.max ?? warning.max) ? 'danger' : 'warning',
          value,
          threshold: warning.max,
          message  : `${label} terlalu tinggi: ${value}${unit} (batas: ${warning.max}${unit})`,
        });
      }
    }
  }

  checkParam('soilMoisture', sensorData.soilMoisture, 'Kelembapan tanah', '%');
  checkParam('temperature',  sensorData.temperature,  'Suhu udara',       '°C');
  checkParam('airHumidity',  sensorData.airHumidity,  'Kelembapan udara', '%');

  // Cahaya — gunakan minLux/maxLux
  const lightReq = requirements.light;
  if (lightReq && sensorData.lightLux !== null) {
    const lux = sensorData.lightLux;
    if (lightReq.warning?.minLux !== undefined && lux < lightReq.warning.minLux) {
      alerts.push({
        type     : 'light_low',
        level    : lux < (lightReq.ideal?.minLux ?? lightReq.warning.minLux) ? 'danger' : 'warning',
        value    : lux,
        threshold: lightReq.warning.minLux,
        message  : `Intensitas cahaya rendah: ${lux} lux (batas: ${lightReq.warning.minLux} lux)`,
      });
    }
  }

  return alerts;
}

module.exports = {
  convertSoilMoisture,
  validateSensorPayload,
  checkThresholds,
  PHYSICAL_RANGES,
};

