// ─────────────────────────────────────────────────────────────
//  src/services/alertService.js
//  Gestion et envoi des alertes multi-canal
// ─────────────────────────────────────────────────────────────
const { query, transaction } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');
const { emitAlert } = require('../utils/socket');
const logger = require('../utils/logger');

// ── SMS via Africa's Talking ─────────────────────────────────
function getATClient() {
  const AfricasTalking = require('africastalking');
  return AfricasTalking({
    apiKey: process.env.AFRICA_TALKING_API_KEY,
    username: process.env.AFRICA_TALKING_USERNAME || 'sandbox'
  });
}

const ALERT_LABELS = {
  watch:     '⚠️  SURVEILLANCE',
  warning:   '🟠 AVERTISSEMENT',
  emergency: '🔴 URGENCE CRITIQUE'
};

const RISK_LABELS = {
  1: 'FAIBLE',
  2: 'MODÉRÉ',
  3: 'ÉLEVÉ',
  4: 'CRITIQUE'
};

// Vérifier si on peut envoyer une alerte (anti-spam 4h)
async function canSendAlert(zoneId, alertType) {
  const cacheKey = `alert:cooldown:${zoneId}:${alertType}`;
  const recent = await cacheGet(cacheKey);
  return !recent;
}

async function markAlertSent(zoneId, alertType) {
  const cacheKey = `alert:cooldown:${zoneId}:${alertType}`;
  await cacheSet(cacheKey, true, 4 * 3600); // cooldown 4 heures
}

// Construire le message d'alerte
function buildAlertMessage(zone, prediction, lang = 'fr') {
  if (lang === 'fr') {
    return [
      `[FloodSense] ${ALERT_LABELS[getAlertType(prediction.risk_level)]}`,
      `Zone: ${zone.commune}`,
      `Risque inondation: ${RISK_LABELS[prediction.risk_level]}`,
      `Probabilité: ${Math.round(prediction.flood_probability * 100)}%`,
      `${prediction.recommendation}`,
      `Mis à jour: ${new Date().toLocaleTimeString('fr-FR')}`
    ].join('\n');
  } else { // Lingala
    return [
      `[FloodSense] LIKILIMBA`,
      `Esika: ${zone.commune}`,
      `Likama ya mbula: ${RISK_LABELS[prediction.risk_level]}`,
      `Bobima nzoto na bino mpe bana na bino!`
    ].join('\n');
  }
}

function getAlertType(riskLevel) {
  if (riskLevel >= 4) return 'emergency';
  if (riskLevel >= 3) return 'warning';
  return 'watch';
}

// Envoyer SMS
async function sendSMS(phones, message) {
  if (!process.env.AFRICA_TALKING_API_KEY) {
    logger.warn('Africa\'s Talking API key manquante. SMS simulé.');
    logger.info(`[SMS SIMULÉ] -> ${phones.join(', ')}\n${message}`);
    return { success: true, simulated: true };
  }

  try {
    const at = getATClient();
    const result = await at.SMS.send({
      to: phones,
      message,
      from: 'FloodSense'
    });
    logger.info(`SMS envoyé à ${phones.length} destinataires`);
    return result;
  } catch (err) {
    logger.error('Erreur envoi SMS:', err.message);
    return { success: false, error: err.message };
  }
}

// Envoyer Email
async function sendEmail(emails, subject, html) {
  const nodemailer = require('nodemailer');
  if (!process.env.EMAIL_HOST) {
    logger.warn('Email config manquante. Email simulé.');
    return { success: true, simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  try {
    await transporter.sendMail({
      from: '"FloodSense Kinshasa" <alerts@floodsense.cd>',
      to: emails.join(', '),
      subject,
      html
    });
    return { success: true };
  } catch (err) {
    logger.error('Erreur envoi email:', err.message);
    return { success: false, error: err.message };
  }
}

// Fonction principale : créer et envoyer une alerte
async function createAndSendAlert({ zone, prediction, channels = ['web'], sentBy = 'system' }) {
  const alertType = getAlertType(prediction.risk_level);

  // Anti-spam check
  const canSend = await canSendAlert(zone.id, alertType);
  if (!canSend) {
    logger.info(`Alerte ${alertType} pour ${zone.commune} ignorée (cooldown actif)`);
    return null;
  }

  const messageFr = buildAlertMessage(zone, prediction, 'fr');
  const messageLn = buildAlertMessage(zone, prediction, 'ln');

  return await transaction(async (client) => {
    // 1. Sauvegarder l'alerte en DB
    const alertResult = await client.query(`
      INSERT INTO alerts (zone_id, alert_type, risk_level, message_fr, message_ln, channels, sent_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [zone.id, alertType, prediction.risk_level, messageFr, messageLn,
        channels, sentBy]);

    const alert = alertResult.rows[0];
    let recipientsCount = 0;

    // 2. Récupérer les contacts de la zone
    const contacts = await client.query(
      'SELECT * FROM contacts WHERE zone_id = $1 AND active = TRUE', [zone.id]
    );

    // 3. Envoyer selon les canaux
    if (channels.includes('sms') && contacts.rows.length > 0) {
      const phones = contacts.rows.filter(c => c.phone).map(c => c.phone);
      if (phones.length > 0) {
        await sendSMS(phones, messageFr);
        recipientsCount += phones.length;
      }
    }

    if (channels.includes('email') && contacts.rows.length > 0) {
      const emails = contacts.rows.filter(c => c.email).map(c => c.email);
      if (emails.length > 0) {
        const subject = `${ALERT_LABELS[alertType]} — ${zone.commune}`;
        const html = `<pre>${messageFr}</pre>`;
        await sendEmail(emails, subject, html);
        recipientsCount += emails.length;
      }
    }

    // 4. Web push via Socket.io (toujours)
    emitAlert({ ...alert, commune: zone.commune });
    recipientsCount += 1; // compter les clients web connectés

    // 5. Mettre à jour le count en DB
    await client.query(
      'UPDATE alerts SET recipients_count = $1 WHERE id = $2',
      [recipientsCount, alert.id]
    );

    // 6. Marquer le cooldown
    await markAlertSent(zone.id, alertType);

    logger.info(`✅ Alerte [${alertType}] envoyée pour ${zone.commune} - ${recipientsCount} destinataires`);
    return { ...alert, recipients_count: recipientsCount };
  });
}

// Escalade automatique selon le niveau de risque
async function processRiskAlert(zone, prediction) {
  if (prediction.risk_level < 2) return null; // Pas d'alerte niveau 1

  let channels = ['web'];
  if (prediction.risk_level >= 3) channels = ['web', 'email'];
  if (prediction.risk_level >= 4) channels = ['web', 'email', 'sms'];

  return createAndSendAlert({ zone, prediction, channels });
}

module.exports = {
  createAndSendAlert,
  processRiskAlert,
  buildAlertMessage,
  getAlertType,
  sendSMS,
};
