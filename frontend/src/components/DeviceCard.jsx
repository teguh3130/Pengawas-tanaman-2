import React from 'react';
import { usePlant } from '../context/PlantContext';
import { Cpu, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export function DeviceCard() {
  const { deviceStatus, isSimulator } = usePlant();

  const isOnline = Boolean(deviceStatus?.online);
  const cal = deviceStatus?.calibration;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header">
        <div className="card-title">
          <Cpu size={16} style={{ color: 'var(--plant-green)' }} />
          <span>Status Unit Hardware</span>
        </div>
        <div className="status-indicator">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: isOnline ? 'var(--status-ok)' : 'var(--text-muted)' }}>
            {isOnline ? 'ONLINE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Industrial Spec Sheet */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.78125rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '7px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Perangkat</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ESP32 DevKit V1</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '7px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Firmware Runtime</span>
          <span className="mono" style={{ color: 'var(--text-secondary)' }}>MicroPython v1.22</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '7px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Kanal Sensor Aktif</span>
          <span style={{ color: 'var(--text-secondary)' }}>ADC1 (D34), DHT (D27), I2C (D21/22)</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '7px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Kalibrasi Tanah</span>
          <span className="mono" style={{ color: 'var(--text-secondary)' }}>
            {cal ? `Kering: ${cal.soilDry} | Air: ${cal.soilWet}` : 'Standar (3450 / 1450)'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Telemetri Terakhir</span>
          <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {deviceStatus?.lastSeen
              ? `${new Date(deviceStatus.lastSeen).toLocaleTimeString('id-ID')} WIB`
              : 'Menunggu kiriman data'}
          </span>
        </div>
      </div>

      {/* Source Tag Note */}
      <div
        style={{
          marginTop: '12px',
          padding: '8px 10px',
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xs)',
          fontSize: '0.725rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
        }}
      >
        <ShieldCheck size={14} style={{ color: 'var(--plant-green)', flexShrink: 0 }} />
        <span>
          Otentikasi Device Bearer Token aktif dengan validasi rentang fisik otomatis di backend.
        </span>
      </div>
    </div>
  );
}

export default DeviceCard;
