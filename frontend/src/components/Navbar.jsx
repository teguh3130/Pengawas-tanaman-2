import React, { useState, useEffect } from 'react';
import { usePlant } from '../context/PlantContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sprout,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
  Layers,
  FlaskConical,
  Cpu,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

export function Navbar({ onOpenAiModal, onOpenPlantModal, onOpenPlantDetail }) {
  const {
    plant,
    isSimulator,
    deviceStatus,
    isBackendOnline,
    lastUpdated,
    refreshAll,
    isRefreshing,
  } = usePlant();

  const { theme, resolvedTheme, setTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isDeviceOnline = Boolean(deviceStatus?.online);

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-header)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        transition: 'background-color 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div className="container" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          
          {/* Logo & Plant Name */}
          <div
            onClick={onOpenPlantDetail}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: onOpenPlantDetail ? 'pointer' : 'default' }}
            title={onOpenPlantDetail ? 'Klik untuk melihat Detail & Panduan Tanaman' : undefined}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                flexShrink: 0,
              }}
            >
              <Sprout size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {plant?.name || 'Sistem Pengawas Tanaman'}
                </h1>
                {plant?.type && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {plant.type}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>IoT Monitoring & AI Plant Care</span>
                {plant?.location && <span>• Lokasi: {plant.location}</span>}
              </div>
            </div>
          </div>

          {/* Status Badges, Theme Switcher & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* 1. Indikator Sumber Data: SIMULATOR vs REAL */}
            {isSimulator ? (
              <div
                className="badge badge-simulated"
                title="Data saat ini dihasilkan oleh Python Sensor Simulator untuk keperluan pengujian"
                style={{ padding: '6px 12px' }}
              >
                <FlaskConical size={14} />
                <span>DATA SIMULASI</span>
              </div>
            ) : (
              <div
                className="badge badge-real"
                title="Data bersumber dari pengukuran sensor fisik ESP32"
                style={{ padding: '6px 12px' }}
              >
                <Cpu size={14} />
                <span>SENSOR FISIK</span>
              </div>
            )}

            {/* 2. Koneksi Device (ESP32/Simulator) */}
            <div
              className={`badge ${isDeviceOnline ? 'badge-online' : 'badge-offline'}`}
              title={
                isDeviceOnline
                  ? `Perangkat aktif. Terakhir update: ${deviceStatus?.lastSeen ? new Date(deviceStatus.lastSeen).toLocaleTimeString() : '-'}`
                  : 'Perangkat offline / belum mengirim data'
              }
              style={{ padding: '6px 12px' }}
            >
              <span className="pulse-dot" style={{ background: isDeviceOnline ? '#10b981' : '#ef4444' }} />
              {isDeviceOnline ? (
                <>
                  <Wifi size={14} />
                  <span>PERANGKAT ON</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} />
                  <span>PERANGKAT OFF</span>
                </>
              )}
            </div>

            {/* 3. Live Clock */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                padding: '6px 10px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
              }}
              className="mono"
            >
              <Clock size={14} style={{ color: 'var(--plant-green)' }} />
              <span>{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</span>
            </div>

            {/* 4. Theme Switcher Segmented Control (Light, Dark, Auto) */}
            <div className="theme-switcher" title={`Tema aktif: ${theme} (tampilan: ${resolvedTheme})`}>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`theme-switcher-btn ${theme === 'light' ? 'active' : ''}`}
                title="Tema Terang (Light)"
                aria-label="Tema Terang"
              >
                <Sun size={14} />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`theme-switcher-btn ${theme === 'dark' ? 'active' : ''}`}
                title="Tema Gelap (Dark)"
                aria-label="Tema Gelap"
              >
                <Moon size={14} />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('auto')}
                className={`theme-switcher-btn ${theme === 'auto' ? 'active' : ''}`}
                title="Mengikuti Tema Sistem Operasi (Auto)"
                aria-label="Tema Auto"
              >
                <Monitor size={14} />
                <span>Auto</span>
              </button>
            </div>

            {/* 5. Action Buttons */}
            <button
              onClick={refreshAll}
              disabled={isRefreshing}
              className="btn btn-secondary btn-icon"
              title="Perbarui data sekarang"
            >
              <RefreshCw size={16} className={isRefreshing ? 'spin-anim' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            <button
              onClick={onOpenPlantModal}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.825rem' }}
            >
              <Layers size={15} />
              <span>Tanaman</span>
            </button>

            <button
              onClick={onOpenAiModal}
              className="btn btn-ai"
              style={{ padding: '8px 16px', fontSize: '0.825rem' }}
            >
              <Sparkles size={15} />
              <span>Gemini AI</span>
            </button>

          </div>

        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </header>
  );
}

export default Navbar;
