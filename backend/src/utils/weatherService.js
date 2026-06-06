/**
 * Service OpenWeatherMap
 * Collecte les donnees meteo actuelles + previsions pour chaque zone
 */

const axios  = require('axios');
const logger = require('./logger');
const db     = require('../config/database');
const redis  = require('../config/redis');

const OWM_BASE  = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5';
const OWM_KEY   = process.env.OPENWEATHER_API_KEY;

const owmAxios = axios.create({
  baseURL: OWM_BASE,
  timeout: 8000,
  params: { appid: OWM_KEY, units: 'metric', lang: 'fr' }
});

/**
 * Fetcher la meteo actuelle pour un point GPS
 * @param {number} lat
 * @param {number} lon
 * @returns {Object} donnees meteo normalisees
 */
async function fetchCurrentWeather(lat, lon) {
  const cacheKey = `weather:current:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const resp = await owmAxios.get('/weather', { params: { lat, lon } });
  const raw  = resp.data;

  const normalized = {
    timestamp:     new Date(raw.dt * 1000).toISOString(),
    temperature:   raw.main?.temp,
    humidity:      raw.main?.humidity,
    pressure:      raw.main?.pressure,
    wind_speed:    raw.wind?.speed * 3.6, // m/s -> km/h
    wind_direction:raw.wind?.deg,
    cloud_cover:   raw.clouds?.all,
    rainfall_1h:   raw.rain?.['1h'] || 0,
    rainfall_3h:   raw.rain?.['3h'] || 0,
    description:   raw.weather?.[0]?.description,
    source:        'openweather'
  };

  // Cache 30 minutes
  await redis.set(cacheKey, normalized, 1800);
  return normalized;
}

/**
 * Fetcher les previsions 5 jours / 3h pour une zone
 */
async function fetchForecast(lat, lon) {
  const cacheKey = `weather:forecast:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const resp = await owmAxios.get('/forecast', { params: { lat, lon } });
  const list  = resp.data.list;

  const forecasts = list.map(item => ({
    forecast_for: new Date(item.dt * 1000).toISOString(),
    rainfall_mm:  item.rain?.['3h'] || 0,
    temperature:  item.main?.temp,
    humidity:     item.main?.humidity,
    description:  item.weather?.[0]?.description,
    pop:          item.pop || 0   // Probability Of Precipitation [0-1]
  }));

  // Cache 1 heure
  await redis.set(cacheKey, forecasts, 3600);
  return forecasts;
}

/**
 * Calculer le cumul de pluie sur 24h a partir de la table weather_readings
 * (agregation des enregistrements horaires de la DB)
 */
async function computeRainfall24h(zoneId) {
  const { rows } = await db.query(`
    SELECT COALESCE(SUM(rainfall_1h), 0) as total
    FROM weather_readings
    WHERE zone_id = $1
      AND timestamp >= NOW() - INTERVAL '24 hours'
  `, [zoneId]);
  return parseFloat(rows[0]?.total || 0);
}

/**
 * Calculer le cumul 72h
 */
async function computeRainfall72h(zoneId) {
  const { rows } = await db.query(`
    SELECT COALESCE(SUM(rainfall_1h), 0) as total
    FROM weather_readings
    WHERE zone_id = $1
      AND timestamp >= NOW() - INTERVAL '72 hours'
  `, [zoneId]);
  return parseFloat(rows[0]?.total || 0);
}

/**
 * Sauvegarder une lecture meteo en DB
 */
async function saveWeatherReading(zoneId, lat, lon, data) {
  await db.query(`
    INSERT INTO weather_readings
      (zone_id, location, timestamp, rainfall_1h, rainfall_3h, rainfall_24h,
       rainfall_72h, temperature, humidity, wind_speed, wind_direction,
       cloud_cover, description, source)
    VALUES
      ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7,
       $8, $9, $10, $11, $12, $13, $14, $15)
  `, [
    zoneId, lon, lat, data.timestamp,
    data.rainfall_1h, data.rainfall_3h,
    await computeRainfall24h(zoneId),
    await computeRainfall72h(zoneId),
    data.temperature, data.humidity,
    data.wind_speed, data.wind_direction,
    data.cloud_cover, data.description, data.source
  ]);
}

/**
 * Sauvegarder les previsions en DB (remplace les anciennes)
 */
async function saveForecastsForZone(zoneId, forecasts) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // Supprimer les anciennes previsions pour cette zone
    await client.query(
      'DELETE FROM weather_forecasts WHERE zone_id = $1 AND forecast_for > NOW()',
      [zoneId]
    );
    // Inserer les nouvelles
    for (const f of forecasts) {
      await client.query(`
        INSERT INTO weather_forecasts
          (zone_id, forecast_for, rainfall_mm, temperature, humidity, description, pop)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [zoneId, f.forecast_for, f.rainfall_mm, f.temperature, f.humidity, f.description, f.pop]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Collecte complete pour une zone (meteo + forecast + sauvegarde)
 */
async function collectWeatherForZone(zone) {
  // Extraire lat/lon du centroide de la zone
  const centroidResult = await db.query(
    'SELECT ST_Y(centroid) as lat, ST_X(centroid) as lon FROM flood_zones WHERE id = $1',
    [zone.id]
  );
  const { lat, lon } = centroidResult.rows[0];

  const [current, forecasts] = await Promise.all([
    fetchCurrentWeather(lat, lon),
    fetchForecast(lat, lon)
  ]);

  await saveWeatherReading(zone.id, lat, lon, current);
  await saveForecastsForZone(zone.id, forecasts);

  // Calculer le cumul de pluie prevu 24h prochain
  const forecastRain24h = forecasts
    .filter(f => new Date(f.forecast_for) <= new Date(Date.now() + 24 * 3600 * 1000))
    .reduce((sum, f) => sum + f.rainfall_mm, 0);

  return {
    ...current,
    rainfall_24h:       await computeRainfall24h(zone.id),
    rainfall_72h:       await computeRainfall72h(zone.id),
    forecast_rain_24h:  forecastRain24h
  };
}

module.exports = {
  fetchCurrentWeather,
  fetchForecast,
  collectWeatherForZone,
  computeRainfall24h,
  computeRainfall72h
};
