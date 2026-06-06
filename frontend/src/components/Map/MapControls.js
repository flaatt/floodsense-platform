import React from 'react';
import { useMap } from 'react-leaflet';
import { useZonesStore } from '../../store/zonesStore';
import './map.css';

export default function MapControls() {
  const map         = useMap();
  const setFilter   = useZonesStore(s => s.setFilter);
  const filter      = useZonesStore(s => s.filter);
  const clearFilter = () => setFilter({ risk_level: null, commune: '' });

  const RISK_OPTIONS = [
    { label: 'Tous',      value: null },
    { label: '🟢 Faible',  value: 1 },
    { label: '🟡 Modéré', value: 2 },
    { label: '🟠 Élevé',  value: 3 },
    { label: '🔴 Critique',value: 4 },
  ];

  return (
    <div className="map-controls">
      {/* Recherche commune */}
      <input
        type="text"
        className="mc-search"
        placeholder="🔍 Chercher une commune..."
        value={filter.commune}
        onChange={e => setFilter({ commune: e.target.value })}
      />

      {/* Filtre par risque */}
      <div className="mc-risk-filters">
        {RISK_OPTIONS.map(opt => (
          <button
            key={String(opt.value)}
            className={`mc-risk-btn ${filter.risk_level === opt.value ? 'active' : ''}`}
            onClick={() => setFilter({ risk_level: opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Recentrer */}
      <button className="mc-center-btn" onClick={() => map.setView([-4.325, 15.322], 11)}>
        ⊕ Recentrer
      </button>
    </div>
  );
}
