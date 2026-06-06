// ─────────────────────────────────────────────────────────────
//  src/app.js — Configuration Express
// ─────────────────────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Routes
const zonesRouter    = require('./routes/zones.routes');
const weatherRouter  = require('./routes/weather.routes');
const predictRouter  = require('./routes/predictions.routes');
const alertsRouter   = require('./routes/alerts.routes');
const authRouter     = require('./routes/auth.routes');
const statsRouter    = require('./routes/stats.routes');
const eventsRouter   = require('./routes/events.routes');
const impactRouter   = require('./routes/impact.routes');
const incidentsRouter = require('./routes/incidents.routes');
const exportRouter   = require('./routes/export.routes');
const operationsRouter = require('./routes/operations.routes');

// Middleware custom
const { errorHandler } = require('./middleware/errorHandler');
const { notFound }     = require('./middleware/notFound');
const logger           = require('./utils/logger');

const app = express();

// ── Security ────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de requêtes. Réessayez dans 15 minutes.' }
});
app.use(limiter);

// Rate limiting strict pour les routes sensibles
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Trop de tentatives de connexion.' }
});

// ── Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ─────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) }
}));

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'FloodSense Kinshasa Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's'
  });
});

// ── Routes API ───────────────────────────────────────────────
app.use('/api/auth',        authLimiter, authRouter);
app.use('/api/zones',       zonesRouter);
app.use('/api/weather',     weatherRouter);
app.use('/api/predictions', predictRouter);
app.use('/api/alerts',      alertsRouter);
app.use('/api/stats',       statsRouter);
app.use('/api/events',      eventsRouter);
app.use('/api/impact',      impactRouter);
app.use('/api/incidents',   incidentsRouter);
app.use('/api/export',      exportRouter);
app.use('/api/operations',  operationsRouter);

// ── Error Handlers ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
