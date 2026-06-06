// ─────────────────────────────────────────────────────────────
//  src/components/UI/index.js — Design System Components
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { RISK_CONFIG } from '../../store/zonesStore';
import { RISK_LABELS } from '../../utils/format';
import './ui.css';

// ── RiskBadge ─────────────────────────────────────────────────
export function RiskBadge({ level, size = 'md', pulse = false }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG[0];
  const sizeClass = size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : 'badge-md';
  return (
    <span className={`risk-badge ${sizeClass} ${pulse && level >= 3 ? 'badge-pulse' : ''}`}
          style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '55' }}>
      {level >= 3 && <span className="badge-dot" style={{ background: cfg.color }} />}
      {RISK_LABELS[level] || 'Inconnu'}
    </span>
  );
}

// ── RiskBar ───────────────────────────────────────────────────
export function RiskBar({ score = 0, level }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG[0];
  const pct = Math.round((score || 0) * 100);
  return (
    <div className="risk-bar-wrap">
      <div className="risk-bar-track">
        <div className="risk-bar-fill"
             style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})` }} />
      </div>
      <span className="risk-bar-label font-mono" style={{ color: cfg.color }}>{pct}%</span>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, accent, delay = 0 }) {
  return (
    <div className="stat-card animate-fade-in-up"
         style={{ animationDelay: `${delay}ms`, borderColor: accent ? accent + '44' : undefined }}>
      {icon && <div className="stat-icon" style={{ color: accent || 'var(--cyan)' }}>{icon}</div>}
      <div className="stat-value font-display" style={{ color: accent || 'var(--cyan)' }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, disabled, onClick, className = '', ...props }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="btn-spinner" />}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, error, icon, ...props }) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrap">
        {icon && <span className="input-icon">{icon}</span>}
        <input className={`input-field ${icon ? 'input-has-icon' : ''} ${error ? 'input-error' : ''}`}
               {...props} />
      </div>
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <select className="input-field select-field" {...props}>
        {children}
      </select>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 24, color = 'var(--cyan)' }) {
  return (
    <svg className="spinner-svg" width={size} height={size} viewBox="0 0 24 24"
         style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" fill="none"
              stroke={color} strokeWidth="2" strokeDasharray="31 63" />
    </svg>
  );
}

// ── Loading Screen ────────────────────────────────────────────
export function LoadingScreen({ message = 'Chargement...' }) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo font-display">FS</div>
        <Spinner size={32} />
        <p className="text-secondary">{message}</p>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, message }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {message && <div className="empty-message">{message}</div>}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────
export function Tooltip({ children, content }) {
  return (
    <div className="tooltip-wrap">
      {children}
      <div className="tooltip-box">{content}</div>
    </div>
  );
}
