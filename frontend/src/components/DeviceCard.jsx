import React from 'react';
import { usePlant } from '../context/PlantContext';
import { Cpu, Wifi, WifiOff, FlaskConical, Gauge, Clock, ShieldCheck } from 'lucide-react';

export function DeviceCard() {
  const { deviceStatus, isSimulator, lastUpdated } = usePlant();

  const isOnline = Boolean(deviceStatus?.online);
  const cal = deviceStatus?.calibration;

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <div className="card-title">
          <Cpu size={18} style={{ color: 'var(--soil-cyan)' }} />
          <span>Status Perangkat & Sensor</span>
        </div>
        <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
          <span className="pulse-dot" style={{ background: isOnline ? '#34d399' : '#f87171' }} />
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      {/* Source Indicator Tag */}
      <div
        style={{
          background: isSimulator ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${isSimulator ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {isSimulator ? (
          <>
            <FlaskConical size={18} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
              <strong>Sumber: Data Simulasi (Python)</strong>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Berasal dari <code>simulate_sensors.py</code>
              </div>
            </div>
          </>
        ) : (
          <>
            <ShieldCheck size={18} style={{ color: 'var(--status-normal)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
              <strong>Sumber: Sensor Fisik ESP32</strong>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Hasil pembacaan pin ADC, DHT22 & BH1750
              </div>
            </div>
          </>
        )}
      </div>

      {/* Specs / Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Hardware:</span>
          <span>ESP32 DevKit V1 (30 Pin)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Firmware:</span>
          <span>{deviceStatus?.firmware || '1.0.0 (MicroPython)'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Terakhir Terhubung:</span>
          <span>
            {deviceStatus?.lastSeen
              ? new Date(deviceStatus.lastSeen).toLocaleTimeString('id-ID')
              : '-'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Kalibrasi Tanah:</span>
          <span>
            {cal?.soilDry && cal?.soilWet
              ? `DRY: ${cal.soilDry} | WET: ${cal.soilWet}`
              : 'Belum kalibrasi aktual'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default DeviceCard;

