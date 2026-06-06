// ─────────────────────────────────────────────────────────────
//  src/middleware/auth.js — JWT Authentication
// ─────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token d\'authentification manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expirée. Reconnectez-vous.' });
    }
    return res.status(401).json({ success: false, error: 'Token invalide' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Non authentifié' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Accès refusé. Rôles requis: ${roles.join(', ')}`
      });
    }
    next();
  };
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch { /* ignore */ }
  next();
}

module.exports = { authenticate, requireRole, optionalAuth };
