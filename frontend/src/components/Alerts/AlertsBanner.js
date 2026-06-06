import React from 'react';
import { useAlertsStore } from '../../store/alertsStore';
import { timeAgo } from '../../utils/format';
import './alerts.css';

const ALERT_STYLES = {
  emergency: { bg: 'rgba(229,62,62,0.12)', border: 'rgba(229,62,62,0.4)', color: '#e53e3e', icon: '🚨', label: 'URGENCE' },
  warning:   { bg: 'rgba(224,124,58,0.12)', border: 'rgba(224,124,58,0.4)', color: '#e07c3a', icon: '⚠️', label: 'AVERTISSEMENT' },
  watch:     { bg: 'rgba(214,158,46,0.10)', border: 'rgba(214,158,46,0.3)', color: '#d69e2e', icon: '👁', label: 'SURVEILLANCE' },
};

export default function AlertsBanner() {
  const activeAlerts = useAlertsStore(s => s.getActiveAlerts());
  const critical = activeAlerts.filter(a => a.alert_type === 'emergency');

  if (critical.length === 0) return null;

  return (
    <div className="alerts-banner">
      {critical.slice(0, 3).map(alert => {
        const sty = ALERT_STYLES[alert.alert_type] || ALERT_STYLES.watch;
        return (
          <div key={alert.id} className="alert-banner-item"
               style={{ background: sty.bg, borderColor: sty.border }}>
            <span className="ab-icon">{sty.icon}</span>
            <div className="ab-content">
              <span className="ab-label font-mono" style={{ color: sty.color }}>{sty.label}</span>
              <span className="ab-commune">{alert.commune}</span>
              <span className="ab-time font-mono">{timeAgo(alert.sent_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
