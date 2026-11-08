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
            borderColor: '#0d9488',
            backgroundColor: isLight ? 'rgba(13, 148, 136, 0.08)' : 'rgba(13, 148, 136, 0.12)',
            borderWidth: 2,
            fill: true,
            tension: 0.25,
            pointRadius: historyData.length > 40 ? 0 : 2.5,
            pointHoverRadius: 5,
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
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.25,
            yAxisID: 'yTemp',
            pointRadius: historyData.length > 40 ? 0 : 2.5,
          },
          {
            label: 'Kelembapan Udara (%)',
            data: historyData.map((d) => d.airHumidity ?? null),
            borderColor: '#0284c7',
            backgroundColor: isLight ? 'rgba(2, 132, 199, 0.06)' : 'rgba(2, 132, 199, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.25,
            yAxisID: 'yHum',
            pointRadius: historyData.length > 40 ? 0 : 2.5,
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
          backgroundColor: isLight ? 'rgba(234, 179, 8, 0.08)' : 'rgba(234, 179, 8, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: historyData.length > 40 ? 0 : 2.5,
        },
      ],
    };
  }, [historyData, activeTab, historyPeriod, isLight]);

  // Options Chart.js adaptif terhadap tema aktif
  const options = useMemo(() => {
    const gridColor = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.05)';
    const tickColor = isLight ? '#64748b' : '#64748b';
    const legendColor = isLight ? '#334155' : '#cbd5e1';
    const tooltipBg = isLight ? '#ffffff' : '#131a1e';
    const tooltipTitle = isLight ? '#0f172a' : '#f8fafc';
    const tooltipBody = isLight ? '#334155' : '#cbd5e1';
    const tooltipBorder = isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)';

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
          align: 'end',
          labels: {
            color: legendColor,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 },
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 6,
            boxHeight: 6,
          },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipTitle,
          bodyColor: tooltipBody,
          borderColor: tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 700 },
          bodyFont: { family: 'JetBrains Mono', size: 11 },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, maxTicksLimit: 10, font: { family: 'JetBrains Mono', size: 10 } },
        },
        ...(activeTab === 'climate'
          ? {
              yTemp: {
                type: 'linear',
                position: 'left',
                grid: { color: gridColor },
                ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono', size: 10 }, callback: (v) => `${v}°C` },
              },
              yHum: {
                type: 'linear',
                position: 'right',
                grid: { drawOnChartArea: false },
                ticks: { color: '#0284c7', font: { family: 'JetBrains Mono', size: 10 }, callback: (v) => `${v}%` },
              },
            }
          : {
              y: {
                grid: { color: gridColor },
                ticks: {
                  color: tickColor,
                  font: { family: 'JetBrains Mono', size: 10 },
                  callback: (v) => (activeTab === 'soil' ? `${v}%` : `${v} lx`),
                },
              },
            }),
      },
    };
  }, [activeTab, isLight]);

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      
      {/* Header with Segmented Tabs & Period Selectors */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Metric Selector Tabs */}
        <div className="segmented-control">
          <button
            type="button"
            onClick={() => setActiveTab('soil')}
            className={`segmented-btn ${activeTab === 'soil' ? 'active' : ''}`}
          >
            <Waves size={13} />
            <span>Kelembapan Tanah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('climate')}
            className={`segmented-btn ${activeTab === 'climate' ? 'active' : ''}`}
          >
            <Thermometer size={13} />
            <span>Suhu & Udara</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('light')}
            className={`segmented-btn ${activeTab === 'light' ? 'active' : ''}`}
          >
            <Sun size={13} />
            <span>Cahaya</span>
          </button>
        </div>

        {/* Period Selector (24h / 7d / 30d) */}
        <div className="segmented-control">
          {['24h', '7d', '30d'].map((p) => {
            const labelMap = { '24h': '24 Jam', '7d': '7 Hari', '30d': '30 Hari' };
            const isSelected = historyPeriod === p;
            return (
              <button
                type="button"
                key={p}
                onClick={() => setHistoryPeriod(p)}
                className={`segmented-btn ${isSelected ? 'active' : ''}`}
              >
                {labelMap[p]}
              </button>
            );
          })}
        </div>

      </div>

      {/* Chart Canvas Area */}
      <div style={{ height: '300px', width: '100%', position: 'relative' }}>
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
              gap: '8px',
              color: 'var(--text-muted)',
            }}
          >
            <Activity size={28} style={{ opacity: 0.35 }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              Belum ada riwayat rekaman data untuk interval {historyPeriod}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Data otomatis terarsip setiap interval 5 menit dari telemetri perangkat
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default SensorCharts;
