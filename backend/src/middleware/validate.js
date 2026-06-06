// ─────────────────────────────────────────────────────────────
//  src/middleware/validate.js — Validation Joi
// ─────────────────────────────────────────────────────────────
const Joi = require('joi');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const details = error.details.map(d => d.message);
      return res.status(400).json({ success: false, error: 'Validation échouée', details });
    }
    req[property] = value;
    next();
  };
}

// Schémas réutilisables
const schemas = {
  login: Joi.object({
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  createAlert: Joi.object({
    zone_id:    Joi.number().integer().required(),
    alert_type: Joi.string().valid('watch','warning','emergency').required(),
    message_fr: Joi.string().min(10).max(500).required(),
    message_ln: Joi.string().max(500),
    channels:   Joi.array().items(Joi.string().valid('sms','whatsapp','email','web')).default(['web'])
  }),

  reportEvent: Joi.object({
    zone_id:    Joi.number().integer().required(),
    event_date: Joi.date().iso().max('now').required(),
    severity:   Joi.string().valid('minor','moderate','severe','catastrophic').required(),
    deaths:     Joi.number().integer().min(0).default(0),
    displaced:  Joi.number().integer().min(0).default(0),
    notes:      Joi.string().max(1000),
    source:     Joi.string().max(200)
  }),

  pagination: Joi.object({
    page:  Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  })
};

module.exports = { validate, schemas };
