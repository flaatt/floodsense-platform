// ─────────────────────────────────────────────────────────────
//  src/config/database.js — Pool PostgreSQL + PostGIS
// ─────────────────────────────────────────────────────────────
const { Pool } = require('pg');
const logger = require('../utils/logger');

require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquante. Vérifie le fichier .env ou les variables Docker.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // connexions max dans le pool
  idleTimeoutMillis: 30000,   // fermer une connexion idle après 30s
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  logger.error('Erreur pool PostgreSQL:', err);
});

// Helper : exécuter une requête
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`Requête lente (${duration}ms): ${text.substring(0, 100)}`);
    }
    return result;
  } catch (err) {
    logger.error('Erreur DB:', { query: text, error: err.message });
    throw err;
  }
}

// Helper : transaction
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function testDbConnection() {
  try {
    const result = await pool.query('SELECT NOW() as time, version() as version, current_database() as db, current_user as user, inet_server_addr() as host, inet_server_port() as port');
    logger.info(`✅ PostgreSQL connecté: ${result.rows[0].user}@${result.rows[0].db} port ${result.rows[0].port} - ${result.rows[0].time}`);
  } catch (err) {
    logger.error('❌ Impossible de connecter à PostgreSQL:', err.message);
    throw err;
  }
}

module.exports = { query, transaction, pool, testDbConnection };
