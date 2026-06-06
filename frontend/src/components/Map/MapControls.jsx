import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const LAYERS = [
  { id: 'risk',      label: 'RISQUE',     icon: '⚠️' },
  { id: 'rainfall',  label: 'PLUIE',      icon: '🌧️' },
  { id: 'elevation', label: 'ALTITUDE',   icon: '⛰️' },
];

export function MapControls() {
  const { activeLayer, setActiveLayer } = useAppStore();

  return (
    <div style={{
      position: 'absolute', top: 16, left: 16, zIndex: 500,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      {LAYERS.map((l) => (
        <button key={l.id} onClick={() => setActiveLayer(l.id)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px',
          background: activeLayer === l.id ? 'rgba(0,200,255,0.15)' : 'rgba(17,24,32,0.92)',
          border: activeLayer === l.id ? '1px solid #00C8FF' : '1px solid #2E3D50',
          borderRadius: 4, cursor: 'pointer',
          color: activeLayer === l.id ? '#00C8FF' : '#C4D1DE',
          fontFamily: 'DM Mono, monospace', fontSize: 11,
          letterSpacing: '0.08em', transition: 'all 0.2s',
          backdropFilter: 'blur(8px)',
        }}>
          <span>{l.icon}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}
