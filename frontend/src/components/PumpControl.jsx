import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import { Power, Cpu, Droplets, ShieldCheck, AlertCircle } from 'lucide-react';

export function PumpControl() {
  const { pump, togglePump, changePumpMode, isSimulator } = usePlant();
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);

  const mode = pump?.mode || 'manual';
  const isAuto = mode === 'auto';

  // Perbedaan Command Logic vs Status Relay Fisik
  const commandVal = Boolean(pump?.command?.value);
  const relayStatus = Boolean(pump?.status?.relayOn);

  const handleToggleCommand = async () => {
    setIsUpdating(true);
    setActionError(null);
    try {
      await togglePump(!commandVal);
    } catch (err) {
      setActionError(err.message || 'Gagal mengirimkan perintah pompa');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleModeSwitch = async (newMode) => {
    setIsUpdating(true);
    setActionError(null);
    try {
      await changePumpMode(newMode);
    } catch (err) {
      setActionError(err.message || 'Gagal mengubah mode');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>

      {/* Header */}
      <div className="card-header">
        <div className="card-title">
          <Droplets size={16} style={{ color: 'var(--plant-green)' }} />
          <span>Kendali Aktuator Pompa</span>
        </div>

        {/* Mode Switcher Segmented */}
        <div className="segmented-control">
          <button
            type="button"
            onClick={() => handleModeSwitch('manual')}
            disabled={isUpdating}
            className={`segmented-btn ${!isAuto ? 'active' : ''}`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('auto')}
            disabled={isUpdating}
            className={`segmented-btn ${isAuto ? 'active' : ''}`}
          >
            Otomatis
          </button>
        </div>
      </div>

      {actionError && (
        <div
          style={{
            background: 'var(--status-crit-bg)',
            border: '1px solid var(--status-crit-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            marginBottom: '14px',
            fontSize: '0.8rem',
            color: 'var(--status-crit)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Industrial Operational Matrix: Relay Hardware vs Logic Command */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>

        {/* Box 1: Status Relay Aktual (Hardware State) */}
        <div
          style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
          }}
        >
          <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            Relay Fisik (GPIO 26)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              className={`status-dot ${relayStatus ? 'online' : 'offline'}`}
              style={{
                background: relayStatus ? 'var(--status-ok)' : 'var(--text-dim)',
                boxShadow: relayStatus ? '0 0 0 2px var(--status-ok-bg)' : 'none',
              }}
            />
            <span
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: relayStatus ? 'var(--status-ok)' : 'var(--text-muted)',
              }}
            >
              {relayStatus ? 'ENERGIZED (ON)' : 'STANDBY (OFF)'}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Sync: {pump?.status?.reportedAt ? new Date(pump.status.reportedAt).toLocaleTimeString('id-ID') : 'Menunggu telemetri'}
          </div>
        </div>

        {/* Box 2: Perintah Kerja Sistem (Command State) */}
        <div
          style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
          }}
        >
          <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            Perintah Kontrol
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: commandVal ? 'var(--plant-green)' : 'var(--text-primary)',
              }}
            >
              {commandVal ? 'ACTIVE (PUMP ON)' : 'IDLE (PUMP OFF)'}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Oleh: {pump?.command?.issuedBy || (isAuto ? 'Sistem Otomatis' : 'Manual Operator')}
          </div>
        </div>

      </div>

      {/* Manual Actuator Trigger or Auto Configuration Summary */}
      {!isAuto ? (
        <button
          type="button"
          onClick={handleToggleCommand}
          disabled={isUpdating}
          className={`btn ${commandVal ? 'btn-danger' : 'btn-primary'}`}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '0.875rem',
          }}
        >
          <Power size={16} />
          <span>{commandVal ? 'Hentikan Sirkulasi Pompa' : 'Aktifkan Pompa Air'}</span>
        </button>
      ) : (
        <div
          style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--plant-green)' }} />
            <span>Mode Otomatis Aktif (Hysteresis Guard)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Mulai Penyiraman:</span><br />
              <strong className="mono" style={{ color: 'var(--text-primary)' }}>&lt; {pump?.auto?.triggerMoistureMin ?? 40}%</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Cutoff Otomatis:</span><br />
              <strong className="mono" style={{ color: 'var(--text-primary)' }}>&gt;= {pump?.auto?.targetMoistureMax ?? 70}%</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Maksimal Durasi:</span><br />
              <strong className="mono" style={{ color: 'var(--text-primary)' }}>{pump?.auto?.maxOnDurationSec ?? 120} detik</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Jeda Cooldown:</span><br />
              <strong className="mono" style={{ color: 'var(--text-primary)' }}>{pump?.auto?.cooldownSec ?? 600} detik</strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PumpControl;
