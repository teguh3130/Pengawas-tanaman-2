"""
index.py — Shortcut Runner Firmware ESP32 MicroPython
Mengarah langsung ke implementasi lengkap di esp32/main.py.
Buka folder esp32/ untuk melihat modularitas config.py dan bh1750.py.
"""

from esp32.main import PlantMonitorESP32

if __name__ == "__main__":
    monitor = PlantMonitorESP32()
    monitor.run()

