import React, { useState } from 'react';
import { useZones } from '../../hooks/useZones';
import { RiskBadge } from '../UI/RiskBadge';
import { Spinner } from '../UI/Spinner';
import { useAppStore } from '../../store/useAppStore';
import { useNavigate } from 'react-router-dom';

export function ZonesTable() {
  const { data: zones, isLoading } = useZones();
  const { setSelectedZone } = useAppStore();
  const navigate = useNavigate();
  const [sort, setSort] = useState({ key: 'risk_score', dir: 'desc' });
  const [filter, setFilter] = useState('');

  const sorted = [...(zones || [])]
    .filter(z => !filter || z.commune.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      const va = a[sort.key] ?? 0;
      const vb = b[sort.key] ?? 0;
      return sort.dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const handleSort = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  const th = (label, key) => (
    <th onClick={() => handleSort(key)} style={{
      padding: '8px 12px', fontFamily: 'DM Mono', fontSize: 10,
      color: sort.key === key ? '#00C8FF' : '#8FA3BA',
      letterSpacing: '0.1em', textAlign: 'left', cursor: 'pointer',
      borderBottom: '1px solid #1A2332', whiteSpace: 'nowrap',
      userSelect: 'none',
    }}>
      {label} {sort.key === key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div style={{ background: '#111820', border: '1px solid #2E3D50', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1A2332' }}>
        <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#8FA3BA', letterSpacing: '0.1em' }}>
          TOUTES LES ZONES ({sorted.length})
        </span>
        <input
          placeholder="Rechercher une commune..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            background: '#0A0E14', border: '1px solid #2E3D50', borderRadius: 4,
            padding: '5px 10px', fontFamily: 'DM Mono', fontSize: 11, color: '#C4D1DE',
            outline: 'none', width: 200,
          }}
        />
      </div>

      {isLoading ? (
        <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {th('COMMUNE', 'commune')}
                {th('RISQUE', 'risk_level')}
                {th('SCORE IA', 'risk_score')}
                {th('PLUIE 1H', 'rainfall_1h')}
                {th('PLUIE 24H', 'rainfall_24h')}
                {th('ALTITUDE', 'elevation_avg')}
                {th('POPULATION', 'population')}
                <th style={{ padding: '8px 12px', borderBottom: '1px solid #1A2332' }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((z, i) => (
                <tr key={z.id} style={{
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  borderBottom: '1px solid #111820',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>
                  <td style={{ padding: '10px 12px', fontFamily: 'Barlow Condensed', fontSize: 16, fontWeight: 600, color: '#EEF2F7' }}>
                    {z.commune}
                  </td>
                  <td style={{ padding: '10px 12px' }}><RiskBadge level={z.risk_level} size="sm" /></td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12, color: '#C4D1DE' }}>
                    {z.risk_score ? (z.risk_score * 100).toFixed(0) + '%' : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12, color: z.rainfall_1h > 20 ? '#E8314A' : '#C4D1DE' }}>
                    {(z.rainfall_1h || 0).toFixed(1)} mm
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12, color: '#C4D1DE' }}>
                    {(z.rainfall_24h || 0).toFixed(1)} mm
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12, color: '#8FA3BA' }}>
                    {z.elevation_avg?.toFixed(0) || '—'} m
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12, color: '#8FA3BA' }}>
                    {z.population ? (z.population / 1000).toFixed(0) + 'K' : '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <button onClick={() => { setSelectedZone(z); navigate('/'); }} style={{
                      padding: '4px 10px', fontFamily: 'DM Mono', fontSize: 10,
                      color: '#00C8FF', background: 'rgba(0,200,255,0.08)',
                      border: '1px solid rgba(0,200,255,0.2)', borderRadius: 3,
                      cursor: 'pointer', letterSpacing: '0.05em',
                    }}>VOIR</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
