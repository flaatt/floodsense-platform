import React from 'react';

const RISK_ITEMS = [
  { color: '#1DB954', label: 'FAIBLE'   },
  { color: '#F5C542', label: 'MODÉRÉ'  },
  { color: '#F07B1D', label: 'ÉLEVÉ'   },
  { color: '#E8314A', label: 'CRITIQUE' },
];

const RAIN_ITEMS = [
  { color: '#1DB954', label: '< 5 mm/h'  },
  { color: '#F5C542', label: '5-15 mm/h'  },
  { color: '#F07B1D', label: '15-30 mm/h' },
  { color: '#E8314A', label: '> 30 mm/h'  },
];

export function MapLegend({ activeLayer }) {
  const items = activeLayer === 'rainfall' ? RAIN_ITEMS : RISK_ITEMS;
  const title = activeLayer === 'rainfall' ? 'PLUIE (mm/h)' : 'NIVEAU DE RISQUE';

  return (
    <div style={{
      position: 'absolute', bottom: 52, right: 16, zIndex: 500,
      background: 'rgba(17,24,32,0.92)', backdropFilter: 'blur(8px)',
      border: '1px solid #2E3D50', borderRadius: 6, padding: '10px 14px',
      minWidth: 140,
    }}>
      <div style={{
        fontFamily: 'DM Mono', fontSize: 9, color: '#8FA3BA',
        letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase'
      }}>{title}</div>
      {items.map((item) => (
        <div key={item.label} style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: 2,
            background: item.color + '99',
            border: `1px solid ${item.color}`,
            flexShrink: 0,
          }} />
          <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#C4D1DE' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
