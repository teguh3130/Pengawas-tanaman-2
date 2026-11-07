/**
 * api.js — HTTP API Service untuk Sistem Pengawas Tanaman
 *
 * Mengakses Backend Node.js / Express pada VITE_BACKEND_URL (default: http://localhost:3001).
 * Seluruh komunikasi frontend melewati backend ini (tidak mengakses database langsung).
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Helper fetch dengan timeout dan parsing JSON terpadu.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 12000);
  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { raw: text };
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.detail || `HTTP Error ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Request timeout ke ${endpoint} (>12 detik)`);
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  }
}

// ─── Health & Connection ──────────────────────────────────────────────────────
export async function getHealth() {
  return request('/api/health');
}

// ─── Sensor Data ─────────────────────────────────────────────────────────────
export async function getLatestSensor() {
  return request('/api/sensor/latest');
}

export async function getSensorHistory(period = '24h') {
  return request(`/api/history/sensor?period=${encodeURIComponent(period)}`);
}

// ─── Plant Configuration ──────────────────────────────────────────────────────
export async function getPlant() {
  return request('/api/plant');
}

export async function configurePlant(plantData) {
  return request('/api/plant/configure', {
    method: 'POST',
    body: plantData,
  });
}

export async function getRequirements() {
  return request('/api/plant/requirements');
}

export async function updateRequirements(requirementsData) {
  return request('/api/plant/requirements', {
    method: 'PUT',
    body: requirementsData,
  });
}

// ─── Gemini AI Integration ───────────────────────────────────────────────────
export async function analyzePlantWithAI(plantData) {
  return request('/api/ai/analyze', {
    method: 'POST',
    body: plantData,
    timeout: 30000, // AI prompt mungkin butuh waktu hingga 30 detik
  });
}

// ─── Pump Control & History (Simulation Mode) ─────────────────────────────────
export async function getPumpStatus() {
  return request('/api/pump');
}

export async function sendPumpCommand(command) {
  return request('/api/pump/command', {
    method: 'POST',
    body: { command: Boolean(command) },
  });
}

export async function setPumpMode(mode) {
  return request('/api/pump/mode', {
    method: 'PUT',
    body: { mode },
  });
}

export async function updatePumpAutoConfig(config) {
  return request('/api/pump/auto-config', {
    method: 'PUT',
    body: config,
  });
}

export async function getPumpHistory() {
  return request('/api/history/pump');
}

// ─── Device Status & Calibration ──────────────────────────────────────────────
export async function getDeviceStatus() {
  return request('/api/device/status');
}

export async function getCalibration() {
  return request('/api/device/calibration');
}

export async function saveCalibration(soilDry, soilWet) {
  return request('/api/device/calibration', {
    method: 'POST',
    body: { soilDry: Number(soilDry), soilWet: Number(soilWet) },
  });
}

export default {
  getHealth,
  getLatestSensor,
  getSensorHistory,
  getPlant,
  configurePlant,
  getRequirements,
  updateRequirements,
  analyzePlantWithAI,
  getPumpStatus,
  sendPumpCommand,
  setPumpMode,
  updatePumpAutoConfig,
  getPumpHistory,
  getDeviceStatus,
  getCalibration,
  saveCalibration,
  BASE_URL,
};

