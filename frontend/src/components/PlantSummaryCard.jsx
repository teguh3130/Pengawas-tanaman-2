import React from 'react';
import { usePlant } from '../context/PlantContext';
import { Sprout, MapPin, Calendar, Settings2, ArrowRight } from 'lucide-react';

export function PlantSummaryCard({ onOpenPlantModal, onOpenAiModal, onOpenDetail }) {
  const { plant, requirements } = usePlant();

  const handleOpenDetail = () => {
    if (onOpenDetail) {
      onOpenDetail();
    } else if (onOpenAiModal) {
      onOpenAiModal();
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header">
        <div className="card-title">
          <Sprout size={16} style={{ color: 'var(--plant-green)' }} />
          <span>Profil Tanaman & Target</span>
        </div>
        <button
          type="button"
          onClick={onOpenPlantModal}
          className="btn btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
        >
          <Settings2 size={13} />
          <span>Konfigurasi</span>
        </button>
      </div>

      {plant ? (
        <div>
          {/* Identity Block */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {plant.name || 'Tanaman Belum Dikonfigurasi'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {plant.type || 'Hortikultura'} {plant.variety ? `• Varietas: ${plant.variety}` : ''}
            </div>
          </div>

          {/* Metadata Rows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '0.75rem' }}>
            {plant.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span>{plant.location}</span>
              </div>
            )}
            {plant.startedAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <Calendar size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span>Tanam: {new Date(plant.startedAt).toLocaleDateString('id-ID')}</span>
              </div>
            )}
          </div>

          {/* Structured Ideal Target Matrix */}
          {requirements && (
            <div
              style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Batas Toleransi Ideal (Gemini AI Guard)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
                <div style={{ padding: '6px 4px', background: 'var(--bg-card)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Tanah</div>
                  <div className="mono" style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--soil-cyan)' }}>
                    {requirements.soilMoisture?.ideal ? `${requirements.soilMoisture.ideal.min}–${requirements.soilMoisture.ideal.max}%` : '-'}
                  </div>
                </div>
                <div style={{ padding: '6px 4px', background: 'var(--bg-card)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Suhu</div>
                  <div className="mono" style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--temp-amber)' }}>
                    {requirements.temperature?.ideal ? `${requirements.temperature.ideal.min}–${requirements.temperature.ideal.max}°C` : '-'}
                  </div>
                </div>
                <div style={{ padding: '6px 4px', background: 'var(--bg-card)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Cahaya</div>
                  <div className="mono" style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--light-gold)' }}>
                    {requirements.light?.dailyDurationHours ? `${requirements.light.dailyDurationHours}h/hari` : '6–8h'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action to Detail */}
          <button
            type="button"
            onClick={handleOpenDetail}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'space-between', padding: '8px 12px', fontSize: '0.75rem' }}
          >
            <span>Buka Detail & Panduan Perawatan</span>
            <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          <div>Belum ada konfigurasi tanaman aktif.</div>
          <button
            type="button"
            onClick={onOpenPlantModal}
            className="btn btn-primary"
            style={{ marginTop: '10px', fontSize: '0.75rem' }}
          >
            Pilih Tanaman Sekarang
          </button>
        </div>
      )}
    </div>
  );
}

export default PlantSummaryCard;
