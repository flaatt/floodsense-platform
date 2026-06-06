// ─────────────────────────────────────────────────────────────
//  AlertsFeed — Flux d'alertes actives
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { useActiveAlerts } from '../../hooks/useAlerts';
import { RiskBadge } from '../UI/RiskBadge';
import { Spinner } from '../UI/Spinner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const ALERT_COLORS = {
  watch:     { text: '#F5C542', bg: 'rgba(245,197,66,0.06)', border: 'rgba(245,197,66,0.2)', label: '⚠️ SURVEILLANCE' },
  warning:   { text: '#F07B1D', bg: 'rgba(240,123,29,0.06)', border: 'rgba(240,123,29,0.2)', label: '🟠 AVERTISSEMENT' },
  emergency: { text: '#E8314A', bg: 'rgba(232,49,74,0.08)',  border: 'rgba(232,49,74,0.25)', label: '🔴 URGENCE' },
};

function AlertItem({ alert, compact = false }) {
  const cfg = ALERT_COLORS[alert.alert_type] || ALERT_COLORS.watch;
  const timeAgo = format(parseISO(alert.sent_at), 'HH:mm', { locale: fr });

  if (compact) {
    return (
      <div style={{
        padding: '10px 14px', borderLeft: `3px solid ${cfg.text}`,
        background: cfg.bg, borderRadius: '0 4px 4px 0',
        marginBottom: 6, animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: cfg.text, letterSpacing: '0.08em' }}>{cfg.label}</span>
          <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E' }}>{timeAgo}</span>
        </div>
        <div style={{ fontFamily: 'Barlow Condensed', fontSize: 16, fontWeight: 600, color: '#EEF2F7' }}>
          {alert.commune || 'Zone inconnue'}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.text}`,
      background: cfg.bg, borderRadius: '0 8px 8px 0', padding: '16px 18px',
      marginBottom: 10, animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: cfg.text, letterSpacing: '0.1em', marginBottom: 4 }}>
            {cfg.label}
          </div>
          <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 700, color: '#EEF2F7' }}>
            {alert.commune || 'Zone inconnue'}
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <RiskBadge level={alert.risk_level} size="sm" />
          <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E', marginTop: 4 }}>
            {format(parseISO(alert.sent_at), 'dd/MM à HH:mm')}
          </div>
        </div>
      </div>
      <p style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#C4D1DE', lineHeight: 1.6, margin: 0 }}>
        {alert.message_fr}
      </p>
      {alert.recipients_count > 0 && (
        <div style={{ marginTop: 10, fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E' }}>
          Envoyé à {alert.recipients_count} destinataire{alert.recipients_count > 1 ? 's' : ''}
          {' · '}
          {alert.channels?.join(', ')}
        </div>
      )}
    </div>
  );
}

export function AlertsFeed({ compact = false }) {
  const { data: alerts, isLoading, error } = useActiveAlerts();

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
      <Spinner color="#F07B1D" />
    </div>
  );

  if (error) return (
    <p style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#E8314A', padding: '12px 0' }}>
      Erreur chargement alertes
    </p>
  );

  if (!alerts?.length) return (
    <div style={{
      padding: '20px 14px', textAlign: 'center',
      border: '1px dashed #2E3D50', borderRadius: 6,
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
      <p style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#1DB954' }}>AUCUNE ALERTE ACTIVE</p>
      <p style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E', marginTop: 4 }}>Toutes les zones sont sous contrôle</p>
    </div>
  );

  return (
    <div>
      {compact && (
        <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: '#5D6D7E', letterSpacing: '0.12em', marginBottom: 10 }}>
          ALERTES ACTIVES (24H) — {alerts.length}
        </div>
      )}
      {alerts.map(a => <AlertItem key={a.id} alert={a} compact={compact} />)}
    </div>
  );
}
