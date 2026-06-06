import React from 'react';
import { useAcknowledgeAlert } from '../../hooks/useAlerts';
import { useAuthStore } from '../../store/authStore';
import { RiskBadge } from '../UI';
import { formatDate, ALERT_TYPE_LABELS } from '../../utils/format';
import './alerts.css';

const ALERT_CONFIG = {
  emergency: { color: '#e53e3e', bg: 'rgba(229,62,62,0.08)', icon: '🚨' },
  warning:   { color: '#e07c3a', bg: 'rgba(224,124,58,0.08)', icon: '⚠️' },
  watch:     { color: '#d69e2e', bg: 'rgba(214,158,46,0.08)', icon: '👁️' },
};

export default function AlertCard({ alert }) {
  const cfg        = ALERT_CONFIG[alert.alert_type] || ALERT_CONFIG.watch;
  const user       = useAuthStore(s => s.user);
  const { mutate, isPending } = useAcknowledgeAlert();

  return (
    <div className={`alert-card ${alert.acknowledged ? 'acknowledged' : ''}`}
         style={{ borderColor: cfg.color + '44', background: cfg.bg }}>
      {/* Header */}
      <div className="ac-header">
        <div className="ac-type" style={{ color: cfg.color }}>
          <span>{cfg.icon}</span>
          <span className="font-mono">{ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}</span>
        </div>
        <div className="ac-meta">
          {alert.risk_level && <RiskBadge level={alert.risk_level} size="sm" />}
          {alert.acknowledged && (
            <span className="ac-ack-badge">✓ Accusé</span>
          )}
        </div>
      </div>

      {/* Infos */}
      <div className="ac-commune font-display">{alert.commune || `Zone #${alert.zone_id}`}</div>
      <div className="ac-message">{alert.message_fr}</div>

      {/* Footer */}
      <div className="ac-footer">
        <div className="ac-footer-left">
          <span className="font-mono ac-time">{formatDate(alert.sent_at)}</span>
          {alert.recipients_count > 0 && (
            <span className="ac-recipients">• {alert.recipients_count} destinataire{alert.recipients_count > 1 ? 's' : ''}</span>
          )}
          {alert.channels?.length > 0 && (
            <span className="ac-channels">{alert.channels.join(', ')}</span>
          )}
        </div>
        {user && !alert.acknowledged && (
          <button
            className="ac-ack-btn"
            onClick={() => mutate(alert.id)}
            disabled={isPending}
          >
            {isPending ? '...' : 'Accuser réception'}
          </button>
        )}
      </div>
    </div>
  );
}
