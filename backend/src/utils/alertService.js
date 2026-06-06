/**
 * Service d'Alertes Multi-canal
 * SMS (Africa's Talking) + Email (Nodemailer) + WebSocket temps reel
 */

const AfricasTalking = require('africastalking');
const nodemailer     = require('nodemailer');
const logger         = require('./logger');
const db             = require('../config/database');
const redis          = require('../config/redis');

// ─── Initialisation Africa's Talking ─────────────────────────────
const AT = AfricasTalking({
  apiKey:   process.env.AFRICA_TALKING_API_KEY,
  username: process.env.AFRICA_TALKING_USERNAME || 'sandbox'
});
const smsService = AT.SMS;

// ─── Initialisation Nodemailer ────────────────────────────────────
const mailer = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ─── Constantes ──────────────────────────────────────────────────
const ALERT_COOLDOWN_MIN = parseInt(process.env.ALERT_COOLDOWN_MINUTES || '240');

const ALERT_TYPES = {
  1: { type: 'watch',     label_fr: 'SURVEILLANCE',   label_ln: 'TALELA' },
  2: { type: 'watch',     label_fr: 'ATTENTION',      label_ln: 'KEBA'   },
  3: { type: 'warning',   label_fr: 'ALERTE',         label_ln: 'LIKILIMBA' },
  4: { type: 'emergency', label_fr: 'URGENCE',        label_ln: 'LIKAMA MAKASI' }
};

// ─── Couleurs niveaux ─────────────────────────────────────────────
const RISK_COLORS = { 1: '#27AE60', 2: '#F39C12', 3: '#E67E22', 4: '#C0392B' };

/**
 * Verifier si une alerte peut etre envoyee (cooldown anti-spam)
 */
async function canSendAlert(zoneId) {
  const key = `alert:cooldown:zone:${zoneId}`;
  const exists = await redis.exists(key);
  return !exists;
}

/**
 * Marquer une alerte comme envoyee (pour le cooldown)
 */
async function markAlertSent(zoneId) {
  const key = `alert:cooldown:zone:${zoneId}`;
  await redis.set(key, '1', ALERT_COOLDOWN_MIN * 60);
}

/**
 * Construire les messages d'alerte bilingues FR + Lingala
 */
function buildAlertMessages(zone, prediction) {
  const alertMeta = ALERT_TYPES[prediction.risk_level];
  const prob      = Math.round(prediction.flood_probability * 100);

  const message_fr = [
    `[FloodSense] ⚠️ ${alertMeta.label_fr} INONDATION`,
    `Zone : ${zone.commune}${zone.quartier ? ' - ' + zone.quartier : ''}`,
    `Risque : ${prob}% de probabilite d'inondation`,
    `Horizon : Prochaines 24 heures`,
    prediction.recommendation,
    `Info : floodsense.cd`
  ].join('\n');

  const message_ln = [
    `[FloodSense] ⚠️ ${alertMeta.label_ln} YA MBULA`,
    `Esika : ${zone.commune}`,
    `Likama : ${prob}% na mbula makasi`,
    `Bobima bino nzoto. Talela mai.`,
    `Info : floodsense.cd`
  ].join('\n');

  return { message_fr, message_ln, alert_type: alertMeta.type };
}

/**
 * Recuperer les contacts d'une zone
 */
async function getZoneContacts(zoneId, channel = null) {
  let query = `
    SELECT id, name, role, phone, email, whatsapp, channel
    FROM contacts
    WHERE zone_id = $1 AND is_active = TRUE
  `;
  const params = [zoneId];

  if (channel) {
    query += ' AND (channel = $2 OR channel = \'all\')';
    params.push(channel);
  }

  const { rows } = await db.query(query, params);
  return rows;
}

/**
 * Envoyer des SMS via Africa's Talking
 */
async function sendSMS(phoneNumbers, message) {
  if (!process.env.AFRICA_TALKING_API_KEY) {
    logger.warn('[SMS] Cle AT non configuree — mode simulation');
    logger.info(`[SMS SIMULE] Vers: ${phoneNumbers.join(', ')}\n${message}`);
    return { success: true, simulated: true, count: phoneNumbers.length };
  }

  try {
    const result = await smsService.send({
      to:      phoneNumbers,
      message,
      from:    process.env.AFRICA_TALKING_SENDER_ID || 'FloodSense'
    });
    logger.info(`[SMS] Envoye a ${phoneNumbers.length} destinataires`);
    return { success: true, result };
  } catch (err) {
    logger.error('[SMS] Erreur envoi:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Envoyer des emails d'alerte
 */
async function sendEmail(emails, zone, prediction, messages) {
  if (!process.env.SMTP_USER) {
    logger.warn('[Email] SMTP non configure — mode simulation');
    return { success: true, simulated: true };
  }

  const riskColor = RISK_COLORS[prediction.risk_level];
  const prob = Math.round(prediction.flood_probability * 100);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${riskColor};padding:20px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">
          ⚠️ ALERTE INONDATION — FloodSense Kinshasa
        </h1>
      </div>
      <div style="background:#f8f8f8;padding:24px;border:1px solid #ddd">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:8px;font-weight:bold;color:#555">Zone</td>
            <td style="padding:8px">${zone.commune}${zone.quartier ? ' — ' + zone.quartier : ''}</td>
          </tr>
          <tr style="background:white">
            <td style="padding:8px;font-weight:bold;color:#555">Probabilite</td>
            <td style="padding:8px;font-size:24px;font-weight:bold;color:${riskColor}">${prob}%</td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;color:#555">Niveau</td>
            <td style="padding:8px">
              <span style="background:${riskColor};color:white;padding:4px 12px;border-radius:4px;font-weight:bold">
                NIVEAU ${prediction.risk_level}
              </span>
            </td>
          </tr>
          <tr style="background:white">
            <td style="padding:8px;font-weight:bold;color:#555">Recommandation</td>
            <td style="padding:8px">${prediction.recommendation}</td>
          </tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px">
          <strong>Message Lingala :</strong><br>
          <em>${messages.message_ln}</em>
        </div>
        <div style="margin-top:16px;text-align:center">
          <a href="${process.env.FRONTEND_URL}/zone/${zone.id}"
             style="background:${riskColor};color:white;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold">
            Voir la carte en temps reel →
          </a>
        </div>
      </div>
      <div style="padding:12px;text-align:center;font-size:12px;color:#999">
        FloodSense Kinshasa — GeoData for Smart Cities — Makeathon 2026
      </div>
    </div>
  `;

  try {
    await mailer.sendMail({
      from:    process.env.EMAIL_FROM || 'FloodSense <alerts@floodsense.cd>',
      to:      emails.join(', '),
      subject: `[FloodSense] ⚠️ Alerte Inondation — ${zone.commune} — Niveau ${prediction.risk_level}`,
      html
    });
    logger.info(`[Email] Envoye a ${emails.length} destinataires`);
    return { success: true };
  } catch (err) {
    logger.error('[Email] Erreur envoi:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sauvegarder l'alerte en DB
 */
async function saveAlert(zoneId, prediction, messages, recipientsCount, channel) {
  const { rows } = await db.query(`
    INSERT INTO alerts
      (zone_id, alert_type, risk_level, flood_probability,
       message_fr, message_ln, recipients_count, channel,
       status, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sent', NOW() + INTERVAL '24 hours')
    RETURNING id
  `, [
    zoneId,
    messages.alert_type,
    prediction.risk_level,
    prediction.flood_probability,
    messages.message_fr,
    messages.message_ln,
    recipientsCount,
    channel
  ]);
  return rows[0].id;
}

/**
 * Envoyer une notification WebSocket aux clients connectes
 */
function broadcastAlert(io, zone, prediction, alertId) {
  if (!io) return;

  const payload = {
    type:       'FLOOD_ALERT',
    alertId,
    zoneId:     zone.id,
    commune:    zone.commune,
    riskLevel:  prediction.risk_level,
    probability:prediction.flood_probability,
    color:      RISK_COLORS[prediction.risk_level],
    recommendation: prediction.recommendation,
    timestamp:  new Date().toISOString()
  };

  // Envoyer a tous les clients de cette zone
  io.to(`zone_${zone.id}`).emit('alert', payload);
  // Envoyer aussi a tous les admins
  io.to('admin_room').emit('alert', payload);
  logger.info(`[WebSocket] Alerte diffusee pour zone ${zone.id}`);
}

/**
 * FONCTION PRINCIPALE : Declencher une alerte complete
 * Appele quand risk_level >= ALERT_THRESHOLD
 */
async function triggerAlert(zone, prediction, io = null, forceSend = false) {
  // Verifier le cooldown (sauf si force)
  if (!forceSend && !(await canSendAlert(zone.id))) {
    logger.info(`[Alert] Cooldown actif pour zone ${zone.id} — alerte non envoyee`);
    return null;
  }

  const messages  = buildAlertMessages(zone, prediction);
  const contacts  = await getZoneContacts(zone.id);

  const phones = contacts.filter(c => c.phone).map(c => c.phone);
  const emails = contacts.filter(c => c.email).map(c => c.email);

  let totalRecipients = 0;
  const results = {};

  // Envoi SMS
  if (phones.length > 0) {
    results.sms = await sendSMS(phones, messages.message_fr);
    totalRecipients += phones.length;
  }

  // Envoi Email
  if (emails.length > 0) {
    results.email = await sendEmail(emails, zone, prediction, messages);
    totalRecipients += emails.length;
  }

  // Sauvegarder en DB
  const alertId = await saveAlert(zone.id, prediction, messages, totalRecipients, 'all');

  // Diffusion WebSocket
  broadcastAlert(io, zone, prediction, alertId);

  // Marquer le cooldown
  await markAlertSent(zone.id);

  logger.info(`[Alert] Alerte #${alertId} envoyee — Zone: ${zone.commune} — Niveau: ${prediction.risk_level} — ${totalRecipients} destinataires`);

  return { alertId, totalRecipients, results };
}

/**
 * Desactiver les alertes precedentes quand le risque redescend
 */
async function deactivateOldAlerts(zoneId) {
  await db.query(
    'UPDATE alerts SET is_active = FALSE WHERE zone_id = $1 AND is_active = TRUE',
    [zoneId]
  );
}

module.exports = {
  triggerAlert,
  buildAlertMessages,
  getZoneContacts,
  sendSMS,
  sendEmail,
  deactivateOldAlerts,
  ALERT_TYPES,
  RISK_COLORS
};
