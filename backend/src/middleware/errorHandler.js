// ─────────────────────────────────────────────────────────────
//  src/middleware/errorHandler.js
// ─────────────────────────────────────────────────────────────
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`${err.name}: ${err.message}`, { url: req.url, stack: err.stack });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, error: err.message, details: err.details });
  }
  if (err.name === 'UnauthorizedError' || err.message === 'jwt expired') {
    return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
  }
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({ success: false, error: 'Cette ressource existe déjà' });
  }
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({ success: false, error: 'Référence invalide' });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Erreur interne du serveur'
    : err.message;

  res.status(status).json({ success: false, error: message });
}

module.exports = { errorHandler };
