"""
config.py — Konfigurasi Cerdas & Multi-Jaringan ESP32
Sistem Pengawas Tanaman IoT
===========================================================
Fitur Auto-Detect:
- Multi-WiFi: Mendukung banyak Wi-Fi sekaligus (otomatis memilih yang sinyalnya ada).
- Multi-Backend: Otomatis mendeteksi backend yang sedang aktif (Cloud Hostingin vs Laptop Lokal).
- Tidak perlu gonta-ganti kode lagi saat berpindah lokasi / jaringan.
"""

# ==============================================================================
# 1. DAFTAR JARINGAN WI-FI (Multi-WiFi Auto-Connect)
# ==============================================================================
# ESP32 akan memindai sinyal dan otomatis menyambung ke Wi-Fi yang tersedia.
# Anda bisa menambahkan Wi-Fi rumah, kantor, atau hotspot di sini.
WIFI_NETWORKS = [
    ("Free Wifi", "podokoyokwingi"),   # Wi-Fi Lokasi Sekarang
    ("GUDANG SKP", "Bismillah123"),   # Wi-Fi Kantor / Gudang
    ("t", "88888888"),                # Hotspot HP
]

# ==============================================================================
# 2. DAFTAR TARGET BACKEND API (Auto-Discovery Failover)
# ==============================================================================
# ESP32 akan otomatis menguji dan memilih server yang sedang ONLINE.
# Jika Server Cloud aktif, ESP32 pakai Cloud. Jika mati, beralih ke Laptop lokal!
BACKEND_TARGETS = [
    "http://144.79.202.196:40051",   # 1. Server Cloud Hostingin (Utama - Cloud)
    "http://192.168.0.106:3001",      # 2. IP Laptop saat di Wi-Fi Free Wifi
    "http://192.168.1.14:3001",       # 3. IP Laptop saat di Wi-Fi GUDANG SKP
    "http://10.53.118.175:3001",      # 4. IP Laptop saat di Hotspot HP (t)
]

# Device Bearer Token untuk autentikasi ke backend (sama dengan ESP32_DEVICE_TOKEN di backend/.env)
DEVICE_TOKEN = "8192736489273994765284626878796452804837"

# ==============================================================================
# 3. KONFIGURASI PIN HARDWARE (ESP32 DevKit V1 30-Pin)
# ==============================================================================
PIN_DHT22 = 27          # GPIO 27 (Digital Data DHT22)
PIN_SOIL_ADC = 34       # GPIO 34 (ADC1 Channel 6, Input-Only Analog Soil Moisture)
PIN_I2C_SDA = 21        # GPIO 21 (Hardware/Soft I2C Data BH1750)
PIN_I2C_SCL = 22        # GPIO 22 (Hardware/Soft I2C Clock BH1750)
BH1750_I2C_ADDR = 0x23  # Alamat I2C BH1750 (Auto-scan 0x23 / 0x5C)

PIN_RELAY = 26          # GPIO 26 (Digital Output Relay Pompa 12V)

# ==============================================================================
# 4. KONFIGURASI PENGAMANAN HARDWARE RELAY & POMPA
# ==============================================================================
RELAY_ACTIVE_LOW = True     # True jika relay menyala saat pin LOW (0)
MAX_PUMP_RUN_SEC = 20       # Durasi maksimal pompa menyala terus menerus (detik)
PUMP_COOLDOWN_SEC = 30      # Jeda waktu minimal sebelum pompa boleh diaktifkan lagi (detik)
FAILSAFE_TIMEOUT_SEC = 15   # Jika hilang koneksi backend saat pompa ON, matikan otomatis (detik)

# ==============================================================================
# 5. INTERVAL TIMER (DETIK)
# ==============================================================================
SENSOR_SEND_INTERVAL_SEC = 5   # Interval pengiriman data sensor ke backend
PUMP_POLL_INTERVAL_SEC = 3     # Interval polling perintah pompa
HTTP_TIMEOUT_SEC = 4           # Timeout per HTTP request
