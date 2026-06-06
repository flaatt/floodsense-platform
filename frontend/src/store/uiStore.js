import { create } from 'zustand';

export const useUiStore = create((set) => ({
  sidebarOpen: false,
  activeLayers: { risk: true, roads: false, health: false, refuges: false },

  setSidebarOpen:  (open)    => set({ sidebarOpen: open }),
  toggleSidebar:   ()        => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  toggleLayer:     (layer)   => set(s => ({
    activeLayers: { ...s.activeLayers, [layer]: !s.activeLayers[layer] }
  })),
}));
