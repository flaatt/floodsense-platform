import React from 'react';
import { ALERT_TYPE, timeAgo } from '../../utils/risk';
import './AlertFeed.css';

export default function AlertFeed({ alerts = [], compact = false, onAcknowledge }) {
  if (alerts.length === 0) {
    return <div className="af-empty">Aucune alerte active</div>;
  }

  return (
    <div className={`alert-feed ${compact ? 'compact' : ''}`}>
      {alerts.map(alert => {
        const type = ALERT_TYPE[alert.alert_type] || ALERT_TYPE.watch;
        return (
          <div key={alert.id} className={`alert-item alt-${alert.alert_type}`}>
            <div className="ali-icon">{type.icon}</div>
            <div className="ali-body">
              <div className="ali-header">
                <span className="ali-commune">{alert.commune || 'Kinshasa'}</span>
                <span className="ali-type" style={{ color: type.color }}>{type.label}</span>
              </div>
              {!compact && <p className="ali-message">{alert.message_fr}</p>}
              <div className="ali-meta">
                <span className="ali-time">{timeAgo(alert.sent_at)}</span>
                {alert.channels && (
                  <span className="ali-channels">{(alert.channels || []).join(' · ')}</span>
                )}
                {alert.recipients_count > 0 && (
                  <span className="ali-rec">{alert.recipients_count} dest.</span>
                )}
              </div>
            </div>
            {onAcknowledge && !alert.acknowledged && (
              <button className="ali-ack" onClick={() => onAcknowledge(alert.id)} title="Accusé de réception">✓</button>
            )}
            {alert.acknowledged && <span className="ali-acked" title="Accusé de réception">✓</span>}
          </div>
        );
      })}
    </div>
  );
}
