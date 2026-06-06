import { create } from 'zustand';

export const RISK_CONFIG = {
  0: { label: 'Inconnu',   color: '#4a5568', bg: 'rgba(74,85,104,0.15)',  hex: '#4a5568' },
  1: { label: 'Faible',    color: '#38a169', bg: 'rgba(56,161,105,0.15)', hex: '#38a169' },
  2: { label: 'Modéré',    color: '#d69e2e', bg: 'rgba(214,158,46,0.15)', hex: '#d69e2e' },
  3: { label: 'Élevé',     color: '#e07c3a', bg: 'rgba(224,124,58,0.18)', hex: '#e07c3a' },
  4: { label: 'Critique',  color: '#e53e3e', bg: 'rgba(229,62,62,0.18)',  hex: '#e53e3e' },
};

export const useZonesStore = create((set, get) => ({
  zones: [],
  selectedZone: null,
  filter: { risk_level: null, commune: '' },

  setZones: (zones) => set({ zones }),

  updateZoneRisk: (zoneId, update) => set(state => ({
    zones: state.zones.map(z =>
      z.id === zoneId ? { ...z, ...update, last_updated: new Date().toISOString() } : z
    )
  })),

  setSelectedZone: (zone) => set({ selectedZone: zone }),
  clearSelectedZone: ()   => set({ selectedZone: null }),

  setFilter: (filter) => set(state => ({ filter: { ...state.filter, ...filter } })),

  getFilteredZones: () => {
    const { zones, filter } = get();
    return zones.filter(z => {
      if (filter.risk_level !== null && z.risk_level !== filter.risk_level) return false;
      if (filter.commune && !z.commune.toLowerCase().includes(filter.commune.toLowerCase())) return false;
      return true;
    });
  },

  getSummary: () => {
    const zones = get().zones;
    return {
      total:    zones.length,
      critical: zones.filter(z => z.risk_level === 4).length,
      high:     zones.filter(z => z.risk_level === 3).length,
      medium:   zones.filter(z => z.risk_level === 2).length,
      low:      zones.filter(z => z.risk_level === 1).length,
      pop_at_risk: zones.filter(z => z.risk_level >= 3)
                        .reduce((s, z) => s + (parseInt(z.population) || 0), 0),
    };
  }
}));
