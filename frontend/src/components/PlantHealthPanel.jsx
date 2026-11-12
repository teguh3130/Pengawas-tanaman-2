import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import {
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
  Wrench,
  RefreshCw,
  Maximize2,
  X,
} from 'lucide-react';

function getStatusConfig(status) {
  switch (status) {
    case 'Sehat':
      return {
        label: 'Sehat',
        color: 'var(--status-normal)',
        bg: 'var(--status-normal-muted)',
        border: 'rgba(22, 163, 74, 0.35)',
        Icon: CheckCircle2,
      };
    case 'Kurang Sehat':
      return {
        label: 'Kurang Sehat',
        color: 'var(--status-warning)',
        bg: 'var(--status-warning-muted)',
        border: 'rgba(217, 119, 6, 0.35)',
        Icon: AlertTriangle,
      };
    case 'Tidak Sehat':
      return {
        label: 'Tidak Sehat',
        color: 'var(--status-danger)',
        bg: 'var(--status-danger-muted)',
        border: 'rgba(220, 38, 38, 0.35)',
        Icon: XCircle,
      };
    default:
      return {
        label: 'Belum dapat dianalisis',
        color: 'var(--text-muted)',
        bg: 'var(--bg-card-subtle)',
        border: 'var(--border-subtle)',
        Icon: HelpCircle,
      };
  }
}

function getPriorityStyle(priority) {
  switch (priority) {
    case 'Tinggi':
      return { color: 'var(--status-danger)', bg: 'var(--status-danger-muted)' };
    case 'Sedang':
      return { color: 'var(--status-warning)', bg: 'var(--status-warning-muted)' };
    default:
      return { color: 'var(--status-normal)', bg: 'var(--status-normal-muted)' };
  }
}

export function PlantHealthPanel() {
  const {
    plant,
    requirements,
    sensorData,
    healthAnalysis,
    runHealthAnalysis,
  } = usePlant();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Cek apakah 4 sensor utama tersedia secara aktual
  const missingSensors = [];
  if (!sensorData) {
    missingSensors.push('Semua sensor belum mengirim data');
  } else {
    if (sensorData.soilMoisture == null || Number.isNaN(Number(sensorData.soilMoisture))) missingSensors.push('Kelembapan Tanah');
    if (sensorData.temperature == null || Number.isNaN(Number(sensorData.temperature))) missingSensors.push('Suhu Udara');
    if (sensorData.airHumidity == null || Number.isNaN(Number(sensorData.airHumidity))) missingSensors.push('Kelembapan Udara');
    if (sensorData.lightLux == null || Number.isNaN(Number(sensorData.lightLux))) missingSensors.push('Intensitas Cahaya');
  }

  const isSensorReady = Boolean(sensorData && missingSensors.length === 0 && requirements);

  // Cek apakah analisis terakhir cocok dengan profil tanaman aktif saat ini
  const isAnalysisStaleForPlant = Boolean(
    healthAnalysis?.canAnalyze &&
    plant &&
    ((healthAnalysis.plantName && healthAnalysis.plantName !== plant.name) ||
      (healthAnalysis.plantType && healthAnalysis.plantType !== plant.type))
  );

  // Jika sensor aktual saat ini tidak tersedia atau profil tanaman berubah,
  // jangan tampilkan kesimpulan status kesehatan palsu/kedaluwarsa.
  const effectiveStatus = (!sensorData || isAnalysisStaleForPlant)
    ? 'Belum dapat dianalisis'
    : (healthAnalysis?.canAnalyze ? healthAnalysis.status : 'Belum dapat dianalisis');

  const statusCfg = getStatusConfig(effectiveStatus);
  const StatusIcon = statusCfg.Icon;

  const hasValidAnalysis = Boolean(isSensorReady && healthAnalysis?.canAnalyze && !isAnalysisStaleForPlant);
  const problems = Array.isArray(healthAnalysis?.problematicParameters) ? healthAnalysis.problematicParameters : [];
  const recommendations = Array.isArray(healthAnalysis?.recommendations) ? healthAnalysis.recommendations : [];

  const handleAnalyze = async () => {
    setErrorMsg(null);
    setIsAnalyzing(true);
    try {
      await runHealthAnalysis();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menjalankan analisis kesehatan tanaman');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: '20px' }}>
        {/* Header */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div className="card-title">
            <Activity size={16} style={{ color: 'var(--plant-green)' }} />
            <span>Analisis Kesehatan Tanaman</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {hasValidAnalysis && (
              <button
                type="button"
                onClick={() => setIsDetailOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <Maximize2 size={13} />
                <span>Detail &amp; Solusi</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !isSensorReady}
              className="btn btn-ai"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              title={!isSensorReady ? 'Menunggu data sensor lengkap & parameter tanaman' : 'Analisis kondisi kesehatan menggunakan AI'}
            >
              {isAnalyzing ? <RefreshCw size={13} className="spin-anim" /> : <Sparkles size={13} />}
              <span>{isAnalyzing ? 'Menganalisis...' : 'Analisis Kesehatan (AI)'}</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div
            style={{
              background: 'var(--status-danger-muted)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              marginBottom: '12px',
              fontSize: '0.8rem',
              color: 'var(--status-danger)',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Compact Status Banner */}
        <div
          style={{
            background: statusCfg.bg,
            border: `1px solid ${statusCfg.border}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StatusIcon size={17} style={{ color: statusCfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Status:
              </span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {hasValidAnalysis && healthAnalysis?.confidence != null && (
                <span className="mono">
                  Keyakinan: <strong style={{ color: 'var(--text-primary)' }}>{healthAnalysis.confidence}%</strong>
                </span>
              )}
              {hasValidAnalysis && healthAnalysis?.analyzedAt && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  <span>{new Date(healthAnalysis.analyzedAt).toLocaleString('id-ID')}</span>
                </span>
              )}
            </div>
          </div>

          <div style={{ fontSize: '0.81rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {!isSensorReady ? (
              <span>
                <strong>Belum dapat dianalisis:</strong>{' '}
                {!requirements
                  ? 'Parameter kebutuhan tanaman belum dikonfigurasi.'
                  : `Data sensor belum lengkap (${missingSensors.join(', ')}). Nyalakan perangkat ESP32 atau simulator untuk melakukan analisis aktual.`}
              </span>
            ) : isAnalysisStaleForPlant ? (
              <span>
                Profil tanaman telah diperbarui menjadi <strong>{plant?.name}</strong> ({plant?.type}). Klik <strong>Analisis Kesehatan (AI)</strong> untuk menganalisis ulang sesuai profil terbaru.
              </span>
            ) : hasValidAnalysis ? (
              <span>{healthAnalysis.reason}</span>
            ) : (
              <span>
                Data sensor untuk <strong>{plant?.name}</strong> sudah tersedia. Klik <strong>Analisis Kesehatan (AI)</strong> untuk mengevaluasi kondisi tanaman dan mendapatkan rencana penanganan.
              </span>
            )}
          </div>

          {/* Summary Bar for Popup */}
          {hasValidAnalysis && (
            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.76rem',
              }}
            >
              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span>
                  Parameter bermasalah: <strong style={{ color: problems.length > 0 ? 'var(--status-danger)' : 'var(--status-normal)' }}>{problems.length}</strong>
                </span>
                <span>•</span>
                <span>
                  Tindakan disarankan: <strong style={{ color: 'var(--text-primary)' }}>{recommendations.length}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'var(--plant-green)',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Buka Detail &amp; Rekomendasi Penanganan →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pop-up Modal Detail Analisis & Rekomendasi Penanganan */}
      {isDetailOpen && hasValidAnalysis && (
        <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '760px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-sm)',
                    background: statusCfg.bg,
                    border: `1px solid ${statusCfg.border}`,
                    color: statusCfg.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <StatusIcon size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Detail Kesehatan &amp; Penanganan: {plant?.name}
                  </h2>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
                    <span>
                      Status: <strong style={{ color: statusCfg.color }}>{statusCfg.label}</strong>
                    </span>
                    {healthAnalysis?.confidence != null && (
                      <span className="mono">Keyakinan: {healthAnalysis.confidence}%</span>
                    )}
                    {healthAnalysis?.analyzedAt && (
                      <span>{new Date(healthAnalysis.analyzedAt).toLocaleString('id-ID')}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                }}
                aria-label="Tutup detail"
              >
                <X size={20} />
              </button>
            </div>

            {/* Ringkasan Penilaian */}
            <div
              style={{
                background: statusCfg.bg,
                border: `1px solid ${statusCfg.border}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                fontSize: '0.83rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.55,
                marginBottom: '18px',
              }}
            >
              {healthAnalysis.reason}
            </div>

            {/* Parameter Bermasalah */}
            <div style={{ marginBottom: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <ShieldAlert size={14} style={{ color: 'var(--status-warning)' }} />
                <span>Parameter Bermasalah</span>
              </div>

              {problems.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {problems.map((item, idx) => {
                    const isDanger = item.severity === 'bahaya';
                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderLeft: `3px solid ${isDanger ? 'var(--status-danger)' : 'var(--status-warning)'}`,
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.label}
                          </span>
                          <span
                            className="mono"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: isDanger ? 'var(--status-danger)' : 'var(--status-warning)',
                            }}
                          >
                            {item.currentValue}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          Ideal: <span className="mono">{item.idealRange}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          {item.issue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Tidak ada parameter yang menyimpang dari rentang ideal saat analisis dilakukan.
                </div>
              )}
            </div>

            {/* Rekomendasi Penanganan */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <Wrench size={14} style={{ color: 'var(--plant-green)' }} />
                <span>Rekomendasi Penanganan Spesifik ({plant?.type || plant?.name})</span>
              </div>

              {recommendations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recommendations.map((rec, idx) => {
                    const pStyle = getPriorityStyle(rec.priority);
                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {rec.actionTitle}
                            </div>
                            {rec.issueCondition && (
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Kondisi: {rec.issueCondition}
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-xs)',
                              color: pStyle.color,
                              background: pStyle.bg,
                              flexShrink: 0,
                            }}
                          >
                            Prioritas {rec.priority || 'Sedang'}
                          </span>
                        </div>

                        {Array.isArray(rec.steps) && rec.steps.length > 0 && (
                          <ol
                            style={{
                              paddingLeft: '18px',
                              margin: '6px 0 0 0',
                              fontSize: '0.8rem',
                              color: 'var(--text-secondary)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              lineHeight: 1.5,
                            }}
                          >
                            {rec.steps.map((s, sIdx) => (
                              <li key={sIdx}>{s}</li>
                            ))}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Belum ada rekomendasi tindakan tambahan.
                </div>
              )}
            </div>

            {healthAnalysis.disclaimer && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginBottom: '14px' }}>
                <em>Catatan: {healthAnalysis.disclaimer}</em>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !isSensorReady}
                className="btn btn-ai"
                style={{ fontSize: '0.8rem' }}
              >
                {isAnalyzing ? <RefreshCw size={14} className="spin-anim" /> : <Sparkles size={14} />}
                <span>{isAnalyzing ? 'Menganalisis...' : 'Analisis Ulang'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlantHealthPanel;
