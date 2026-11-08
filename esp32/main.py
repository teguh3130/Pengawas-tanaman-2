"""
================================================================================
🌿 SISTEM PENGAWAS TANAMAN — FIRMWARE ESP32 MICROPYTHON (ULTRA-STABLE v3.0)
================================================================================
Fitur Stabilitas Tinggi:
  1. Multi-WiFi Auto-Connect: Otomatis mendeteksi dan menyambung ke Wi-Fi yang aktif
     (Gudang SKP atau Hotspot HP) tanpa perlu mengganti kode.
  2. Auto-Discovery Backend: Otomatis mencari dan mengunci server yang sedang online
     (Cloud Hostingin vs Laptop Lokal), dengan failover otomatis jika salah satu mati.
  3. Auto I2C Scan BH1750: Otomatis mengenali alamat 0x23 maupun 0x5C.
  4. Pengaman Pompa Terpadu:
     - Booting selalu OFF (Aman).
     - Cutoff otomatis maksimal 20 detik jika menyala terus menerus.
     - Cooldown 30 detik untuk menjaga umur pompa 12V.
     - Failsafe: Jika hilang kontak backend saat pompa ON, pompa langsung mati.
     - Mematikan relay saat program dihentikan (Ctrl+C di Thonny).
  5. Manajemen Memori: Pembersihan RAM (gc.collect()) dan penutupan socket
     secara eksplisit untuk mencegah error out-of-memory (ENOMEM).
================================================================================
"""

import gc
import sys
import time
import network
from machine import Pin, ADC, SoftI2C

# Modul HTTP MicroPython
try:
    import urequests as requests
except ImportError:
    try:
        import requests
    except ImportError:
        print("❌ Error: Library 'urequests' tidak ditemukan di MicroPython.")
        sys.exit(1)

# Impor Konfigurasi dari config.py
try:
    import config
    WIFI_NETWORKS        = getattr(config, 'WIFI_NETWORKS', [("Free Wifi", "podokoyokwingi"), ("GUDANG SKP", "Bismillah123"), ("t", "88888888")])
    BACKEND_TARGETS      = getattr(config, 'BACKEND_TARGETS', ["http://144.79.202.196:40051", "http://192.168.0.106:3001", "http://192.168.1.14:3001", "http://10.53.118.175:3001"])
    DEVICE_TOKEN         = getattr(config, 'DEVICE_TOKEN', "8192736489273994765284626878796452804837")
    PIN_DHT22            = getattr(config, 'PIN_DHT22', 27)
    PIN_SOIL_ADC         = getattr(config, 'PIN_SOIL_ADC', 34)
    PIN_I2C_SDA          = getattr(config, 'PIN_I2C_SDA', 21)
    PIN_I2C_SCL          = getattr(config, 'PIN_I2C_SCL', 22)
    BH1750_I2C_ADDR      = getattr(config, 'BH1750_I2C_ADDR', 0x23)
    PIN_RELAY            = getattr(config, 'PIN_RELAY', 26)
    RELAY_ACTIVE_LOW     = getattr(config, 'RELAY_ACTIVE_LOW', True)
    MAX_PUMP_RUN_SEC     = getattr(config, 'MAX_PUMP_RUN_SEC', 20)
    PUMP_COOLDOWN_SEC    = getattr(config, 'PUMP_COOLDOWN_SEC', 30)
    FAILSAFE_TIMEOUT_SEC = getattr(config, 'FAILSAFE_TIMEOUT_SEC', 15)
    SENSOR_SEND_INTERVAL = getattr(config, 'SENSOR_SEND_INTERVAL_SEC', 5)
    PUMP_POLL_INTERVAL   = getattr(config, 'PUMP_POLL_INTERVAL_SEC', 3)
    HTTP_TIMEOUT_SEC     = getattr(config, 'HTTP_TIMEOUT_SEC', 4)
except ImportError:
    print("ℹ️  config.py tidak ditemukan, menggunakan nilai default.")
    WIFI_NETWORKS        = [("Free Wifi", "podokoyokwingi"), ("GUDANG SKP", "Bismillah123"), ("t", "88888888")]
    BACKEND_TARGETS      = ["http://144.79.202.196:40051", "http://192.168.0.106:3001", "http://192.168.1.14:3001", "http://10.53.118.175:3001"]
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
    HTTP_TIMEOUT_SEC     = 4

# Driver Sensor Cahaya BH1750
try:
    from bh1750 import BH1750
except ImportError:
    class BH1750:
        def __init__(self, i2c, addr=0x23):
            self.i2c = i2c
            self.addr = addr
            self._init_sensor()

        def _init_sensor(self):
            try:
                self.i2c.writeto(self.addr, bytes([0x01])) # POWER_ON
                time.sleep_ms(10)
                self.i2c.writeto(self.addr, bytes([0x07])) # RESET
                time.sleep_ms(10)
                self.i2c.writeto(self.addr, bytes([0x10])) # CONT_H_RES
                time.sleep_ms(130)
            except Exception as e:
                raise OSError(f"BH1750 init error: {e}")

        def read_lux(self):
            data = self.i2c.readfrom(self.addr, 2)
            raw = (data[0] << 8) | data[1]
            return round(raw / 1.2, 1)

import dht


# ==============================================================================
# CONTROLLER UTAMA ESP32
# ==============================================================================
class PlantMonitorESP32:
    def __init__(self):
        print("\n========================================================")
        print("🌱 Menginisialisasi Sistem Pengawas Tanaman (ESP32 DevKit)")
        print("========================================================")

        # ── 1. Inisialisasi Relay (KEAMANAN: Wajib OFF saat awal) ──────────────
        self.relay_pin = Pin(PIN_RELAY, Pin.OUT)
        self.is_relay_on = False
        self._apply_relay_hardware(False)
        print("🔒 [Relay] Inisialisasi state: OFF (Aman)")

        self.pump_turned_on_at = 0
        self.pump_turned_off_at = 0
        self.last_backend_contact = time.ticks_ms()

        # ── 2. Inisialisasi Sensor DHT22 ──────────────────────────────────────
        try:
            self.dht_sensor = dht.DHT22(Pin(PIN_DHT22))
            print(f"✅ [DHT22] Terhubung pada GPIO {PIN_DHT22}")
        except Exception as e:
            self.dht_sensor = None
            print(f"⚠️  [DHT22] Inisialisasi gagal: {e}")

        # ── 3. Inisialisasi Sensor Kelembapan Tanah (ADC) ───────────────────────
        try:
            self.soil_adc = ADC(Pin(PIN_SOIL_ADC))
            self.soil_adc.atten(ADC.ATTN_11DB)
            print(f"✅ [Soil Moisture] ADC1 Channel 6 terhubung pada GPIO {PIN_SOIL_ADC}")
        except Exception as e:
            self.soil_adc = None
            print(f"⚠️  [Soil Moisture] Inisialisasi ADC gagal: {e}")

        # ── 4. Inisialisasi Sensor Cahaya BH1750 (SoftI2C Auto-Scan) ──────────
        try:
            self.i2c = SoftI2C(scl=Pin(PIN_I2C_SCL), sda=Pin(PIN_I2C_SDA), freq=100000)
            scanned = self.i2c.scan()
            print(f"🔍 [I2C Scan] Perangkat terdeteksi di bus: {[hex(x) for x in scanned]}")

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

        # ── 5. Inisialisasi Jaringan & Backend ─────────────────────────────────
        self.wlan = network.WLAN(network.STA_IF)
        self.wlan.active(True)
        self.active_backend_url = None
        self.consecutive_fails = 0

        # Cache nilai terakhir
        self.last_temp = 27.5
        self.last_hum = 65.0

        # Sambungkan ke Wi-Fi dan cari backend
        self.connect_wifi()
        self.discover_backend()

    # --------------------------------------------------------------------------
    # KENDALI RELAY & PENGAMANAN HARDWARE
    # --------------------------------------------------------------------------
    def _apply_relay_hardware(self, turn_on):
        """Mengatur sinyal fisik GPIO relay berdasarkan polaritas Active LOW/HIGH."""
        if RELAY_ACTIVE_LOW:
            self.relay_pin.value(0 if turn_on else 1)
        else:
            self.relay_pin.value(1 if turn_on else 0)
        self.is_relay_on = turn_on

    def set_pump(self, turn_on, reason="COMMAND"):
        """Mengubah status relay dengan aturan keamanan ketat (cooldown & timer)."""
        now = time.ticks_ms()

        if turn_on:
            if self.is_relay_on:
                return

            if self.pump_turned_off_at > 0:
                cooldown_elapsed = time.ticks_diff(now, self.pump_turned_off_at) / 1000
                if cooldown_elapsed < PUMP_COOLDOWN_SEC:
                    sisa = int(PUMP_COOLDOWN_SEC - cooldown_elapsed)
                    print(f"⏳ [Pompa] Perintah ON ditolak: Masa cooldown ({sisa}s lagi).")
                    return

            self._apply_relay_hardware(True)
            self.pump_turned_on_at = now
            print(f"🚿 [Pompa] MENYALA (ON) — Alasan: {reason}")
            self.report_pump_status(True)
        else:
            if not self.is_relay_on:
                return

            durasi_jalan = time.ticks_diff(now, self.pump_turned_on_at) / 1000 if self.pump_turned_on_at > 0 else 0
            self._apply_relay_hardware(False)
            self.pump_turned_off_at = now
            print(f"🛑 [Pompa] MATI (OFF) — Berjalan: {durasi_jalan:.1f}s — Alasan: {reason}")
            self.report_pump_status(False)

    def check_pump_safety(self):
        """Pemeriksaan keselamatan otomatis pada setiap siklus loop."""
        if not self.is_relay_on:
            return

        now = time.ticks_ms()

        # 1. Batas maksimal durasi menyala
        run_sec = time.ticks_diff(now, self.pump_turned_on_at) / 1000
        if run_sec >= MAX_PUMP_RUN_SEC:
            print(f"⚠️  [Safety Alert] Batas maksimal menyala tercapai ({MAX_PUMP_RUN_SEC}s)!")
            self.set_pump(False, reason="MAX_RUN_TIME_EXCEEDED")

        # 2. Hilang kontak dengan backend
        lost_sec = time.ticks_diff(now, self.last_backend_contact) / 1000
        if lost_sec >= FAILSAFE_TIMEOUT_SEC:
            print(f"⚠️  [Safety Alert] Kehilangan kontak backend ({lost_sec:.1f}s)! Mematikan pompa...")
            self.set_pump(False, reason="FAILSAFE_CONNECTION_LOST")

    # --------------------------------------------------------------------------
    # MULTI-WIFI AUTO-CONNECT
    # --------------------------------------------------------------------------
    def connect_wifi(self):
        """Memindai dan otomatis menyambung ke salah satu Wi-Fi yang tersedia."""
        if self.wlan.isconnected():
            print(f"📡 Wi-Fi aktif: IP={self.wlan.ifconfig()[0]} | Gateway={self.wlan.ifconfig()[2]}")
            return True

        print("🔍 Memindai sinyal Wi-Fi di sekitar...")
        try:
            available_aps = [ap[0].decode('utf-8') for ap in self.wlan.scan()]
        except Exception:
            available_aps = []

        # Cari Wi-Fi dari daftar konfigurasi yang terdeteksi di udara
        matched = None
        for ssid, password in WIFI_NETWORKS:
            if ssid in available_aps:
                matched = (ssid, password)
                break

        # Jika tidak ditemukan hasil scan, gunakan urutan pertama sebagai fallback
        if not matched and WIFI_NETWORKS:
            matched = WIFI_NETWORKS[0]

        if matched:
            target_ssid, target_pwd = matched
            print(f"📡 Menyambungkan ke Wi-Fi '{target_ssid}'...")
            self.wlan.connect(target_ssid, target_pwd)

            start = time.ticks_ms()
            while not self.wlan.isconnected():
                if time.ticks_diff(time.ticks_ms(), start) > 15000:
                    print(f"\n❌ Gagal menyambung ke '{target_ssid}' (Timeout 15s).")
                    return False
                time.sleep_ms(500)
                print(".", end="")

            print(f"\n✅ Wi-Fi Terhubung! IP: {self.wlan.ifconfig()[0]} | Gateway: {self.wlan.ifconfig()[2]}")
            return True

        return False

    # --------------------------------------------------------------------------
    # AUTO-DISCOVERY BACKEND (Mencari Server yang Aktif Otomatis)
    # --------------------------------------------------------------------------
    def discover_backend(self):
        """Menguji daftar URL backend dan mengunci server yang online."""
        if not self.wlan.isconnected():
            return None

        print("🔍 Mencari server backend yang aktif...")
        for url in BACKEND_TARGETS:
            clean_url = url.rstrip('/')
            probe_url = f"{clean_url}/api/health"
            resp = None
            try:
                # Tes cepat ke endpoint /api/health
                resp = requests.get(probe_url)
                if resp.status_code == 200:
                    self.active_backend_url = clean_url
                    self.consecutive_fails = 0
                    print(f"🎯 [Backend Terkunci] Menggunakan: {self.active_backend_url}")
                    return self.active_backend_url
            except Exception:
                pass
            finally:
                if resp:
                    resp.close()

        # Jika belum ada yang merespons, gunakan target pertama
        if not self.active_backend_url and BACKEND_TARGETS:
            self.active_backend_url = BACKEND_TARGETS[0].rstrip('/')
            print(f"ℹ️  Server belum merespons, default ke: {self.active_backend_url}")

        return self.active_backend_url

    # --------------------------------------------------------------------------
    # PEMBACAAN SENSOR FISIK
    # --------------------------------------------------------------------------
    def read_dht22(self):
        """Membaca suhu dan kelembapan udara dari DHT22 dengan auto-retry 3x."""
        if self.dht_sensor is None:
            return self.last_temp, self.last_hum

        for _ in range(3):
            try:
                self.dht_sensor.measure()
                t = round(self.dht_sensor.temperature(), 1)
                h = round(self.dht_sensor.humidity(), 1)
                if -20 <= t <= 70 and 0 <= h <= 100:
                    self.last_temp = t
                    self.last_hum = h
                    return t, h
            except Exception:
                time.sleep_ms(150)

        return self.last_temp, self.last_hum

    def read_soil_moisture_raw(self):
        """Membaca ADC kelembapan tanah (0..4095) dengan filter rata-rata 10 sampel."""
        if self.soil_adc is None:
            return 2500

        samples = []
        for _ in range(10):
            try:
                val = self.soil_adc.read()
                samples.append(val)
            except Exception:
                pass
            time.sleep_ms(8)

        if not samples:
            return 2500

        avg_adc = int(sum(samples) / len(samples))
        return max(0, min(4095, avg_adc))

    def read_light_lux(self):
        """Membaca intensitas cahaya BH1750 dalam satuan Lux."""
        if self.light_sensor is None:
            return 0.0

        try:
            return self.light_sensor.read_lux()
        except Exception:
            return 0.0

    # --------------------------------------------------------------------------
    # KOMUNIKASI HTTP BACKEND
    # --------------------------------------------------------------------------
    def send_sensor_data(self, temp, hum, soil_raw, lux):
        """Mengirimkan data sensor ke POST /api/sensor."""
        if not self.active_backend_url:
            self.discover_backend()
            if not self.active_backend_url:
                return False

        url = f"{self.active_backend_url}/api/sensor"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "User-Agent": "PlantMonitor-ESP32-Hardware/3.0",
        }
        payload = {
            "temperature": temp,
            "airHumidity": hum,
            "soilMoistureRaw": soil_raw,
            "lightLux": lux,
            "timestamp": None, # Menggunakan server timestamp akurat
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
                self.consecutive_fails = 0
                return True
            else:
                print(f"📤 [Kirim Sensor] ❌ HTTP {resp.status_code}: {resp.text}")
                return False
        except Exception as e:
            self.consecutive_fails += 1
            print(f"📤 [Kirim Sensor] ⚠️  Gagal ke {url}: {e}")
            if self.consecutive_fails >= 3:
                print("🔄 Mencari jalur backend alternatif...")
                self.discover_backend()
            return False
        finally:
            if resp:
                resp.close()

    def poll_pump_state(self):
        """Mengambil perintah pompa terbaru dari GET /api/pump/state."""
        if not self.active_backend_url:
            return False

        url = f"{self.active_backend_url}/api/pump/state"
        headers = {
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "User-Agent": "PlantMonitor-ESP32-Hardware/3.0",
        }

        resp = None
        try:
            resp = requests.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                self.last_backend_contact = time.ticks_ms()
                self.consecutive_fails = 0

                command = data.get("command", {})
                command_val = bool(command.get("value", False))
                mode = data.get("mode", "manual")

                if command_val and not self.is_relay_on:
                    self.set_pump(True, reason=f"PERINTAH_BACKEND ({mode.upper()})")
                elif not command_val and self.is_relay_on:
                    self.set_pump(False, reason=f"PERINTAH_STOP_BACKEND ({mode.upper()})")

                return True
            else:
                return False
        except Exception as e:
            self.consecutive_fails += 1
            if self.consecutive_fails >= 3:
                self.discover_backend()
            return False
        finally:
            if resp:
                resp.close()

    def report_pump_status(self, relay_on):
        """Melaporkan status aktual relay fisik ke POST /api/pump/status."""
        if not self.active_backend_url:
            return

        url = f"{self.active_backend_url}/api/pump/status"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "User-Agent": "PlantMonitor-ESP32-Hardware/3.0",
        }
        payload = {"relayOn": bool(relay_on)}

        resp = None
        try:
            resp = requests.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                print(f"📢 [Status Relay] Terlapor: {'ON' if relay_on else 'OFF'}")
                self.last_backend_contact = time.ticks_ms()
                self.consecutive_fails = 0
        except Exception:
            pass
        finally:
            if resp:
                resp.close()

    # --------------------------------------------------------------------------
    # SIKLUS UTAMA (MAIN LOOP)
    # --------------------------------------------------------------------------
    def run(self):
        """Loop pengawasan tanaman non-blocking dan tahan banting."""
        print("\n🚀 Memulai loop pengawasan tanaman ESP32...")
        print(f"⏱️  Interval Sensor: {SENSOR_SEND_INTERVAL}s | Polling Pompa: {PUMP_POLL_INTERVAL}s")
        print("💡 Tekan Ctrl+C di Thonny kapan saja untuk menghentikan program.\n")

        last_sensor_time = 0
        last_poll_time = 0

        # Lapor status awal relay (OFF)
        self.report_pump_status(False)

        while True:
            try:
                now = time.ticks_ms()

                # 1. Cek proteksi keselamatan relay
                self.check_pump_safety()

                # 2. Pastikan Wi-Fi tetap aktif
                if not self.connect_wifi():
                    time.sleep(2)
                    continue

                # 3. Polling status perintah pompa berkala
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

                    # Pembersihan memori RAM rutin
                    gc.collect()

                time.sleep_ms(150)

            except KeyboardInterrupt:
                print("\n🛑 Program dihentikan pengguna.")
                self.set_pump(False, reason="USER_KEYBOARD_INTERRUPT")
                break
            except Exception as e:
                print(f"⚠️  Peringatan loop: {e}")
                time.sleep(1)


# ==============================================================================
# ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    monitor = PlantMonitorESP32()
    monitor.run()
