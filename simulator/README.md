# 🧪 Python Sensor Simulator — Sistem Pengawas Tanaman

> [!WARNING]
> Seluruh data yang dihasilkan oleh modul ini adalah **DATA DUMMY / SIMULASI**, bukan hasil pengukuran sensor fisik ESP32.
> Modul ini dibuat khusus untuk memverifikasi fungsionalitas backend, database, dashboard frontend, grafik riwayat, dan sistem kontrol pompa sebelum hardware ESP32 terpasang.

---

## 📋 Fitur Simulator

1. **Format Payload Sesuai Backend:** Menghasilkan payload JSON yang 100% cocok dengan `POST /api/sensor`.
2. **Identitas Data Simulasi:** Menyertakan label eksplisit `"isSimulator": true` dan `"source": "SIMULATOR"`.
3. **Fluktuasi Dinamis & Realistis:**
   - Suhu udara (°C): 24°C – 32°C mengikuti siklus diurnal dan fluktuasi acak halus.
   - Kelembapan udara (%): 45% – 85% berbanding terbalik dengan suhu.
   - Kelembapan tanah (ADC mentah 0–4095): Mengering perlahan seiring waktu.
   - Cahaya (BH1750, Lux): Gelombang intensitas terang saat siang dan rendah saat malam.
4. **Respon Tertutup Pompa (Closed-Loop Simulation):**
   - Simulator melakukan polling perintah pompa ke `GET /api/pump/state`.
   - Jika pompa dinyalakan oleh sistem/user, tanah akan mulai membasah (nilai ADC menurun).
   - Simulator secara otomatis melaporkan status relay aktual ke `POST /api/pump/status`.
5. **Autentikasi Aman:** Menggunakan `ESP32_DEVICE_TOKEN` dari environment variable atau parameter CLI tanpa hardcode di kode.
6. **Zero Dependency:** Menggunakan modul standar Python bawaan (`urllib.request`, `json`, `math`, `time`).

---

## 🚀 Cara Menjalankan

### 1. Jalankan Backend terlebih dahulu
Pastikan backend Express berjalan di terminal lain:
```powershell
cd d:\for-lomba\pengawas-tanaman\backend
npm run dev
```

### 2. Jalankan Simulator
Di terminal baru:
```powershell
cd d:\for-lomba\pengawas-tanaman\simulator
python simulate_sensors.py
```

### 3. Pilihan Parameter Tambahan (CLI Arguments)

| Parameter | Deskripsi | Default |
|---|---|---|
| `--interval <detik>` | Frekuensi pengiriman data | `5.0` |
| `--mode <dynamic\|dry\|wet>` | Pola nilai sensor | `dynamic` |
| `--url <URL>` | URL Backend API | `http://localhost:3001` |
| `--token <TOKEN>` | Device token untuk header Authorization | dari `.env` |
| `--count <N>` | Berhenti setelah mengirimkan N data | Tak terbatas |
| `--no-pump-sync` | Jangan mengecek status perintah pompa | `False` |

#### Contoh Menjalankan Berbagai Skenario:

```powershell
# 1. Mode pengujian tanah kering (untuk menguji apakah pompa otomatis menyala):
python simulate_sensors.py --mode dry --interval 3

# 2. Mode pengujian tanah basah:
python simulate_sensors.py --mode wet

# 3. Mengirimkan 10 data lalu berhenti:
python simulate_sensors.py --count 10 --interval 2
```

---

## 📦 Contoh Payload yang Dikirim ke `/api/sensor`

```json
{
  "temperature": 27.8,
  "airHumidity": 66.4,
  "soilMoistureRaw": 2420,
  "lightLux": 14250.0,
  "timestamp": 1730914800000,
  "isSimulator": true,
  "source": "SIMULATOR",
  "simulatorNote": "DATA DUMMY PENGUJIAN - BUKAN SENSOR FISIK"
}
```

