import React from 'react';
import { usePlant } from '../context/PlantContext';
import { Thermometer, Droplets, Waves, Sun, Clock, Sparkles } from 'lucide-react';

export function SensorOverview() {
  const { sensorData, requirements, lastUpdated } = usePlant();

  // Helper status evaluator
  function evaluateStatus(value, idealMin, idealMax, warnMin, warnMax) {
    if (value === null || value === undefined) return { label: 'MENUNGGU DATA', badgeClass: 'badge-warning', percent: 0 };
    if (warnMin !== undefined && value < warnMin) return { label: 'TERLALU RENDAH', badgeClass: 'badge-danger', percent: 15 };
    if (warnMax !== undefined && value > warnMax) return { label: 'TERLALU TINGGI', badgeClass: 'badge-danger', percent: 95 };
    if (idealMin !== undefined && value < idealMin) return { label: 'CUKUP RENDAH', badgeClass: 'badge-warning', percent: 35 };
    if (idealMax !== undefined && value > idealMax) return { label: 'AGAK TINGGI', badgeClass: 'badge-warning', percent: 80 };
    return { label: 'OPTIMAL', badgeClass: 'badge-normal', percent: 60 };
  }

  // 1. Suhu Udara (DHT22)
  const tempVal = sensorData?.temperature ?? null;
  const tempReq = requirements?.temperature;
  const tempStatus = evaluateStatus(
    tempVal,
    tempReq?.ideal?.min,
    tempReq?.ideal?.max,
    tempReq?.warning?.min,
    tempReq?.warning?.max
  );

  // 2. Kelembapan Udara (DHT22)
  const humVal = sensorData?.airHumidity ?? null;
  const humReq = requirements?.airHumidity;
  const humStatus = evaluateStatus(
    humVal,
    humReq?.ideal?.min,
    humReq?.ideal?.max,
    humReq?.warning?.min,
    humReq?.warning?.max
  );

  // 3. Kelembapan Tanah (Soil Moisture ADC)
  const soilVal = sensorData?.soilMoisture ?? null;
  const soilRaw = sensorData?.soilMoistureRaw ?? null;
  const soilReq = requirements?.soilMoisture;
  const soilStatus = evaluateStatus(
    soilVal,
    soilReq?.ideal?.min,
    soilReq?.ideal?.max,
    soilReq?.warning?.min,
    soilReq?.warning?.max
  );

  // 4. Intensitas Cahaya (BH1750)
  const luxVal = sensorData?.lightLux ?? null;
  const lightReq = requirements?.light;
  let luxStatus = { label: 'OPTIMAL', badgeClass: 'badge-normal', percent: 50 };
  if (luxVal !== null && lightReq) {
    if (lightReq.warning?.minLux !== undefined && luxVal < lightReq.warning.minLux) {
      luxStatus = { label: 'KURANG CAHAYA', badgeClass: 'badge-warning', percent: 20 };
    } else if (lightReq.warning?.maxLux !== undefined && luxVal > lightReq.warning.maxLux) {
      luxStatus = { label: 'TERLALU TERIK', badgeClass: 'badge-warning', percent: 90 };
    }
  }

  const timeStr = sensorData?.timestamp
    ? new Date(sensorData.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '-';

  return (
    <div className="metric-grid">
      
      {/* ── CARD 1: Kelembapan Tanah (Soil Moisture) ────────────────────────── */}
      <div className="metric-card" style={{ '--card-accent': 'var(--soil-cyan)' }}>
        <div className="metric-top">
          <div className="metric-icon-wrap" style={{ background: 'rgba(20, 184, 166, 0.12)' }}>
            <Waves size={22} />
          </div>
          <span className={`badge ${soilStatus.badgeClass}`}>{soilStatus.label}</span>
        </div>

        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Kelembapan Tanah
        </div>

        <div className="metric-value-row">
          <span className="metric-value">
            {soilVal !== null ? soilVal.toFixed(1) : '--'}
          </span>
          <span className="metric-unit">%</span>
        </div>

        {/* Progress Bar */}
        <div className="metric-bar-bg">
          <div
            className="metric-bar-fill"
            style={{ width: `${Math.min(100, Math.max(5, soilVal !== null ? soilVal : 0))}%` }}
          />
        </div>

        <div className="metric-meta">
          <span>Sensor: Soil Moisture ADC {soilRaw !== null ? `(raw: ${soilRaw})` : ''}</span>
          <span>Ideal: {soilReq?.ideal ? `${soilReq.ideal.min}–${soilReq.ideal.max}%` : '40–70%'}</span>
        </div>
      </div>

      {/* ── CARD 2: Suhu Udara (DHT22) ───────────────────────────────────────── */}
      <div className="metric-card" style={{ '--card-accent': 'var(--temp-orange)' }}>
        <div className="metric-top">
          <div className="metric-icon-wrap" style={{ background: 'rgba(249, 115, 22, 0.12)' }}>
            <Thermometer size={22} />
          </div>
          <span className={`badge ${tempStatus.badgeClass}`}>{tempStatus.label}</span>
        </div>

        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Suhu Udara
        </div>

        <div className="metric-value-row">
          <span className="metric-value">
            {tempVal !== null ? tempVal.toFixed(1) : '--'}
          </span>
          <span className="metric-unit">°C</span>
        </div>

        {/* Progress Bar (20C - 40C range) */}
        <div className="metric-bar-bg">
          <div
            className="metric-bar-fill"
            style={{
              width: `${Math.min(100, Math.max(5, tempVal !== null ? ((tempVal - 15) / 25) * 100 : 0))}%`,
            }}
          />
        </div>

        <div className="metric-meta">
          <span>Sensor: DHT22</span>
          <span>Ideal: {tempReq?.ideal ? `${tempReq.ideal.min}–${tempReq.ideal.max}°C` : '22–30°C'}</span>
        </div>
      </div>

      {/* ── CARD 3: Kelembapan Udara (DHT22) ─────────────────────────────────── */}
      <div className="metric-card" style={{ '--card-accent': 'var(--humid-blue)' }}>
        <div className="metric-top">
          <div className="metric-icon-wrap" style={{ background: 'rgba(14, 165, 233, 0.12)' }}>
            <Droplets size={22} />
          </div>
          <span className={`badge ${humStatus.badgeClass}`}>{humStatus.label}</span>
        </div>

        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Kelembapan Udara
        </div>

        <div className="metric-value-row">
          <span className="metric-value">
            {humVal !== null ? humVal.toFixed(1) : '--'}
          </span>
          <span className="metric-unit">%</span>
        </div>

        {/* Progress Bar */}
        <div className="metric-bar-bg">
          <div
            className="metric-bar-fill"
            style={{ width: `${Math.min(100, Math.max(5, humVal !== null ? humVal : 0))}%` }}
          />
        </div>

        <div className="metric-meta">
          <span>Sensor: DHT22</span>
          <span>Ideal: {humReq?.ideal ? `${humReq.ideal.min}–${humReq.ideal.max}%` : '60–80%'}</span>
        </div>
      </div>

      {/* ── CARD 4: Intensitas Cahaya (BH1750) ───────────────────────────────── */}
      <div className="metric-card" style={{ '--card-accent': 'var(--light-yellow)' }}>
        <div className="metric-top">
          <div className="metric-icon-wrap" style={{ background: 'rgba(234, 179, 8, 0.12)' }}>
            <Sun size={22} />
          </div>
          <span className={`badge ${luxStatus.badgeClass}`}>{luxStatus.label}</span>
        </div>

        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Intensitas Cahaya
        </div>

        <div className="metric-value-row">
          <span className="metric-value" style={{ fontSize: '1.95rem' }}>
            {luxVal !== null ? Math.round(luxVal).toLocaleString('id-ID') : '--'}
          </span>
          <span className="metric-unit">Lux</span>
        </div>

        {/* Progress Bar */}
        <div className="metric-bar-bg">
          <div
            className="metric-bar-fill"
            style={{
              width: `${Math.min(100, Math.max(5, luxVal !== null ? (luxVal / 30000) * 100 : 0))}%`,
            }}
          />
        </div>

        <div className="metric-meta">
          <span>Sensor: BH1750 (I2C)</span>
          <span>Target: {lightReq?.dailyDurationHours ? `${lightReq.dailyDurationHours} jam/hari` : '6–8 jam'}</span>
        </div>
      </div>

    </div>
  );
}

export default SensorOverview;

