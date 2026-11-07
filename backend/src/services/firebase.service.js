'use strict';

/**
 * firebase.service.js
 * Wrapper Firebase Admin SDK — satu-satunya titik akses ke database.
 * Semua read/write Firebase di backend wajib melalui fungsi-fungsi ini.
 *
 * Optimasi:
 * - Mendukung Atomic Multi-Location Updates (dbMultiUpdate)
 * - In-Memory Caching dengan TTL untuk data yang jarang berubah
 *   (mengeliminasi multiple sequential network round-trips)
 */

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

let initialized = false;

// In-Memory Cache untuk optimasi query pembacaan
const memoryCache = new Map();

/**
 * Inisialisasi Firebase Admin SDK menggunakan Service Account.
 * Mendukung pembacaan dari file path (FIREBASE_SERVICE_ACCOUNT_PATH)
 * atau JSON string langsung (FIREBASE_SERVICE_ACCOUNT_JSON).
 */
function initFirebase() {
  if (initialized) return true;

  const saPath  = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const saJson  = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const dbUrl   = process.env.FIREBASE_DATABASE_URL || 'https://pengawas-tanaman-4f599-default-rtdb.firebaseio.com';

  let serviceAccount = null;

  try {
    if (saJson) {
      serviceAccount = JSON.parse(saJson);
    } else if (saPath) {
      const resolvedPath = path.resolve(saPath);
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      } else {
        console.warn(`\n⚠️  [Firebase] File Service Account tidak ditemukan di: ${resolvedPath}`);
        console.warn('   Unduh serviceAccountKey.json dari Firebase Console dan atur FIREBASE_SERVICE_ACCOUNT_PATH di .env\n');
        return false;
      }
    } else {
      console.warn('\n⚠️  [Firebase] Belum ada konfigurasi Service Account di .env');
      console.warn('   Atur FIREBASE_SERVICE_ACCOUNT_PATH atau FIREBASE_SERVICE_ACCOUNT_JSON di file .env\n');
      return false;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential : admin.credential.cert(serviceAccount),
        databaseURL: dbUrl,
      });
    }

    initialized = true;
    console.log(`✅ Firebase Admin SDK terhubung (${dbUrl})`);
    return true;
  } catch (err) {
    console.error('❌ Gagal inisialisasi Firebase Admin SDK:', err.message);
    return false;
  }
}

/**
 * Cek apakah Firebase sudah terhubung.
 * @returns {boolean}
 */
function isFirebaseInitialized() {
  return initialized && admin.apps.length > 0;
}

/**
 * Memastikan Firebase siap digunakan sebelum melakukan query.
 */
function ensureInitialized() {
  if (!initialized && !initFirebase()) {
    const error = new Error('Firebase belum terhubung. Konfigurasikan FIREBASE_SERVICE_ACCOUNT_PATH dan FIREBASE_DATABASE_URL di file .env');
    error.status = 503;
    throw error;
  }
}

/**
 * Mengembalikan referensi Database root.
 * @returns {admin.database.Database}
 */
function getDatabase() {
  ensureInitialized();
  return admin.database();
}

/**
 * Baca data satu kali dari path tertentu (langsung ke Firebase).
 * @param {string} dbPath
 * @returns {Promise<any>} nilai data (null jika tidak ada)
 */
async function dbGet(dbPath) {
  ensureInitialized();
  const snap = await admin.database().ref(dbPath).once('value');
  const val = snap.val();
  // Update cache
  memoryCache.set(dbPath, { val, expiry: Date.now() + 10000 });
  return val;
}

/**
 * Baca data dengan in-memory cache TTL untuk mengeliminasi network latency.
 * Jika data ada di cache dan belum expired, mengembalikan seketika (0 ms).
 * @param {string} dbPath
 * @param {number} ttlMs (default: 10000 ms / 10 detik)
 * @returns {Promise<any>}
 */
async function dbGetCached(dbPath, ttlMs = 10000) {
  const cached = memoryCache.get(dbPath);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    return cached.val;
  }

  // Cache miss / expired: fetch dari Firebase
  return dbGet(dbPath);
}

/**
 * Invalidate cache untuk path tertentu.
 * @param {string} dbPath
 */
function invalidateCache(dbPath) {
  memoryCache.delete(dbPath);
}

/**
 * Tulis (overwrite) data pada path tertentu.
 * @param {string} dbPath
 * @param {any} data
 */
async function dbSet(dbPath, data) {
  ensureInitialized();
  await admin.database().ref(dbPath).set(data);
  memoryCache.set(dbPath, { val: data, expiry: Date.now() + 10000 });
}

/**
 * Update sebagian data pada path tertentu (merge, bukan overwrite).
 * @param {string} dbPath
 * @param {object} data
 */
async function dbUpdate(dbPath, data) {
  ensureInitialized();
  await admin.database().ref(dbPath).update(data);
  invalidateCache(dbPath);
}

/**
 * Atomic Multi-Location Update (satu network packet untuk banyak path).
 * Sangat penting untuk performa tinggi sensor ingestion.
 * @param {object} updates Map dari path ke nilai { '/path/a': valA, '/path/b': valB }
 */
async function dbMultiUpdate(updates) {
  ensureInitialized();
  await admin.database().ref().update(updates);
  // Invalidate any cached root nodes affected
  for (const k of Object.keys(updates)) {
    for (const cachedKey of memoryCache.keys()) {
      if (k.startsWith(cachedKey) || cachedKey.startsWith(k)) {
        memoryCache.delete(cachedKey);
      }
    }
  }
}

/**
 * Push data baru dengan auto-generated key pada path tertentu.
 * @param {string} dbPath
 * @param {any} data
 * @returns {Promise<string>} key yang dihasilkan
 */
async function dbPush(dbPath, data) {
  ensureInitialized();
  const ref = await admin.database().ref(dbPath).push(data);
  return ref.key;
}

/**
 * Hapus node pada path tertentu.
 * @param {string} dbPath
 */
async function dbRemove(dbPath) {
  ensureInitialized();
  await admin.database().ref(dbPath).remove();
  invalidateCache(dbPath);
}

/**
 * Verifikasi Firebase ID Token yang dikirim oleh frontend.
 * @param {string} idToken
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
async function verifyIdToken(idToken) {
  ensureInitialized();
  return admin.auth().verifyIdToken(idToken);
}

module.exports = {
  initFirebase,
  isFirebaseInitialized,
  getDatabase,
  dbGet,
  dbGetCached,
  invalidateCache,
  dbSet,
  dbUpdate,
  dbMultiUpdate,
  dbPush,
  dbRemove,
  verifyIdToken,
  admin,
};
