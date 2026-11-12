import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import {
  Sprout,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Waves,
  Thermometer,
  Droplets,
  Sun,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react';

export function PlantOnboarding() {
  const { previewAiAnalysis, completeOnboarding, isBackendOnline, errorMessage } = usePlant();

  const [step, setStep] = useState(1); // 1: Input Tanaman | 2: Review & Setujui AI
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    variety: '',
    location: '',
    startedAt: new Date().toISOString().split('T')[0],
    additionalInfo: '',
  });

  const [aiPreview, setAiPreview] = useState(null);
  const [editLimits, setEditLimits] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestAiPreview = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.name.trim() || !formData.type.trim()) {
      setLocalError('Harap isi minimal Nama Tanaman dan Jenis / Spesies tanaman.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type.trim(),
        variety: formData.variety.trim(),
        location: formData.location.trim() || '-',
        additionalInfo: formData.additionalInfo.trim(),
      };
      const result = await previewAiAnalysis(payload);
      setAiPreview(result);
      setStep(2);
    } catch (err) {
      setLocalError(err.message || 'Gagal meminta rekomendasi AI. Periksa koneksi backend.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updatePreviewRange = (metric, level, bound, value) => {
    const numVal = value === '' ? '' : Number(value);
    setAiPreview((prev) => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [level]: {
          ...prev[metric]?.[level],
          [bound]: numVal,
        },
      },
    }));
  };

  const sanitizeNumberOrNull = (val) => {
    if (val === '' || val === null || val === undefined) return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  };

  const sanitizeRequirements = (reqObj) => {
    if (!reqObj) return null;
    return {
      ...reqObj,
      soilMoisture: {
        ...reqObj.soilMoisture,
        ideal: {
          min: sanitizeNumberOrNull(reqObj.soilMoisture?.ideal?.min),
          max: sanitizeNumberOrNull(reqObj.soilMoisture?.ideal?.max),
        },
        warning: {
          min: sanitizeNumberOrNull(reqObj.soilMoisture?.warning?.min),
          max: sanitizeNumberOrNull(reqObj.soilMoisture?.warning?.max),
        },
      },
      temperature: {
        ...reqObj.temperature,
        ideal: {
          min: sanitizeNumberOrNull(reqObj.temperature?.ideal?.min),
          max: sanitizeNumberOrNull(reqObj.temperature?.ideal?.max),
        },
        warning: {
          min: sanitizeNumberOrNull(reqObj.temperature?.warning?.min),
          max: sanitizeNumberOrNull(reqObj.temperature?.warning?.max),
        },
      },
      airHumidity: {
        ...reqObj.airHumidity,
        ideal: {
          min: sanitizeNumberOrNull(reqObj.airHumidity?.ideal?.min),
          max: sanitizeNumberOrNull(reqObj.airHumidity?.ideal?.max),
        },
        warning: {
          min: sanitizeNumberOrNull(reqObj.airHumidity?.warning?.min),
          max: sanitizeNumberOrNull(reqObj.airHumidity?.warning?.max),
        },
      },
      light: {
        ...reqObj.light,
        ideal: {
          minLux: sanitizeNumberOrNull(reqObj.light?.ideal?.minLux),
          maxLux: sanitizeNumberOrNull(reqObj.light?.ideal?.maxLux),
        },
        warning: {
          minLux: sanitizeNumberOrNull(reqObj.light?.warning?.minLux),
          maxLux: sanitizeNumberOrNull(reqObj.light?.warning?.maxLux),
        },
        dailyDurationHours: sanitizeNumberOrNull(reqObj.light?.dailyDurationHours),
      },
    };
  };

  const handleApproveAndSave = async () => {
    setLocalError(null);
    setIsSaving(true);
    try {
      const plantPayload = {
        name: formData.name.trim(),
        type: formData.type.trim(),
        variety: formData.variety.trim(),
        location: formData.location.trim() || '-',
        startedAt: formData.startedAt ? new Date(formData.startedAt).getTime() : Date.now(),
        additionalInfo: formData.additionalInfo.trim(),
      };

      const cleanedRequirements = sanitizeRequirements(aiPreview);
      await completeOnboarding(plantPayload, cleanedRequirements);
    } catch (err) {
      setLocalError(err.message || 'Gagal menyimpan konfigurasi tanaman.');
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '12px 0 32px 0' }}>
      {/* Header Onboarding */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--plant-green-muted)',
              color: 'var(--plant-green)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sprout size={22} />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Registrasi Tanaman Awal
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
              Konfigurasikan tanaman yang sedang dipantau sebelum mengakses dashboard telemetry. Sistem AI akan menyusun parameter perawatan yang dapat Anda periksa sebelum disimpan.
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginTop: '18px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: step === 1 ? 'var(--plant-green-muted)' : 'var(--bg-card-subtle)',
              border: `1px solid ${step === 1 ? 'var(--plant-green)' : 'var(--border-subtle)'}`,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: step === 1 ? 'var(--plant-green)' : 'var(--text-secondary)',
            }}
          >
            <span className="mono" style={{ fontWeight: 700 }}>01</span>
            <span>Identitas Tanaman</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: step === 2 ? 'var(--plant-green-muted)' : 'var(--bg-card-subtle)',
              border: `1px solid ${step === 2 ? 'var(--plant-green)' : 'var(--border-subtle)'}`,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: step === 2 ? 'var(--plant-green)' : 'var(--text-secondary)',
            }}
          >
            <span className="mono" style={{ fontWeight: 700 }}>02</span>
            <span>Tinjau &amp; Setujui Parameter AI</span>
          </div>
        </div>
      </div>

      {/* Backend / Local Error */}
      {(!isBackendOnline && errorMessage) && (
        <div
          style={{
            background: 'var(--status-danger-muted)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '0.825rem',
            color: 'var(--status-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {localError && (
        <div
          style={{
            background: 'var(--status-danger-muted)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '0.825rem',
            color: 'var(--status-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{localError}</span>
        </div>
      )}

      {/* STEP 1: FORM INPUT */}
      {step === 1 && (
        <div className="card">
          <form onSubmit={handleRequestAiPreview}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Nama Tanaman *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Contoh: Cabai Rawit Pot A"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jenis / Spesies Tanaman *</label>
                <input
                  type="text"
                  name="type"
                  required
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="Contoh: Cabai Rawit (Capsicum frutescens)"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Varietas (Opsional)</label>
                <input
                  type="text"
                  name="variety"
                  value={formData.variety}
                  onChange={handleChange}
                  placeholder="Contoh: Bara / Dewata"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lokasi Penanaman (Opsional)</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Contoh: Greenhouse / Teras"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tanggal Mulai Penanaman (Opsional)</label>
              <input
                type="date"
                name="startedAt"
                value={formData.startedAt}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Catatan Media Tanam &amp; Kondisi (Opsional)</label>
              <textarea
                name="additionalInfo"
                rows={3}
                value={formData.additionalInfo}
                onChange={handleChange}
                placeholder="Contoh: Media sekam bakar + kompos, terkena sinar matahari pagi..."
                className="form-textarea"
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Riwayat sensor &amp; penyiraman lama tetap tersimpan aman.
              </span>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="btn btn-ai"
                style={{ minHeight: '42px', padding: '10px 18px' }}
              >
                <Sparkles size={16} />
                <span>{isAnalyzing ? 'Menganalisis Kebutuhan...' : 'Analisis Kebutuhan (AI)'}</span>
                {!isAnalyzing && <ArrowRight size={15} />}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: REVIEW & APPROVE */}
      {step === 2 && aiPreview && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div className="card-title">
              <ShieldCheck size={18} style={{ color: 'var(--plant-green)' }} />
              <span>Tinjau Rekomendasi Perawatan: {formData.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setEditLimits((v) => !v)}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              <SlidersHorizontal size={14} />
              <span>{editLimits ? 'Selesai Ubah Batas' : 'Sesuaikan Batas'}</span>
            </button>
          </div>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Periksa batas parameter yang direkomendasikan sistem untuk <strong>{formData.type}</strong>
            {formData.variety ? ` (${formData.variety})` : ''}. Anda dapat menyesuaikan angka di bawah sebelum menyetujui dan masuk ke dashboard.
          </p>

          {/* 4 Metric Preview Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            {/* Soil */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--soil-cyan)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                <Waves size={15} />
                <span>Kelembapan Tanah</span>
              </div>
              {!editLimits ? (
                <>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {aiPreview.soilMoisture?.ideal?.min}–{aiPreview.soilMoisture?.ideal?.max}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Waspada: {aiPreview.soilMoisture?.warning?.min}–{aiPreview.soilMoisture?.warning?.max}%
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ideal Min / Max (%)</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="number" className="form-input" value={aiPreview.soilMoisture?.ideal?.min ?? ''} onChange={(e) => updatePreviewRange('soilMoisture', 'ideal', 'min', e.target.value)} />
                    <input type="number" className="form-input" value={aiPreview.soilMoisture?.ideal?.max ?? ''} onChange={(e) => updatePreviewRange('soilMoisture', 'ideal', 'max', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Temperature */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--temp-amber)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                <Thermometer size={15} />
                <span>Suhu Udara</span>
              </div>
              {!editLimits ? (
                <>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {aiPreview.temperature?.ideal?.min}–{aiPreview.temperature?.ideal?.max}°C
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Waspada: {aiPreview.temperature?.warning?.min}–{aiPreview.temperature?.warning?.max}°C
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ideal Min / Max (°C)</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="number" className="form-input" value={aiPreview.temperature?.ideal?.min ?? ''} onChange={(e) => updatePreviewRange('temperature', 'ideal', 'min', e.target.value)} />
                    <input type="number" className="form-input" value={aiPreview.temperature?.ideal?.max ?? ''} onChange={(e) => updatePreviewRange('temperature', 'ideal', 'max', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Air Humidity */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--humid-sky)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                <Droplets size={15} />
                <span>Kelembapan Udara</span>
              </div>
              {!editLimits ? (
                <>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {aiPreview.airHumidity?.ideal?.min}–{aiPreview.airHumidity?.ideal?.max}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Waspada: {aiPreview.airHumidity?.warning?.min}–{aiPreview.airHumidity?.warning?.max}%
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ideal Min / Max (%)</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="number" className="form-input" value={aiPreview.airHumidity?.ideal?.min ?? ''} onChange={(e) => updatePreviewRange('airHumidity', 'ideal', 'min', e.target.value)} />
                    <input type="number" className="form-input" value={aiPreview.airHumidity?.ideal?.max ?? ''} onChange={(e) => updatePreviewRange('airHumidity', 'ideal', 'max', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Light */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--light-gold)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                <Sun size={15} />
                <span>Cahaya Harian</span>
              </div>
              {!editLimits ? (
                <>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {aiPreview.light?.dailyDurationHours ?? '-'} Jam/Hari
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Ideal: {aiPreview.light?.ideal?.minLux ?? '-'}–{aiPreview.light?.ideal?.maxLux ?? '-'} lux
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ideal Min / Max (lux)</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="number" className="form-input" value={aiPreview.light?.ideal?.minLux ?? ''} onChange={(e) => updatePreviewRange('light', 'ideal', 'minLux', e.target.value)} />
                    <input type="number" className="form-input" value={aiPreview.light?.ideal?.maxLux ?? ''} onChange={(e) => updatePreviewRange('light', 'ideal', 'maxLux', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description & Watering Advice */}
          {aiPreview.description && (
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Ringkasan Kebutuhan:</strong> {aiPreview.description}
            </div>
          )}

          {aiPreview.watering && (
            <div style={{ background: 'var(--humid-sky-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <strong style={{ color: 'var(--humid-sky)' }}>Saran Penyiraman:</strong>{' '}
              {aiPreview.watering.frequency || '-'} • {aiPreview.watering.method || '-'}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isSaving}
              className="btn btn-secondary"
            >
              <ArrowLeft size={15} />
              <span>Ubah Data Tanaman</span>
            </button>

            <button
              type="button"
              onClick={handleApproveAndSave}
              disabled={isSaving}
              className="btn btn-primary"
              style={{ minHeight: '42px', padding: '10px 20px' }}
            >
              <CheckCircle2 size={16} />
              <span>{isSaving ? 'Menyimpan...' : 'Setujui & Masuk Dashboard'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlantOnboarding;

