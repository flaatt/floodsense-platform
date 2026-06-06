// ─────────────────────────────────────────────────────────────
//  src/jobs/predictionCron.js
//  Mise à jour des prédictions IA et déclenchement des alertes
// ─────────────────────────────────────────────────────────────
const cron = require('node-cron');
const { query } = require('../config/database');
const { cacheDelPattern } = require('../config/redis');
const { predict } = require('../utils/aiClient');
const { processRiskAlert } = require('../services/alertService');
const { emitRiskUpdate } = require('../utils/socket');
const logger = require('../utils/logger');

// Exécuter toutes les heures à la minute 15 (après la collecte météo à HH:05)
cron.schedule('15 * * * *', async () => {
  logger.info('[CRON:PREDICT] Démarrage mise à jour prédictions...');
  const start = Date.now();
  let updated = 0, alerts = 0, errors = 0;

  try {
    // Récupérer toutes les zones avec la dernière météo disponible
    const { rows: zones } = await query(`
      SELECT
        fz.*,
        wr.rainfall_1h, wr.rainfall_24h, wr.rainfall_72h,
        wr.forecast_rain, wr.temperature, wr.humidity
      FROM flood_zones fz
      LEFT JOIN LATERAL (
        SELECT rainfall_1h,
               COALESCE(rainfall_24h, 0) AS rainfall_24h,
               COALESCE(rainfall_72h, 0) AS rainfall_72h,
               COALESCE(0, 0)           AS forecast_rain,
               temperature, humidity
        FROM weather_readings
        WHERE zone_id = fz.id
        ORDER BY timestamp DESC LIMIT 1
      ) wr ON TRUE
    `);

    for (const zone of zones) {
      try {
        // 1. Appeler le service IA
        const prediction = await predict(zone, {
          rainfall_1h:   zone.rainfall_1h   || 0,
          rainfall_24h:  zone.rainfall_24h  || 0,
          rainfall_72h:  zone.rainfall_72h  || 0,
          forecast_rain: zone.forecast_rain || 0,
        });

        // 2. Sauvegarder la prédiction
        await query(`
          INSERT INTO predictions
            (zone_id, flood_probability, risk_level, features_used, recommendation)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          zone.id,
          prediction.flood_probability,
          prediction.risk_level,
          JSON.stringify({ rainfall_1h: zone.rainfall_1h, rainfall_24h: zone.rainfall_24h }),
          prediction.recommendation
        ]);

        // 3. Mettre à jour la zone
        const oldRiskLevel = zone.risk_level;
        await query(`
          UPDATE flood_zones
          SET risk_level = $1, risk_score = $2, last_updated = NOW()
          WHERE id = $3
        `, [prediction.risk_level, prediction.flood_probability, zone.id]);

        // 4. Émettre la mise à jour WebSocket
        emitRiskUpdate(zone.id, {
          risk_level:        prediction.risk_level,
          risk_score:        prediction.flood_probability,
          previous_level:    oldRiskLevel,
          recommendation:    prediction.recommendation,
          updated_at:        new Date().toISOString()
        });

        // 5. Déclencher une alerte si nécessaire
        if (prediction.risk_level >= 2) {
          const alert = await processRiskAlert(zone, prediction);
          if (alert) alerts++;
        }

        updated++;

      } catch (err) {
        logger.error(`[CRON:PREDICT] Erreur zone ${zone.commune}:`, err.message);
        errors++;
      }
    }

    // 6. Invalider le cache des endpoints
    await cacheDelPattern('api:zones:*');
    await cacheDelPattern('api:stats:*');

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    logger.info(`[CRON:PREDICT] ✅ ${updated} zones, ${alerts} alertes, ${errors} erreurs — ${duration}s`);

  } catch (err) {
    logger.error('[CRON:PREDICT] Erreur critique:', err.message);
  }
});

logger.info('✅ Cron prédictions planifié (toutes les heures à HH:15)');
