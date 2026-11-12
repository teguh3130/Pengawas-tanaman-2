import React from 'react';
import { usePlant } from '../context/PlantContext';
import { Thermometer, Droplets, Waves, Sun } from 'lucide-react';

export function SensorOverview() {
  const { sensorData, requirements } = usePlant();

  // Helper status evaluator dengan tone profesional
  function evaluateStatus(value, idealMin, idealMax, warnMin, warnMax) {
    if (value === null || value === undefined) {
      return { label: 'Standby', statusClass: 'waiting', percent: 0 };
    }
    if (warnMin !== undefined && value < warnMin) {
      return { label: 'Kritis Rendah', statusClass: 'crit', percent: 15 };
    }
    if (warnMax !== undefined && value > warnMax) {
      return { label: 'Kritis Tinggi', statusClass: 'crit', percent: 95 };
    }
    if (idealMin !== undefined && value < idealMin) {
      return { label: 'Di Bawah Ideal', statusClass: 'warn', percent: 35 };
    }
    if (idealMax !== undefined && value > idealMax) {
      return { label: 'Di Atas Ideal', statusClass: 'warn', percent: 80 };
    }
    return { label: 'Optimal', statusClass: 'ok', percent: 60 };
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
  const targetHours = lightReq?.dailyDurationHours ?? 8;
  const dailyLight = sensorData?.dailyLight;
  const lightSecToday = dailyLight?.durationIdealSec ?? dailyLight?.durationAboveThresholdSec ?? null;

  function formatLightDuration(sec) {
    if (sec === null || sec === undefined || Number.isNaN(Number(sec))) return '--';
    const totalSec = Math.max(0, Math.floor(Number(sec)));
    if (totalSec === 0) return '0 mnt';
    if (totalSec < 60) return '< 1 mnt';
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (hours === 0) return `${mins} mnt`;
    return mins > 0 ? `${hours}j ${mins}m` : `${hours} jam`;
  }

  const targetSec = targetHours * 3600;
  const lightGoalReached = lightSecToday !== null && lightSecToday >= targetSec;

  let luxStatus = { label: 'Optimal', statusClass: 'ok', percent: 50 };
  if (luxVal === null || luxVal === undefined) {
    luxStatus = { label: 'Standby', statusClass: 'waiting', percent: 0 };
  } else if (lightReq) {
    if (lightReq.warning?.minLux !== undefined && luxVal < lightReq.warning.minLux) {
      luxStatus = { label: 'Kurang Cahaya', statusClass: 'warn', percent: 20 };
    } else if (lightReq.warning?.maxLux !== undefined && luxVal > lightReq.warning.maxLux) {
      luxStatus = { label: 'Terlalu Terik', statusClass: 'warn', percent: 90 };
    }
  }

  return (
    <div className="metric-grid">
      
      {/* ── CARD 1: Kelembapan Tanah (Soil Moisture) ────────────────────────── */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-label-group">
            <span className="metric-icon" style={{ color: 'var(--soil-cyan)' }}>
              <Waves size={16} />
            </span>
            <span className="metric-title">Kelembapan Tanah</span>
          </div>
          <span className={`metric-status-tag ${soilStatus.statusClass}`}>
            {soilStatus.label}
          </span>
        </div>

        <div className="metric-value-row">
          <span className="metric-value">
            {soilVal !== null ? soilVal.toFixed(1) : '--'}
          </span>
          <span className="metric-unit">%</span>
        </div>

        <div className="metric-bar-track">
          <div
            className="metric-bar-value"
            style={{
              width: `${Math.min(100, Math.max(3, soilVal !== null ? soilVal : 0))}%`,
              background: 'var(--soil-cyan)',
            }}
          />
        </div>

        <div className="metric-footer">
          <span>Target: {soilReq?.ideal ? `${soilReq.ideal.min}–${soilReq.ideal.max}%` : '40–70%'}</span>
          <span>Soil ADC {soilRaw !== null ? `#${soilRaw}` : ''}</span>
        </div>
      </div>

      {/* ── CARD 2: Suhu Udara (DHT22) ───────────────────────────────────────── */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-label-group">
            <span className="metric-icon" style={{ color: 'var(--temp-amber)' }}>
              <Thermometer size={16} />
            </span>
            <span className="metric-title">Suhu Udara</span>
          </div>
          <span className={`metric-status-tag ${tempStatus.statusClass}`}>
            {tempStatus.label}
          </span>
        </div>

        <div className="metric-value-row">
          <span className="metric-value">
            {tempVal !== null ? tempVal.toFixed(1) : '--'}
          </span>
          <span className="metric-unit">°C</span>
        </div>

        <div className="metric-bar-track">
          <div
            className="metric-bar-value"
            style={{
              width: `${Math.min(100, Math.max(3, tempVal !== null ? ((tempVal - 15) / 25) * 100 : 0))}%`,
              background: 'var(--temp-amber)',
            }}
          />
        </div>

        <div className="metric-footer">
          <span>Target: {tempReq?.ideal ? `${tempReq.ideal.min}–${tempReq.ideal.max}°C` : '22–30°C'}</span>
          <span>DHT22 (GPIO 27)</span>
        </div>
      </div>

      {/* ── CARD 3: Kelembapan Udara (DHT22) ─────────────────────────────────── */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-label-group">
            <span className="metric-icon" style={{ color: 'var(--humid-sky)' }}>
              <Droplets size={16} />
            </span>
            <span className="metric-title">Kelembapan Udara</span>
          </div>
          <span className={`metric-status-tag ${humStatus.statusClass}`}>
            {humStatus.label}
          </span>
        </div>

        <div className="metric-value-row">
          <span className="metric-value">
            {humVal !== null ? humVal.toFixed(1) : '--'}
          </span>
          <span className="metric-unit">%</span>
        </div>

        <div className="metric-bar-track">
          <div
            className="metric-bar-value"
            style={{
              width: `${Math.min(100, Math.max(3, humVal !== null ? humVal : 0))}%`,
              background: 'var(--humid-sky)',
            }}
          />
        </div>

        <div className="metric-footer">
          <span>Target: {humReq?.ideal ? `${humReq.ideal.min}–${humReq.ideal.max}%` : '60–80%'}</span>
          <span>DHT22 (Kelembapan)</span>
        </div>
      </div>

      {/* ── CARD 4: Intensitas Cahaya (BH1750) ───────────────────────────────── */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-label-group">
            <span className="metric-icon" style={{ color: 'var(--light-gold)' }}>
              <Sun size={16} />
            </span>
            <span className="metric-title">Intensitas Cahaya</span>
          </div>
          <span className={`metric-status-tag ${luxStatus.statusClass}`}>
            {luxStatus.label}
          </span>
        </div>

        <div className="metric-value-row">
          <span className="metric-value">
            {luxVal !== null ? Math.round(luxVal).toLocaleString('id-ID') : '--'}
          </span>
          <span className="metric-unit">Lux</span>
        </div>

        <div className="metric-bar-track">
          <div
            className="metric-bar-value"
            style={{
              width: `${Math.min(100, Math.max(3, luxVal !== null ? (luxVal / 30000) * 100 : 0))}%`,
              background: 'var(--light-gold)',
            }}
          />
        </div>

        <div className="metric-footer">
          <span>
            Target: {targetHours} jam/hari
            {lightReq?.ideal?.minLux != null ? ` (${Number(lightReq.ideal.minLux).toLocaleString('id-ID')}+ Lux)` : ''}
          </span>
          <span>BH1750 (I2C 0x23)</span>
        </div>
        <div
          style={{
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px dashed var(--border-subtle)',
            fontSize: '0.7rem',
            color: lightGoalReached ? 'var(--status-normal)' : 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Cahaya ideal hari ini:</span>
          <strong className="mono" style={{ color: lightGoalReached ? 'var(--status-normal)' : 'var(--text-secondary)' }}>
            {formatLightDuration(lightSecToday)} / {targetHours} jam
          </strong>
        </div>
      </div>

    </div>
  );
}

export default SensorOverview;
