// ─────────────────────────────────────────────────────────────
//  src/utils/aiClient.js — Client vers le service Python FastAPI
// ─────────────────────────────────────────────────────────────
const axios = require('axios');
const logger = require('./logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiAxios = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

async function predict(zone, weather) {
  try {
    const payload = {
      zone_id:       zone.id,
      rainfall_1h:   weather.rainfall_1h   || 0,
      rainfall_24h:  weather.rainfall_24h  || 0,
      rainfall_72h:  weather.rainfall_72h  || 0,
      forecast_rain: weather.forecast_rain || 0,
      elevation_avg: zone.elevation_avg    || 300,
      elevation_min: zone.elevation_min    || 280,
      area_sqkm:     zone.area_sqkm        || 10,
      impervious_ratio: zone.impervious_ratio || 0.5,
      drainage_density: zone.drainage_density || 0.5,
      population_density: (zone.population / zone.area_sqkm) || 10000,
      season: isRainySeason() ? 1 : 0,
    };

    const response = await aiAxios.post('/predict', payload);
    return response.data;

  } catch (err) {
    logger.error(`AI Service error pour zone ${zone.id}:`, err.message);
    // Fallback : prédiction basée sur règles simples si le service IA est down
    return fallbackPrediction(zone, weather);
  }
}

async function predictBatch(zones, weatherMap) {
  const payload = zones.map(z => ({
    zone_id: z.id,
    rainfall_1h:   weatherMap[z.id]?.rainfall_1h   || 0,
    rainfall_24h:  weatherMap[z.id]?.rainfall_24h  || 0,
    rainfall_72h:  weatherMap[z.id]?.rainfall_72h  || 0,
    elevation_avg: z.elevation_avg    || 300,
    elevation_min: z.elevation_min    || 280,
    area_sqkm:     z.area_sqkm        || 10,
    impervious_ratio: z.impervious_ratio || 0.5,
    season: isRainySeason() ? 1 : 0,
  }));

  try {
    const response = await aiAxios.post('/predict/batch', payload);
    return response.data;
  } catch (err) {
    logger.error('Batch prediction failed:', err.message);
    return zones.map(z => fallbackPrediction(z, weatherMap[z.id] || {}));
  }
}

async function getModelInfo() {
  try {
    const response = await aiAxios.get('/model/info');
    return response.data;
  } catch {
    return { status: 'unavailable', version: 'unknown' };
  }
}

// ── Helpers ──────────────────────────────────────────────────

function isRainySeason() {
  const month = new Date().getMonth() + 1; // 1-12
  return [10, 11, 12, 1, 2, 3, 4].includes(month);
}

function fallbackPrediction(zone, weather) {
  // Règles simples basées sur la pluie et l'élévation
  let score = 0;
  const rain = weather.rainfall_24h || 0;
  const elev = zone.elevation_avg   || 300;

  if (rain > 50)  score += 0.4;
  else if (rain > 30) score += 0.25;
  else if (rain > 15) score += 0.10;

  if (elev < 285) score += 0.3;
  else if (elev < 295) score += 0.15;
  else if (elev < 310) score += 0.05;

  if (zone.impervious_ratio > 0.65) score += 0.1;
  if (isRainySeason()) score += 0.05;

  score = Math.min(score, 1.0);

  let risk_level = 1;
  if (score >= 0.75) risk_level = 4;
  else if (score >= 0.50) risk_level = 3;
  else if (score >= 0.25) risk_level = 2;

  return {
    zone_id: zone.id,
    flood_probability: score,
    risk_level,
    model_version: 'fallback_rules',
    recommendation: getRecommendation(risk_level)
  };
}

function getRecommendation(level) {
  const map = {
    1: 'Situation normale. Surveillance standard.',
    2: 'Pluies importantes. Informer les quartiers vulnérables.',
    3: 'Pré-alerte inondation. Préparer les évacuations.',
    4: 'ALERTE CRITIQUE. Évacuation immédiate recommandée.'
  };
  return map[level] || map[1];
}

module.exports = { predict, predictBatch, getModelInfo };
