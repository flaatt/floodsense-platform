// ─────────────────────────────────────────────────────────────
//  RiskBadge — Badge visuel du niveau de risque
// ─────────────────────────────────────────────────────────────
import React from 'react';

const RISK_CONFIG = {
  0: { label: 'INCONNU',   color: '#8FA3BA', bg: 'rgba(143,163,186,0.12)', dot: '#8FA3BA' },
  1: { label: 'FAIBLE',    color: '#1DB954', bg: 'rgba(29,185,84,0.12)',   dot: '#1DB954' },
  2: { label: 'MODÉRÉ',    color: '#F5C542', bg: 'rgba(245,197,66,0.12)',  dot: '#F5C542' },
  3: { label: 'ÉLEVÉ',     color: '#F07B1D', bg: 'rgba(240,123,29,0.12)', dot: '#F07B1D' },
  4: { label: 'CRITIQUE',  color: '#E8314A', bg: 'rgba(232,49,74,0.12)',  dot: '#E8314A' },
};

export function RiskBadge({ level = 0, size = 'md', showDot = true, pulse = false }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG[0];
  const sizes = {
    sm: { fontSize: '10px', padding: '2px 6px', dotSize: '5px' },
    md: { fontSize: '11px', padding: '3px 8px', dotSize: '6px' },
    lg: { fontSize: '13px', padding: '5px 12px', dotSize: '8px' },
  };
  const s = sizes[size];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontFamily: 'DM Mono, monospace', fontWeight: 500,
      fontSize: s.fontSize, padding: s.padding,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}40`,
      borderRadius: '3px', letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
    }}>
      {showDot && (
        <span style={{
          width: s.dotSize, height: s.dotSize,
          borderRadius: '50%', background: cfg.color,
          flexShrink: 0, display: 'inline-block',
          animation: (pulse && level >= 3) ? 'pulse-critical 2s infinite' : 'none',
        }} />
      )}
      {cfg.label}
    </span>
  );
}

export function RiskGauge({ score = 0 }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.75 ? '#E8314A'
              : score >= 0.50 ? '#F07B1D'
              : score >= 0.25 ? '#F5C542'
              : '#1DB954';

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: '#8FA3BA' }}>PROBABILITÉ</span>
        <span style={{ fontFamily: 'DM Mono', fontSize: '13px', fontWeight: 500, color }}>{pct}%</span>
      </div>
      <div style={{ height: '4px', background: '#243040', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: '2px',
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
    </div>
  );
}

export function getRiskColor(level) {
  return RISK_CONFIG[level]?.color || RISK_CONFIG[0].color;
}

export function getRiskFill(level) {
  const alpha = level >= 3 ? '99' : level >= 2 ? '77' : '55';
  return (RISK_CONFIG[level]?.color || '#8FA3BA') + alpha;
}
