import React from 'react';
import { usePlant } from '../context/PlantContext';
import { AlertTriangle, AlertCircle, Info, FlaskConical, ServerCrash } from 'lucide-react';

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
          message: `Nilai kelembapan ${soil}% di bawah batas toleransi minimum (${soilWarnMin}%). Sistem mengaktifkan protokol irigasi.`,
        });
      } else if (soilIdealMin !== undefined && soil < soilIdealMin) {
        activeAlerts.push({
          level: 'warning',
          title: 'Kelembapan Tanah Rendah',
          message: `Nilai kelembapan ${soil}% mendekati batas bawah rekomendasi ideal (${soilIdealMin}%).`,
        });
      } else if (soilWarnMax !== undefined && soil > soilWarnMax) {
        activeAlerts.push({
          level: 'warning',
          title: 'Kelembapan Tanah Jenuh',
          message: `Nilai kelembapan ${soil}% melebihi kapasitas lapang ideal (${soilWarnMax}%).`,
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
          title: 'Suhu Udara Melebihi Batas',
          message: `Suhu saat ini ${temp}°C melampaui toleransi biologis tanaman (${tempWarnMax}°C).`,
        });
      } else if (tempWarnMin !== undefined && temp < tempWarnMin) {
        activeAlerts.push({
          level: 'warning',
          title: 'Suhu Lingkungan Rendah',
          message: `Suhu saat ini ${temp}°C berada di bawah rentang optimal (${tempWarnMin}°C).`,
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
          title: 'Fotoperiode / Intensitas Minim',
          message: `Intensitas radiasi cahaya ${lux} Lux di bawah ambang fotosintesis efektif (${minLux} Lux).`,
        });
      }
    }
  }

  return (
    <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      
      {/* Backend Offline Banner */}
      {!isBackendOnline && (
        <div
          style={{
            background: 'var(--status-crit-bg)',
            border: '1px solid var(--status-crit-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--status-crit)',
            fontSize: '0.8125rem',
          }}
        >
          <ServerCrash size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Koneksi API Backend Terputus:</strong> {errorMessage || 'Server backend Node.js tidak merespons.'}
          </div>
        </div>
      )}

      {/* Firebase Unconfigured Notice */}
      {isBackendOnline && backendHealth?.firebase === 'unconfigured' && (
        <div
          style={{
            background: 'var(--status-warn-bg)',
            border: '1px solid var(--status-warn-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--status-warn)',
            fontSize: '0.8125rem',
          }}
        >
          <Info size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Firebase Standby:</strong> Menunggu sinkronisasi berkas <code>serviceAccountKey.json</code> pada backend.
          </div>
        </div>
      )}

      {/* Simulator Source Notice */}
      {isSimulator && (
        <div
          style={{
            background: 'var(--bg-card-subtle)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '0.78125rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FlaskConical size={16} style={{ color: 'var(--temp-amber)', flexShrink: 0 }} />
            <span>
              <strong>Mode Telemetri Uji (Simulasi Virtual):</strong> Data sensor dialirkan dari skrip pengujian software.
            </span>
          </div>
          <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>
            POST /api/sensor
          </span>
        </div>
      )}

      {/* Plant Health Threshold Alerts */}
      {activeAlerts.map((alert, idx) => {
        const isDanger = alert.level === 'danger';
        const isWarning = alert.level === 'warning';
        const bg = isDanger ? 'var(--status-crit-bg)' : isWarning ? 'var(--status-warn-bg)' : 'var(--status-info-bg)';
        const border = isDanger ? 'var(--status-crit-border)' : isWarning ? 'var(--status-warn-border)' : 'var(--status-info-border)';
        const color = isDanger ? 'var(--status-crit)' : isWarning ? 'var(--status-warn)' : 'var(--status-info)';
        const IconComponent = isDanger ? AlertCircle : isWarning ? AlertTriangle : Info;

        return (
          <div
            key={idx}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              color: color,
              fontSize: '0.8125rem',
            }}
          >
            <IconComponent size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontWeight: 700 }}>{alert.title}:</strong> {alert.message}
            </div>
          </div>
        );
      })}

    </div>
  );
}

export default AlertBanner;
