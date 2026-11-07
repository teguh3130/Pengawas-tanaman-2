import React, { useState, useEffect } from 'react';
import { usePlant } from '../context/PlantContext';
import { X, Sprout, Save, AlertCircle, CheckCircle } from 'lucide-react';

export function PlantModal({ isOpen, onClose, onOpenAi }) {
  const { plant, savePlantConfig } = usePlant();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    variety: '',
    location: '',
    startedAt: '',
    additionalInfo: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (plant) {
      setFormData({
        name: plant.name || '',
        type: plant.type || '',
        variety: plant.variety || '',
        location: plant.location || '',
        startedAt: plant.startedAt ? new Date(plant.startedAt).toISOString().split('T')[0] : '',
        additionalInfo: plant.additionalInfo || '',
      });
    }
  }, [plant, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        ...formData,
        startedAt: formData.startedAt ? new Date(formData.startedAt).getTime() : Date.now(),
      };
      await savePlantConfig(payload);
      setSuccessMsg('Konfigurasi tanaman berhasil disimpan!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan konfigurasi tanaman');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--plant-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sprout size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', color: '#fff' }}>Konfigurasi Tanaman</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Tentukan informasi tanaman yang diawasi oleh sistem IoT
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
            <AlertCircle size={16} />
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nama Tanaman *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Contoh: Bayam Hias Merah"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Jenis / Spesies *</label>
              <input
                type="text"
                name="type"
                required
                value={formData.type}
                onChange={handleChange}
                placeholder="Contoh: Bayam Hias (Amaranthus)"
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Varietas (Opsional)</label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleChange}
                placeholder="Contoh: Batang Merah Super"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Lokasi Penanaman *</label>
              <input
                type="text"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                placeholder="Contoh: Greenhouse / Halaman Belakang"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tanggal Mulai Penanaman</label>
            <input
              type="date"
              name="startedAt"
              value={formData.startedAt}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Catatan Tambahan (Opsional)</label>
            <textarea
              name="additionalInfo"
              rows={3}
              value={formData.additionalInfo}
              onChange={handleChange}
              placeholder="Contoh: Media tanam sekam bakar + kompos, intensitas matahari pagi..."
              className="form-textarea"
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              <Save size={16} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Data'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default PlantModal;

