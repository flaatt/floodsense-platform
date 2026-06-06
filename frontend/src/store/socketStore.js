import { create } from 'zustand';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  lastAlert: null,

  connect: () => {
    if (get().socket?.connected) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      set({ connected: true });
    });
    socket.on('disconnect', () => {
      set({ connected: false });
    });
    socket.on('alert:new', (alert) => {
      set({ lastAlert: alert });
      const emoji = alert.risk_level >= 4 ? '🔴' : alert.risk_level >= 3 ? '🟠' : '⚠️';
      toast(`${emoji} ${alert.commune} — ${alert.alert_type.toUpperCase()}`, {
        duration: 8000,
        style: { borderColor: alert.risk_level >= 4 ? '#e74c3c' : '#e67e22' }
      });
    });
    socket.on('zones:update', (update) => {
      // Déclencher un refresh des zones via un event custom
      window.dispatchEvent(new CustomEvent('zones:refresh', { detail: update }));
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, connected: false });
  },

  subscribeToZone: (zoneId) => {
    get().socket?.emit('subscribe:zone', zoneId);
  },
}));
