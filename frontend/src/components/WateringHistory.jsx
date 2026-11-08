import React from 'react';
import { usePlant } from '../context/PlantContext';
import { History, Droplets } from 'lucide-react';

export function WateringHistory() {
  const { wateringHistory } = usePlant();

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <History size={16} style={{ color: 'var(--plant-green)' }} />
          <span>Log Aktivitas Irigasi & Aktuator</span>
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
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Mode</th>
                <th>Durasi</th>
                <th>Pemicu / Alasan</th>
                <th>Kondisi Tanah</th>
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
                  : '-';
                const isAuto = item.mode === 'auto';
                return (
                  <tr key={item.key || idx}>
                    <td className="mono" style={{ color: 'var(--text-primary)' }}>{dateStr}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          background: isAuto ? 'var(--status-info-bg)' : 'var(--plant-green-muted)',
                          color: isAuto ? 'var(--status-info)' : 'var(--plant-green)',
                          border: `1px solid ${isAuto ? 'var(--status-info-border)' : 'var(--plant-green-border)'}`,
                        }}
                      >
                        {item.mode || 'manual'}
                      </span>
                    </td>
                    <td className="mono">
                      {item.durationSec ? `${item.durationSec}s` : 'Aktif'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.triggerReason || 'Operator Trigger'}
                    </td>
                    <td className="mono" style={{ color: 'var(--soil-cyan)', fontWeight: 600 }}>
                      {item.soilAfter !== null && item.soilAfter !== undefined
                        ? `${item.soilAfter}%`
                        : '-'}
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
