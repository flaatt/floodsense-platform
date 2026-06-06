// ─────────────────────────────────────────────────────────────
//  MapPage — Page principale avec la carte
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { FloodMap } from '../components/Map/FloodMap';
import { AlertsFeed } from '../components/Alerts/AlertsFeed';
import { useActiveAlerts } from '../hooks/useAlerts';

export function MapPage() {
  const { data: alerts } = useActiveAlerts();
  const hasAlerts = alerts?.length > 0;

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Main map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <FloodMap />
      </div>

      {/* Alerts sidebar (visible seulement si alertes actives) */}
      {hasAlerts && (
        <div style={{
          width: 300, background: '#0A0E14',
          borderLeft: '1px solid #1A2332',
          overflowY: 'auto', padding: '16px 14px',
          flexShrink: 0,
          animation: 'slideRight 0.3s ease',
        }}>
          <div style={{
            fontFamily: 'DM Mono', fontSize: 9, color: '#E8314A',
            letterSpacing: '0.15em', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#E8314A', display: 'inline-block',
              animation: 'pulse-critical 2s infinite',
            }} />
            ALERTES EN COURS
          </div>
          <AlertsFeed compact />
        </div>
      )}
    </div>
  );
}
