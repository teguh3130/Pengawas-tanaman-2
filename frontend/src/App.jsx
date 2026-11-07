import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { PlantProvider } from './context/PlantContext';
import Navbar from './components/Navbar';
import AlertBanner from './components/AlertBanner';
import SensorOverview from './components/SensorOverview';
import SensorCharts from './components/SensorCharts';
import PumpControl from './components/PumpControl';
import PlantSummaryCard from './components/PlantSummaryCard';
import DeviceCard from './components/DeviceCard';
import WateringHistory from './components/WateringHistory';
import PlantModal from './components/PlantModal';
import GeminiModal from './components/GeminiModal';
import PlantDetailView from './components/PlantDetailView';

function DashboardContent() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'detail'
  const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Top Navigation */}
      <Navbar
        onOpenPlantModal={() => setIsPlantModalOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenPlantDetail={() => setCurrentView('detail')}
      />

      {/* Main Body */}
      <main style={{ flex: 1, padding: '24px 0 40px 0' }}>
        <div className="container">

          {currentView === 'detail' ? (
            /* Halaman Detail Tanaman & Panduan Gemini AI */
            <PlantDetailView
              onBack={() => setCurrentView('dashboard')}
              onOpenPlantModal={() => setIsPlantModalOpen(true)}
              onOpenAiModal={() => setIsAiModalOpen(true)}
            />
          ) : (
            /* Halaman Utama Dashboard */
            <>
              {/* Alerts & Simulation Banner */}
              <AlertBanner />

              {/* 4 Sensor Realtime Metric Cards */}
              <SensorOverview />

              {/* 2-Column Responsive Dashboard Layout */}
              <div className="dashboard-grid">

                {/* Left Column: Charts & Watering History */}
                <div>
                  <SensorCharts />
                  <WateringHistory />
                </div>

                {/* Right Column: Pump Control & Plant/Device Info */}
                <div>
                  <PumpControl />
                  <PlantSummaryCard
                    onOpenPlantModal={() => setIsPlantModalOpen(true)}
                    onOpenAiModal={() => setIsAiModalOpen(true)}
                    onOpenDetail={() => setCurrentView('detail')}
                  />
                  <DeviceCard />
                </div>

              </div>
            </>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '20px 0',
          background: 'var(--bg-footer)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div className="container">
          <p>
            <strong>Sistem Pengawas Tanaman</strong> — IoT Monitoring, ESP32 MicroPython, Firebase Realtime Database & Google Gemini AI.
          </p>
          <p style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>
            Data tiruan dan kontrol pompa saat ini bekerja dalam lingkungan simulasi virtual untuk pengujian.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <PlantModal
        isOpen={isPlantModalOpen}
        onClose={() => setIsPlantModalOpen(false)}
        onOpenAi={() => {
          setIsPlantModalOpen(false);
          setIsAiModalOpen(true);
        }}
      />

      <GeminiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <PlantProvider>
        <DashboardContent />
      </PlantProvider>
    </ThemeProvider>
  );
}

export default App;
