'use strict';

/**
 * ai.controller.js
 * Controller integrasi Gemini AI untuk analisis kebutuhan tanaman.
 *
 * Gemini API Key HANYA ada di backend .env — tidak pernah dikirim ke frontend.
 */

const { generatePlantRequirements, generatePlantHealthAnalysis } = require('../services/gemini.service');
const { dbGet, dbSet, dbUpdate }     = require('../services/firebase.service');

/**
 * Evaluasi deterministik metrik sensor aktual terhadap requirements tanaman.
 */
function evaluateMetricRange(value, ideal, warning, isLux = false) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return { available: false, status: 'unavailable' };
  }
  const num = Number(value);
  const idealMin = isLux ? ideal?.minLux : ideal?.min;
  const idealMax = isLux ? ideal?.maxLux : ideal?.max;
  const warnMin = isLux ? warning?.minLux : warning?.min;
  const warnMax = isLux ? warning?.maxLux : warning?.max;

  if (idealMin == null || idealMax == null) {
    return { available: true, value: num, status: 'unknown' };
  }
  if (num >= idealMin && num <= idealMax) {
    return { available: true, value: num, status: 'ideal', idealMin, idealMax };
  }
  if (warnMin != null && warnMax != null && (num < warnMin || num > warnMax)) {
    return {
      available: true,
      value: num,
      status: 'bahaya',
      direction: num < warnMin ? 'low' : 'high',
      idealMin,
      idealMax,
      warnMin,
      warnMax,
    };
  }
  return {
    available: true,
    value: num,
    status: 'waspada',
    direction: num < idealMin ? 'low' : 'high',
    idealMin,
    idealMax,
    warnMin,
    warnMax,
  };
}

/**
 * Validasi kelengkapan sensor dan evaluasi aktual terhadap requirements.
 */
function evaluateActualSensorHealth(sensorData, requirements) {
  const missingSensors = [];
  if (!sensorData) {
    return {
      canAnalyze: false,
      missingSensors: ['soilMoisture', 'temperature', 'airHumidity', 'lightLux'],
      evaluations: {},
    };
  }

  const checks = [
    { key: 'soilMoisture', label: 'Kelembapan Tanah', val: sensorData.soilMoisture, unit: '%' },
    { key: 'temperature', label: 'Suhu Udara', val: sensorData.temperature, unit: '°C' },
    { key: 'airHumidity', label: 'Kelembapan Udara', val: sensorData.airHumidity, unit: '%' },
    { key: 'lightLux', label: 'Intensitas Cahaya', val: sensorData.lightLux, unit: 'lux' },
  ];

  for (const item of checks) {
    if (item.val === null || item.val === undefined || Number.isNaN(Number(item.val))) {
      missingSensors.push(item.label);
    }
  }

  if (missingSensors.length > 0) {
    return { canAnalyze: false, missingSensors, evaluations: {} };
  }

  const evaluations = {
    soilMoisture: evaluateMetricRange(sensorData.soilMoisture, requirements?.soilMoisture?.ideal, requirements?.soilMoisture?.warning, false),
    temperature: evaluateMetricRange(sensorData.temperature, requirements?.temperature?.ideal, requirements?.temperature?.warning, false),
    airHumidity: evaluateMetricRange(sensorData.airHumidity, requirements?.airHumidity?.ideal, requirements?.airHumidity?.warning, false),
    lightLux: evaluateMetricRange(sensorData.lightLux, requirements?.light?.ideal, requirements?.light?.warning, true),
  };

  return { canAnalyze: true, missingSensors: [], evaluations };
}

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
      source     : aiResult.source      ?? 'Analisis AI Agronomi',
      disclaimer : aiResult.disclaimer  ?? '',
      updatedAt  : Date.now(),
      updatedBy  : 'gemini_ai',
      verifiedByUser: false,
    };

    const isPreview = Boolean(req.body.preview);

    // Simpan ke Firebase jika bukan mode preview onboarding
    if (!isPreview) {
      await dbSet('/plantRequirements', requirements);

      // Sinkronkan threshold auto pump dari rekomendasi Gemini
      if (aiResult.pumpAuto) {
        await dbUpdate('/pump/auto', {
          triggerMoistureMin: aiResult.pumpAuto.triggerMoistureMin ?? requirements.soilMoisture.warning?.min,
          targetMoistureMax : aiResult.pumpAuto.targetMoistureMax  ?? requirements.soilMoisture.ideal?.max,
        });
      }
    }

    console.log(`✅ Gemini: analisis selesai untuk "${plantData.name}"${isPreview ? ' (preview)' : ''}`);

    res.json({
      success     : true,
      preview     : isPreview,
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

/**
 * POST /api/ai/health-analysis
 * Analisis kondisi kesehatan tanaman berdasarkan sensor aktual + requirements + Gemini AI.
 * Memvalidasi hasil AI terhadap data sensor aktual agar tidak menghasilkan kesimpulan palsu.
 */
async function analyzePlantHealth(req, res, next) {
  try {
    const [plant, requirements, latestSensor] = await Promise.all([
      dbGet('/plant'),
      dbGet('/plantRequirements'),
      dbGet('/sensorData/latest'),
    ]);

    if (!plant) {
      return res.status(400).json({
        success: false,
        error: 'Profil tanaman belum dikonfigurasi. Lengkapi data tanaman terlebih dahulu.',
      });
    }

    if (!requirements) {
      return res.status(400).json({
        success: false,
        error: 'Parameter kebutuhan tanaman belum tersedia. Jalankan analisis kebutuhan terlebih dahulu.',
      });
    }

    const actualCheck = evaluateActualSensorHealth(latestSensor, requirements);

    // Jika data sensor belum tersedia atau tidak lengkap -> jangan membuat kesimpulan palsu
    if (!actualCheck.canAnalyze) {
      const unavailableResult = {
        status: 'Belum dapat dianalisis',
        canAnalyze: false,
        missingSensors: actualCheck.missingSensors,
        reason: latestSensor
          ? `Data sensor belum lengkap (${actualCheck.missingSensors.join(', ')} belum tersedia).`
          : 'Belum ada data pembacaan sensor dari perangkat ESP32 atau simulator.',
        problematicParameters: [],
        recommendations: [],
        confidence: null,
        analyzedAt: Date.now(),
        sensorSnapshot: latestSensor || null,
        source: 'Validasi Sistem',
      };
      return res.json({ success: true, data: unavailableResult });
    }

    // Panggil Gemini AI dengan data aktual dan evaluasi numerik
    const aiHealth = await generatePlantHealthAnalysis({
      plant,
      requirements,
      sensorData: latestSensor,
      actualEvaluation: actualCheck.evaluations,
    });

    // Validasi ketat hasil AI dengan evaluasi numerik aktual
    const evalEntries = Object.entries(actualCheck.evaluations);
    const dangerParams = evalEntries.filter(([, ev]) => ev.status === 'bahaya');
    const warnParams = evalEntries.filter(([, ev]) => ev.status === 'waspada');

    const validStatuses = ['Sehat', 'Kurang Sehat', 'Tidak Sehat'];
    let finalStatus = validStatuses.includes(aiHealth.status) ? aiHealth.status : 'Kurang Sehat';

    // Anti-halusinasi guard:
    if (dangerParams.length >= 2 && finalStatus !== 'Tidak Sehat') {
      finalStatus = 'Tidak Sehat';
    } else if (dangerParams.length === 1 && finalStatus === 'Sehat') {
      finalStatus = 'Kurang Sehat';
    } else if (warnParams.length >= 2 && finalStatus === 'Sehat') {
      finalStatus = 'Kurang Sehat';
    } else if (dangerParams.length === 0 && warnParams.length === 0 && finalStatus === 'Tidak Sehat') {
      finalStatus = 'Sehat';
    }

    // Susun daftar parameter bermasalah yang tervalidasi dari sensor aktual
    const labelMap = {
      soilMoisture: { label: 'Kelembapan Tanah', unit: '%' },
      temperature: { label: 'Suhu Udara', unit: '°C' },
      airHumidity: { label: 'Kelembapan Udara', unit: '%' },
      lightLux: { label: 'Intensitas Cahaya', unit: 'lux' },
    };

    const aiIssuesMap = new Map(
      (Array.isArray(aiHealth.problematicParameters) ? aiHealth.problematicParameters : [])
        .map((p) => [p.parameter, p])
    );

    const validatedProblems = evalEntries
      .filter(([, ev]) => ev.status === 'bahaya' || ev.status === 'waspada')
      .map(([key, ev]) => {
        const meta = labelMap[key] || { label: key, unit: '' };
        const aiItem = aiIssuesMap.get(key);
        const dirText = ev.direction === 'low' ? 'di bawah batas ideal' : 'melebihi batas ideal';
        return {
          parameter: key,
          label: meta.label,
          severity: ev.status,
          currentValue: `${ev.value}${meta.unit === 'lux' ? ' lux' : meta.unit}`,
          idealRange: `${ev.idealMin}–${ev.idealMax}${meta.unit === 'lux' ? ' lux' : meta.unit}`,
          issue: aiItem?.issue || `${meta.label} (${ev.value}${meta.unit}) ${dirText} (${ev.idealMin}–${ev.idealMax}${meta.unit}).`,
        };
      });

    const confidenceNum = Number(aiHealth.confidence);
    const validatedConfidence = Number.isFinite(confidenceNum)
      ? Math.max(0, Math.min(100, Math.round(confidenceNum)))
      : null;

    const healthRecord = {
      status: finalStatus,
      canAnalyze: true,
      confidence: validatedConfidence,
      reason: aiHealth.reason || 'Analisis selesai berdasarkan pembacaan sensor aktual.',
      problematicParameters: validatedProblems,
      recommendations: Array.isArray(aiHealth.recommendations) ? aiHealth.recommendations : [],
      disclaimer: aiHealth.disclaimer || 'Analisis ini berdasarkan pembacaan sensor lingkungan dan belum mencakup pemeriksaan visual hama/penyakit fisik.',
      analyzedAt: Date.now(),
      sensorSnapshot: {
        temperature: latestSensor.temperature,
        airHumidity: latestSensor.airHumidity,
        soilMoisture: latestSensor.soilMoisture,
        lightLux: latestSensor.lightLux,
        timestamp: latestSensor.timestamp,
        source: latestSensor.source || 'SENSOR',
      },
      plantName: plant.name,
      plantType: plant.type,
      source: 'Analisis AI + Validasi Sensor Aktual',
    };

    await dbSet('/plantHealth', healthRecord);

    return res.json({ success: true, data: healthRecord });
  } catch (err) {
    console.error('❌ Gemini Health Analysis error:', err.message);
    next({
      status: 502,
      message: `Gagal menganalisis kesehatan tanaman: ${err.message}`,
    });
  }
}

/**
 * GET /api/ai/health-analysis
 * Ambil hasil analisis kesehatan tanaman terakhir dari Firebase.
 */
async function getPlantHealth(req, res, next) {
  try {
    const health = await dbGet('/plantHealth');
    if (!health) {
      return res.status(404).json({ success: false, error: 'Belum ada riwayat analisis kesehatan' });
    }
    res.json({ success: true, data: health });
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzePlant, analyzePlantHealth, getPlantHealth };

