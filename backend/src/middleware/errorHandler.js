'use strict';

/**
 * errorHandler.js — Global Error Handler Middleware
 * Harus dipasang terakhir di app.js setelah semua route.
 */

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;

  // Jangan bocorkan stack trace di production
  if (process.env.NODE_ENV !== 'production') {
    console.error(`\n❌ Error [${status}] ${req.method} ${req.path}`);
    console.error(err.stack || err.message);
  }

  // Tangani error CORS khusus
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, error: err.message });
  }

  res.status(status).json({
    success: false,
    error  : status < 500 ? err.message : 'Terjadi kesalahan pada server',
    ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
  });
}

module.exports = errorHandler;

