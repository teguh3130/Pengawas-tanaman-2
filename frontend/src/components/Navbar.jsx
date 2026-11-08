import React, { useState, useEffect } from 'react';
import { usePlant } from '../context/PlantContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sprout,
  RefreshCw,
  Cpu,
  FlaskConical,
  Clock,
  Sparkles,
  Layers,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

export function Navbar({ onOpenAiModal, onOpenPlantModal, onOpenPlantDetail }) {
  const {
    plant,
    isSimulator,
    deviceStatus,
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
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div className="container" style={{ padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* 1. Left: Brand & Plant Overview */}
          <div
            onClick={onOpenPlantDetail}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: onOpenPlantDetail ? 'pointer' : 'default',
              userSelect: 'none',
            }}
            title={onOpenPlantDetail ? 'Klik untuk membuka Detail & Panduan Tanaman' : undefined}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--plant-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Sprout size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {plant?.name || 'Sistem Pengawas Tanaman'}
                </span>
                {plant?.type && (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {plant.type}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>IoT Telemetri & Otomasi</span>
                {plant?.location && <span>• {plant.location}</span>}
              </div>
            </div>
          </div>

          {/* 2. Right: Industrial Toolbar & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            
            {/* Telemetry Source & Device State Tag */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
              }}
            >
              <span
                className={`status-dot ${isDeviceOnline ? 'online' : 'offline'}`}
                title={isDeviceOnline ? 'Hardware ESP32 aktif terhubung' : 'Hardware ESP32 offline'}
              />
              <span style={{ fontWeight: 600, color: isDeviceOnline ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {isDeviceOnline ? 'ESP32 ON' : 'ESP32 STANDBY'}
              </span>
              <span style={{ color: 'var(--border-strong)' }}>|</span>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isSimulator ? (
                  <>
                    <FlaskConical size={12} style={{ color: 'var(--temp-amber)' }} />
                    <span>Simulasi</span>
                  </>
                ) : (
                  <>
                    <Cpu size={12} style={{ color: 'var(--plant-green)' }} />
                    <span>Sensor Fisik</span>
                  </>
                )}
              </span>
            </div>

            {/* Industrial Live Clock */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                padding: '4px 8px',
              }}
              className="mono"
            >
              <Clock size={13} />
              <span>{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</span>
            </div>

            {/* Clean Segmented Theme Switcher */}
            <div className="segmented-control" title={`Tema: ${theme}`}>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`segmented-btn ${theme === 'light' ? 'active' : ''}`}
                title="Tema Terang"
              >
                <Sun size={13} />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`segmented-btn ${theme === 'dark' ? 'active' : ''}`}
                title="Tema Gelap"
              >
                <Moon size={13} />
              </button>
              <button
                type="button"
                onClick={() => setTheme('auto')}
                className={`segmented-btn ${theme === 'auto' ? 'active' : ''}`}
                title="Otomatis (OS)"
              >
                <Monitor size={13} />
              </button>
            </div>

            {/* Action Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={refreshAll}
                disabled={isRefreshing}
                className="btn btn-secondary btn-icon"
                title="Sinkronisasi data sekarang"
              >
                <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
              </button>

              <button
                onClick={onOpenPlantModal}
                className="btn btn-secondary"
              >
                <Layers size={14} />
                <span>Tanaman</span>
              </button>

              <button
                onClick={onOpenAiModal}
                className="btn btn-ai"
              >
                <Sparkles size={14} />
                <span>Gemini AI</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}

export default Navbar;
