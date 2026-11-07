# PROMPT PEMBUATAN SISTEM PENGAWAS TANAMAN BERBASIS IoT, FIREBASE, DAN GEMINI AI

Saya ingin membangun sebuah aplikasi web bernama **Sistem Pengawas Tanaman**, yaitu sistem monitoring dan pengendalian tanaman berbasis IoT yang terintegrasi dengan Firebase Realtime Database dan Google Gemini AI.

Buat aplikasi secara menyeluruh, meliputi frontend, backend, database, integrasi AI, serta komunikasi dengan perangkat ESP32.

## 1. Tujuan Sistem

Aplikasi harus memungkinkan pengguna untuk:
- Menentukan jenis tanaman yang ingin diawasi.
- Mendapatkan rekomendasi kondisi ideal tanaman melalui Gemini AI.
- Memantau kondisi tanaman secara realtime berdasarkan data sensor.
- Melihat riwayat dan statistik kondisi tanaman.
- Mengontrol pompa air secara manual maupun otomatis.
- Mendapatkan informasi dan peringatan ketika kondisi tanaman berada di luar batas normal.

## 2. Teknologi yang Digunakan

Gunakan teknologi berikut:
- Frontend: React.js dengan tampilan responsif.
- Backend: Node.js dan Express.js.
- Database: Firebase Realtime Database.
- AI: Google Gemini API.
- IoT: ESP32 DevKit V1 dengan MicroPython.
- Grafik: Chart.js atau library grafik sejenis.

Firebase Realtime Database:
https://pengawas-tanaman-4f599-default-rtdb.firebaseio.com

Gunakan struktur proyek yang rapi, modular, mudah dikembangkan, dan mudah dipelihara.

## 3. Alur Awal Penggunaan Aplikasi

Saat pertama kali membuka aplikasi, tampilkan halaman onboarding atau konfigurasi tanaman.

Pengguna harus mengisi:
- Nama tanaman.
- Jenis tanaman.
- Varietas tanaman (opsional).
- Lokasi atau tempat penanaman.
- Tanggal mulai penanaman (opsional).
- Informasi tambahan (opsional).

Setelah pengguna mengisi data, sistem mengirimkan informasi tanaman ke backend untuk diproses oleh Gemini AI.

### Integrasi Gemini AI

Gemini AI bertugas menganalisis jenis tanaman dan menghasilkan rekomendasi parameter pemantauan, seperti:

1. Rentang kelembapan tanah ideal.
2. Rentang suhu udara ideal.
3. Rentang kelembapan udara ideal.
4. Kebutuhan intensitas cahaya.
5. Kebutuhan durasi pencahayaan harian.
6. Rekomendasi penyiraman.
7. Kondisi yang perlu diwaspadai.
8. Penjelasan singkat mengenai kebutuhan tanaman.

Hasil analisis harus disimpan ke Firebase dan digunakan sebagai acuan monitoring.

PENTING:
- Jangan mengarang nilai kebutuhan tanaman.
- Gemini harus memberikan penjelasan dan sumber atau dasar rekomendasi jika tersedia.
- Bedakan nilai ideal, nilai toleransi, dan kondisi peringatan.
- Jika informasi tidak cukup, tampilkan bahwa rekomendasi perlu diverifikasi.
- Pengguna harus dapat mengubah batas parameter secara manual.
- Jangan langsung menjalankan pompa hanya berdasarkan jawaban teks Gemini. Gunakan parameter yang sudah divalidasi dan disetujui pengguna.
- API Key Gemini hanya boleh disimpan di backend melalui environment variable, tidak boleh ditampilkan di frontend.

## 4. Dashboard Monitoring

Buat dashboard utama yang modern, sederhana, responsif, dan mudah dipahami.

Tampilkan informasi:

### A. Informasi Tanaman
- Nama tanaman.
- Jenis tanaman.
- Tanggal mulai pemantauan.
- Status kondisi tanaman.
- Rekomendasi perawatan dari AI.

### B. Monitoring Sensor

Tampilkan data realtime dari sensor:

| Sensor | Data |
|---|---|
| DHT22 | Suhu udara (°C) |
| DHT22 | Kelembapan udara (%) |
| Soil Moisture | Kelembapan tanah (%) |
| BH1750 | Intensitas cahaya (Lux) |

Konversikan nilai ADC Soil Moisture menjadi persentase menggunakan kalibrasi sensor kering dan basah. Jangan menganggap nilai ADC langsung sebagai persentase.

Untuk BH1750, tampilkan intensitas cahaya dalam Lux. Durasi pencahayaan harian harus dihitung dari data pengukuran sepanjang hari, bukan disamakan dengan nilai Lux.

Setiap data harus mempunyai:
- Nilai terbaru.
- Waktu pembaruan terakhir.
- Status normal, rendah, atau tinggi.
- Batas rekomendasi tanaman.

### C. Grafik Statistik

Gunakan gambar referensi yang diberikan sebagai inspirasi tampilan grafik.

Buat bagian statistik dengan:
- Grafik kelembapan tanah.
- Grafik suhu udara.
- Grafik intensitas cahaya atau durasi pencahayaan.
- Filter 24 jam, 7 hari, dan 30 hari.
- Tombol Detail untuk melihat data lebih lengkap.

Desain grafik harus memiliki legenda, tanggal, tooltip, dan warna berbeda untuk setiap parameter.

Pastikan data yang ditampilkan benar-benar berasal dari Firebase, bukan data dummy.

## 5. Integrasi Firebase Realtime Database

Gunakan Firebase Realtime Database dengan URL:

https://pengawas-tanaman-4f599-default-rtdb.firebaseio.com

Buat struktur database yang terorganisasi. Contoh struktur:

```json
{
  "plant": {
    "name": "Bayam Hias Batang Merah",
    "type": "Bayam Hias",
    "createdAt": 0
  },
  "plantRequirements": {
    "soilMoisture": {
      "min": 0,
      "max": 0
    },
    "temperature": {
      "min": 0,
      "max": 0
    },
    "airHumidity": {
      "min": 0,
      "max": 0
    },
    "light": {
      "minLux": 0,
      "maxLux": 0,
      "dailyDurationHours": 0
    }
  },
  "sensorData": {
    "latest": {
      "temperature": 0,
      "airHumidity": 0,
      "soilMoisture": 0,
      "lightLux": 0,
      "timestamp": 0
    }
  },
  "pump": {
    "mode": "auto",
    "status": false,
    "command": false,
    "updatedAt": 0
  }
}
```

Struktur tersebut hanya contoh awal. Kembangkan sesuai kebutuhan aplikasi.

Buat juga penyimpanan riwayat sensor dengan timestamp agar grafik statistik dapat menampilkan data historis.

Perhatikan:
- Gunakan Firebase Realtime Database Listener untuk mendapatkan perubahan data secara realtime.
- Hindari pembacaan database berulang yang tidak diperlukan.
- Atur pemisahan data terbaru dan data historis.
- Buat mekanisme pembatasan jumlah data historis dan pengarsipan jika diperlukan.
- Gunakan Firebase Authentication atau mekanisme autentikasi yang sesuai.
- Jangan menggunakan aturan database terbuka untuk publik.
- Validasi setiap data yang masuk.

## 6. Integrasi ESP32 dan MicroPython

Perangkat menggunakan:
- ESP32 DevKit V1 30 pin.
- Sensor DHT22.
- Sensor Soil Moisture.
- Sensor BH1750.
- Relay untuk mengendalikan pompa air.

Rencana pin:

| Komponen | Pin ESP32 |
|---|---|
| DHT22 DATA | GPIO27 |
| Soil Moisture AO | GPIO34 |
| BH1750 SDA | GPIO21 |
| BH1750 SCL | GPIO22 |
| Relay IN | GPIO26 |

ESP32 menggunakan MicroPython.

Buat program Python/MicroPython yang bertugas:
1. Membaca suhu dan kelembapan udara dari DHT22.
2. Membaca nilai ADC Soil Moisture.
3. Mengonversi ADC menjadi persentase berdasarkan kalibrasi.
4. Membaca intensitas cahaya BH1750 dalam Lux.
5. Mengirimkan data sensor ke sistem backend/database.
6. Membaca perintah pompa dari sistem.
7. Mengaktifkan atau menonaktifkan relay sesuai perintah.
8. Mengirimkan status pompa kembali ke server.

Gunakan koneksi Wi-Fi dan komunikasi HTTP atau metode lain yang paling sesuai.

Pastikan:
- Ada penanganan ketika Wi-Fi terputus.
- Ada mekanisme reconnect.
- Ada penanganan sensor gagal dibaca.
- Data memiliki timestamp.
- Pengiriman data dilakukan dengan interval yang dapat dikonfigurasi.
- Program tidak berhenti hanya karena satu pembacaan sensor gagal.

Jangan mengirim data sensor yang tidak valid sebagai data normal.

## 7. Sistem Kontrol Pompa Air

Buat fitur kontrol pompa yang dapat bekerja dalam dua mode.

### Mode Manual
Pengguna dapat menyalakan dan mematikan pompa melalui dashboard web.

Alur:
1. Pengguna menekan tombol pompa.
2. Backend memvalidasi perintah.
3. Perintah disimpan ke Firebase.
4. ESP32 membaca perintah tersebut.
5. ESP32 mengendalikan relay.
6. Status pompa aktual dikirim kembali ke Firebase.
7. Dashboard memperbarui status pompa.

### Mode Otomatis
Sistem menentukan kapan pompa perlu menyala berdasarkan kelembapan tanah dan batas rekomendasi tanaman.

Contoh:
- Jika kelembapan tanah di bawah batas minimum, sistem mempertimbangkan penyiraman.
- Jika kelembapan tanah sudah mencapai target, pompa dimatikan.

Gunakan hysteresis agar pompa tidak sering hidup dan mati ketika nilai sensor berada dekat ambang batas.

Tambahkan:
- Batas maksimal waktu pompa menyala.
- Jeda atau cooldown antarpenyiraman.
- Pengamanan ketika sensor gagal dibaca.
- Tombol penghentian pompa.
- Status mode otomatis/manual.
- Status perintah dan status aktual relay.

Pastikan sistem otomatis tidak menyebabkan penyiraman berlebihan.

Pompa menggunakan sumber daya 12V terpisah. ESP32 hanya mengendalikan relay dan tidak memasok daya pompa secara langsung.

## 8. Alur Komunikasi Sistem

Buat arsitektur komunikasi yang jelas.

Alur data sensor:

ESP32 + MicroPython → Backend API → Firebase Realtime Database → Frontend Dashboard.

Alur pembaruan dashboard:

Firebase Realtime Database → Listener frontend → Tampilan monitoring realtime.

Alur kontrol pompa:

Frontend → Backend → Firebase → ESP32 → Relay → Pompa.

Alur AI:

Frontend → Backend → Gemini API → Backend → Firebase → Frontend.

Backend harus menjadi penghubung yang aman untuk proses yang membutuhkan API Key dan validasi.

Jangan meletakkan API Key Gemini atau kredensial administrator Firebase di frontend maupun firmware ESP32.

## 9. Fitur Tambahan

Buat halaman atau komponen berikut:

1. Dashboard utama.
2. Konfigurasi tanaman.
3. Rekomendasi perawatan AI.
4. Detail sensor.
5. Grafik riwayat sensor.
6. Kontrol pompa.
7. Pengaturan batas normal.
8. Riwayat aktivitas penyiraman.
9. Notifikasi kondisi tanaman.
10. Informasi status koneksi ESP32.

Notifikasi diberikan ketika:
- Kelembapan tanah terlalu rendah.
- Suhu terlalu tinggi atau rendah.
- Kelembapan udara berada di luar batas.
- Intensitas cahaya tidak sesuai rekomendasi.
- ESP32 tidak mengirimkan data dalam waktu tertentu.
- Terjadi kegagalan sensor atau pompa.

## 10. Desain UI/UX

Gunakan screenshot referensi sebagai inspirasi desain statistik tanaman.

Karakter desain:
- Modern dan bersih.
- Dominasi warna hijau yang berhubungan dengan tanaman.
- Warna biru untuk informasi kelembapan.
- Warna oranye untuk suhu.
- Warna kuning untuk cahaya.
- Card dengan sudut membulat.
- Grafik yang mudah dibaca.
- Navigasi sederhana.
- Responsif untuk desktop dan smartphone.

Dashboard jangan terlalu ramai. Prioritaskan informasi kondisi tanaman dan kontrol pompa.

## 11. Keamanan dan Keandalan

Pastikan:
- Gemini API Key disimpan di `.env`.
- Firebase menggunakan autentikasi dan Security Rules.
- Validasi input pengguna dan data sensor.
- Backend memiliki penanganan error.
- Tidak ada kredensial rahasia yang diunggah ke GitHub.
- Perintah pompa divalidasi sebelum dijalankan.
- Jika koneksi terputus, pompa tidak boleh menyala tanpa batas.
- Status koneksi perangkat ditampilkan dengan jelas.

## 12. Tahapan Pengerjaan

Jangan langsung membuat seluruh aplikasi tanpa perencanaan.

Kerjakan secara bertahap:

**Tahap 1 — Analisis dan Perancangan**
- Periksa struktur folder proyek yang sudah ada.
- Tentukan arsitektur frontend, backend, dan database.
- Buat struktur Firebase.
- Tentukan alur komunikasi perangkat.

**Tahap 2 — Backend dan Firebase**
- Konfigurasi Firebase.
- Buat koneksi backend.
- Buat API untuk data sensor, konfigurasi tanaman, AI, dan pompa.
- Uji penyimpanan serta pembacaan data.

**Tahap 3 — Integrasi Gemini AI**
- Buat fitur input tanaman.
- Hubungkan backend ke Gemini.
- Simpan hasil rekomendasi ke Firebase.
- Buat fitur pengubahan batas rekomendasi.

**Tahap 4 — Frontend**
- Buat halaman onboarding.
- Buat dashboard.
- Buat grafik statistik.
- Buat kontrol pompa.
- Hubungkan frontend ke Firebase/backend.

**Tahap 5 — ESP32 dan MicroPython**
- Buat program pembacaan sensor.
- Hubungkan ESP32 ke backend.
- Uji pengiriman data.
- Uji penerimaan perintah pompa.

**Tahap 6 — Pengujian Menyeluruh**
- Uji seluruh sensor.
- Uji sinkronisasi data.
- Uji mode manual dan otomatis.
- Uji koneksi terputus.
- Uji keamanan dan validasi.

Setiap tahap harus diuji sebelum melanjutkan ke tahap berikutnya.

## 13. Ketentuan Penting untuk AI Coding Assistant

- Jangan hanya membuat desain frontend statis.
- Semua fitur harus benar-benar terhubung dengan backend dan Firebase.
- Jangan menggunakan data dummy pada implementasi akhir.
- Jangan menghapus kode proyek yang sudah ada tanpa alasan.
- Periksa dan pahami struktur proyek terlebih dahulu.
- Gunakan kode yang modular dan mudah dipahami.
- Sertakan komentar pada bagian penting.
- Buat `.env.example` tanpa kredensial asli.
- Buat README berisi cara instalasi, konfigurasi, dan menjalankan aplikasi.
- Jelaskan setiap perubahan file.
- Jangan membuat seluruh sistem sekaligus jika berisiko menimbulkan banyak error.
- Utamakan implementasi langsung, pengujian, dan perbaikan secara bertahap.
- Jika ada informasi atau konfigurasi yang belum diketahui, tanyakan terlebih dahulu daripada mengarang.

**Target akhir:** Sebuah sistem pengawas tanaman berbasis IoT yang benar-benar berfungsi, dengan Gemini AI sebagai pemberi rekomendasi kebutuhan tanaman, Firebase sebagai database realtime, ESP32 sebagai perangkat pembaca sensor dan pengendali pompa, serta website sebagai pusat monitoring dan kontrol.