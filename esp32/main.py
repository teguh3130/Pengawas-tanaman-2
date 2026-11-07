"""
================================================================================
🌿 SISTEM PENGAWAS TANAMAN — FIRMWARE ESP32 MICROPYTHON (main.py)
================================================================================
Hardware: ESP32 DevKit V1 (30-pin)
Sensor & Aktuator:
  - DHT22          : GPIO 27 (Suhu & Kelembapan Udara)
  - Soil Moisture  : GPIO 34 (ADC1 Ch6, Analog Output 0..4095)
  - BH1750         : I2C (SDA GPIO 21, SCL GPIO 22, Alamat 0x23 / 0x5C)
  - Relay Pompa 12V: GPIO 26 (Digital Output, default Active LOW)

Fitur Utama:
  1. Pembacaan periodik sensor DHT22, Soil Moisture ADC, dan BH1750 (Lux).
  2. Pengiriman data ke backend: POST /api/sensor (Bearer Token).
  3. Polling perintah pompa: GET /api/pump/state (Bearer Token).
  4. Kontrol relay dan pelaporan status aktual: POST /api/pump/status.
  5. Pengamanan terpadu:
     - Pompa SELALU OFF saat pertama kali booting.
     - Timeout proteksi pompa (maksimal menyala 20 detik).
     - Cooldown minimal 30 detik sebelum pompa dapat menyala kembali.
     - Failsafe koneksi: jika terputus dari backend saat pompa ON, pompa
       otomatis dimatikan untuk mencegah banjir.
     - Nilai kelembapan tanah mentah (ADC) dikirim apa adanya tanpa
       membuat persentase palsu jika belum dikalibrasi di backend.
================================================================================
"""

import gc
import sys
import time
import network
from machine import Pin, ADC, SoftI2C, I2C

# Modul HTTP MicroPython
try:
    import urequests as requests
except ImportError:
    try:
        import requests
    except ImportError:
        print("❌ Error: Modul 'urequests' atau 'requests' tidak ditemukan di MicroPython.")
        sys.exit(1)

# Impor Konfigurasi (Gunakan config.py jika tersedia, atau fallback default)
try:
    import config
    WIFI_SSID            = config.WIFI_SSID
    WIFI_PASSWORD        = config.WIFI_PASSWORD
    BACKEND_URL          = config.BACKEND_URL.rstrip('/')
    DEVICE_TOKEN         = config.DEVICE_TOKEN
    PIN_DHT22            = config.PIN_DHT22
    PIN_SOIL_ADC         = config.PIN_SOIL_ADC
    PIN_I2C_SDA          = config.PIN_I2C_SDA
    PIN_I2C_SCL          = config.PIN_I2C_SCL
    BH1750_I2C_ADDR      = getattr(config, 'BH1750_I2C_ADDR', 0x23)
    PIN_RELAY            = config.PIN_RELAY
    RELAY_ACTIVE_LOW     = config.RELAY_ACTIVE_LOW
    MAX_PUMP_RUN_SEC     = config.MAX_PUMP_RUN_SEC
    PUMP_COOLDOWN_SEC    = config.PUMP_COOLDOWN_SEC
    FAILSAFE_TIMEOUT_SEC = config.FAILSAFE_TIMEOUT_SEC
    SENSOR_SEND_INTERVAL = config.SENSOR_SEND_INTERVAL_SEC
    PUMP_POLL_INTERVAL   = config.PUMP_POLL_INTERVAL_SEC
    HTTP_TIMEOUT_SEC     = config.HTTP_TIMEOUT_SEC
except ImportError:
    print("ℹ️  config.py tidak ditemukan, menggunakan konfigurasi default inline.")
    WIFI_SSID            = "t"
    WIFI_PASSWORD        = "88888888"
    BACKEND_URL          = "http://10.53.118.175:3001"
    DEVICE_TOKEN         = "8192736489273994765284626878796452804837"
    PIN_DHT22            = 27
    PIN_SOIL_ADC         = 34
    PIN_I2C_SDA          = 21
    PIN_I2C_SCL          = 22
    BH1750_I2C_ADDR      = 0x23
    PIN_RELAY            = 26
    RELAY_ACTIVE_LOW     = True
    MAX_PUMP_RUN_SEC     = 20
    PUMP_COOLDOWN_SEC    = 30
    FAILSAFE_TIMEOUT_SEC = 15
    SENSOR_SEND_INTERVAL = 5
    PUMP_POLL_INTERVAL   = 3
    HTTP_TIMEOUT_SEC     = 6

# Driver BH1750: Gunakan bh1750.py jika ada, atau inline fallback
try:
    from bh1750 import BH1750
except ImportError:
    class BH1750:
        """Inline Driver BH1750 Ambient Light Sensor dengan Auto-Detect Address."""
        def __init__(self, i2c, addr=0x23):
            self.i2c = i2c
            self.addr = addr
            self._init_sensor()

        def _init_sensor(self):
            self.i2c.writeto(self.addr, bytes([0x01])) # POWER_ON
            time.sleep_ms(10)
            self.i2c.writeto(self.addr, bytes([0x07])) # RESET
            time.sleep_ms(10)
            self.i2c.writeto(self.addr, bytes([0x10])) # CONT_H_RES
            time.sleep_ms(130)

        def read_lux(self):
            data = self.i2c.readfrom(self.addr, 2)
            raw = (data[0] << 8) | data[1]
            return round(raw / 1.2, 1)

# Sensor DHT22
import dht


# ==============================================================================
# KELAS CONTROLLER PERANGKAT ESP32
# ==============================================================================
class PlantMonitorESP32:
    def __init__(self):
        print("\n========================================================")
        print("🌱 Menginisialisasi Sistem Pengawas Tanaman (ESP32 DevKit)")
        print("========================================================")

        # ── 1. Inisialisasi Relay (KEAMANAN: Wajib OFF saat awal nyala) ───────
        self.relay_pin = Pin(PIN_RELAY, Pin.OUT)
        self.is_relay_on = False
        self._apply_relay_hardware(False)
        print("🔒 [Relay] Inisialisasi state: OFF (Aman)")

        # Tracking waktu pompa & safety
        self.pump_turned_on_at = 0
        self.pump_turned_off_at = 0
        self.last_backend_contact = time.ticks_ms()

        # ── 2. Inisialisasi Sensor DHT22 ─────────────────────────────────────
        try:
            self.dht_sensor = dht.DHT22(Pin(PIN_DHT22))
            print(f"✅ [DHT22] Terhubung pada GPIO {PIN_DHT22}")
        except Exception as e:
            self.dht_sensor = None
            print(f"⚠️  [DHT22] Inisialisasi gagal pada GPIO {PIN_DHT22}: {e}")

        # ── 3. Inisialisasi Sensor Kelembapan Tanah (ADC) ──────────────────────
        try:
            self.soil_adc = ADC(Pin(PIN_SOIL_ADC))
            self.soil_adc.atten(ADC.ATTN_11DB) # Rentang tegangan input 0 - 3.3V
            print(f"✅ [Soil Moisture] ADC1 Channel 6 terhubung pada GPIO {PIN_SOIL_ADC}")
        except Exception as e:
            self.soil_adc = None
            print(f"⚠️  [Soil Moisture] Inisialisasi ADC gagal: {e}")

        # ── 4. Inisialisasi Sensor Cahaya BH1750 (SoftI2C dengan Auto-Scan) ───
        try:
            # Gunakan SoftI2C untuk toleransi timing maksimal pada pin jumper
            self.i2c = SoftI2C(scl=Pin(PIN_I2C_SCL), sda=Pin(PIN_I2C_SDA), freq=100000)
            scanned = self.i2c.scan()
            print(f"🔍 [I2C Scan] Perangkat terdeteksi di bus: {[hex(x) for x in scanned]}")

            # Deteksi apakah menggunakan 0x23 (ADDR->GND) atau 0x5C (ADDR->VCC)
            actual_addr = BH1750_I2C_ADDR
            if actual_addr not in scanned:
                if 0x23 in scanned:
                    actual_addr = 0x23
                elif 0x5C in scanned:
                    actual_addr = 0x5C
                elif scanned:
                    actual_addr = scanned[0]

            self.light_sensor = BH1750(self.i2c, addr=actual_addr)
            print(f"✅ [BH1750] Sensor cahaya aktif di alamat 0x{actual_addr:02X} (SDA: D{PIN_I2C_SDA}, SCL: D{PIN_I2C_SCL})")
        except Exception as e:
            self.light_sensor = None
            print(f"⚠️  [BH1750] Sensor cahaya tidak terdeteksi: {e}")
            print("   💡 Tips I2C: Pastikan VCC ke 3.3V, GND ke GND, SDA ke D21, dan SCL ke D22.")

        # ── 5. Setup Jaringan WiFi ───────────────────────────────────────────
        self.wlan = network.WLAN(network.STA_IF)
        self.wlan.active(True)
        self.ensure_wifi()

        # Cache nilai terakhir untuk stabilitas jika ada glitch pembacaan
        self.last_temp = 27.5
        self.last_hum = 65.0

    # --------------------------------------------------------------------------
    # KENDALI RELAY & PENGAMANAN HARDWARE
    # --------------------------------------------------------------------------
    def _apply_relay_hardware(self, turn_on):
        """Mengatur sinyal fisik GPIO relay berdasarkan polaritas Active LOW/HIGH."""
        if RELAY_ACTIVE_LOW:
            # Active LOW: 0 = Menyala, 1 = Mati
            self.relay_pin.value(0 if turn_on else 1)
        else:
            # Active HIGH: 1 = Menyala, 0 = Mati
            self.relay_pin.value(1 if turn_on else 0)
        self.is_relay_on = turn_on

    def set_pump(self, turn_on, reason="COMMAND"):
        """
        Mengubah status relay pompa dengan aturan proteksi keamanan:
        1. Mencegah aktivasi jika masih dalam masa cooldown.
        2. Mencegah aktivasi jika status sudah sama.
        3. Mencatat waktu aktif untuk monitoring batas durasi maksimal.
        """
        now = time.ticks_ms()

        if turn_on:
            if self.is_relay_on:
                return # Sudah menyala, abaikan

            # Cek Cooldown
            if self.pump_turned_off_at > 0:
                cooldown_elapsed = time.ticks_diff(now, self.pump_turned_off_at) / 1000
                if cooldown_elapsed < PUMP_COOLDOWN_SEC:
                    sisa = int(PUMP_COOLDOWN_SEC - cooldown_elapsed)
                    print(f"⏳ [Pompa] Perintah ON ditolak: Masa cooldown aktif (tersisa {sisa} detik).")
                    return

            self._apply_relay_hardware(True)
            self.pump_turned_on_at = now
            print(f"🚿 [Pompa] MENYALA (ON) — Alasan: {reason}")
            self.report_pump_status(True)

        else:
            if not self.is_relay_on:
                return # Sudah mati, abaikan

            durasi_jalan = time.ticks_diff(now, self.pump_turned_on_at) / 1000 if self.pump_turned_on_at > 0 else 0
            self._apply_relay_hardware(False)
            self.pump_turned_off_at = now
            print(f"🛑 [Pompa] MATI (OFF) — Berjalan: {durasi_jalan:.1f} detik — Alasan: {reason}")
            self.report_pump_status(False)

    def check_pump_safety(self):
        """
        Pengawas keamanan berjalan pada setiap loop:
        1. Auto-Cutoff jika pompa menyala melampaui MAX_PUMP_RUN_SEC.
        2. Failsafe jika koneksi ke backend terputus lebih dari FAILSAFE_TIMEOUT_SEC.
        """
        if not self.is_relay_on:
            return

        now = time.ticks_ms()

        # Proteksi 1: Batas durasi maksimal menyala
        run_sec = time.ticks_diff(now, self.pump_turned_on_at) / 1000
        if run_sec >= MAX_PUMP_RUN_SEC:
            print(f"⚠️  [Safety Alert] Batas maksimal menyala tercapai ({MAX_PUMP_RUN_SEC}s)!")
            self.set_pump(False, reason="SAFETY_TIMEOUT_EXCEEDED")

        # Proteksi 2: Hilang kontak dengan backend saat pompa hidup
        lost_sec = time.ticks_diff(now, self.last_backend_contact) / 1000
        if lost_sec >= FAILSAFE_TIMEOUT_SEC:
            print(f"⚠️  [Safety Alert] Kehilangan kontak backend selama {lost_sec:.1f}s saat pompa ON!")
            self.set_pump(False, reason="FAILSAFE_CONNECTION_LOST")

    # --------------------------------------------------------------------------
    # KONEKSI WIFI
    # --------------------------------------------------------------------------
    def ensure_wifi(self):
        """Memastikan koneksi WiFi aktif pada subnet yang sesuai dengan Backend URL."""
        if self.wlan.isconnected():
            ip_info = self.wlan.ifconfig()
            esp_ip = ip_info[0]

            # Validasi apakah subnet ESP32 sesuai dengan target IP backend
            try:
                target_host = BACKEND_URL.split("://")[1].split(":")[0]
                target_prefix = ".".join(target_host.split(".")[:2]) # e.g. "10.53" atau "192.168"
                if not esp_ip.startswith(target_prefix):
                    print(f"\n⚠️  ESP32 berada di IP lama ({esp_ip}), sedangkan backend di ({target_host}).")
                    print("🔄 Memutuskan Wi-Fi lama dan menghubungkan ke Wi-Fi terbaru...")
                    self.wlan.disconnect()
                    time.sleep(1)
                else:
                    return True
            except Exception:
                return True

        masked_ssid = WIFI_SSID
        print(f"📡 Menghubungkan ke WiFi '{masked_ssid}'...")
        self.wlan.connect(WIFI_SSID, WIFI_PASSWORD)

        start = time.ticks_ms()
        while not self.wlan.isconnected():
            if time.ticks_diff(time.ticks_ms(), start) > 15000:
                print("\n❌ WiFi timeout (15 detik). Cek SSID dan password di config.py.")
                return False
            time.sleep_ms(500)
            print(".", end="")

        ip_info = self.wlan.ifconfig()
        print(f"\n✅ WiFi Terhubung! IP ESP32: {ip_info[0]} | Gateway: {ip_info[2]}")
        return True

    # --------------------------------------------------------------------------
    # PEMBACAAN SENSOR FISIK
    # --------------------------------------------------------------------------
    def read_dht22(self):
        """Membaca suhu (°C) dan kelembapan udara (%) dari DHT22 dengan toleransi retry."""
        if self.dht_sensor is None:
            return self.last_temp, self.last_hum

        for _ in range(3):
            try:
                self.dht_sensor.measure()
                t = round(self.dht_sensor.temperature(), 1)
                h = round(self.dht_sensor.humidity(), 1)
                # Validasi fisik batas akal sehat
                if -20 <= t <= 70 and 0 <= h <= 100:
                    self.last_temp = t
                    self.last_hum = h
                    return t, h
            except Exception:
                time.sleep_ms(200)

        # Fallback ke nilai terakhir jika terjadi glitch sementara
        return self.last_temp, self.last_hum

    def read_soil_moisture_raw(self):
        """
        Membaca nilai ADC mentah kelembapan tanah (GPIO 34, 12-bit: 0 - 4095).
        Mengambil 8 sampel dan merata-ratakannya untuk meredam noise listrik.
        CATATAN: Tidak mengarang persentase palsu. Konversi persentase ilmiah
        dilakukan di backend menggunakan kalibrasi aktual.
        """
        if self.soil_adc is None:
            return 2500

        samples = []
        for _ in range(8):
            try:
                # MicroPython ESP32: read() menghasilkan nilai 0..4095 (12-bit)
                val = self.soil_adc.read()
                samples.append(val)
            except Exception:
                pass
            time.sleep_ms(10)

        if not samples:
            return 2500

        avg_adc = int(sum(samples) / len(samples))
        # Pastikan berada di dalam range 0 - 4095
        return max(0, min(4095, avg_adc))

    def read_light_lux(self):
        """Membaca intensitas cahaya dari BH1750 dalam satuan Lux."""
        if self.light_sensor is None:
            return 0.0

        try:
            return self.light_sensor.read_lux()
        except Exception as e:
            return 0.0

    # --------------------------------------------------------------------------
    # KOMUNIKASI HTTP BACKEND API
    # --------------------------------------------------------------------------
    def send_sensor_data(self, temp, hum, soil_raw, lux):
        """
        Mengirimkan pembacaan fisik ke POST /api/sensor.
        Autentikasi menggunakan Device Bearer Token.
        """
        url = f"{BACKEND_URL}/api/sensor"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "User-Agent": "PlantMonitor-ESP32-Hardware/1.0",
        }
        payload = {
            "temperature": temp,
            "airHumidity": hum,
            "soilMoistureRaw": soil_raw,
            "lightLux": lux,
            # Biarkan None agar backend memberikan timestamp server (Date.now())
            # yang presisi sesuai jam Unix (mencegah desinkronisasi tahun 2000 vs 1970)
            "timestamp": None,
            "isSimulator": False,
            "source": "HARDWARE",
        }

        resp = None
        try:
            start_t = time.ticks_ms()
            resp = requests.post(url, json=payload, headers=headers)
            elapsed_ms = time.ticks_diff(time.ticks_ms(), start_t)

            if resp.status_code == 200:
                print(f"📤 [Kirim Sensor] ✅ HTTP 200 ({elapsed_ms}ms) | Suhu: {temp}°C | Hum: {hum}% | SoilADC: {soil_raw} | Lux: {lux}")
                self.last_backend_contact = time.ticks_ms()
                return True
            else:
                print(f"📤 [Kirim Sensor] ❌ HTTP {resp.status_code}: {resp.text}")
                return False
        except Exception as e:
            print(f"📤 [Kirim Sensor] ⚠️  Gagal terhubung ke {url}: {e}")
            return False
        finally:
            if resp:
                resp.close()

    def poll_pump_state(self):
        """
        Mengambil perintah pompa terbaru dari GET /api/pump/state.
        Mengeksekusi perintah (ON / OFF) ke relay fisik.
        """
        url = f"{BACKEND_URL}/api/pump/state"
        headers = {
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "User-Agent": "PlantMonitor-ESP32-Hardware/1.0",
        }

        resp = None
        try:
            resp = requests.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                self.last_backend_contact = time.ticks_ms()

                command = data.get("command", {})
                command_val = bool(command.get("value", False))
                mode = data.get("mode", "manual")

                # Eksekusi sesuai instruksi backend
                if command_val and not self.is_relay_on:
                    self.set_pump(True, reason=f"PERINTAH_BACKEND ({mode.upper()})")
                elif not command_val and self.is_relay_on:
                    self.set_pump(False, reason=f"PERINTAH_STOP_BACKEND ({mode.upper()})")

                return True
            else:
                print(f"🚿 [Pump State] ❌ HTTP {resp.status_code}")
                return False
        except Exception as e:
            print(f"🚿 [Pump State] ⚠️  Gagal polling state: {e}")
            return False
        finally:
            if resp:
                resp.close()

    def report_pump_status(self, relay_on):
        """
        Melaporkan status aktual relay fisik ke backend: POST /api/pump/status.
        Membedakan status fisik relay aktual dengan perintah sistem.
        """
        url = f"{BACKEND_URL}/api/pump/status"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "User-Agent": "PlantMonitor-ESP32-Hardware/1.0",
        }
        payload = {"relayOn": bool(relay_on)}

        resp = None
        try:
            resp = requests.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                print(f"📢 [Status Relay] Terlapor ke backend: {'ON' if relay_on else 'OFF'}")
                self.last_backend_contact = time.ticks_ms()
            else:
                print(f"📢 [Status Relay] ⚠️  Gagal kirim status: HTTP {resp.status_code}")
        except Exception as e:
            print(f"📢 [Status Relay] ⚠️  Gagal koneksi ({url}): {e}")
        finally:
            if resp:
                resp.close()

    # --------------------------------------------------------------------------
    # SIKLUS UTAMA (MAIN LOOP)
    # --------------------------------------------------------------------------
    def run(self):
        """Menjalankan loop pengawasan tanaman non-blocking dengan manajemen memori."""
        print("\n🚀 Memulai loop pengawasan tanaman ESP32...")
        print(f"⏱️  Interval Sensor: {SENSOR_SEND_INTERVAL}s | Polling Pompa: {PUMP_POLL_INTERVAL}s")
        print(f"🎯 Target Backend: {BACKEND_URL}")
        print("💡 Tekan Ctrl+C di Thonny kapan saja untuk menghentikan program.\n")

        last_sensor_time = 0
        last_poll_time = 0

        # Lapor status awal relay (OFF) ke backend saat pertama kali online
        if self.ensure_wifi():
            self.report_pump_status(False)

        while True:
            try:
                now = time.ticks_ms()

                # 1. Cek keamanan relay (auto-cutoff & failsafe)
                self.check_pump_safety()

                # 2. Cek koneksi WiFi
                if not self.ensure_wifi():
                    time.sleep(2)
                    continue

                # 3. Polling status perintah pompa dari backend
                if time.ticks_diff(now, last_poll_time) >= (PUMP_POLL_INTERVAL * 1000):
                    self.poll_pump_state()
                    last_poll_time = time.ticks_ms()

                # 4. Pembacaan dan pengiriman data sensor berkala
                if time.ticks_diff(now, last_sensor_time) >= (SENSOR_SEND_INTERVAL * 1000):
                    temp, hum = self.read_dht22()
                    soil_adc = self.read_soil_moisture_raw()
                    lux = self.read_light_lux()

                    self.send_sensor_data(temp, hum, soil_adc, lux)
                    last_sensor_time = time.ticks_ms()

                    # Rutinitas pembersihan memori (RAM garbage collection)
                    gc.collect()

                # Tidur singkat non-blocking agar CPU tidak throttle
                time.sleep_ms(150)

            except KeyboardInterrupt:
                print("\n🛑 Program dihentikan pengguna.")
                # KEAMANAN: Matikan relay saat program diinterupsi
                self.set_pump(False, reason="USER_KEYBOARD_INTERRUPT")
                break
            except Exception as e:
                print(f"⚠️  Unhandled exception di main loop: {e}")
                time.sleep(2)


# ==============================================================================
# ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    monitor = PlantMonitorESP32()
    monitor.run()
