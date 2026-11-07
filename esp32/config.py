"""
config.py — Konfigurasi Hardware, Jaringan & Keamanan ESP32
Sistem Pengawas Tanaman IoT
===========================================================
Isi parameter di bawah ini sesuai dengan jaringan WiFi dan alamat IP PC Backend Anda.
"""

# ==============================================================================
# 1. KONFIGURASI JARINGAN & BACKEND API
# ==============================================================================
# Nama SSID dan Password WiFi 2.4GHz Anda
WIFI_SSID = "t"
WIFI_PASSWORD = "88888888"

# Alamat IP Komputer/Server Backend (Gunakan IP lokal laptop/PC di jaringan WiFi yang sama)
# CATATAN: JANGAN gunakan 'localhost' atau '127.0.0.1' karena ESP32 adalah perangkat terpisah.
# IP Laptop Anda saat ini (di hotspot): 10.53.118.175
BACKEND_URL = "http://10.53.118.175:3001"

# Device Bearer Token untuk autentikasi ke backend (harus sama dengan ESP32_DEVICE_TOKEN di backend/.env)
DEVICE_TOKEN = "8192736489273994765284626878796452804837"

# ==============================================================================
# 2. KONFIGURASI PIN HARDWARE (ESP32 DevKit V1 30-Pin)
# ==============================================================================
PIN_DHT22 = 27          # GPIO 27 (Digital Input/Output untuk DHT22 Data)
PIN_SOIL_ADC = 34       # GPIO 34 (ADC1 Channel 6, Input-Only untuk Soil Moisture AO)
PIN_I2C_SDA = 21        # GPIO 21 (Hardware I2C Data untuk BH1750)
PIN_I2C_SCL = 22        # GPIO 22 (Hardware I2C Clock untuk BH1750)
BH1750_I2C_ADDR = 0x23  # Alamat default I2C sensor BH1750 (0x23 jika pin ADDR ke GND)

PIN_RELAY = 26          # GPIO 26 (Digital Output untuk kendali modul Relay pompa)

# ==============================================================================
# 3. KONFIGURASI LOGIKA RELAY & PENGAMANAN POMPA 12V
# ==============================================================================
# Mayoritas modul relay mekanik bersifat Active LOW:
# - Active LOW  : Nilai 0 (LOW) = Relay ON (Pompa Hidup), 1 (HIGH) = Relay OFF (Pompa Mati)
# - Active HIGH : Nilai 1 (HIGH) = Relay ON (Pompa Hidup), 0 (LOW) = Relay OFF (Pompa Mati)
RELAY_ACTIVE_LOW = True

# Batas Durasi Maksimal Pompa Menyala Terus Menerus (Detik)
# Pengaman jika perintah STOP terlambat diterima atau sistem freeze agar tanaman tidak kebanjiran.
MAX_PUMP_RUN_SEC = 20

# Durasi Cooldown Minimal (Detik) setelah pompa mati sebelum boleh diaktifkan lagi
PUMP_COOLDOWN_SEC = 30

# Fail-safe Timeout (Detik): Jika ESP32 kehilangan koneksi ke backend saat pompa ON,
# matikan relay secara otomatis setelah batas waktu ini.
FAILSAFE_TIMEOUT_SEC = 15

# ==============================================================================
# 4. INTERVAL LOOP (DETIK)
# ==============================================================================
SENSOR_SEND_INTERVAL_SEC = 5   # Interval pengiriman data sensor ke POST /api/sensor
PUMP_POLL_INTERVAL_SEC = 3     # Interval polling perintah pompa ke GET /api/pump/state
HTTP_TIMEOUT_SEC = 6           # Timeout per HTTP request

