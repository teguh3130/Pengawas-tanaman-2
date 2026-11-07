'use strict';

/**
 * ai.controller.js
 * Controller integrasi Gemini AI untuk analisis kebutuhan tanaman.
 *
 * Gemini API Key HANYA ada di backend .env — tidak pernah dikirim ke frontend.
 */

const { generatePlantRequirements } = require('../services/gemini.service');
const { dbGet, dbSet, dbUpdate }     = require('../services/firebase.service');

/**
 * POST /api/ai/analyze
 * Analisis kebutuhan tanaman menggunakan Gemini AI.
 * Simpan hasilnya ke /plantRequirements Firebase.
 */
async function analyzePlant(req, res, next) {
  try {
    const plantData = {
      name          : req.body.name?.trim(),
      type          : req.body.type?.trim(),
      variety       : req.body.variety?.trim() || '-',
      location      : req.body.location?.trim() || '-',
      additionalInfo: req.body.additionalInfo?.trim() || '-',
    };

    console.log(`🤖 Gemini: menganalisis tanaman "${plantData.name}" (${plantData.type})`);

    // Panggil Gemini AI
    const aiResult = await generatePlantRequirements(plantData);

    // Susun data yang akan disimpan ke Firebase
    const requirements = {
      soilMoisture: {
        ideal  : aiResult.soilMoisture?.ideal   ?? { min: null, max: null },
        warning: aiResult.soilMoisture?.warning  ?? { min: null, max: null },
        unit   : '%',
        note   : aiResult.soilMoisture?.note     ?? '',
      },
      temperature: {
        ideal  : aiResult.temperature?.ideal    ?? { min: null, max: null },
        warning: aiResult.temperature?.warning   ?? { min: null, max: null },
        unit   : '°C',
        note   : aiResult.temperature?.note      ?? '',
      },
      airHumidity: {
        ideal  : aiResult.airHumidity?.ideal    ?? { min: null, max: null },
        warning: aiResult.airHumidity?.warning   ?? { min: null, max: null },
        unit   : '%',
        note   : aiResult.airHumidity?.note      ?? '',
      },
      light: {
        ideal              : aiResult.light?.ideal   ?? { minLux: null, maxLux: null },
        warning            : aiResult.light?.warning  ?? { minLux: null, maxLux: null },
        dailyDurationHours : aiResult.light?.dailyDurationHours ?? null,
        unit               : 'lux',
        note               : aiResult.light?.note ?? '',
      },
      watering   : aiResult.watering    ?? {},
      warnings   : aiResult.warnings    ?? [],
      description: aiResult.description ?? '',
      source     : aiResult.source      ?? 'Gemini AI',
      disclaimer : aiResult.disclaimer  ?? '',
      updatedAt  : Date.now(),
      updatedBy  : 'gemini_ai',
      verifiedByUser: false,
    };

    // Simpan ke Firebase
    await dbSet('/plantRequirements', requirements);

    // Sinkronkan threshold auto pump dari rekomendasi Gemini
    if (aiResult.pumpAuto) {
      await dbUpdate('/pump/auto', {
        triggerMoistureMin: aiResult.pumpAuto.triggerMoistureMin ?? requirements.soilMoisture.warning?.min,
        targetMoistureMax : aiResult.pumpAuto.targetMoistureMax  ?? requirements.soilMoisture.ideal?.max,
      });
    }

    console.log(`✅ Gemini: analisis selesai untuk "${plantData.name}"`);

    res.json({
      success     : true,
      data        : requirements,
      pumpAuto    : aiResult.pumpAuto ?? null,
      disclaimer  : requirements.disclaimer || null,
    });

  } catch (err) {
    // Jangan bocorkan detail error Gemini (mungkin mengandung informasi sensitif)
    console.error('❌ Gemini error:', err.message);
    next({
      status : 502,
      message: `Gagal mendapatkan analisis AI: ${err.message}`,
    });
  }
}

module.exports = { analyzePlant };

