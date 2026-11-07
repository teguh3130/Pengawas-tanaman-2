import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import { Power, ToggleLeft, ToggleRight, ShieldAlert, Cpu, CheckCircle, Clock, Droplets, Info } from 'lucide-react';

export function PumpControl() {
  const { pump, togglePump, changePumpMode, isSimulator } = usePlant();
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);

  const mode = pump?.mode || 'manual';
  const isAuto = mode === 'auto';

  // Perbedaan Command vs Status Fisik
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
    <div className="card" style={{ marginBottom: '24px' }}>
      
      {/* Header */}
      <div className="card-header">
        <div className="card-title">
          <Droplets size={20} style={{ color: 'var(--humid-blue)' }} />
          <span>Kendali Pompa Penyiraman</span>
        </div>
        
        {/* Mode Selector Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => handleModeSwitch('manual')}
            disabled={isUpdating}
            style={{
              background: !isAuto ? 'var(--plant-green)' : 'transparent',
              color: !isAuto ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Manual
          </button>
          <button
            onClick={() => handleModeSwitch('auto')}
            disabled={isUpdating}
            style={{
              background: isAuto ? '#6366f1' : 'transparent',
              color: isAuto ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Otomatis
          </button>
        </div>
      </div>

      {/* Simulation Warning Note */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '0.8rem',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Info size={16} style={{ flexShrink: 0, color: 'var(--status-warning)' }} />
        <span>
          <strong>Tahap Simulasi:</strong> Tombol kendali di bawah ini memicu simulator virtual. Relay dan pompa 12V fisik belum terhubung ke sistem.
        </span>
      </div>

      {actionError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            marginBottom: '14px',
            fontSize: '0.825rem',
            color: 'var(--status-danger)',
          }}
        >
          {actionError}
        </div>
      )}

      {/* Main Status & Controls Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
        
        {/* Box 1: Perintah Sistem (Command) */}
        <div
          style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Perintah Pengguna / AI:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: commandVal ? 'var(--plant-green)' : 'var(--text-muted)',
              }}
            >
              {commandVal ? 'MENYALA (ON)' : 'MATI (OFF)'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Dikeluarkan oleh: <strong>{pump?.command?.issuedBy || 'user'}</strong>
          </div>
        </div>

        {/* Box 2: Status Relay Fisik/Virtual (Status) */}
        <div
          style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Status Relay Aktual:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span
              className="pulse-dot"
              style={{
                background: relayStatus ? 'var(--plant-green)' : '#64748b',
                width: '10px',
                height: '10px',
              }}
            />
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: relayStatus ? '#34d399' : 'var(--text-muted)',
              }}
            >
              {relayStatus ? 'RELAY AKTIF' : 'RELAY NONAKTIF'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Laporan Perangkat: {pump?.status?.reportedAt ? new Date(pump.status.reportedAt).toLocaleTimeString() : 'Menunggu sync'}
          </div>
        </div>

      </div>

      {/* Big Action Button (Mode Manual) */}
      {!isAuto ? (
        <button
          onClick={handleToggleCommand}
          disabled={isUpdating}
          className={`btn ${commandVal ? 'btn-danger' : 'btn-primary'}`}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '1rem',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Power size={20} />
          <span>{commandVal ? 'Matikan Pompa (Simulation Stop)' : 'Nyalakan Pompa (Simulation Start)'}</span>
        </button>
      ) : (
        /* Mode Otomatis Config Summary */
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#a5b4fc', fontSize: '0.875rem', fontWeight: 700 }}>
            <Cpu size={18} />
            <span>Mode Otomatis Aktif (Hysteresis Guard)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div>
              Mulai Siram Saat: <br />
              <strong style={{ color: '#fff' }}>&lt; {pump?.auto?.triggerMoistureMin ?? 40}%</strong>
            </div>
            <div>
              Berhenti Siram Saat: <br />
              <strong style={{ color: '#fff' }}>&gt;= {pump?.auto?.targetMoistureMax ?? 70}%</strong>
            </div>
            <div>
              Max Durasi: <br />
              <strong style={{ color: '#fff' }}>{pump?.auto?.maxOnDurationSec ?? 120}s</strong>
            </div>
            <div>
              Cooldown: <br />
              <strong style={{ color: '#fff' }}>{pump?.auto?.cooldownSec ?? 600}s</strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PumpControl;

