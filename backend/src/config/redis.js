// ─────────────────────────────────────────────────────────────
//  src/config/redis.js — Client Redis optionnel
// ─────────────────────────────────────────────────────────────
const { createClient } = require('redis');
const logger = require('../utils/logger');

let client = null;
let redisEnabled = false;

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    logger.warn('⚠️ REDIS_URL absent — Redis désactivé, cache mémoire ignoré.');
    redisEnabled = false;
    return null;
  }

  try {
    client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) return new Error('Redis: trop de tentatives');
          return Math.min(retries * 100, 2000);
        }
      }
    });

    client.on('error', (err) => logger.warn('Redis error:', err.message));
    client.on('reconnecting', () => logger.warn('Redis: reconnexion...'));

    await client.connect();
    redisEnabled = true;
    logger.info('✅ Redis connecté');
    return client;
  } catch (err) {
    redisEnabled = false;
    client = null;
    logger.warn(`⚠️ Redis indisponible — démarrage sans cache: ${err.message}`);
    return null;
  }
}

function getClient() {
  return client;
}

async function cacheGet(key) {
  if (!redisEnabled || !client) return null;

  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  if (!redisEnabled || !client) return;

  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn('Cache set failed:', err.message);
  }
}

async function cacheDel(key) {
  if (!redisEnabled || !client) return;

  try {
    await client.del(key);
  } catch (err) {
    logger.warn('Cache del failed:', err.message);
  }
}

async function cacheDelPattern(pattern) {
  if (!redisEnabled || !client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(keys);
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