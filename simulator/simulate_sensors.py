#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
simulate_sensors.py - Python Sensor Simulator untuk Sistem Pengawas Tanaman
===========================================================================
PERINGATAN:
Data yang dihasilkan oleh skrip ini adalah DATA SIMULASI (DUMMY),
BUKAN hasil pembacaan sensor fisik sungguhan.
Digunakan untuk menguji integrasi Backend, database Firebase, grafik statistik,
dan respons kontrol pompa sebelum firmware ESP32 MicroPython dideploy ke hardware.

Peningkatan Performa & Keandalan:
1. Timeout yang dapat dikonfigurasi (--timeout, default: 5.0s).
2. Retry otomatis dengan jeda bertahap (exponential backoff) saat terjadi gangguan jaringan/timeout.
3. Menjaga idempotensi payload pada retry agar tidak terjadi duplikasi data sensor.
4. Kompensasi interval pengiriman agar frekuensi pengiriman presisi (misal tepat 3.0s).
5. Statistik performa lengkap: total terkirim, sukses, gagal, retry, rata-rata durasi (ms), waktu tercepat, dan waktu terlama.
"""

import sys
import os
import time
import math
import random
import json
import argparse
import urllib.request
import urllib.error
from pathlib import Path


# ---------------------------------------------------------------------------
# Helper: Muat .env sederhana tanpa dependency pihak ketiga
# ---------------------------------------------------------------------------
def load_env_file(env_path):
    """Membaca file .env jika ada dan memasukkan ke os.environ (jika belum diset)."""
    p = Path(env_path)
    if not p.is_file():
        return False
    try:
        with open(p, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k not in os.environ:
                    os.environ[k] = v
        return True
    except Exception as e:
        print(f"⚠️  Gagal membaca {env_path}: {e}")
        return False


# Cari .env di backend/ atau direktori lokal simulator
BASE_DIR = Path(__file__).resolve().parent.parent
load_env_file(BASE_DIR / "backend" / ".env")
load_env_file(Path(__file__).resolve().parent / ".env")


# ---------------------------------------------------------------------------
# Model Simulasi Nilai Sensor
# ---------------------------------------------------------------------------
class PlantEnvironmentSimulator:
    """
    Menghasilkan data lingkungan tanaman yang realistis:
    - Siklus waktu (siang/malam): suhu naik siang, kelembapan turun siang.
    - Tanah mengering perlahan (ADC naik mendekati nilai kering).
    - Ketika pompa menyala, tanah menjadi basah (ADC turun mendekati nilai basah).
    - Intensitas cahaya mengikuti siklus matahari buatan.
    """

    def __init__(self, dry_adc=3500, wet_adc=1500, mode="dynamic"):
        self.dry_adc = dry_adc
        self.wet_adc = wet_adc
        self.mode = mode

        # Nilai awal
        self.base_temp = 27.0
        self.base_humidity = 68.0
        self.current_soil_adc = 2600.0  # Kelembapan sedang (~45%)
        self.sim_tick = 0
        self.simulated_relay_on = False

    def step(self, pump_command_active=False):
        """Melangkah 1 interval waktu dan menghasilkan nilai sensor terkini."""
        self.sim_tick += 1
        t = self.sim_tick * 0.1  # fase kurva

        if self.mode == "dry":
            # Mode simulasi tanah sangat kering untuk menguji auto-watering
            self.current_soil_adc = min(self.dry_adc - 50, self.current_soil_adc + 40.0)
            target_temp = 31.5 + math.sin(t) * 1.5
            target_humidity = 48.0 - math.sin(t) * 4.0
            lux = 18000 + random.uniform(-1000, 1000)

        elif self.mode == "wet":
            # Mode simulasi tanah jenuh basah
            self.current_soil_adc = max(self.wet_adc + 50, self.current_soil_adc - 30.0)
            target_temp = 24.5 + math.sin(t) * 1.0
            target_humidity = 82.0 + math.sin(t) * 3.0
            lux = 4500 + random.uniform(-300, 300)

        else:
            # Mode 'dynamic' (realistis harian)
            # Siklus suhu (24.0°C - 31.5°C)
            temp_wave = math.sin(t) * 3.5
            target_temp = self.base_temp + temp_wave + random.uniform(-0.3, 0.3)

            # Kelembapan udara berbanding terbalik dengan suhu (50% - 85%)
            hum_wave = -math.sin(t) * 12.0
            target_humidity = self.base_humidity + hum_wave + random.uniform(-1.0, 1.0)
            target_humidity = max(35.0, min(95.0, target_humidity))

            # Respon tanah: jika pompa menyala, tanah membasah (ADC turun)
            if pump_command_active or self.simulated_relay_on:
                self.current_soil_adc -= random.uniform(80.0, 140.0)
                if self.current_soil_adc <= self.wet_adc + 100:
                    self.current_soil_adc = self.wet_adc + 100
            else:
                # Mengering perlahan secara alami (ADC naik)
                self.current_soil_adc += random.uniform(3.0, 12.0)
                if self.current_soil_adc >= self.dry_adc:
                    self.current_soil_adc = self.dry_adc

            # Intensitas cahaya (Lux) mengikuti gelombang
            # Siang = tinggi (5.000 - 35.000 lux), Malam = rendah (0 - 50 lux)
            light_wave = math.sin(t)
            if light_wave > 0:
                lux = (light_wave ** 1.5) * 28000.0 + random.uniform(-800, 800)
            else:
                lux = random.uniform(5.0, 45.0)  # malam/ruang gelap
            lux = max(0.0, lux)

        return {
            "temperature": round(target_temp, 1),
            "airHumidity": round(target_humidity, 1),
            "soilMoistureRaw": int(round(self.current_soil_adc)),
            "lightLux": round(lux, 1),
            "timestamp": int(time.time() * 1000),
            "isSimulator": True,
            "source": "SIMULATOR",
            "simulatorNote": "DATA DUMMY PENGUJIAN - BUKAN SENSOR FISIK",
        }


# ---------------------------------------------------------------------------
# Pengiriman HTTP ke Backend dengan Retry & Timeout
# ---------------------------------------------------------------------------
def send_sensor_data_with_retry(backend_url, token, payload, timeout=5.0, max_retries=2):
    """
    Mengirimkan payload sensor dummy ke POST /api/sensor dengan mekanisme retry bertahap.
    Mengembalikan: (sukses: bool, data_or_err: any, status_code: int, elapsed_ms: int, retries_used: int)
    """
    url = f"{backend_url.rstrip('/')}/api/sensor"
    data_bytes = json.dumps(payload).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "PlantMonitor-SensorSimulator/2.0",
    }

    last_status = 0
    last_err = ""
    retries_used = 0

    for attempt in range(max_retries + 1):
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        start_t = time.time()
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                elapsed_ms = int((time.time() - start_t) * 1000)
                status = resp.status
                body_text = resp.read().decode("utf-8")
                try:
                    data = json.loads(body_text)
                except Exception:
                    data = {"raw": body_text}
                return True, data, status, elapsed_ms, retries_used

        except urllib.error.HTTPError as e:
            elapsed_ms = int((time.time() - start_t) * 1000)
            last_status = e.code
            err_body = e.read().decode("utf-8", errors="replace")
            try:
                last_err = json.loads(err_body)
            except Exception:
                last_err = {"raw": err_body}

            # Error 400 (bad request) atau 401 (unauthorized) tidak perlu di-retry
            if last_status in (400, 401, 403):
                return False, last_err, last_status, elapsed_ms, retries_used

        except urllib.error.URLError as e:
            elapsed_ms = int((time.time() - start_t) * 1000)
            last_status = 0
            last_err = f"Koneksi gagal: {e.reason}"

        except Exception as e:
            elapsed_ms = int((time.time() - start_t) * 1000)
            last_status = 0
            last_err = f"Exception: {str(e)}"

        # Jika masih ada sisa percobaan, lakukan backoff bertahap
        if attempt < max_retries:
            retries_used += 1
            backoff_delay = 0.5 * (2 ** attempt)  # 0.5s, 1.0s
            time.sleep(backoff_delay)

    return False, last_err, last_status, elapsed_ms, retries_used


def poll_pump_state(backend_url, token, timeout=3.0):
    """
    Polling perintah pompa dari GET /api/pump/state.
    """
    url = f"{backend_url.rstrip('/')}/api/pump/state"
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "PlantMonitor-SensorSimulator/2.0",
    }
    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            cmd = data.get("command", {})
            return bool(cmd.get("value", False)), data
    except Exception:
        return False, None


def report_pump_status(backend_url, token, relay_on, timeout=3.0):
    """
    Melaporkan status aktual relay virtual simulator ke POST /api/pump/status.
    """
    url = f"{backend_url.rstrip('/')}/api/pump/status"
    payload = {"relayOn": bool(relay_on)}
    data_bytes = json.dumps(payload).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Loop Utama Simulator
# ---------------------------------------------------------------------------
def run_simulator(backend_url, token, interval_sec, mode, count=None, sync_pump=True, timeout=5.0, max_retries=2):
    print("=" * 76)
    print("SISTEM PENGAWAS TANAMAN — PYTHON SENSOR SIMULATOR (v2.0 Optimized)")
    print("=" * 76)
    print("⚠️  PERINGATAN : Seluruh data yang dikirim adalah DATA SIMULATOR (DUMMY).")
    print("                Bukan pembacaan sensor fisik hardware ESP32.")
    print(f" Target API  : {backend_url}/api/sensor")
    print(f" Token Auth  : {'*' * max(0, len(token) - 6) + token[-6:] if len(token) > 6 else '***'}")
    print(f" Interval   : {interval_sec} detik (dengan kompensasi presisi waktu)")
    print(f" Timeout     : {timeout} detik (max retry: {max_retries}x bertahap)")
    print(f" Mode Data   : {mode.upper()} (dynamic / dry / wet)")
    print(f" Sinkron Pompa: {'Aktif (simulasi basah saat pompa ON)' if sync_pump else 'Nonaktif'}")
    if count:
        print(f"🎯 Target Uji   : {count} pengiriman data")
    print("=" * 76)
    print("Tekan Ctrl+C untuk menghentikan simulator kapan saja.\n")

    sim = PlantEnvironmentSimulator(mode=mode)
    sent_count = 0
    success_count = 0
    fail_count = 0
    total_retries = 0
    response_times = []
    pump_active_state = False

    try:
        while True:
            cycle_start = time.time()

            # 1. Periksa status pompa dari backend jika sinkronisasi aktif
            if sync_pump:
                cmd_active, pdata = poll_pump_state(backend_url, token, timeout=2.5)
                if cmd_active != pump_active_state:
                    pump_active_state = cmd_active
                    status_str = "AKTIF 🚿" if pump_active_state else "MATI ⭕"
                    print(f"🔔 [Pompa Event] Backend meminta pompa: {status_str}")
                    report_pump_status(backend_url, token, pump_active_state, timeout=2.5)

            # 2. Hasilkan nilai sensor dummy untuk siklus ini
            payload = sim.step(pump_command_active=pump_active_state)

            # 3. Kirim ke Backend API dengan retry bertahap
            ok, resp_data, status_code, elapsed_ms, retries_used = send_sensor_data_with_retry(
                backend_url, token, payload, timeout=timeout, max_retries=max_retries
            )

            sent_count += 1
            total_retries += retries_used
            now_str = time.strftime("%H:%M:%S")

            if ok:
                success_count += 1
                response_times.append(elapsed_ms)
                soil_raw = payload["soilMoistureRaw"]
                temp = payload["temperature"]
                hum = payload["airHumidity"]
                lux = payload["lightLux"]
                pump_tag = " [POMPA ON]" if pump_active_state else ""
                fb_ms = resp_data.get("fbDurationMs", "-")
                retry_tag = f" (retry {retries_used}x)" if retries_used > 0 else ""

                print(
                    f"[{now_str}] #{sent_count:04d} ✅ HTTP {status_code} ({elapsed_ms}ms, FB:{fb_ms}ms{retry_tag}) | "
                    f"Suhu: {temp:4.1f}°C | Hum: {hum:4.1f}% | SoilRaw: {soil_raw:4d} | Lux: {lux:6.1f}{pump_tag} | "
                    f"[SIMULATOR]"
                )
            else:
                fail_count += 1
                print(f"[{now_str}] #{sent_count:04d} ❌ GAGAL (HTTP {status_code}, {elapsed_ms}ms): {resp_data}")
                if status_code == 401:
                    print("   💡 Petunjuk: Pastikan ESP32_DEVICE_TOKEN di simulator sama dengan di backend/.env!")
                elif status_code == 0:
                    print(f"   💡 Petunjuk: Periksa apakah backend sedang aktif di {backend_url}")

            if count and sent_count >= count:
                break

            # 4. Kompensasi interval tidur agar siklus pengiriman presisi
            cycle_duration = time.time() - cycle_start
            sleep_needed = max(0.05, interval_sec - cycle_duration)
            time.sleep(sleep_needed)

    except KeyboardInterrupt:
        print("\n\n🛑 Simulator dihentikan oleh pengguna.")

    # -----------------------------------------------------------------------
    # Tampilkan Ringkasan Statistik
    # -----------------------------------------------------------------------
    print("\n" + "=" * 76)
    print("📊 STATISTIK PENGUJIAN SENSOR SIMULATOR")
    print("=" * 76)
    print(f"Total Percobaan Pengiriman : {sent_count}")
    print(f"Jumlah Berhasil (HTTP 200) : {success_count} ({(success_count / max(1, sent_count)) * 100:.1f}%)")
    print(f"Jumlah Gagal               : {fail_count} ({(fail_count / max(1, sent_count)) * 100:.1f}%)")
    print(f"Total Retry yang Terjadi   : {total_retries}")

    if response_times:
        avg_ms = sum(response_times) / len(response_times)
        min_ms = min(response_times)
        max_ms = max(response_times)
        print(f"Waktu Respons Rata-rata    : {avg_ms:.1f} ms")
        print(f"Waktu Respons Tercepat     : {min_ms} ms")
        print(f"Waktu Respons Terlama      : {max_ms} ms")
    print("=" * 76 + "\n")


# ---------------------------------------------------------------------------
# CLI Argument Parser
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Sensor Data Simulator untuk Sistem Pengawas Tanaman IoT (Data Dummy)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--url",
        default=os.getenv("BACKEND_URL", "http://localhost:3001"),
        help="URL dasar Backend API (default: http://localhost:3001 atau BACKEND_URL)",
    )
    parser.add_argument(
        "--token",
        default=os.getenv("ESP32_DEVICE_TOKEN", "default_secret_esp32_device_token_key_32chars"),
        help="Device Bearer Token untuk autentikasi ke backend (default: dari .env)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=float(os.getenv("SIMULATOR_INTERVAL_SEC", "3.0")),
        help="Interval pengiriman dalam detik (default: 3.0 detik)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=float(os.getenv("SIMULATOR_TIMEOUT_SEC", "5.0")),
        help="Timeout HTTP dalam detik (default: 5.0 detik)",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=2,
        help="Jumlah maksimal percobaan ulang jika terjadi error jaringan (default: 2)",
    )
    parser.add_argument(
        "--mode",
        choices=["dynamic", "dry", "wet"],
        default=os.getenv("SIMULATOR_MODE", "dynamic"),
        help="Mode variasi sensor: 'dynamic' (fluktuasi harian), 'dry' (kering/picu pompa), 'wet' (basah)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=None,
        help="Jumlah kiriman data sebelum berhenti (default: tanpa batas, tekan Ctrl+C)",
    )
    parser.add_argument(
        "--no-pump-sync",
        action="store_true",
        help="Nonaktifkan polling status pompa dari backend",
    )

    args = parser.parse_args()

    run_simulator(
        backend_url=args.url,
        token=args.token,
        interval_sec=args.interval,
        mode=args.mode,
        count=args.count,
        sync_pump=not args.no_pump_sync,
        timeout=args.timeout,
        max_retries=args.retries,
    )


if __name__ == "__main__":
    main()
