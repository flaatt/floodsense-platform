import React, { useState } from 'react';
import { useZonesStore } from '../../store/zonesStore';
import { RiskBadge, RiskBar } from '../UI';
import { formatNumber, timeAgo } from '../../utils/format';

export default function RiskTable() {
  const zones = useZonesStore(s => s.zones);
  const [sort, setSort] = useState({ key: 'risk_score', dir: 'desc' });

  const sorted = [...zones].sort((a, b) => {
    const va = a[sort.key] || 0;
    const vb = b[sort.key] || 0;
    return sort.dir === 'desc' ? vb - va : va - vb;
  });

  const toggleSort = (key) => setSort(s =>
    s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }
  );

  const Th = ({ label, sortKey }) => (
    <th className={`rt-th ${sort.key === sortKey ? 'active' : ''}`}
        onClick={() => sortKey && toggleSort(sortKey)}>
      {label} {sort.key === sortKey ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>
  );

  return (
    <div className="risk-table-wrap">
      <div className="rt-header">
        <h3 className="rt-title font-display">Zones — État en temps réel</h3>
        <span className="rt-count font-mono">{zones.length} zones</span>
      </div>
      <div className="rt-scroll">
        <table className="risk-table">
          <thead>
            <tr>
              <Th label="Commune"    sortKey="commune" />
              <Th label="Risque"     sortKey="risk_level" />
              <Th label="Score IA"   sortKey="risk_score" />
              <Th label="Pluie 1h"   sortKey="rainfall_1h" />
              <Th label="Pluie 24h"  sortKey="rainfall_24h" />
              <Th label="Population" sortKey="population" />
              <Th label="MAJ" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(z => (
              <tr key={z.id} className={`rt-row ${z.risk_level >= 4 ? 'row-critical' : ''}`}>
                <td className="rt-commune">
                  <span className="font-display">{z.commune}</span>
                  {z.quartier && <span className="rt-quartier">{z.quartier}</span>}
                </td>
                <td><RiskBadge level={z.risk_level} size="sm" pulse={z.risk_level >= 3} /></td>
                <td className="rt-score">
                  <RiskBar score={z.risk_score} level={z.risk_level} />
                </td>
                <td className="font-mono rt-rain">
                  {z.rainfall_1h != null ? `${z.rainfall_1h.toFixed(1)} mm` : '—'}
                </td>
                <td className="font-mono rt-rain">
                  {z.rainfall_24h != null ? `${z.rainfall_24h.toFixed(1)} mm` : '—'}
                </td>
                <td className="font-mono">{formatNumber(z.population)}</td>
                <td className="rt-time">{timeAgo(z.last_updated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
