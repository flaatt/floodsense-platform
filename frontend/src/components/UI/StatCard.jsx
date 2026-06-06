import React from 'react';
import { Spinner } from './Spinner';

export function StatCard({ label, value, sub, icon, color = '#00C8FF', loading = false }) {
  return (
    <div style={{
      background: 'var(--ink-2)',
      border: 'var(--border)',
      borderTop: `2px solid ${color}`,
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: '6px',
      animation: 'fadeIn 0.4s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontFamily: 'DM Mono', fontSize: '10px',
          color: 'var(--mist)', letterSpacing: '0.1em', textTransform: 'uppercase'
        }}>{label}</span>
        {icon && <span style={{ fontSize: '18px', opacity: 0.7 }}>{icon}</span>}
      </div>
      {loading ? <Spinner size={20} color={color} /> : (
        <span style={{
          fontFamily: 'Barlow Condensed', fontSize: '32px',
          fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.02em'
        }}>{value ?? '—'}</span>
      )}
      {sub && <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'var(--mist)' }}>{sub}</span>}
    </div>
  );
}
