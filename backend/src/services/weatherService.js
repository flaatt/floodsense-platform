// ─────────────────────────────────────────────────────────────
//  src/services/weatherService.js
//  Collecte des données météo via OpenWeatherMap API
// ─────────────────────────────────────────────────────────────
const axios = require('axios');
const { query } = require('../config/database');
const { cacheSet, cacheGet } = require('../config/redis');
const logger = require('../utils/logger');

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const API_KEY  = process.env.OPENWEATHER_API_KEY;

const COMMUNE_COORDS = {
  'Ndjili':       { lat: -4.420, lon: 15.408 },
  'Bumbu':        { lat: -4.390, lon: 15.290 },
  'Kimbanseke':   { lat: -4.450, lon: 15.430 },
  'Selembao':     { lat: -4.370, lon: 15.270 },
  'Limete':       { lat: -4.340, lon: 15.340 },
  'Masina':       { lat: -4.380, lon: 15.430 },
  'Kisenso':      { lat: -4.410, lon: 15.340 },
  'Makala':       { lat: -4.380, lon: 15.300 },
  'Kalamu':       { lat: -4.340, lon: 15.310 },
  'Matete':       { lat: -4.360, lon: 15.350 },
  'Ngaba':        { lat: -4.370, lon: 15.310 },
  'Gombe':        { lat: -4.300, lon: 15.315 },
  'Mont-Ngafula': { lat: -4.430, lon: 15.270 },
  'Ngaliema':     { lat: -4.340, lon: 15.250 },
  'Lemba':        { lat: -4.400, lon: 15.330 },
  '_default':     { lat: -4.320, lon: 15.320 },
};

async function fetchCurrentWeather(commune) {
  const coords = COMMUNE_COORDS[commune] || COMMUNE_COORDS['_default'];
  const cacheKey = `weather:current:${commune}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${OWM_BASE}/weather`, {
      params: { lat: coords.lat, lon: coords.lon, appid: API_KEY, units: 'metric' },
      timeout: 10000
    });
    const d = response.data;
    const weather = {
      commune,
      timestamp:      new Date().toISOString(),
      rainfall_1h:    d.rain?.['1h']         || 0,
      rainfall_3h:    d.rain?.['3h']         || 0,
      temperature:    d.main?.temp           || 0,
      humidity:       d.main?.humidity       || 0,
      wind_speed:     d.wind?.speed          || 0,
      wind_direction: d.wind?.deg            || 0,
      pressure:       d.main?.pressure       || 0,
      weather_code:   d.weather?.[0]?.id     || 0,
      weather_desc:   d.weather?.[0]?.description || '',
      source:         'openweather',
      raw_data:       d,
    };
    await cacheSet(cacheKey, weather, 1800);
    return weather;
  } catch (err) {
    logger.error(`fetchCurrentWeather [${commune}]:`, err.message);
    return null;
  }
}

async function fetchForecast(commune) {
  const coords = COMMUNE_COORDS[commune] || COMMUNE_COORDS['_default'];
  const cacheKey = `weather:forecast:${commune}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${OWM_BASE}/forecast`, {
      params: { lat: coords.lat, lon: coords.lon, appid: API_KEY, units: 'metric', cnt: 16 },
      timeout: 10000
    });
    const forecast = response.data.list.map(item => ({
      forecast_time: new Date(item.dt * 1000).toISOString(),
      rainfall_mm:   item.rain?.['3h'] || 0,
      temperature:   item.main?.temp   || 0,
      humidity:      item.main?.humidity || 0,
      pop:           item.pop || 0,
    }));
    const forecastRain24h = forecast.slice(0, 8).reduce((s, f) => s + f.rainfall_mm, 0);
    const result = { forecast, forecastRain24h };
    await cacheSet(cacheKey, result, 3600);
    return result;
  } catch (err) {
    logger.error(`fetchForecast [${commune}]:`, err.message);
    return { forecast: [], forecastRain24h: 0 };
  }
}

async function getRainfallAccumulation(zoneId, hours) {
  const result = await query(
    `SELECT COALESCE(SUM(rainfall_1h), 0) AS total_mm,
            COALESCE(AVG(rainfall_1h), 0) AS avg_mm_per_hour,
            COUNT(*)                       AS readings_count
     FROM weather_readings
     WHERE zone_id = $1 AND timestamp >= NOW() - ($2 || ' hours')::interval`,
    [zoneId, hours]
  );
  return result.rows[0];
}

async function saveWeatherReading(zoneId, weather) {
  await query(`
    INSERT INTO weather_readings
      (zone_id, commune, timestamp, rainfall_1h, rainfall_3h, temperature,
       humidity, wind_speed, wind_direction, pressure, weather_code, weather_desc, source, raw_data)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
  `, [
    zoneId, weather.commune, weather.timestamp,
    weather.rainfall_1h, weather.rainfall_3h, weather.temperature,
    weather.humidity, weather.wind_speed, weather.wind_direction,
    weather.pressure, weather.weather_code, weather.weather_desc,
    weather.source, JSON.stringify(weather.raw_data || {})
  ]);
}

async function collectAndSaveWeather(zone) {
  const weather = await fetchCurrentWeather(zone.commune);
  if (!weather) return null;

  const acc24 = await getRainfallAccumulation(zone.id, 24);
  const acc72 = await getRainfallAccumulation(zone.id, 72);
  weather.rainfall_24h = parseFloat(acc24.total_mm) + weather.rainfall_1h;
  weather.rainfall_72h = parseFloat(acc72.total_mm) + weather.rainfall_1h;

  const { forecastRain24h } = await fetchForecast(zone.commune);
  weather.forecast_rain = forecastRain24h;

  await saveWeatherReading(zone.id, weather);
  return weather;
}

module.exports = {
  fetchCurrentWeather, fetchForecast,
  getRainfallAccumulation, saveWeatherReading, collectAndSaveWeather,
};
