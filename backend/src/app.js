'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { initFirebase, isFirebaseInitialized } = require('./services/firebase.service');
const errorHandler = require('./middleware/errorHandler');

// Routes
const sensorRoutes = require('./routes/sensor.routes');
const plantRoutes = require('./routes/plant.routes');
const aiRoutes = require('./routes/ai.routes');
const pumpRoutes = require('./routes/pump.routes');
const historyRoutes = require('./routes/history.routes');
const deviceRoutes = require('./routes/device.routes');

// ─── Inisialisasi Firebase Admin jika konfigurasi tersedia ───────────────────
initFirebase();

const app = express();

// ─── Security & Logging Middleware ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Memungkinkan frontend memuat resource tanpa blokir CSP
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Static Files (Frontend UI jika public/ ada) ──────────────────────────────
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// ─── CORS (Mendukung localhost, IP lokal, dan Cloud Deployment) ───────────────
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (ESP32, curl, Postman, Python simulator)
    if (!origin) return callback(null, true);
    // Izinkan jika wildcard '*', origin ada di daftar, atau saat mode development
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin tidak diizinkan — ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Health Check & Diagnostics ───────────────────────────────────────────────
app.get('/', (_req, res) => {
  const indexHtml = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.json({
    status: 'online',
    service: 'pengawas-tanaman-backend',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      sensorLatest: '/api/sensor/latest',
      pumpStatus: '/api/pump'
    },
    time: new Date().toISOString()
  });
});

app.get('/api/health', (_req, res) => {
  const fbConnected = isFirebaseInitialized();
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  );

  res.json({
    status: 'ok',
    service: 'pengawas-tanaman-backend',
    firebase: fbConnected ? 'connected' : 'unconfigured',
    gemini: geminiConfigured ? 'configured' : 'unconfigured',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/sensor', sensorRoutes);
app.use('/api/plant', plantRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/device', deviceRoutes);

// ─── Frontend SPA Fallback ───────────────────────────────────────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const indexHtml = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  next();
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
