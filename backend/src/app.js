'use strict';

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const { initFirebase, isFirebaseInitialized } = require('./services/firebase.service');
const errorHandler = require('./middleware/errorHandler');

// Routes
const sensorRoutes  = require('./routes/sensor.routes');
const plantRoutes   = require('./routes/plant.routes');
const aiRoutes      = require('./routes/ai.routes');
const pumpRoutes    = require('./routes/pump.routes');
const historyRoutes = require('./routes/history.routes');
const deviceRoutes  = require('./routes/device.routes');

// ─── Inisialisasi Firebase Admin jika konfigurasi tersedia ───────────────────
initFirebase();

const app = express();

// ─── Security & Logging Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (ESP32, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin tidak diizinkan — ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Health Check & Diagnostics ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const fbConnected = isFirebaseInitialized();
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  );

  res.json({
    status     : 'ok',
    service    : 'pengawas-tanaman-backend',
    firebase   : fbConnected ? 'connected' : 'unconfigured',
    gemini     : geminiConfigured ? 'configured' : 'unconfigured',
    environment: process.env.NODE_ENV || 'development',
    time       : new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/sensor',  sensorRoutes);
app.use('/api/plant',   plantRoutes);
app.use('/api/ai',      aiRoutes);
app.use('/api/pump',    pumpRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/device',  deviceRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
