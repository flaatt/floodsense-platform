// ─────────────────────────────────────────────────────────────
//  src/app.js — Configuration Express
// ─────────────────────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Routes
const zonesRouter = require('./routes/zones.routes');
const weatherRouter = require('./routes/weather.routes');
const predictRouter = require('./routes/predictions.routes');
const alertsRouter = require('./routes/alerts.routes');
const authRouter = require('./routes/auth.routes');
const statsRouter = require('./routes/stats.routes');
const eventsRouter = require('./routes/events.routes');
const impactRouter = require('./routes/impact.routes');
const incidentsRouter = require('./routes/incidents.routes');
const exportRouter = require('./routes/export.routes');
const operationsRouter = require('./routes/operations.routes');

// Middleware custom
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');
const logger = require('./utils/logger');

const app = express();

// ─────────────────────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// ─────────────────────────────────────────────────────────────
// CORS CONFIGURATION
// ─────────────────────────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:3000',
  'https://floodsense-platform.vercel.app',
  'https://floodsense-platform-o4q7.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Autorise Postman, Render Health Checks, curl
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`⛔ CORS bloqué pour origin : ${origin}`);

      return callback(
        new Error(`Origin non autorisée par CORS : ${origin}`)
      );
    },
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  })
);

// ─────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Trop de requêtes. Réessayez dans 15 minutes.',
  },
});

app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Trop de tentatives de connexion.',
  },
});

// ─────────────────────────────────────────────────────────────
// PARSING
// ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
// LOGGING
// ─────────────────────────────────────────────────────────────

app.use(
  morgan('combined', {
    stream: {
      write: (msg) => logger.http(msg.trim()),
    },
  })
);

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    app: 'FloodSense Kinshasa Backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRouter);

app.use('/api/zones', zonesRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/predictions', predictRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/impact', impactRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/export', exportRouter);
app.use('/api/operations', operationsRouter);

// ─────────────────────────────────────────────────────────────
// ROOT ENDPOINT
// ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'FloodSense Operational API',
    version: '2.0.0',
    status: 'online',
    documentation: '/health',
  });
});

// ─────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

module.exports = app;