import { create } from 'zustand';

export const useAlertsStore = create((set, get) => ({
  alerts: [],
  unreadCount: 0,

  setAlerts: (alerts) => set({ alerts }),

  addAlert: (alert) => set(state => ({
    alerts: [alert, ...state.alerts].slice(0, 50),
    unreadCount: state.unreadCount + 1,
  })),

  clearUnread: () => set({ unreadCount: 0 }),

  getActiveAlerts: () =>
    get().alerts.filter(a => {
      const age = Date.now() - new Date(a.sent_at).getTime();
      return age < 24 * 60 * 60 * 1000; // moins de 24h
    }),
}));
