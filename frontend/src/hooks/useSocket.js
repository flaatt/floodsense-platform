// ─────────────────────────────────────────────────────────────
//  src/hooks/useSocket.js — WebSocket temps réel
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/useAppStore';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

let socket = null;

export function useSocket() {
  const { addAlert, setRiskUpdate } = useAppStore();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connecté:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Déconnecté');
    });

    // Réception d'une nouvelle alerte
    socket.on('alert:new', (alert) => {
      addAlert(alert);
      const level = alert.alert_type;
      const icon = level === 'emergency' ? '🔴' : level === 'warning' ? '🟠' : '⚠️';
      toast(
        `${icon} ${alert.commune || 'Zone'} — ${alert.alert_type.toUpperCase()}`,
        {
          duration: 6000,
          style: {
            background: level === 'emergency' ? '#7A0F1E' : '#3d2106',
            color: '#EEF2F7',
            border: `1px solid ${level === 'emergency' ? '#E8314A' : '#F07B1D'}`,
            fontFamily: 'DM Mono, monospace',
            fontSize: '13px',
          },
        }
      );
    });

    // Mise à jour du risque d'une zone
    socket.on('zones:update', (data) => {
      setRiskUpdate(data.zoneId, data);
    });

    return () => {
      if (socket) socket.disconnect();
      connectedRef.current = false;
    };
  }, [addAlert, setRiskUpdate]);

  return socket;
}
