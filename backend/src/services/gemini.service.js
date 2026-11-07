'use strict';

/**
 * gemini.service.js
 * Wrapper Google Gemini API untuk analisis kebutuhan tanaman.
 *
 * API Key HANYA diambil dari process.env.GEMINI_API_KEY (backend .env).
 * Tidak pernah dikirim ke frontend atau ESP32.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI  = null;
let model  = null;

/**
 * Inisialisasi Gemini client.
 * Dipanggil lazy (saat pertama kali dibutuhkan).
 */
function initGemini() {
  if (model) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di .env');
  }

  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature     : 0.3,  // Lebih deterministik untuk data ilmiah
    },
  });

  console.log(`✅ Gemini AI siap (model: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'})`);
}

/**
 * Minta Gemini menganalisis kebutuhan tanaman dan mengembalikan
 * parameter pemantauan dalam format JSON terstruktur.
 *
 * @param {object} plantData - { name, type, variety, location, additionalInfo }
 * @returns {Promise<object>} requirements yang sudah diparse
 */
async function generatePlantRequirements(plantData) {
  initGemini();

  const { name, type, variety = '-', location = '-', additionalInfo = '-' } = plantData;

  const prompt = `
Kamu adalah ahli pertanian dan hortikultura. Analisis kebutuhan tanaman berikut dan berikan rekomendasi parameter pemantauan yang akurat berdasarkan pengetahuan ilmiah.

Tanaman  : ${name}
Jenis    : ${type}
Varietas : ${variety}
Lokasi   : ${location}
Catatan  : ${additionalInfo}

PENTING:
- Berikan nilai berdasarkan literatur ilmiah atau panduan budidaya yang umum digunakan.
- Bedakan antara nilai ideal (terbaik) dan nilai toleransi/warning (batas aman).
- Jika data spesifik tidak tersedia, berikan estimasi umum untuk jenis tanaman tersebut dan tandai di disclaimer.
- Jangan mengarang nilai yang tidak memiliki dasar ilmiah.
- Nilai soilMoisture adalah persentase (0-100%), bukan nilai ADC.

Berikan respons HANYA dalam format JSON berikut, tanpa teks atau markdown di luar JSON:

{
  "soilMoisture": {
    "ideal":   { "min": <number 0-100>, "max": <number 0-100> },
    "warning": { "min": <number 0-100>, "max": <number 0-100> },
    "unit": "%",
    "note": "<penjelasan singkat kebutuhan kelembapan tanah>"
  },
  "temperature": {
    "ideal":   { "min": <number>, "max": <number> },
    "warning": { "min": <number>, "max": <number> },
    "unit": "°C",
    "note": "<penjelasan singkat kebutuhan suhu>"
  },
  "airHumidity": {
    "ideal":   { "min": <number 0-100>, "max": <number 0-100> },
    "warning": { "min": <number 0-100>, "max": <number 0-100> },
    "unit": "%",
    "note": "<penjelasan singkat kebutuhan kelembapan udara>"
  },
  "light": {
    "ideal":   { "minLux": <number>, "maxLux": <number> },
    "warning": { "minLux": <number>, "maxLux": <number> },
    "dailyDurationHours": <number 0-24>,
    "unit": "lux",
    "note": "<penjelasan singkat kebutuhan cahaya>"
  },
  "watering": {
    "frequency": "<seberapa sering penyiraman dianjurkan>",
    "method"   : "<cara penyiraman yang dianjurkan>"
  },
  "pumpAuto": {
    "triggerMoistureMin": <number — ambang batas mulai pompa, sama atau lebih rendah dari soilMoisture.warning.min>,
    "targetMoistureMax" : <number — target kelembapan saat pompa berhenti, sama atau lebih rendah dari soilMoisture.ideal.max>
  },
  "warnings": [
    "<kondisi yang perlu diwaspadai 1>",
    "<kondisi yang perlu diwaspadai 2>"
  ],
  "description": "<penjelasan singkat 2-3 kalimat tentang kebutuhan umum tanaman ini>",
  "source"     : "<dasar atau referensi rekomendasi jika tersedia, atau 'Estimasi umum berbasis panduan budidaya'>",
  "disclaimer" : "<catatan jika ada nilai yang perlu diverifikasi lebih lanjut>"
}
`.trim();

  const result   = await model.generateContent(prompt);
  const rawText  = result.response.text().trim();

  // Parsing JSON — Gemini dengan responseMimeType JSON seharusnya langsung valid
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Fallback: coba ekstrak JSON dari dalam code block markdown
    const match = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        parsed = JSON.parse(match[1].trim());
      } catch (e2) {
        throw new Error(`Gagal memparsing respons Gemini sebagai JSON: ${e2.message}\nRaw: ${rawText.slice(0, 200)}`);
      }
    } else {
      throw new Error(`Respons Gemini bukan JSON valid.\nRaw: ${rawText.slice(0, 200)}`);
    }
  }

  return parsed;
}

module.exports = { generatePlantRequirements };

