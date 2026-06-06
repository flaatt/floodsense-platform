// ─────────────────────────────────────────────────────────────
//  src/store/useAppStore.js — Zustand global state
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // ── Auth ────────────────────────────────────────────────
  user:  null,
  token: localStorage.getItem('fs_token') || null,
  isAuthenticated: !!localStorage.getItem('fs_token'),

  login: (user, token) => {
    localStorage.setItem('fs_token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('fs_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  // ── Selected zone (carte) ────────────────────────────────
  selectedZone: null,
  setSelectedZone: (zone) => set({ selectedZone: zone }),

  // ── Active alerts ────────────────────────────────────────
  activeAlerts: [],
  addAlert: (alert) => set((state) => ({
    activeAlerts: [alert, ...state.activeAlerts].slice(0, 50)
  })),
  clearAlerts: () => set({ activeAlerts: [] }),

  // ── Live risk updates (from WebSocket) ───────────────────
  riskUpdates: {},
  setRiskUpdate: (zoneId, data) => set((state) => ({
    riskUpdates: { ...state.riskUpdates, [zoneId]: data }
  })),

  // ── UI state ─────────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  activeLayer: 'risk',  // 'risk' | 'rainfall' | 'elevation'
  setActiveLayer: (layer) => set({ activeLayer: layer }),

  mapView: { center: [-4.322, 15.322], zoom: 11 },
  setMapView: (view) => set({ mapView: view }),
}));
