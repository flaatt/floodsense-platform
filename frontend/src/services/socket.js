// ─────────────────────────────────────────────────────────────
//  src/services/socket.js — WebSocket client
// ─────────────────────────────────────────────────────────────
import { io } from 'socket.io-client';
import { useZonesStore }  from '../store/zonesStore';
import { useAlertsStore } from '../store/alertsStore';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
let socket = null;

export function initSocket() {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connecté:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.warn('🔌 WebSocket déconnecté:', reason);
  });

  // Mise à jour risque d'une zone
  socket.on('zones:update', ({ zoneId, risk_level, risk_score, recommendation }) => {
    useZonesStore.getState().updateZoneRisk(zoneId, { risk_level, risk_score, recommendation });
  });

  // Nouvelle alerte
  socket.on('alert:new', (alert) => {
    useAlertsStore.getState().addAlert(alert);

    // Notification navigateur si disponible
    if (Notification.permission === 'granted' && alert.alert_type !== 'watch') {
      new Notification(`⚠️ FloodSense — ${alert.commune}`, {
        body: alert.message_fr?.slice(0, 120),
        icon: '/favicon.ico',
      });
    }
  });

  return socket;
}

export function subscribeToZone(zoneId) {
  socket?.emit('subscribe:zone', zoneId);
}

export function getSocket() { return socket; }
