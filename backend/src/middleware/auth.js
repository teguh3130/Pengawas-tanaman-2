'use strict';

/**
 * auth.js — Middleware Autentikasi
 *
 * Dua lapisan autentikasi:
 * 1. authenticateDevice  — untuk request dari ESP32 (Static Bearer Token)
 * 2. authenticateUser    — untuk request dari Frontend (Firebase Anonymous ID Token)
 */

const { verifyIdToken } = require('../services/firebase.service');

/**
 * Autentikasi ESP32 menggunakan Static Bearer Token.
 * Token dibandingkan dengan ESP32_DEVICE_TOKEN di environment variable.
 *
 * Header yang diharapkan: Authorization: Bearer <token>
 */
function authenticateDevice(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error  : 'Autentikasi diperlukan — sertakan header Authorization: Bearer <device_token>',
    });
  }

  const token         = authHeader.slice(7).trim();
  const expectedToken = process.env.ESP32_DEVICE_TOKEN;

  if (!expectedToken) {
    console.error('⚠️  ESP32_DEVICE_TOKEN tidak dikonfigurasi di .env');
    return res.status(500).json({ success: false, error: 'Konfigurasi server tidak lengkap' });
  }

  if (token !== expectedToken) {
    return res.status(401).json({
      success: false,
      error  : 'Device token tidak valid',
    });
  }

  // Tandai request sebagai terautentikasi oleh device ESP32
  req.deviceAuthenticated = true;
  next();
}

/**
 * Autentikasi Frontend menggunakan Firebase Anonymous ID Token.
 * Token diverifikasi menggunakan Firebase Admin SDK.
 *
 * Header yang diharapkan: Authorization: Bearer <firebase_id_token>
 */
async function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error  : 'Autentikasi diperlukan — sertakan header Authorization: Bearer <firebase_id_token>',
    });
  }

  const idToken = authHeader.slice(7).trim();

  try {
    const decoded       = await verifyIdToken(idToken);
    req.user            = decoded;  // { uid, firebase: { ... } }
    req.userAuthenticated = true;
    next();
  } catch (err) {
    console.warn(`⚠️  Verifikasi ID Token gagal: ${err.message}`);
    return res.status(401).json({
      success: false,
      error  : 'Token tidak valid atau kedaluwarsa — login ulang diperlukan',
    });
  }
}

module.exports = { authenticateDevice, authenticateUser };

