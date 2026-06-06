// ─────────────────────────────────────────────────────────────
//  src/controllers/auth.controller.js
// ─────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1 AND active = TRUE', [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logger.warn(`Tentative de connexion échouée pour: ${email}`);
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Mettre à jour last_login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    logger.info(`Connexion réussie: ${user.email} (${user.role})`);
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });

  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, username, email, role, last_login, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ success: false, error: 'Le mot de passe doit avoir au moins 8 caractères' });
    }

    const { rows } = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(current_password, rows[0].password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Mot de passe actuel incorrect' });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (err) { next(err); }
};
