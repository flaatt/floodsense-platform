import React from 'react';
export function Spinner({ size = 24, color = '#00C8FF' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}
