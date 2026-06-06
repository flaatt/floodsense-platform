import React, { useState } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { RiskBadge } from '../components/UI/RiskBadge';
import { Spinner } from '../components/UI/Spinner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const ALERT_COLORS = {
  watch:     { text: '#F5C542', bg: 'rgba(245,197,66,0.06)', label: '⚠️ SURVEILLANCE' },
  warning:   { text: '#F07B1D', bg: 'rgba(240,123,29,0.06)', label: '🟠 AVERTISSEMENT' },
  emergency: { text: '#E8314A', bg: 'rgba(232,49,74,0.08)',  label: '🔴 URGENCE' },
};

export function AlertesPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAlerts({ alert_type: typeFilter || undefined, page, limit: 25 });

  const alerts = data?.data || [];
  const total  = data?.total || 0;

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: 40, fontWeight: 700, color: '#EEF2F7' }}>ALERTES</h1>
          <p style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#8FA3BA', marginTop: 6 }}>
            {total} alertes enregistrées
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'watch', 'warning', 'emergency'].map(t => (
            <button key={t || 'all'} onClick={() => { setTypeFilter(t); setPage(1); }} style={{
              padding: '6px 12px', fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.08em',
              color: typeFilter === t ? '#00C8FF' : '#8FA3BA',
              background: typeFilter === t ? 'rgba(0,200,255,0.08)' : '#111820',
              border: `1px solid ${typeFilter === t ? 'rgba(0,200,255,0.3)' : '#2E3D50'}`,
              borderRadius: 4, cursor: 'pointer',
            }}>
              {t === '' ? 'TOUT' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={40} /></div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ fontFamily: 'DM Mono', fontSize: 13, color: '#1DB954' }}>Aucune alerte trouvée</p>
        </div>
      ) : (
        <div>
          {alerts.map(alert => {
            const cfg = ALERT_COLORS[alert.alert_type] || ALERT_COLORS.watch;
            return (
              <div key={alert.id} style={{
                background: cfg.bg, borderLeft: `4px solid ${cfg.text}`,
                border: `1px solid ${cfg.text}30`,
                borderRadius: '0 8px 8px 0', padding: '16px 20px', marginBottom: 12,
                animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: cfg.text, letterSpacing: '0.1em' }}>{cfg.label}</span>
                    <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 700, color: '#EEF2F7', marginTop: 2 }}>
                      {alert.commune || 'Zone inconnue'}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <RiskBadge level={alert.risk_level} size="sm" />
                    <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E', marginTop: 4 }}>
                      {format(parseISO(alert.sent_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                    </div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E', marginTop: 2 }}>
                      {alert.sent_by === 'system' ? '🤖 Automatique' : `👤 ${alert.sent_by}`}
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#C4D1DE', lineHeight: 1.7, margin: 0 }}>
                  {alert.message_fr}
                </p>
                {alert.recipients_count > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E' }}>
                      📨 {alert.recipients_count} destinataire{alert.recipients_count > 1 ? 's' : ''}
                    </span>
                    {alert.channels?.map(ch => (
                      <span key={ch} style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E' }}>
                        · {ch.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {total > 25 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', fontFamily: 'DM Mono', fontSize: 11, color: '#8FA3BA', background: '#111820', border: '1px solid #2E3D50', borderRadius: 4, cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← PRÉCÉDENT</button>
              <span style={{ padding: '6px 14px', fontFamily: 'DM Mono', fontSize: 11, color: '#5D6D7E' }}>{page} / {Math.ceil(total / 25)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 25)} style={{ padding: '6px 14px', fontFamily: 'DM Mono', fontSize: 11, color: '#8FA3BA', background: '#111820', border: '1px solid #2E3D50', borderRadius: 4, cursor: 'pointer', opacity: page >= Math.ceil(total / 25) ? 0.4 : 1 }}>SUIVANT →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
