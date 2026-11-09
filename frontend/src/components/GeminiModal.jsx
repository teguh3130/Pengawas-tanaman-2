import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import {
  X,
  Sparkles,
  Bot,
  CheckCircle,
  AlertTriangle,
  Waves,
  Thermometer,
  Sun,
  Droplets,
  Edit3,
  Save,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

function safeFormatNum(val, fallback = '-') {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return Number(val).toLocaleString('id-ID');
}

export function GeminiModal({ isOpen, onClose }) {
  const { plant, requirements, runAiAnalysis, saveRequirements } = usePlant();

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

  if (!isOpen) return null;

  const handleStartAnalysis = async () => {
    if (!plant?.name || !plant?.type) {
      setErrorMsg('Harap lengkapi Nama dan Jenis tanaman di Konfigurasi Tanaman sebelum meminta analisis AI.');
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
      setSuccessMsg('Analisis Google Gemini AI berhasil diperoleh dan disimpan!');
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: '#4f46e5',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>Rekomendasi Gemini AI</h2>
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                  }}
                >
                  AI HORTIKULTURA
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Target Tanaman: <strong>{plant?.name || 'Belum diatur'}</strong> ({plant?.type || '-'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: '#6ee7b7',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content View or Edit View */}
        {!isEditing ? (
          <div>
            {/* Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                Status Verifikasi:{' '}
                {requirements?.verifiedByUser ? (
                  <span style={{ color: '#34d399', fontWeight: 600 }}>Telah Disesuaikan Pengguna</span>
                ) : (
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>Rekomendasi AI Otomatis</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  <Edit3 size={14} />
                  <span>Ubah Batas Manual</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  disabled={isLoadingAi}
                  className="btn btn-ai"
                  style={{ fontSize: '0.8rem', padding: '6px 16px' }}
                >
                  <Sparkles size={14} />
                  <span>{isLoadingAi ? 'Memproses AI...' : 'Analisis Ulang dengan AI'}</span>
                </button>
              </div>
            </div>

            {/* Recommendation Cards */}
            {requirements ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* 4 Metrics Summary Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>

                  {/* Kelembapan Tanah */}
                  <div style={{ background: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.25)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--soil-cyan)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      <Waves size={16} />
                      <span>Kelembapan Tanah</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {requirements.soilMoisture?.ideal ? `${requirements.soilMoisture.ideal.min}–${requirements.soilMoisture.ideal.max}%` : '-'}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Batas Aman: {requirements.soilMoisture?.warning ? `${requirements.soilMoisture.warning.min}–${requirements.soilMoisture.warning.max}%` : '-'}
                    </div>
                  </div>

                  {/* Suhu */}
                  <div style={{ background: 'var(--temp-amber-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--temp-amber)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      <Thermometer size={16} />
                      <span>Suhu Udara</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {requirements.temperature?.ideal ? `${requirements.temperature.ideal.min}–${requirements.temperature.ideal.max}°C` : '-'}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Batas Aman: {requirements.temperature?.warning ? `${requirements.temperature.warning.min}–${requirements.temperature.warning.max}°C` : '-'}
                    </div>
                  </div>

                  {/* Kelembapan Udara */}
                  <div style={{ background: 'var(--humid-sky-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--humid-sky)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      <Droplets size={16} />
                      <span>Kelembapan Udara</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {requirements.airHumidity?.ideal ? `${requirements.airHumidity.ideal.min}–${requirements.airHumidity.ideal.max}%` : '-'}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Batas Aman: {requirements.airHumidity?.warning ? `${requirements.airHumidity.warning.min}–${requirements.airHumidity.warning.max}%` : '-'}
                    </div>
                  </div>

                  {/* Cahaya */}
                  <div style={{ background: 'var(--light-gold-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--light-gold)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      <Sun size={16} />
                      <span>Cahaya Harian</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {requirements.light?.dailyDurationHours ? `${requirements.light.dailyDurationHours} Jam/Hari` : '-'}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Lux: {requirements.light?.ideal ? `${safeFormatNum(requirements.light.ideal.minLux)}–${safeFormatNum(requirements.light.ideal.maxLux)}` : '-'}
                    </div>
                  </div>

                </div>

                {/* Penjelasan Deskriptif Gemini */}
                {requirements.description && (
                  <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', padding: '14px 18px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Karakteristik Tanaman:</strong> {requirements.description}
                  </div>
                )}

                {/* Rekomendasi Penyiraman */}
                {requirements.watering && (
                  <div style={{ background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.2)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.825rem' }}>
                    <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>Petunjuk Penyiraman:</div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Frekuensi: {requirements.watering.frequency || '-'} • Metode: {requirements.watering.method || '-'}
                    </div>
                  </div>
                )}

                {/* Kondisi Waspada */}
                {Array.isArray(requirements.warnings) && requirements.warnings.length > 0 && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.825rem' }}>
                    <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>Kondisi yang Perlu Diwaspadai:</div>
                    <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {requirements.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disclaimer */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span>Sumber: {requirements.source || 'Gemini AI'}</span>
                  {requirements.disclaimer && <span> • <em>Catatan: {requirements.disclaimer}</em></span>}
                </div>

              </div>
            ) : (
              /* Belum ada requirements */
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Bot size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>
                  Belum Ada Rekomendasi AI
                </div>
                <div style={{ fontSize: '0.825rem', maxWidth: '420px', margin: '0 auto 20px auto' }}>
                  Klik tombol di bawah agar Google Gemini AI menganalisis kebutuhan ideal kelembapan, suhu, dan cahaya tanaman Anda secara ilmiah.
                </div>
                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  disabled={isLoadingAi}
                  className="btn btn-ai"
                >
                  <Sparkles size={16} />
                  <span>{isLoadingAi ? 'Memproses Analisis AI...' : 'Dapatkan Analisis Gemini AI Sekarang'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Form Edit Manual */
          <form onSubmit={handleSaveManualEdit}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Sesuaikan ambang batas toleransi secara spesifik sesuai kondisi media tanam Anda:
            </div>

            <div className="form-grid-2">
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

            <div className="form-grid-2">
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <Save size={16} />
                <span>Simpan Penyesuaian</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

export default GeminiModal;

