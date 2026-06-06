// ─────────────────────────────────────────────────────────────
//  FloodSense Kinshasa — server.js
//  Point d'entrée principal de l'application
// ─────────────────────────────────────────────────────────────
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/utils/socket');
const { connectRedis } = require('./src/config/redis');
const { testDbConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');

// Démarrer les cron jobs
require('./src/jobs/weatherCron');
require('./src/jobs/predictionCron');

const PORT = process.env.PORT || 3001;

async function startServer() {
  await testDbConnection();
  await connectRedis();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    logger.info(`✅ FloodSense Backend running on port ${PORT}`);
    logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🗺️  API Base: http://localhost:${PORT}/api`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM reçu. Arrêt propre...');
    server.close(() => process.exit(0));
  });
}

startServer().catch(err => {
  logger.error('Echec démarrage serveur:', err);
  process.exit(1);
});
