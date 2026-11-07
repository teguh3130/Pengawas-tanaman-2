'use strict';

/**
 * validate.js — Middleware Validasi Input menggunakan express-validator
 */

const { body, query, validationResult } = require('express-validator');

/**
 * Middleware: tangani dan kembalikan error validasi jika ada.
 * Pasang SETELAH chain validasi.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error  : 'Data tidak valid',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/**
 * Validasi payload data sensor dari ESP32.
 * Hanya cek tipe data — range fisik dicek di sensorValidation.js.
 */
const validateSensorData = [
  body('temperature')
    .notEmpty().withMessage('temperature wajib ada')
    .isFloat().withMessage('temperature harus berupa angka'),
  body('airHumidity')
    .notEmpty().withMessage('airHumidity wajib ada')
    .isFloat().withMessage('airHumidity harus berupa angka'),
  body('soilMoistureRaw')
    .notEmpty().withMessage('soilMoistureRaw wajib ada')
    .isInt({ min: 0, max: 4095 }).withMessage('soilMoistureRaw harus integer 0–4095'),
  body('lightLux')
    .notEmpty().withMessage('lightLux wajib ada')
    .isFloat({ min: 0 }).withMessage('lightLux harus angka >= 0'),
  body('isSimulator')
    .optional()
    .isBoolean().withMessage('isSimulator harus boolean'),
  body('source')
    .optional()
    .isString().withMessage('source harus string'),
  handleValidationErrors,
];

/**
 * Validasi konfigurasi tanaman dari frontend (form onboarding).
 */
const validatePlantConfig = [
  body('name')
    .notEmpty().withMessage('Nama tanaman wajib diisi')
    .isLength({ max: 100 }).withMessage('Nama tanaman maksimal 100 karakter')
    .trim(),
  body('type')
    .notEmpty().withMessage('Jenis tanaman wajib diisi')
    .isLength({ max: 100 }).withMessage('Jenis tanaman maksimal 100 karakter')
    .trim(),
  body('variety')
    .optional()
    .isLength({ max: 100 }).withMessage('Varietas maksimal 100 karakter')
    .trim(),
  body('location')
    .notEmpty().withMessage('Lokasi wajib diisi')
    .isLength({ max: 200 }).withMessage('Lokasi maksimal 200 karakter')
    .trim(),
  body('startedAt')
    .optional()
    .isInt({ min: 0 }).withMessage('startedAt harus berupa timestamp millisecond'),
  body('additionalInfo')
    .optional()
    .isLength({ max: 500 }).withMessage('Informasi tambahan maksimal 500 karakter')
    .trim(),
  handleValidationErrors,
];

/**
 * Validasi perintah pompa dari frontend.
 */
const validatePumpCommand = [
  body('command')
    .notEmpty().withMessage('command wajib ada')
    .isBoolean().withMessage('command harus boolean (true/false)'),
  handleValidationErrors,
];

/**
 * Validasi update mode pompa.
 */
const validatePumpMode = [
  body('mode')
    .notEmpty().withMessage('mode wajib ada')
    .isIn(['auto', 'manual']).withMessage("mode harus 'auto' atau 'manual'"),
  handleValidationErrors,
];

/**
 * Validasi update batas parameter tanaman oleh user.
 */
const validateRequirementsUpdate = [
  body('soilMoisture.ideal.min').optional().isFloat({ min: 0, max: 100 }),
  body('soilMoisture.ideal.max').optional().isFloat({ min: 0, max: 100 }),
  body('soilMoisture.warning.min').optional().isFloat({ min: 0, max: 100 }),
  body('soilMoisture.warning.max').optional().isFloat({ min: 0, max: 100 }),
  body('temperature.ideal.min').optional().isFloat({ min: -50, max: 100 }),
  body('temperature.ideal.max').optional().isFloat({ min: -50, max: 100 }),
  body('temperature.warning.min').optional().isFloat({ min: -50, max: 100 }),
  body('temperature.warning.max').optional().isFloat({ min: -50, max: 100 }),
  body('airHumidity.ideal.min').optional().isFloat({ min: 0, max: 100 }),
  body('airHumidity.ideal.max').optional().isFloat({ min: 0, max: 100 }),
  body('airHumidity.warning.min').optional().isFloat({ min: 0, max: 100 }),
  body('airHumidity.warning.max').optional().isFloat({ min: 0, max: 100 }),
  body('light.ideal.minLux').optional().isFloat({ min: 0 }),
  body('light.ideal.maxLux').optional().isFloat({ min: 0 }),
  body('light.warning.minLux').optional().isFloat({ min: 0 }),
  body('light.warning.maxLux').optional().isFloat({ min: 0 }),
  body('light.dailyDurationHours').optional().isFloat({ min: 0, max: 24 }),
  handleValidationErrors,
];

/**
 * Validasi data kalibrasi soil moisture dari ESP32.
 */
const validateCalibration = [
  body('soilDry')
    .notEmpty().withMessage('soilDry wajib ada')
    .isInt({ min: 0, max: 4095 }).withMessage('soilDry harus integer 0–4095'),
  body('soilWet')
    .notEmpty().withMessage('soilWet wajib ada')
    .isInt({ min: 0, max: 4095 }).withMessage('soilWet harus integer 0–4095'),
  handleValidationErrors,
];

/**
 * Validasi query parameter history (period).
 */
const validateHistoryQuery = [
  query('period')
    .optional()
    .isIn(['24h', '7d', '30d']).withMessage("period harus '24h', '7d', atau '30d'"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateSensorData,
  validatePlantConfig,
  validatePumpCommand,
  validatePumpMode,
  validateRequirementsUpdate,
  validateCalibration,
  validateHistoryQuery,
};

