import React, { useState } from 'react';
import { getRiskConfig, formatNumber, formatProbability } from '../../utils/risk';
import './ZoneTable.css';

export default function ZoneTable({ zones, onSelectZone }) {
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const sorted = [...zones].sort((a, b) => {
    const va = a[sortBy] ?? 0, vb = b[sortBy] ?? 0;
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const Th = ({ col, label }) => (
    <th className={`zt-th ${sortBy === col ? 'active' : ''}`} onClick={() => handleSort(col)}>
      {label} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="zone-table-wrap">
      <div className="zt-header">
        <h3 className="zt-title">Toutes les zones — {zones.length} communes</h3>
      </div>
      <div className="zt-scroll">
        <table className="zone-table">
          <thead>
            <tr>
              <Th col="commune"     label="Commune" />
              <Th col="risk_level"  label="Risque" />
              <Th col="risk_score"  label="Score IA" />
              <Th col="rainfall_1h" label="Pluie 1h" />
              <Th col="population"  label="Population" />
              <th className="zt-th">Mise à jour</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(zone => {
              const risk = getRiskConfig(zone.risk_level);
              return (
                <tr key={zone.id} className="zt-row" onClick={() => onSelectZone?.(zone)}>
                  <td className="zt-td zt-commune">{zone.commune}</td>
                  <td className="zt-td">
                    <span className="zt-risk-badge" style={{ color: risk.color, borderColor: risk.border, background: risk.bg }}>
                      {risk.emoji} {risk.label}
                    </span>
                  </td>
                  <td className="zt-td zt-mono">{formatProbability(zone.risk_score)}</td>
                  <td className="zt-td zt-mono">{(zone.rainfall_1h || 0).toFixed(1)} mm</td>
                  <td className="zt-td zt-mono">{formatNumber(zone.population)}</td>
                  <td className="zt-td zt-muted">
                    {zone.last_updated ? new Date(zone.last_updated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
