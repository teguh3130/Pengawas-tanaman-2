'use strict';

/**
 * gemini.service.js
 * Wrapper AI Engine untuk analisis kebutuhan tanaman & kesehatan tanaman.
 *
 * Mendukung:
 * 1. TokenAI (OpenAI-compatible API, default model: deepseek-v4-flash)
 * 2. Google Gemini AI (fallback otomatis jika TokenAI tidak aktif / gagal)
 *
 * Seluruh API Key HANYA diambil dari backend .env — tidak pernah dikirim ke frontend/ESP32.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let geminiModel = null;

function isTokenAIConfigured() {
  const key = process.env.TOKENAI_API_KEY;
  return Boolean(key && key !== 'your_tokenai_api_key_here' && key.trim().length > 0);
}

function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key !== 'your_gemini_api_key_here' && key.trim().length > 0);
}

/**
 * Parsing JSON yang tahan terhadap pembungkus markdown ```json ... ```.
 */
function parseJsonResponse(rawText) {
  const cleaned = String(rawText || '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error(`Respons AI bukan JSON valid. Cuplikan: ${cleaned.slice(0, 180)}`);
  }
}

/**
 * Panggil TokenAI (OpenAI-compatible Chat Completions API).
 */
async function callTokenAI(prompt) {
  const apiKey = process.env.TOKENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('TOKENAI_API_KEY belum dikonfigurasi di .env');
  }

  const baseUrl = (process.env.TOKENAI_BASE_URL || 'https://api.tokenai.id/v1').replace(/\/+$/, '');
  const modelId = process.env.TOKENAI_MODEL || 'deepseek-v4-flash';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah ahli agronomi dan hortikultura IoT. Balas HANYA dengan JSON valid sesuai skema yang diminta, tanpa teks pembuka, penutup, atau markdown.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errMsg = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
      throw new Error(`TokenAI error (${response.status}): ${errMsg}`);
    }

    const rawText = payload?.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error('TokenAI mengembalikan respons kosong');
    }

    return parseJsonResponse(rawText);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('TokenAI request timeout (>25 detik)');
    }
    throw err;
  }
}

/**
 * Inisialisasi Google Gemini client (lazy).
 */
function initGemini() {
  if (geminiModel) return;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di .env');
  }

  genAI = new GoogleGenerativeAI(apiKey);
  geminiModel = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  });

  console.log(`✅ Gemini AI siap (model: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'})`);
}

/**
 * Panggil Google Gemini API.
 */
async function callGemini(prompt) {
  initGemini();
  const result = await geminiModel.generateContent(prompt);
  const rawText = result.response.text().trim();
  return parseJsonResponse(rawText);
}

/**
 * Router AI Provider:
 * - AI_PROVIDER=tokenai -> wajib TokenAI
 * - AI_PROVIDER=gemini  -> wajib Gemini
 * - AI_PROVIDER=auto (default) -> prioritas TokenAI jika tersedia, fallback ke Gemini jika gagal
 */
async function generateStructuredJson(prompt) {
  const mode = (process.env.AI_PROVIDER || 'auto').toLowerCase();

  if (mode === 'tokenai') {
    return callTokenAI(prompt);
  }

  if (mode === 'gemini') {
    return callGemini(prompt);
  }

  // Mode 'auto'
  if (isTokenAIConfigured()) {
    try {
      return await callTokenAI(prompt);
    } catch (tokenErr) {
      console.warn(`⚠️  TokenAI gagal (${tokenErr.message}), mencoba fallback ke Gemini...`);
      if (isGeminiConfigured()) {
        return callGemini(prompt);
      }
      throw tokenErr;
    }
  }

  if (isGeminiConfigured()) {
    return callGemini(prompt);
  }

  throw new Error('Belum ada API Key AI yang dikonfigurasi (TOKENAI_API_KEY atau GEMINI_API_KEY di .env)');
}

/**
 * Minta AI menganalisis kebutuhan tanaman dan mengembalikan
 * parameter pemantauan dalam format JSON terstruktur.
 *
 * @param {object} plantData - { name, type, variety, location, additionalInfo }
 * @returns {Promise<object>} requirements yang sudah diparse
 */
async function generatePlantRequirements(plantData) {
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

  return generateStructuredJson(prompt);
}

/**
 * Minta AI menganalisis kondisi kesehatan tanaman berdasarkan data sensor aktual
 * dan parameter kebutuhan tanaman yang sudah dikonfigurasi.
 *
 * @param {object} payload - { plant, requirements, sensorData, actualEvaluation }
 * @returns {Promise<object>} hasil analisis kesehatan + rekomendasi penanganan spesifik
 */
async function generatePlantHealthAnalysis({ plant, requirements, sensorData, actualEvaluation }) {
  const prompt = `
Kamu adalah agronom dan ahli kesehatan tanaman berbasis data sensor IoT.
Analisis kondisi kesehatan tanaman berikut secara objektif HANYA berdasarkan data sensor aktual dan ambang batas kebutuhan tanaman yang diberikan.

PROFIL TANAMAN:
- Nama      : ${plant?.name || '-'}
- Jenis     : ${plant?.type || '-'}
- Varietas  : ${plant?.variety || '-'}
- Lokasi    : ${plant?.location || '-'}
- Catatan   : ${plant?.additionalInfo || '-'}

DATA SENSOR AKTUAL SAAT INI:
- Kelembapan Tanah : ${sensorData.soilMoisture}%
- Suhu Udara       : ${sensorData.temperature}°C
- Kelembapan Udara : ${sensorData.airHumidity}%
- Intensitas Cahaya: ${sensorData.lightLux} lux
- Sumber Data      : ${sensorData.source || 'SENSOR'}

AMBANG BATAS KEBUTUHAN TANAMAN:
- Kelembapan Tanah Ideal: ${requirements?.soilMoisture?.ideal?.min ?? '-'}–${requirements?.soilMoisture?.ideal?.max ?? '-'}% (Waspada: ${requirements?.soilMoisture?.warning?.min ?? '-'}–${requirements?.soilMoisture?.warning?.max ?? '-'}%)
- Suhu Udara Ideal      : ${requirements?.temperature?.ideal?.min ?? '-'}–${requirements?.temperature?.ideal?.max ?? '-'}°C (Waspada: ${requirements?.temperature?.warning?.min ?? '-'}–${requirements?.temperature?.warning?.max ?? '-'}%)
- Kelembapan Udara Ideal: ${requirements?.airHumidity?.ideal?.min ?? '-'}–${requirements?.airHumidity?.ideal?.max ?? '-'}% (Waspada: ${requirements?.airHumidity?.warning?.min ?? '-'}–${requirements?.airHumidity?.warning?.max ?? '-'}%)
- Cahaya Ideal          : ${requirements?.light?.ideal?.minLux ?? '-'}–${requirements?.light?.ideal?.maxLux ?? '-'} lux

EVALUASI NUMERIK AKTUAL SISTEM:
${JSON.stringify(actualEvaluation, null, 2)}

ATURAN KETAT:
1. Status kesehatan HARUS salah satu dari tepat 3 nilai: "Sehat", "Kurang Sehat", atau "Tidak Sehat".
2. JANGAN mengarang data sensor yang tidak ada atau bertentangan dengan angka di atas.
3. Jika evaluasi numerik menunjukkan ada parameter "bahaya" (di luar batas aman), status TIDAK BOLEH "Sehat".
4. Rekomendasi penanganan HARUS spesifik untuk jenis tanaman "${plant?.type || plant?.name}" dan kondisi angka sensor aktual di atas (bukan saran generik).
5. Jika semua parameter normal/ideal, tetap berikan langkah pemeliharaan preventif yang relevan dengan karakteristik tanaman tersebut dengan prioritas "Rendah".

Berikan respons HANYA dalam format JSON berikut tanpa teks lain:
{
  "status": "Sehat" | "Kurang Sehat" | "Tidak Sehat",
  "confidence": <integer 0-100>,
  "reason": "<penjelasan ringkas 2-3 kalimat mengenai alasan penilaian berdasarkan angka sensor aktual>",
  "problematicParameters": [
    {
      "parameter": "soilMoisture" | "temperature" | "airHumidity" | "lightLux",
      "label": "<nama parameter bahasa Indonesia>",
      "severity": "waspada" | "bahaya",
      "issue": "<penjelasan spesifik dampak penyimpangan angka terhadap tanaman ini>"
    }
  ],
  "recommendations": [
    {
      "issueCondition": "<kondisi spesifik yang perlu diperbaiki atau dipertahankan>",
      "actionTitle": "<judul tindakan singkat & jelas>",
      "steps": [
        "<langkah praktis 1 cara melakukan penanganan>",
        "<langkah praktis 2 cara melakukan penanganan>"
      ],
      "priority": "Tinggi" | "Sedang" | "Rendah",
      "targetParameter": "soilMoisture" | "temperature" | "airHumidity" | "lightLux" | "general"
    }
  ],
  "disclaimer": "<catatan singkat batas analisis sensor tanpa inspeksi visual daun/akar>"
}
`.trim();

  return generateStructuredJson(prompt);
}

module.exports = {
  generatePlantRequirements,
  generatePlantHealthAnalysis,
  isTokenAIConfigured,
  isGeminiConfigured,
};
