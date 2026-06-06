import React, { useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { RISK_CONFIG } from '../../store/zonesStore';

// Leaflet custom control via useEffect
export default function MapLegend() {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: 'bottomleft' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = `
        <div class="legend-title">NIVEAU DE RISQUE</div>
        ${Object.entries(RISK_CONFIG)
          .filter(([k]) => k > 0)
          .map(([k, v]) => `
            <div class="legend-item">
              <span class="legend-dot" style="background:${v.hex}"></span>
              <span class="legend-label">${v.label}</span>
            </div>
          `).join('')}
        <div class="legend-divider"></div>
        <div class="legend-item">
          <span class="legend-line"></span>
          <span class="legend-label">Frontière</span>
        </div>
      `;
      return div;
    };

    legend.addTo(map);
    return () => legend.remove();
  }, [map]);

  return null;
}
