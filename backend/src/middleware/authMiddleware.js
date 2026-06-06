/**
 * Middleware d'authentification JWT
 */

const jwt    = require('jsonwebtoken');
const db     = require('../config/database');
const logger = require('../utils/logger');

/**
 * Verifier le token JWT dans le header Authorization
 * Usage dans les routes : router.get('/protected', auth, controller)
 */
const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verifier que l'utilisateur existe encore en DB
    const { rows } = await db.query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, error: 'Utilisateur inactif ou supprime' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expire — veuillez vous reconnecter' });
    }
    logger.error('Auth middleware error:', err.message);
    return res.status(401).json({ success: false, error: 'Token invalide' });
  }
};

/**
 * Verifier le role (utiliser apres auth)
 * Usage : router.post('/admin', auth, requireRole('admin'), controller)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: `Acces refuse. Role requis: ${roles.join(' ou ')}`
    });
  }
  next();
};

/**
 * Middleware optionnel : n'echoue pas si pas de token
 * Utile pour des routes publiques qui beneficient du contexte user
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, email, name, role FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );
    if (rows.length) req.user = rows[0];
  } catch { /* ignore */ }
  next();
};

module.exports = { auth, requireRole, optionalAuth };
