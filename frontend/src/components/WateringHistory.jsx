import React from 'react';
import { usePlant } from '../context/PlantContext';
import { History, Droplets } from 'lucide-react';

function formatTriggerReason(reason) {
  if (!reason) return 'Pemicu Sistem';
  const map = {
    relay_off_reported: 'Penyiraman Selesai',
    manual_on: 'Dinyalakan Manual',
    manual_off: 'Dimatikan Manual',
    auto_on: 'Otomatis (Tanah Kering)',
    auto_moisture_low: 'Otomatis (Tanah Kering)',
    auto_off: 'Otomatis (Target Tercapai)',
    auto_target_reached: 'Otomatis (Target Tercapai)',
    safety_cutoff: 'Cutoff Keamanan',
    failsafe: 'Failsafe Perangkat',
  };
  if (map[reason]) return map[reason];
  return String(reason)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDuration(sec) {
  if (sec === null || sec === undefined) return 'Berjalan';
  const num = Number(sec);
  if (!Number.isFinite(num) || num <= 0) return 'Berjalan';
  if (num < 60) return `${Math.round(num)} dtk`;
  const m = Math.floor(num / 60);
  const s = Math.round(num % 60);
  return s > 0 ? `${m}m ${s}d` : `${m} mnt`;
}

export function WateringHistory() {
  const { wateringHistory } = usePlant();

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <History size={16} style={{ color: 'var(--plant-green)' }} />
          <span>Log Aktivitas Irigasi &amp; Aktuator</span>
        </div>
        <span className="mono" style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          {wateringHistory.length} Sesi Tercatat
        </span>
      </div>

      {wateringHistory.length === 0 ? (
        <div
          style={{
            padding: '28px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8125rem',
          }}
        >
          <Droplets size={22} style={{ opacity: 0.3, marginBottom: '6px' }} />
          <div style={{ fontWeight: 600 }}>Belum ada log penyiraman tercatat</div>
          <div style={{ fontSize: '0.725rem', marginTop: '2px', color: 'var(--text-dim)' }}>
            Setiap aktivasi pompa (manual maupun otomatis) otomatis terarsip dalam tabel ini.
          </div>
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: '290px',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          <table className="data-table">
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                background: 'var(--bg-card)',
              }}
            >
              <tr>
                <th>Waktu</th>
                <th>Mode</th>
                <th>Durasi</th>
                <th>Keterangan</th>
                <th>Tanah Akhir</th>
              </tr>
            </thead>
            <tbody>
              {wateringHistory.map((item, idx) => {
                const dateStr = item.startedAt
                  ? new Date(item.startedAt).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : '—';
                const isAuto = item.mode === 'auto';
                const hasSoilAfter = item.soilAfter !== null && item.soilAfter !== undefined && !Number.isNaN(Number(item.soilAfter));

                return (
                  <tr key={item.key || idx}>
                    <td className="mono" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {dateStr}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-xs)',
                          background: isAuto ? 'var(--status-info-bg)' : 'var(--plant-green-muted)',
                          color: isAuto ? 'var(--status-info)' : 'var(--plant-green)',
                          border: `1px solid ${isAuto ? 'var(--status-info-border)' : 'var(--plant-green-border)'}`,
                          display: 'inline-block',
                        }}
                      >
                        {item.mode || 'manual'}
                      </span>
                    </td>
                    <td className="mono" style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {formatDuration(item.durationSec)}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {formatTriggerReason(item.triggerReason)}
                    </td>
                    <td className="mono" style={{ color: hasSoilAfter ? 'var(--soil-cyan)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {hasSoilAfter ? `${Number(item.soilAfter).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default WateringHistory;
