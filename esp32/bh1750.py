"""
Driver BH1750 Ambient Light Sensor untuk MicroPython ESP32
Mendukung auto-detect alamat I2C (0x23 atau 0x5C) dan pembacaan Lux.
"""

import time

class BH1750:
    POWER_DOWN = 0x00
    POWER_ON = 0x01
    RESET = 0x07
    CONTINUOUS_HIGH_RES_MODE = 0x10   # Resolusi 1 lux, durasi baca ~120ms

    def __init__(self, i2c, addr=None):
        """
        Inisialisasi sensor BH1750.
        Jika addr=None, akan otomatis mencari alamat 0x23 atau 0x5C via i2c.scan().
        """
        self.i2c = i2c
        self.addr = addr
        self.mode = self.CONTINUOUS_HIGH_RES_MODE

        # Auto-detect alamat jika tidak ditentukan
        if self.addr is None:
            devices = self.i2c.scan()
            if 0x23 in devices:
                self.addr = 0x23
            elif 0x5C in devices:
                self.addr = 0x5C
            elif devices:
                # Gunakan perangkat pertama yang ditemukan
                self.addr = devices[0]
            else:
                raise OSError("Tidak ada perangkat I2C yang terdeteksi di bus (i2c.scan() = [])")

        self._init_sensor()

    def _init_sensor(self):
        """Menyalakan dan menyetel mode pengukuran default."""
        try:
            self.i2c.writeto(self.addr, bytes([self.POWER_ON]))
            time.sleep_ms(10)
            self.i2c.writeto(self.addr, bytes([self.RESET]))
            time.sleep_ms(10)
            self.i2c.writeto(self.addr, bytes([self.mode]))
            time.sleep_ms(130) # Tunggu konversi pertama selesai
        except Exception as e:
            raise OSError(f"BH1750 gagal merespons di alamat 0x{self.addr:02X}: {e}")

    def read_lux(self):
        """
        Membaca nilai intensitas cahaya dalam satuan Lux.
        Mengembalikan float (contoh: 450.5 lx).
        """
        try:
            data = self.i2c.readfrom(self.addr, 2)
            raw = (data[0] << 8) | data[1]
            return round(raw / 1.2, 1)
        except Exception as e:
            # Coba re-inisialisasi sekali jika glitch
            try:
                self._init_sensor()
                data = self.i2c.readfrom(self.addr, 2)
                raw = (data[0] << 8) | data[1]
                return round(raw / 1.2, 1)
            except Exception:
                raise OSError(f"Gagal membaca data dari BH1750: {e}")

    def power_down(self):
        try:
            self.i2c.writeto(self.addr, bytes([self.POWER_DOWN]))
        except Exception:
            pass
