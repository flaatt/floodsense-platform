// ─────────────────────────────────────────────────────────────
//  src/pages/AlertsPage.js — Page publique des alertes
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import TopBar    from '../components/Layout/TopBar';
import AlertCard from '../components/Alerts/AlertCard';
import { useAllAlerts }   from '../hooks/useAlerts';
import { useAlertsStore } from '../store/alertsStore';
import { Button, EmptyState, Spinner, Select } from '../components/UI';
import './pages.css';

export default function AlertsPage() {
  const [filter, setFilter] = useState({ alert_type: '', page: 1 });
  const clearUnread = useAlertsStore(s => s.clearUnread);

  const { data, isLoading, refetch } = useAllAlerts({
    alert_type: filter.alert_type || undefined,
    limit: 20,
    page: filter.page
  });

  const alerts = data?.data || [];
  const total  = data?.total || 0;

  // Clear badge au mount
  React.useEffect(() => { clearUnread(); }, [clearUnread]);

  return (
    <div className="page-alerts">
      <TopBar />

      <main className="alerts-main">
        <div className="alerts-page-header">
          <div>
            <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800 }}>Centre d'alertes</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {total} alerte{total > 1 ? 's' : ''} au total — Kinshasa, RDC
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select value={filter.alert_type} onChange={e => setFilter(f => ({ ...f, alert_type: e.target.value, page: 1 }))}>
              <option value="">Tous les types</option>
              <option value="emergency">🚨 Urgence</option>
              <option value="warning">⚠️ Avertissement</option>
              <option value="watch">👁️ Surveillance</option>
            </Select>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>↻ Actualiser</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="alerts-loading"><Spinner size={32} /></div>
        ) : alerts.length === 0 ? (
          <EmptyState icon="✅" title="Aucune alerte" message="Aucune alerte ne correspond à vos critères" />
        ) : (
          <div className="alerts-grid">
            {alerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="alerts-pagination">
            <Button variant="ghost" size="sm" disabled={filter.page <= 1}
                    onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))}>← Préc.</Button>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Page {filter.page} / {Math.ceil(total / 20)}
            </span>
            <Button variant="ghost" size="sm" disabled={filter.page >= Math.ceil(total / 20)}
                    onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))}>Suiv. →</Button>
          </div>
        )}
      </main>
    </div>
  );
}
