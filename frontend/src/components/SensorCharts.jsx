import React, { useState, useMemo } from 'react';
import { usePlant } from '../context/PlantContext';
import { useTheme } from '../context/ThemeContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity, Calendar, Waves, Thermometer, Sun } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function SensorCharts() {
  const { historyData, historyPeriod, setHistoryPeriod } = usePlant();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const [activeTab, setActiveTab] = useState('soil'); // 'soil' | 'climate' | 'light'

  // Siapkan data label dan series dari history
  const chartData = useMemo(() => {
    if (!Array.isArray(historyData) || historyData.length === 0) {
      return null;
    }

    const labels = historyData.map((d) => {
      const date = new Date(d.timestamp);
      if (historyPeriod === '24h') {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:00`;
    });

    if (activeTab === 'soil') {
      return {
        labels,
        datasets: [
          {
            label: 'Kelembapan Tanah (%)',
            data: historyData.map((d) => d.soilMoisture ?? null),
            borderColor: '#14b8a6',
            backgroundColor: isLight ? 'rgba(20, 184, 166, 0.16)' : 'rgba(20, 184, 166, 0.12)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: historyData.length > 50 ? 0 : 3,
            pointHoverRadius: 6,
          },
        ],
      };
    }

    if (activeTab === 'climate') {
      return {
        labels,
        datasets: [
          {
            label: 'Suhu Udara (°C)',
            data: historyData.map((d) => d.temperature ?? null),
            borderColor: '#f97316',
            backgroundColor: isLight ? 'rgba(249, 115, 22, 0.12)' : 'rgba(249, 115, 22, 0.08)',
            borderWidth: 2,
            tension: 0.35,
            yAxisID: 'yTemp',
            pointRadius: historyData.length > 50 ? 0 : 3,
          },
          {
            label: 'Kelembapan Udara (%)',
            data: historyData.map((d) => d.airHumidity ?? null),
            borderColor: '#0ea5e9',
            backgroundColor: isLight ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.08)',
            borderWidth: 2,
            tension: 0.35,
            yAxisID: 'yHum',
            pointRadius: historyData.length > 50 ? 0 : 3,
          },
        ],
      };
    }

    // activeTab === 'light'
    return {
      labels,
      datasets: [
        {
          label: 'Intensitas Cahaya (Lux)',
          data: historyData.map((d) => d.lightLux ?? null),
          borderColor: '#eab308',
          backgroundColor: isLight ? 'rgba(234, 179, 8, 0.18)' : 'rgba(234, 179, 8, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: historyData.length > 50 ? 0 : 3,
        },
      ],
    };
  }, [historyData, activeTab, historyPeriod, isLight]);

  // Options Chart.js adaptif terhadap tema aktif
  const options = useMemo(() => {
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
    const tickColor = isLight ? '#475569' : '#64748b';
    const legendColor = isLight ? '#1e293b' : '#94a3b8';
    const tooltipBg = isLight ? '#ffffff' : '#0f172a';
    const tooltipTitle = isLight ? '#0f172a' : '#f8fafc';
    const tooltipBody = isLight ? '#334155' : '#e2e8f0';
    const tooltipBorder = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: legendColor,
            font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipTitle,
          bodyColor: tooltipBody,
          borderColor: tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, maxTicksLimit: 12, font: { size: 11 } },
        },
        ...(activeTab === 'climate'
          ? {
              yTemp: {
                type: 'linear',
                position: 'left',
                grid: { color: gridColor },
                ticks: { color: '#f97316', callback: (v) => `${v}°C` },
              },
              yHum: {
                type: 'linear',
                position: 'right',
                grid: { drawOnChartArea: false },
                ticks: { color: '#0ea5e9', callback: (v) => `${v}%` },
              },
            }
          : {
              y: {
                grid: { color: gridColor },
                ticks: {
                  color: tickColor,
                  callback: (v) => (activeTab === 'soil' ? `${v}%` : `${v} lx`),
                },
              },
            }),
      },
    };
  }, [activeTab, isLight]);

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      
      {/* Header with Tabs & Period Selectors */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
        
        {/* Metric Selector Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', padding: '4px', borderRadius: '12px' }}>
          <button
            onClick={() => setActiveTab('soil')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              background: activeTab === 'soil' ? 'var(--soil-cyan)' : 'transparent',
              color: activeTab === 'soil' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
            }}
          >
            <Waves size={15} />
            <span>Tanah</span>
          </button>

          <button
            onClick={() => setActiveTab('climate')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              background: activeTab === 'climate' ? 'var(--temp-orange)' : 'transparent',
              color: activeTab === 'climate' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
            }}
          >
            <Thermometer size={15} />
            <span>Suhu & Udara</span>
          </button>

          <button
            onClick={() => setActiveTab('light')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              background: activeTab === 'light' ? 'var(--light-yellow)' : 'transparent',
              color: activeTab === 'light' ? '#0b1315' : 'var(--text-secondary)',
              fontWeight: 700,
            }}
          >
            <Sun size={15} />
            <span>Cahaya</span>
          </button>
        </div>

        {/* Period Selector (24h / 7d / 30d) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
          {['24h', '7d', '30d'].map((p) => {
            const labelMap = { '24h': '24 Jam', '7d': '7 Hari', '30d': '30 Hari' };
            const isSelected = historyPeriod === p;
            return (
              <button
                key={p}
                onClick={() => setHistoryPeriod(p)}
                style={{
                  background: isSelected ? 'var(--btn-secondary-bg)' : 'transparent',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: isSelected ? '1px solid var(--border-hover)' : '1px solid transparent',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {labelMap[p]}
              </button>
            );
          })}
        </div>

      </div>

      {/* Chart Canvas Area */}
      <div style={{ height: '320px', width: '100%', position: 'relative' }}>
        {chartData && chartData.labels.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <Activity size={36} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: '0.9rem' }}>
              Belum ada riwayat data untuk periode <strong>{historyPeriod}</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Jalankan <code>simulate_sensors.py</code> untuk mulai mengirim data riwayat berkala.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default SensorCharts;
