import React from 'react';
import { usePlant } from '../context/PlantContext';
import { AlertTriangle, AlertCircle, Info, FlaskConical, ServerCrash, CheckCircle2 } from 'lucide-react';

export function AlertBanner() {
  const { sensorData, requirements, isSimulator, isBackendOnline, errorMessage, backendHealth } = usePlant();

  // Evaluasi alert lokal jika data sensor dan requirements tersedia
  const activeAlerts = [];

  if (sensorData && requirements) {
    // 1. Kelembapan tanah
    if (sensorData.soilMoisture !== null && sensorData.soilMoisture !== undefined) {
      const soil = sensorData.soilMoisture;
      const soilWarnMin = requirements.soilMoisture?.warning?.min;
      const soilIdealMin = requirements.soilMoisture?.ideal?.min;
      const soilWarnMax = requirements.soilMoisture?.warning?.max;

      if (soilWarnMin !== undefined && soil < soilWarnMin) {
        activeAlerts.push({
          level: 'danger',
          title: 'Kelembapan Tanah Kritis',
          message: `Kelembapan tanah ${soil}% berada di bawah batas minimum aman (${soilWarnMin}%). Sistem mempertimbangkan penyiraman.`,
        });
      } else if (soilIdealMin !== undefined && soil < soilIdealMin) {
        activeAlerts.push({
          level: 'warning',
          title: 'Kelembapan Tanah Rendah',
          message: `Kelembapan tanah ${soil}% sedikit di bawah rentang ideal (${soilIdealMin}%).`,
        });
      } else if (soilWarnMax !== undefined && soil > soilWarnMax) {
        activeAlerts.push({
          level: 'warning',
          title: 'Kelembapan Tanah Berlebih',
          message: `Kelembapan tanah ${soil}% melebihi batas toleransi atas (${soilWarnMax}%).`,
        });
      }
    }

    // 2. Suhu udara
    if (sensorData.temperature !== null && sensorData.temperature !== undefined) {
      const temp = sensorData.temperature;
      const tempWarnMax = requirements.temperature?.warning?.max;
      const tempWarnMin = requirements.temperature?.warning?.min;

      if (tempWarnMax !== undefined && temp > tempWarnMax) {
        activeAlerts.push({
          level: 'danger',
          title: 'Suhu Udara Terlalu Panas',
          message: `Suhu saat ini ${temp}°C melampaui batas toleransi tanaman (${tempWarnMax}°C).`,
        });
      } else if (tempWarnMin !== undefined && temp < tempWarnMin) {
        activeAlerts.push({
          level: 'warning',
          title: 'Suhu Udara Dingin',
          message: `Suhu saat ini ${temp}°C di bawah batas ideal (${tempWarnMin}°C).`,
        });
      }
    }

    // 3. Cahaya
    if (sensorData.lightLux !== null && sensorData.lightLux !== undefined) {
      const lux = sensorData.lightLux;
      const minLux = requirements.light?.warning?.minLux;
      if (minLux !== undefined && lux < minLux) {
        activeAlerts.push({
          level: 'info',
          title: 'Intensitas Cahaya Rendah',
          message: `Intensitas ${lux} Lux lebih rendah dari kebutuhan minimal (${minLux} Lux). Pastikan tanaman mendapat cahaya cukup.`,
        });
      }
    }
  }

  return (
    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Backend Offline Banner */}
      {!isBackendOnline && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#fca5a5',
          }}
        >
          <ServerCrash size={20} style={{ flexShrink: 0, color: '#ef4444' }} />
          <div style={{ fontSize: '0.875rem' }}>
            <strong>Backend Terputus:</strong> {errorMessage || 'Server backend Node.js tidak merespons.'}
          </div>
        </div>
      )}

      {/* Firebase Unconfigured Notice */}
      {isBackendOnline && backendHealth?.firebase === 'unconfigured' && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#fde68a',
          }}
        >
          <Info size={20} style={{ flexShrink: 0, color: '#f59e0b' }} />
          <div style={{ fontSize: '0.875rem' }}>
            <strong>Firebase Mode Standby:</strong> File <code>serviceAccountKey.json</code> belum diisi di backend. Data saat ini disimpan dalam buffer runtime dan siap terhubung saat kunci ditambahkan.
          </div>
        </div>
      )}

      {/* Simulator Source Notice */}
      {isSimulator && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px dashed rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            color: '#fef3c7',
            fontSize: '0.825rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FlaskConical size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span>
              <strong>Mode Simulasi Aktif:</strong> Nilai sensor berasal dari <code>Python Sensor Simulator</code>. Kontrol pompa bekerja dalam simulasi virtual tertutup dan tidak menggerakkan relay fisik 12V.
            </span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Simulator v1.0 • Endpoint: /api/sensor
          </span>
        </div>
      )}

      {/* Plant Health Alerts */}
      {activeAlerts.map((alert, idx) => {
        const isDanger = alert.level === 'danger';
        const isWarning = alert.level === 'warning';
        const borderColor = isDanger ? 'rgba(239, 68, 68, 0.35)' : isWarning ? 'rgba(245, 158, 11, 0.35)' : 'rgba(14, 165, 233, 0.35)';
        const bgColor = isDanger ? 'rgba(239, 68, 68, 0.12)' : isWarning ? 'rgba(245, 158, 11, 0.1)' : 'rgba(14, 165, 233, 0.1)';
        const textColor = isDanger ? '#fca5a5' : isWarning ? '#fde68a' : '#bae6fd';
        const IconComponent = isDanger ? AlertCircle : isWarning ? AlertTriangle : Info;

        return (
          <div
            key={idx}
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              color: textColor,
            }}
          >
            <IconComponent size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.875rem' }}>
              <strong>{alert.title}:</strong> {alert.message}
            </div>
          </div>
        );
      })}

    </div>
  );
}

export default AlertBanner;

