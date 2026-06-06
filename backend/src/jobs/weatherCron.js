// ─────────────────────────────────────────────────────────────
//  src/jobs/weatherCron.js
//  Collecte météo automatique toutes les heures
// ─────────────────────────────────────────────────────────────
const cron = require('node-cron');
const { query } = require('../config/database');
const { collectAndSaveWeather } = require('../services/weatherService');
const logger = require('../utils/logger');

// Exécuter toutes les heures à la minute 5 (ex: 14:05, 15:05...)
cron.schedule('5 * * * *', async () => {
  logger.info('[CRON:WEATHER] Démarrage collecte météo...');
  const start = Date.now();

  try {
    const { rows: zones } = await query(
      'SELECT id, commune FROM flood_zones ORDER BY risk_level DESC'
    );

    let success = 0, failed = 0;
    // Traiter par lots de 5 pour éviter de spammer l'API
    for (let i = 0; i < zones.length; i += 5) {
      const batch = zones.slice(i, i + 5);
      await Promise.allSettled(
        batch.map(async (zone) => {
          const result = await collectAndSaveWeather(zone);
          if (result) success++; else failed++;
        })
      );
      // Pause entre les lots pour respecter les rate limits API
      if (i + 5 < zones.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    logger.info(`[CRON:WEATHER] ✅ ${success} zones OK, ${failed} échouées — ${duration}s`);

  } catch (err) {
    logger.error('[CRON:WEATHER] Erreur critique:', err.message);
  }
});

logger.info('✅ Cron météo planifié (toutes les heures à HH:05)');
