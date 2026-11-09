import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import {
  ArrowLeft,
  Sprout,
  Sparkles,
  MapPin,
  Calendar,
  Waves,
  Thermometer,
  Droplets,
  Sun,
  ShieldCheck,
  AlertTriangle,
  Edit3,
  Bot,
  RefreshCw,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';

/**
 * Helper format angka aman (tidak pernah crash saat null/undefined).
 */
function safeFormatNum(val, fallback = '-') {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return fallback;
  }
  return Number(val).toLocaleString('id-ID');
}

export function PlantDetailView({ onBack, onOpenPlantModal, onOpenAiModal }) {
  const {
    plant,
    requirements,
    runAiAnalysis,
    saveRequirements,
    isLoading,
    isRefreshing,
  } = usePlant();

  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form edit manual batas parameter
  const [editForm, setEditForm] = useState({
    soilIdealMin: 40,
    soilIdealMax: 70,
    soilWarnMin: 30,
    soilWarnMax: 85,
    tempIdealMin: 22,
    tempIdealMax: 30,
    tempWarnMin: 18,
    tempWarnMax: 35,
    humIdealMin: 60,
    humIdealMax: 80,
    humWarnMin: 45,
    humWarnMax: 90,
    lightMinLux: 5000,
    lightMaxLux: 30000,
    lightDailyHours: 8,
  });

  // Hitung durasi tanam (hari)
  const daysPlanted = plant?.startedAt
    ? Math.max(0, Math.floor((Date.now() - Number(plant.startedAt)) / (1000 * 60 * 60 * 24)))
    : null;

  const handleStartAnalysis = async () => {
    if (!plant?.name || !plant?.type) {
      setErrorMsg('Harap lengkapi Nama dan Jenis tanaman terlebih dahulu.');
      return;
    }

    setIsLoadingAi(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await runAiAnalysis({
        name: plant.name,
        type: plant.type,
        variety: plant.variety || '',
        location: plant.location || '',
        additionalInfo: plant.additionalInfo || '',
      });
      setSuccessMsg('Analisis Google Gemini AI berhasil diperbarui!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memanggil Gemini AI');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleOpenEdit = () => {
    if (requirements) {
      setEditForm({
        soilIdealMin: requirements.soilMoisture?.ideal?.min ?? 40,
        soilIdealMax: requirements.soilMoisture?.ideal?.max ?? 70,
        soilWarnMin: requirements.soilMoisture?.warning?.min ?? 30,
        soilWarnMax: requirements.soilMoisture?.warning?.max ?? 85,
        tempIdealMin: requirements.temperature?.ideal?.min ?? 22,
        tempIdealMax: requirements.temperature?.ideal?.max ?? 30,
        tempWarnMin: requirements.temperature?.warning?.min ?? 18,
        tempWarnMax: requirements.temperature?.warning?.max ?? 35,
        humIdealMin: requirements.airHumidity?.ideal?.min ?? 60,
        humIdealMax: requirements.airHumidity?.ideal?.max ?? 80,
        humWarnMin: requirements.airHumidity?.warning?.min ?? 45,
        humWarnMax: requirements.airHumidity?.warning?.max ?? 90,
        lightMinLux: requirements.light?.ideal?.minLux ?? 5000,
        lightMaxLux: requirements.light?.ideal?.maxLux ?? 30000,
        lightDailyHours: requirements.light?.dailyDurationHours ?? 8,
      });
    }
    setIsEditing(true);
  };

  const handleSaveManualEdit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const payload = {
        soilMoisture: {
          ideal: { min: Number(editForm.soilIdealMin), max: Number(editForm.soilIdealMax) },
          warning: { min: Number(editForm.soilWarnMin), max: Number(editForm.soilWarnMax) },
        },
        temperature: {
          ideal: { min: Number(editForm.tempIdealMin), max: Number(editForm.tempIdealMax) },
          warning: { min: Number(editForm.tempWarnMin), max: Number(editForm.tempWarnMax) },
        },
        airHumidity: {
          ideal: { min: Number(editForm.humIdealMin), max: Number(editForm.humIdealMax) },
          warning: { min: Number(editForm.humWarnMin), max: Number(editForm.humWarnMax) },
        },
        light: {
          ideal: { minLux: Number(editForm.lightMinLux), maxLux: Number(editForm.lightMaxLux) },
          dailyDurationHours: Number(editForm.lightDailyHours),
        },
      };

      await saveRequirements(payload);
      setIsEditing(false);
      setSuccessMsg('Batas parameter manual berhasil disimpan dan diverifikasi!');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan penyesuaian manual');
    }
  };

  // Safe checks for requirements sub-objects
  const smIdeal = requirements?.soilMoisture?.ideal;
  const smWarn = requirements?.soilMoisture?.warning;
  const tempIdeal = requirements?.temperature?.ideal;
  const tempWarn = requirements?.temperature?.warning;
  const humIdeal = requirements?.airHumidity?.ideal;
  const humWarn = requirements?.airHumidity?.warning;
  const lightIdeal = requirements?.light?.ideal;
  const lightWarn = requirements?.light?.warning;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>

      {/* ── Top Bar: Back Button & Header ───────────────────────────────────── */}
      <style>{`
        .plant-detail-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .plant-detail-topbar-left {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }
        .plant-detail-topbar-title h1 {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .plant-detail-topbar-title p {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .plant-detail-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        @media (max-width: 540px) {
          .plant-detail-topbar {
            flex-direction: column;
          }
          .plant-detail-topbar-left {
            flex-direction: column;
            gap: 8px;
          }
          .plant-detail-topbar-title h1 {
            font-size: 1.1rem;
          }
          .plant-detail-topbar-actions {
            width: 100%;
          }
          .plant-detail-topbar-actions .btn {
            flex: 1;
            justify-content: center;
            font-size: 0.8rem;
          }
        }
        .plant-param-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .plant-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 20px;
          margin-bottom: 16px;
        }
        .plant-edit-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 480px) {
          .plant-param-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .plant-info-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .plant-edit-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 360px) {
          .plant-param-grid {
            grid-template-columns: 1fr;
          }
          .plant-info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="plant-detail-topbar">
        <div className="plant-detail-topbar-left">
          <button
            onClick={onBack}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', flexShrink: 0 }}
          >
            <ArrowLeft size={15} />
            <span>Kembali</span>
          </button>
          <div className="plant-detail-topbar-title">
            <h1>Detail &amp; Panduan Perawatan Tanaman</h1>
            <p>Profil budidaya dan parameter monitoring Google Gemini AI</p>
          </div>
        </div>

        <div className="plant-detail-topbar-actions">
          <button
            onClick={onOpenPlantModal}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <Edit3 size={14} />
            <span>Ubah Profil</span>
          </button>
          <button
            onClick={handleStartAnalysis}
            disabled={isLoadingAi}
            className="btn btn-ai"
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <Sparkles size={14} />
            <span>{isLoadingAi ? 'Memproses...' : 'Gemini AI'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: '20px',
            fontSize: '0.875rem',
            color: 'var(--status-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: '20px',
            fontSize: '0.875rem',
            color: 'var(--status-normal)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <ShieldCheck size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── SECTION 1: Informasi Tanaman ────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <Sprout size={20} style={{ color: 'var(--plant-green)' }} />
            <span>Identitas & Informasi Tanaman</span>
          </div>
          {plant?.type && (
            <span className="badge badge-normal" style={{ fontSize: '0.75rem' }}>
              {plant.type}
            </span>
          )}
        </div>

        <div className="plant-info-grid">
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nama Tanaman
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {plant?.name || 'Belum dinamai'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Jenis & Varietas
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
              {plant?.type || '-'} {plant?.variety ? `(Varietas: ${plant.variety})` : ''}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lokasi Penanaman
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} style={{ color: 'var(--plant-green)' }} />
              <span>{plant?.location || '-'}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Waktu & Usia Tanam
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} style={{ color: 'var(--plant-green)' }} />
              <span>
                {plant?.startedAt ? new Date(plant.startedAt).toLocaleDateString('id-ID') : '-'}
                {daysPlanted !== null ? ` (${daysPlanted} hari)` : ''}
              </span>
            </div>
          </div>
        </div>

        {plant?.additionalInfo && (
          <div
            style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginTop: '10px',
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Catatan Media & Perawatan:</strong> {plant.additionalInfo}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Panduan & Rekomendasi Gemini AI ──────────────────────── */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="card-title">
            <Sparkles size={20} style={{ color: '#818cf8' }} />
            <span>Rekomendasi Pemantauan Gemini AI</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className={`badge ${requirements?.verifiedByUser ? 'badge-normal' : 'badge-warning'}`}
              style={{ fontSize: '0.725rem' }}
            >
              {requirements?.verifiedByUser ? 'VERIFIKASI PENGGUNA' : 'REKOMENDASI AI'}
            </span>

            {!isEditing && (
              <button
                onClick={handleOpenEdit}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <Edit3 size={14} />
                <span>Ubah Batas Manual</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode atau Edit Mode */}
        {!isEditing ? (
          <div>
            {requirements ? (
              <div>

                {/* 4 Cards Grid */}
                <div className="plant-param-grid">

                  {/* Kelembapan Tanah */}
                  <div
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderTop: '3px solid var(--soil-cyan)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--soil-cyan)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
                      <Waves size={18} />
                      <span>Kelembapan Tanah</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {smIdeal?.min != null && smIdeal?.max != null ? `${smIdeal.min}–${smIdeal.max}%` : '-'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Rentang Ideal
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                      Batas Waspada: <strong>{smWarn?.min != null && smWarn?.max != null ? `${smWarn.min}–${smWarn.max}%` : '-'}</strong>
                    </div>
                  </div>

                  {/* Suhu Udara */}
                  <div
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderTop: '3px solid var(--temp-orange)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--temp-orange)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
                      <Thermometer size={18} />
                      <span>Suhu Udara</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {tempIdeal?.min != null && tempIdeal?.max != null ? `${tempIdeal.min}–${tempIdeal.max}°C` : '-'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Rentang Ideal
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                      Batas Waspada: <strong>{tempWarn?.min != null && tempWarn?.max != null ? `${tempWarn.min}–${tempWarn.max}°C` : '-'}</strong>
                    </div>
                  </div>

                  {/* Kelembapan Udara */}
                  <div
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderTop: '3px solid var(--humid-blue)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--humid-blue)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
                      <Droplets size={18} />
                      <span>Kelembapan Udara</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {humIdeal?.min != null && humIdeal?.max != null ? `${humIdeal.min}–${humIdeal.max}%` : '-'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Rentang Ideal
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                      Batas Waspada: <strong>{humWarn?.min != null && humWarn?.max != null ? `${humWarn.min}–${humWarn.max}%` : '-'}</strong>
                    </div>
                  </div>

                  {/* Cahaya */}
                  <div
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderTop: '3px solid var(--light-yellow)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--light-yellow)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
                      <Sun size={18} />
                      <span>Intensitas Cahaya</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {requirements?.light?.dailyDurationHours != null ? `${requirements.light.dailyDurationHours} Jam` : '-'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Durasi Pencahayaan Harian
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                      Lux: <strong>{safeFormatNum(lightIdeal?.minLux)}–{safeFormatNum(lightIdeal?.maxLux)}</strong>
                    </div>
                  </div>

                </div>

                {/* Deskripsi & Panduan Lengkap */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>

                  {requirements.description && (
                    <div style={{ background: 'var(--bg-app)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Karakteristik & Penjelasan Kebutuhan:
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {requirements.description}
                      </p>
                    </div>
                  )}

                  {requirements.watering && (
                    <div style={{ background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.25)', padding: '14px 18px', borderRadius: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.85rem', marginBottom: '4px' }}>
                        Saran Penyiraman:
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {typeof requirements.watering === 'object' ? (
                          <>
                            <strong>Frekuensi:</strong> {requirements.watering.frequency || '-'} &nbsp;•&nbsp;{' '}
                            <strong>Metode:</strong> {requirements.watering.method || '-'}
                          </>
                        ) : (
                          requirements.watering
                        )}
                      </div>
                    </div>
                  )}

                  {Array.isArray(requirements.warnings) && requirements.warnings.length > 0 && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '14px 18px', borderRadius: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--status-warning)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Kondisi yang Perlu Diwaspadai:
                      </div>
                      <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {requirements.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>

                {/* Footer Sumber & Disclaimer */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span>Dasar Rekomendasi: <strong>{requirements.source || 'Google Gemini AI'}</strong></span>
                  {requirements.disclaimer && <span><em>Catatan: {requirements.disclaimer}</em></span>}
                </div>

              </div>
            ) : (
              /* Belum ada analisis */
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Bot size={44} style={{ opacity: 0.35, marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Belum Ada Parameter Pemantauan
                </h3>
                <p style={{ fontSize: '0.825rem', maxWidth: '440px', margin: '0 auto 18px auto' }}>
                  Gunakan Google Gemini AI untuk menganalisis kebutuhan tanaman Anda secara otomatis, atau masukkan batas parameter manual.
                </p>
                <button
                  onClick={handleStartAnalysis}
                  disabled={isLoadingAi}
                  className="btn btn-ai"
                >
                  <Sparkles size={16} />
                  <span>{isLoadingAi ? 'Memproses AI...' : 'Minta Analisis Gemini AI Sekarang'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Form Edit Manual */
          <form onSubmit={handleSaveManualEdit}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Ubah batas ideal dan batas waspada parameter tanaman secara manual:
            </div>

            <div className="plant-edit-grid">
              <div className="form-group">
                <label className="form-label">Kelembapan Tanah Ideal Min / Max (%)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    value={editForm.soilIdealMin}
                    onChange={(e) => setEditForm({ ...editForm, soilIdealMin: e.target.value })}
                    className="form-input"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={editForm.soilIdealMax}
                    onChange={(e) => setEditForm({ ...editForm, soilIdealMax: e.target.value })}
                    className="form-input"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Kelembapan Tanah Warning Min / Max (%)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    value={editForm.soilWarnMin}
                    onChange={(e) => setEditForm({ ...editForm, soilWarnMin: e.target.value })}
                    className="form-input"
                    placeholder="Batas Bawah"
                  />
                  <input
                    type="number"
                    value={editForm.soilWarnMax}
                    onChange={(e) => setEditForm({ ...editForm, soilWarnMax: e.target.value })}
                    className="form-input"
                    placeholder="Batas Atas"
                  />
                </div>
              </div>
            </div>

            <div className="plant-edit-grid">
              <div className="form-group">
                <label className="form-label">Suhu Udara Ideal Min / Max (°C)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    value={editForm.tempIdealMin}
                    onChange={(e) => setEditForm({ ...editForm, tempIdealMin: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="number"
                    value={editForm.tempIdealMax}
                    onChange={(e) => setEditForm({ ...editForm, tempIdealMax: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Durasi Cahaya Harian (Jam)</label>
                <input
                  type="number"
                  value={editForm.lightDailyHours}
                  onChange={(e) => setEditForm({ ...editForm, lightDailyHours: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
}

export default PlantDetailView;

