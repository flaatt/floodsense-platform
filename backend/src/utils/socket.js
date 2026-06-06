// ─────────────────────────────────────────────────────────────
//  src/utils/socket.js — WebSocket avec Socket.io
//  Broadcast temps réel vers le frontend
// ─────────────────────────────────────────────────────────────
const { Server } = require('socket.io');
const logger = require('./logger');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connecté: ${socket.id}`);

    socket.on('subscribe:zone', (zoneId) => {
      socket.join(`zone:${zoneId}`);
      logger.info(`Client ${socket.id} souscrit zone ${zoneId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket déconnecté: ${socket.id}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io non initialisé');
  return io;
}

// Émettre une mise à jour de risque à tous les clients
function emitRiskUpdate(zoneId, data) {
  if (!io) return;
  io.to(`zone:${zoneId}`).emit('risk:update', data);
  io.emit('zones:update', { zoneId, ...data }); // broadcast global
}

// Émettre une nouvelle alerte
function emitAlert(alert) {
  if (!io) return;
  io.emit('alert:new', alert);
  if (alert.zone_id) {
    io.to(`zone:${alert.zone_id}`).emit('alert:zone', alert);
  }
}

module.exports = { initSocket, getIo, emitRiskUpdate, emitAlert };
