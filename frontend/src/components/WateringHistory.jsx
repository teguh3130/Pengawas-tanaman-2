import React from 'react';
import { usePlant } from '../context/PlantContext';
import { Droplets, Clock, CheckCircle2, History } from 'lucide-react';

export function WateringHistory() {
  const { wateringHistory } = usePlant();

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <History size={18} style={{ color: 'var(--plant-green)' }} />
          <span>Riwayat Aktivitas Penyiraman</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {wateringHistory.length} catatan
        </span>
      </div>

      {wateringHistory.length === 0 ? (
        <div
          style={{
            padding: '30px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          <Droplets size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <div>Belum ada riwayat aktivasi pompa.</div>
          <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
            Pompa akan dicatat otomatis saat mode manual atau otomatis menyala.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>Waktu Mulai</th>
                <th style={{ padding: '8px 10px' }}>Mode</th>
                <th style={{ padding: '8px 10px' }}>Durasi</th>
                <th style={{ padding: '8px 10px' }}>Alasan / Pemicu</th>
                <th style={{ padding: '8px 10px' }}>Kelembapan</th>
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
                  <tr
                    key={item.key || idx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <td style={{ padding: '10px 10px', color: 'var(--text-primary)' }}>{dateStr}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.7rem',
                          background: isAuto ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isAuto ? '#a5b4fc' : '#6ee7b7',
                        }}
                      >
                        {item.mode || 'manual'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', fontFamily: 'var(--font-mono)' }}>
                      {item.durationSec ? `${item.durationSec}s` : 'Sedang jalan'}
                    </td>
                    <td style={{ padding: '10px 10px' }}>{item.triggerReason || 'manual'}</td>
                    <td style={{ padding: '10px 10px' }}>
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

