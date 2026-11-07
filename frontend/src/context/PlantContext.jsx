import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const PlantContext = createContext(null);

export function PlantProvider({ children }) {
  // State data utama
  const [sensorData, setSensorData] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [plant, setPlant] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [pump, setPump] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyPeriod, setHistoryPeriod] = useState('24h');
  const [wateringHistory, setWateringHistory] = useState([]);
  const [backendHealth, setBackendHealth] = useState(null);

  // State status & UI
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const pollingRef = useRef(null);
  const pollingInterval = Number(import.meta.env.VITE_POLLING_INTERVAL_MS) || 4000;

  // ─── Fetch Data Sensor Terkini & Device Status ─────────────────────────────
  const fetchLiveStatus = useCallback(async () => {
    try {
      // 1. Health check
      const health = await api.getHealth();
      setBackendHealth(health);
      setIsBackendOnline(true);
      setErrorMessage(null);

      // 2. Data sensor terbaru
      try {
        const sRes = await api.getLatestSensor();
        if (sRes?.success && sRes.data) {
          setSensorData(sRes.data);
        }
      } catch (e) {
        // Belum ada data sensor dikirim, bukan error fatal
        if (e.status !== 404 && e.status !== 503) {
          console.warn('Gagal membaca latest sensor:', e.message);
        }
      }

      // 3. Status pompa
      try {
        const pRes = await api.getPumpStatus();
        if (pRes?.success) {
          setPump(pRes.data);
        }
      } catch (e) {
        // Ignored
      }

      // 4. Status perangkat ESP32 / Simulator
      try {
        const dRes = await api.getDeviceStatus();
        if (dRes?.success) {
          setDeviceStatus(dRes.data);
        }
      } catch (e) {
        // Ignored
      }

      setLastUpdated(new Date());
    } catch (err) {
      setIsBackendOnline(false);
      setErrorMessage(
        `Backend tidak dapat dihubungi (${api.BASE_URL}). Pastikan server backend Node.js sedang berjalan.`
      );
    }
  }, []);

  // ─── Fetch Plant & Requirements ───────────────────────────────────────────
  const fetchPlantData = useCallback(async () => {
    try {
      const pRes = await api.getPlant();
      if (pRes?.success && pRes.data) {
        setPlant(pRes.data);
      }
    } catch (e) {
      if (e.status !== 404) console.warn('Gagal membaca data tanaman:', e.message);
    }

    try {
      const rRes = await api.getRequirements();
      if (rRes?.success && rRes.data) {
        setRequirements(rRes.data);
      }
    } catch (e) {
      if (e.status !== 404) console.warn('Gagal membaca requirements:', e.message);
    }
  }, []);

  // ─── Fetch Riwayat Sensor ──────────────────────────────────────────────────
  const fetchHistory = useCallback(async (period = historyPeriod) => {
    try {
      const hRes = await api.getSensorHistory(period);
      if (hRes?.success && Array.isArray(hRes.data)) {
        setHistoryData(hRes.data);
      }
    } catch (e) {
      console.warn('Gagal mengambil riwayat sensor:', e.message);
    }

    try {
      const wRes = await api.getPumpHistory();
      if (wRes?.success && Array.isArray(wRes.data)) {
        setWateringHistory(wRes.data);
      }
    } catch (e) {
      console.warn('Gagal mengambil riwayat pompa:', e.message);
    }
  }, [historyPeriod]);

  // ─── Refresh All Manually ──────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchLiveStatus(), fetchPlantData(), fetchHistory(historyPeriod)]);
    setIsRefreshing(false);
  }, [fetchLiveStatus, fetchPlantData, fetchHistory, historyPeriod]);

  // ─── Initial Load & Polling Loop ──────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      await Promise.all([fetchLiveStatus(), fetchPlantData(), fetchHistory(historyPeriod)]);
      if (isMounted) setIsLoading(false);
    }

    init();

    // Jalankan background polling
    pollingRef.current = setInterval(() => {
      fetchLiveStatus();
    }, pollingInterval);

    return () => {
      isMounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchLiveStatus, fetchPlantData, fetchHistory, pollingInterval, historyPeriod]);

  // Ketika period berubah, refresh riwayat
  useEffect(() => {
    fetchHistory(historyPeriod);
  }, [historyPeriod, fetchHistory]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const savePlantConfig = async (plantForm) => {
    const res = await api.configurePlant(plantForm);
    if (res?.success) {
      setPlant(res.data);
      return res.data;
    }
    throw new Error(res?.error || 'Gagal menyimpan konfigurasi tanaman');
  };

  const runAiAnalysis = async (plantPayload) => {
    const res = await api.analyzePlantWithAI(plantPayload);
    if (res?.success && res.data) {
      setRequirements(res.data);
      await fetchLiveStatus(); // sync pump auto config
      return res.data;
    }
    throw new Error(res?.error || 'Gagal mendapatkan analisis AI');
  };

  const saveRequirements = async (reqData) => {
    const res = await api.updateRequirements(reqData);
    if (res?.success) {
      setRequirements(res.data);
      return res.data;
    }
    throw new Error(res?.error || 'Gagal menyimpan parameter');
  };

  const togglePump = async (command) => {
    const res = await api.sendPumpCommand(command);
    if (res?.success) {
      await fetchLiveStatus();
      return res;
    }
    throw new Error(res?.error || 'Gagal mengirimkan perintah pompa');
  };

  const changePumpMode = async (mode) => {
    const res = await api.setPumpMode(mode);
    if (res?.success) {
      await fetchLiveStatus();
      return res;
    }
    throw new Error(res?.error || 'Gagal mengubah mode pompa');
  };

  const savePumpAutoConfig = async (config) => {
    const res = await api.updatePumpAutoConfig(config);
    if (res?.success) {
      await fetchLiveStatus();
      return res.data;
    }
    throw new Error(res?.error || 'Gagal memperbarui konfigurasi otomatis');
  };

  const saveDeviceCalibration = async (dry, wet) => {
    const res = await api.saveCalibration(dry, wet);
    if (res?.success) {
      await fetchLiveStatus();
      return res.calibration;
    }
    throw new Error(res?.error || 'Gagal menyimpan kalibrasi');
  };

  // Indikator Sumber Data: SIMULATED vs REAL
  // Prioritas deteksi: dari data sensor terakhir, atau dari status device
  const isSimulator = Boolean(
    sensorData?.isSimulator ||
    sensorData?.source === 'SIMULATOR' ||
    deviceStatus?.lastSource === 'SIMULATOR'
  );

  const value = {
    sensorData,
    deviceStatus,
    plant,
    requirements,
    pump,
    historyData,
    historyPeriod,
    setHistoryPeriod,
    wateringHistory,
    backendHealth,
    isBackendOnline,
    isSimulator,
    isLoading,
    isRefreshing,
    lastUpdated,
    errorMessage,
    refreshAll,
    savePlantConfig,
    runAiAnalysis,
    saveRequirements,
    togglePump,
    changePumpMode,
    savePumpAutoConfig,
    saveDeviceCalibration,
  };

  return <PlantContext.Provider value={value}>{children}</PlantContext.Provider>;
}

export function usePlant() {
  const context = useContext(PlantContext);
  if (!context) {
    throw new Error('usePlant harus digunakan di dalam PlantProvider');
  }
  return context;
}

export default PlantContext;

