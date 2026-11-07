import React from 'react';
import { usePlant } from '../context/PlantContext';
import { Sprout, Sparkles, MapPin, Calendar, Settings2 } from 'lucide-react';

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
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <div className="card-title">
          <Sprout size={18} style={{ color: 'var(--plant-green)' }} />
          <span>Informasi Tanaman</span>
        </div>
        <button
          onClick={onOpenPlantModal}
          className="btn btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
        >
          <Settings2 size={13} />
          <span>Ubah</span>
        </button>
      </div>

      {plant ? (
        <div>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {plant.name || 'Belum dinamai'}
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              {plant.type} {plant.variety ? `• Varietas: ${plant.variety}` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {plant.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={14} style={{ color: 'var(--plant-green)' }} />
                <span>{plant.location}</span>
              </div>
            )}
            {plant.startedAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} style={{ color: 'var(--plant-green)' }} />
                <span>Mulai Tanam: {new Date(plant.startedAt).toLocaleDateString('id-ID')}</span>
              </div>
            )}
          </div>

          {requirements ? (
            <div
              style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Panduan Gemini AI</span>
                <button
                  type="button"
                  onClick={handleOpenDetail}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6366f1',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 4px',
                    borderRadius: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  Detail &gt;
                </button>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {requirements.description ? `${requirements.description.slice(0, 110)}...` : 'Parameter optimal telah dikonfigurasi.'}
              </p>
            </div>
          ) : (
            <button
              onClick={onOpenAiModal}
              className="btn btn-ai"
              style={{ width: '100%', fontSize: '0.825rem', padding: '10px' }}
            >
              <Sparkles size={15} />
              <span>Analisis dengan Gemini AI</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '0.85rem', marginBottom: '12px' }}>Belum ada data tanaman.</p>
          <button onClick={onOpenPlantModal} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            Atur Tanaman Sekarang
          </button>
        </div>
      )}
    </div>
  );
}

export default PlantSummaryCard;
