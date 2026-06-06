// ─────────────────────────────────────────────────────────────
//  src/config/redis.js — Client Redis (cache + pub/sub)
// ─────────────────────────────────────────────────────────────
const { createClient } = require('redis');
const logger = require('../utils/logger');

let client = null;

async function connectRedis() {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('Redis: trop de tentatives de reconnexion');
        return Math.min(retries * 100, 3000);
      }
    }
  });

  client.on('error', (err) => logger.error('Redis error:', err));
  client.on('reconnecting', () => logger.warn('Redis: reconnexion...'));

  await client.connect();
  logger.info('✅ Redis connecté');
  return client;
}

function getClient() {
  if (!client) throw new Error('Redis non initialisé. Appeler connectRedis() d\'abord.');
  return client;
}

// ── Helpers cache ─────────────────────────────────────────────

async function cacheGet(key) {
  try {
    const val = await getClient().get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    await getClient().setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn('Cache set failed:', err.message);
  }
}

async function cacheDel(key) {
  try {
    await getClient().del(key);
  } catch (err) {
    logger.warn('Cache del failed:', err.message);
  }
}

async function cacheDelPattern(pattern) {
  try {
    const keys = await getClient().keys(pattern);
    if (keys.length > 0) await getClient().del(keys);
  } catch (err) {
    logger.warn('Cache del pattern failed:', err.message);
  }
}

module.exports = {
  connectRedis,
  getClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
};
