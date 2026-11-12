import React, { useState, useEffect } from 'react';
import { usePlant } from '../context/PlantContext';
import { X, Sprout, Save, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

export function PlantModal({ isOpen, onClose, onOpenAi }) {
  const { plant, savePlantConfig, removePlantProfile } = usePlant();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    variety: '',
    location: '',
    startedAt: '',
    additionalInfo: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (plant) {
      setFormData({
        name: plant.name || '',
        type: plant.type || '',
        variety: plant.variety || '',
        location: plant.location === '-' ? '' : (plant.location || ''),
        startedAt: plant.startedAt ? new Date(plant.startedAt).toISOString().split('T')[0] : '',
        additionalInfo: plant.additionalInfo || '',
      });
    }
    setConfirmDelete(false);
    setIsDeleting(false);
    setIsSaving(false);
    setErrorMsg(null);
    setSuccessMsg(null);
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
              <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>Konfigurasi Tanaman</h2>
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
              background: 'var(--status-danger-muted)',
              border: '1px solid rgba(220, 38, 38, 0.35)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: 'var(--status-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: 'var(--status-normal-muted)',
              border: '1px solid rgba(22, 163, 74, 0.35)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: 'var(--status-normal)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
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

          <div className="form-grid-2">
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
              <label className="form-label">Lokasi Penanaman (Opsional)</label>
              <input
                type="text"
                name="location"
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            {plant ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn btn-danger"
                style={{ fontSize: '0.8rem' }}
              >
                <Trash2 size={15} />
                <span>Hapus Tanaman</span>
              </button>
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          </div>

          {confirmDelete && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--status-danger-muted)',
                border: '1px solid rgba(220, 38, 38, 0.35)',
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--status-danger)', marginBottom: '4px' }}>
                Konfirmasi Hapus Profil Tanaman
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.45 }}>
                Anda akan keluar dari profil <strong>{plant?.name}</strong> dan kembali ke halaman registrasi tanaman baru. Riwayat sensor dan penyiraman lama <strong>tidak akan dihapus</strong>.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    setErrorMsg(null);
                    try {
                      await removePlantProfile();
                      onClose();
                    } catch (err) {
                      setErrorMsg(err.message || 'Gagal menghapus profil tanaman');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="btn btn-danger"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus & Ganti Tanaman'}
                </button>
              </div>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}

export default PlantModal;

