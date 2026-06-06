import React from 'react';
import { useZones } from '../hooks/useZones';
import { RiskBadge, RiskGauge } from '../components/UI/RiskBadge';
import { Spinner } from '../components/UI/Spinner';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

export function ZonesPage() {
  const { data: zones, isLoading } = useZones();
  const { setSelectedZone } = useAppStore();
  const navigate = useNavigate();

  const handleViewOnMap = (zone) => {
    setSelectedZone(zone);
    navigate('/');
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: 40, fontWeight: 700, letterSpacing: '0.02em', color: '#EEF2F7' }}>
          ZONES SURVEILLÉES
        </h1>
        <p style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#8FA3BA', marginTop: 6 }}>
          {zones?.length || 0} communes de Kinshasa — mise à jour toutes les heures
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={40} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {zones?.map(zone => (
            <div key={zone.id} style={{
              background: '#111820', border: '1px solid #1A2332',
              borderTop: `2px solid ${zone.risk_level >= 4 ? '#E8314A' : zone.risk_level >= 3 ? '#F07B1D' : zone.risk_level >= 2 ? '#F5C542' : '#1DB954'}`,
              borderRadius: 6, padding: '16px 18px',
              animation: 'fadeIn 0.4s ease',
              cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
            }}
            onClick={() => handleViewOnMap(zone)}
            onMouseEnter={e => e.currentTarget.style.background = '#1A2332'}
            onMouseLeave={e => e.currentTarget.style.background = '#111820'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 700, color: '#EEF2F7' }}>
                  {zone.commune}
                </h3>
                <RiskBadge level={zone.risk_level} pulse />
              </div>

              <RiskGauge score={zone.risk_score || 0} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <InfoLine label="PLUIE 1H" value={`${(zone.rainfall_1h || 0).toFixed(1)} mm`} />
                <InfoLine label="TEMP." value={`${(zone.temperature || 0).toFixed(0)}°C`} />
                <InfoLine label="ALTITUDE" value={`${zone.elevation_avg?.toFixed(0) || '—'} m`} />
                <InfoLine label="POPULATION" value={zone.population ? (zone.population / 1000).toFixed(0) + 'K' : '—'} />
              </div>

              {zone.last_recommendation && (
                <p style={{
                  fontFamily: 'DM Mono', fontSize: 11, color: '#8FA3BA',
                  marginTop: 12, lineHeight: 1.5, borderTop: '1px solid #1A2332', paddingTop: 10,
                }}>
                  {zone.last_recommendation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: '#5D6D7E', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: '#C4D1DE', marginTop: 2 }}>{value}</div>
    </div>
  );
}
