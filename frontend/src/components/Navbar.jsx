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
    refreshAll,
    isRefreshing,
  } = usePlant();

  const { theme, setTheme } = useTheme();
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
      <div className="container" style={{ padding: '10px 16px' }}>
        
        {/* Main Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* 1. Brand & Plant Name */}
          <div
            onClick={onOpenPlantDetail}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: onOpenPlantDetail ? 'pointer' : 'default',
              userSelect: 'none',
              minWidth: 0,
            }}
            title={onOpenPlantDetail ? 'Buka Detail & Panduan Tanaman' : undefined}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--plant-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Sprout size={18} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '0.975rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {plant?.name || 'Sistem Pengawas Tanaman'}
                </span>
                {plant?.type && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-xs)',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    {plant.type}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span>IoT Telemetri</span>
                {plant?.location && <span> • {plant.location}</span>}
              </div>
            </div>
          </div>

          {/* 2. Desktop & Tablet Toolbar */}
          <div
            className="navbar-desktop-tools"
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {/* Status Tag */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '4px 9px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.725rem',
              }}
            >
              <span
                className={`status-dot ${isDeviceOnline ? 'online' : 'offline'}`}
                title={isDeviceOnline ? 'Hardware ESP32 aktif terhubung' : 'Hardware ESP32 offline'}
              />
              <span style={{ fontWeight: 600, color: isDeviceOnline ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {isDeviceOnline ? 'ESP32 ON' : 'STANDBY'}
              </span>
              <span style={{ color: 'var(--border-strong)' }}>|</span>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isSimulator ? (
                  <>
                    <FlaskConical size={11} style={{ color: 'var(--temp-amber)' }} />
                    <span>Simulasi</span>
                  </>
                ) : (
                  <>
                    <Cpu size={11} style={{ color: 'var(--plant-green)' }} />
                    <span>Sensor Fisik</span>
                  </>
                )}
              </span>
            </div>

            {/* Live Clock (Hidden on small screens via CSS) */}
            <div
              className="navbar-clock"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.725rem',
                color: 'var(--text-muted)',
                padding: '4px 6px',
              }}
            >
              <Clock size={12} />
              <span className="mono">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
              </span>
            </div>

            {/* Theme Switcher Segmented */}
            <div className="segmented-control" title={`Tema: ${theme}`}>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`segmented-btn ${theme === 'light' ? 'active' : ''}`}
                title="Tema Terang"
              >
                <Sun size={12} />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`segmented-btn ${theme === 'dark' ? 'active' : ''}`}
                title="Tema Gelap"
              >
                <Moon size={12} />
              </button>
              <button
                type="button"
                onClick={() => setTheme('auto')}
                className={`segmented-btn ${theme === 'auto' ? 'active' : ''}`}
                title="Otomatis (OS)"
              >
                <Monitor size={12} />
              </button>
            </div>

            {/* Sync Refresh */}
            <button
              type="button"
              onClick={refreshAll}
              disabled={isRefreshing}
              className="btn btn-secondary btn-icon"
              title="Sinkronisasi data sekarang"
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin-anim' : ''} />
            </button>

            {/* Main Action Buttons */}
            {onOpenPlantModal && (
              <button
                type="button"
                onClick={onOpenPlantModal}
                className="btn btn-secondary"
              >
                <Layers size={13} />
                <span>Tanaman</span>
              </button>
            )}

            {onOpenAiModal && (
              <button
                type="button"
                onClick={onOpenAiModal}
                className="btn btn-ai"
              >
                <Sparkles size={13} />
                <span>Asisten AI</span>
              </button>
            )}
          </div>

          {/* 3. Mobile Header Controls (Visible only on <= 768px) */}
          <div
            className="navbar-mobile-controls"
            style={{ display: 'none', alignItems: 'center', gap: '6px' }}
          >
            {/* Theme Cycle Button */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'auto' : 'dark')}
              className="btn btn-secondary btn-icon"
              title={`Ganti tema (sekarang: ${theme})`}
            >
              {theme === 'light' ? <Sun size={14} /> : theme === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}
            </button>

            {/* Sync Refresh */}
            <button
              type="button"
              onClick={refreshAll}
              disabled={isRefreshing}
              className="btn btn-secondary btn-icon"
              title="Sinkronisasi"
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
            </button>
          </div>

        </div>

        {/* Mobile Sub-Toolbar (Visible only on <= 768px) */}
        <div
          className="navbar-mobile-subbar"
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
            }}
          >
            <span
              className={`status-dot ${isDeviceOnline ? 'online' : 'offline'}`}
            />
            <span style={{ fontWeight: 600, color: isDeviceOnline ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {isDeviceOnline ? 'ESP32 ON' : 'STANDBY'}
            </span>
            <span>•</span>
            <span>{isSimulator ? 'Simulasi' : 'Sensor Fisik'}</span>
          </div>

          {/* Action Buttons in Mobile Subbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onOpenPlantModal && (
              <button
                type="button"
                onClick={onOpenPlantModal}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.75rem', minHeight: '32px' }}
              >
                <Layers size={12} />
                <span>Tanaman</span>
              </button>
            )}

            {onOpenAiModal && (
              <button
                type="button"
                onClick={onOpenAiModal}
                className="btn btn-ai"
                style={{ padding: '5px 12px', fontSize: '0.75rem', minHeight: '32px' }}
              >
                <Sparkles size={12} />
                <span>Asisten AI</span>
              </button>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          .navbar-desktop-tools {
            display: none !important;
          }
          .navbar-mobile-controls {
            display: flex !important;
          }
          .navbar-mobile-subbar {
            display: flex !important;
          }
        }
        @media (max-width: 900px) {
          .navbar-clock {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}

export default Navbar;
