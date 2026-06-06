import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useZonesStore } from '../../store/zonesStore';
import { useAlertsStore } from '../../store/alertsStore';
import { useAuthStore } from '../../store/authStore';
import { timeAgo } from '../../utils/format';
import './topbar.css';

export default function TopBar() {
  const location    = useLocation();
  const summary     = useZonesStore(s => s.getSummary());
  const unread      = useAlertsStore(s => s.unreadCount);
  const clearUnread = useAlertsStore(s => s.clearUnread);
  const user        = useAuthStore(s => s.user);
  const logout      = useAuthStore(s => s.logout);

  const nav = [
    { path: '/',       label: 'Carte' },
    { path: '/alerts', label: 'Alertes', badge: unread },
    ...(user ? [{ path: '/admin', label: 'Dashboard' }] : []),
  ];

  return (
    <header className="topbar">
      {/* Logo */}
      <div className="topbar-brand">
        <div className="topbar-logo">
          <span className="logo-icon">◉</span>
          <span className="logo-text font-display">FloodSense</span>
          <span className="logo-city">Kinshasa</span>
        </div>
        {/* Status bar */}
        {summary.critical > 0 && (
          <div className="topbar-critical-badge">
            <span className="critical-dot" />
            {summary.critical} zone{summary.critical > 1 ? 's' : ''} critique{summary.critical > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Stats rapides */}
      <div className="topbar-stats">
        <div className="topbar-stat" title="Zones critiques">
          <span className="ts-dot" style={{ background: 'var(--risk-4)' }} />
          <span className="ts-val font-mono" style={{ color: 'var(--risk-4)' }}>{summary.critical}</span>
          <span className="ts-lbl">Critique</span>
        </div>
        <div className="topbar-stat" title="Zones élevées">
          <span className="ts-dot" style={{ background: 'var(--risk-3)' }} />
          <span className="ts-val font-mono" style={{ color: 'var(--risk-3)' }}>{summary.high}</span>
          <span className="ts-lbl">Élevé</span>
        </div>
        <div className="topbar-stat" title="Population à risque élevé/critique">
          <span className="ts-dot" style={{ background: 'var(--cyan)' }} />
          <span className="ts-val font-mono" style={{ color: 'var(--cyan)' }}>
            {summary.pop_at_risk >= 1000
              ? `${(summary.pop_at_risk / 1000).toFixed(0)}K`
              : summary.pop_at_risk}
          </span>
          <span className="ts-lbl">Habitants</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="topbar-nav">
        {nav.map(({ path, label, badge }) => (
          <Link key={path}
                to={path}
                onClick={() => badge && clearUnread()}
                className={`topbar-link ${location.pathname === path ? 'active' : ''}`}>
            {label}
            {badge > 0 && <span className="nav-badge">{badge}</span>}
          </Link>
        ))}
      </nav>

      {/* Auth */}
      <div className="topbar-auth">
        {user ? (
          <div className="topbar-user">
            <span className="user-name">{user.username}</span>
            <span className="user-role">{user.role}</span>
            <button className="btn-logout" onClick={logout}>Déconnexion</button>
          </div>
        ) : (
          <Link to="/login" className="topbar-login-btn">Connexion</Link>
        )}
      </div>
    </header>
  );
}
