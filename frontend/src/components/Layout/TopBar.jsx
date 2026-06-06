// ─────────────────────────────────────────────────────────────
//  TopBar — Barre supérieure avec logo + alertes + status
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSummary } from '../../hooks/useStats';
import { useActiveAlerts } from '../../hooks/useAlerts';
import { useAppStore } from '../../store/useAppStore';
import { RiskBadge } from '../UI/RiskBadge';
import { Spinner } from '../UI/Spinner';

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAppStore();
  const { data: summary, isLoading } = useSummary();
  const { data: activeAlerts } = useActiveAlerts();
  const [alertsOpen, setAlertsOpen] = useState(false);

  const criticalCount = summary?.critical_zones || 0;
  const alertCount = activeAlerts?.length || 0;

  const navLinks = [
    { to: '/',        label: 'CARTE' },
    { to: '/zones',   label: 'ZONES' },
    { to: '/alertes', label: `ALERTES${alertCount > 0 ? ` (${alertCount})` : ''}` },
  ];
  if (isAuthenticated) navLinks.push({ to: '/dashboard', label: 'DASHBOARD' });

  return (
    <header style={{
      height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      background: 'rgba(10,14,20,0.98)',
      borderBottom: '1px solid #1A2332',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
      backdropFilter: 'blur(10px)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: 'linear-gradient(135deg, #006B87, #00C8FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>🌊</div>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 700, color: '#EEF2F7', letterSpacing: '0.05em', lineHeight: 1 }}>
              FLOOD<span style={{ color: '#00C8FF' }}>SENSE</span>
            </div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: '#5D6D7E', letterSpacing: '0.15em' }}>KINSHASA</div>
          </div>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
          {navLinks.map(link => {
            const isActive = location.pathname === link.to;
            const hasAlert = link.to === '/alertes' && alertCount > 0;
            return (
              <Link key={link.to} to={link.to} style={{
                padding: '5px 12px',
                fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.08em',
                color: isActive ? '#00C8FF' : hasAlert ? '#F07B1D' : '#8FA3BA',
                background: isActive ? 'rgba(0,200,255,0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(0,200,255,0.2)' : '1px solid transparent',
                borderRadius: 4, textDecoration: 'none',
                transition: 'all 0.15s',
              }}>{link.label}</Link>
            );
          })}
        </nav>
      </div>

      {/* Right: status + auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

        {/* Live status */}
        {isLoading ? <Spinner size={16} /> : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {criticalCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px',
                background: 'rgba(232,49,74,0.1)', border: '1px solid rgba(232,49,74,0.3)',
                borderRadius: 4, animation: 'pulse-critical 2s infinite',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8314A' }} />
                <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#E8314A' }}>
                  {criticalCount} CRITIQUE{criticalCount > 1 ? 'S' : ''}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1DB954', animation: 'blink 2s infinite' }} />
              <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E' }}>LIVE</span>
            </div>
          </div>
        )}

        {/* Auth */}
        {isAuthenticated ? (
          <button onClick={() => { logout(); navigate('/'); }} style={{
            padding: '5px 12px',
            fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.08em',
            color: '#8FA3BA', background: 'transparent',
            border: '1px solid #2E3D50', borderRadius: 4, cursor: 'pointer',
          }}>DÉCONNEXION</button>
        ) : (
          <Link to="/login" style={{
            padding: '5px 12px',
            fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.08em',
            color: '#00C8FF', background: 'rgba(0,200,255,0.08)',
            border: '1px solid rgba(0,200,255,0.3)', borderRadius: 4,
            textDecoration: 'none',
          }}>ADMIN</Link>
        )}
      </div>
    </header>
  );
}
