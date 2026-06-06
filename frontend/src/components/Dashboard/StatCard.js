import React from 'react';
import './StatCard.css';

export default function StatCard({ label, value, sub, icon, color = 'var(--accent)', trend, pulse }) {
  return (
    <div className={`stat-card-d ${pulse ? 'stat-pulse' : ''}`} style={{ '--card-color': color }}>
      <div className="scd-header">
        <span className="scd-icon">{icon}</span>
        {trend !== undefined && (
          <span className={`scd-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="scd-value">{value}</div>
      <div className="scd-label">{label}</div>
      {sub && <div className="scd-sub">{sub}</div>}
    </div>
  );
}
