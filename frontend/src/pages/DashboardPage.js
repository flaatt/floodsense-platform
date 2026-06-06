// ─────────────────────────────────────────────────────────────
//  src/pages/DashboardPage.js — Dashboard admin
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import TopBar         from '../components/Layout/TopBar';
import KpiRow         from '../components/Dashboard/KpiRow';
import RiskTable      from '../components/Dashboard/RiskTable';
import RainfallChart  from '../components/Dashboard/RainfallChart';
import AlertCard      from '../components/Alerts/AlertCard';
import CreateAlertModal from '../components/Alerts/CreateAlertModal';
import { useZones }        from '../hooks/useZones';
import { useAllAlerts }    from '../hooks/useAlerts';
import { useDashboardStats } from '../hooks/useStats';
import { Button, EmptyState, Spinner } from '../components/UI';
import { predictionsApi } from '../services/api';
import './pages.css';

export default function DashboardPage() {
  const [showModal, setShowModal] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const { isLoading: zonesLoading } = useZones();
  const { data: alertsData, isLoading: alertsLoading } = useAllAlerts({ limit: 15 });
  const { data: statsData } = useDashboardStats();

  const recentAlerts = alertsData?.data || [];
  const stats = statsData?.data || {};

  const handleTriggerPredictions = async () => {
    if (!window.confirm('Recalculer toutes les prédictions IA maintenant ?')) return;
    setTriggering(true);
    try {
      await predictionsApi.trigger();
      alert('Prédictions recalculées avec succès!');
    } catch {
      alert('Erreur lors du recalcul');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="page-dashboard">
      <TopBar />

      <main className="dashboard-main">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title font-display">Centre de Commande</h1>
            <p className="dash-subtitle">FloodSense Kinshasa — Vue en temps réel</p>
          </div>
          <div className="dash-actions">
            <Button variant="secondary" loading={triggering} onClick={handleTriggerPredictions} size="sm">
              ⚡ Forcer recalcul IA
            </Button>
            <Button variant="primary" onClick={() => setShowModal(true)} size="sm">
              + Créer alerte
            </Button>
          </div>
        </div>

        {/* KPI */}
        <KpiRow />

        {/* Main grid */}
        <div className="dash-grid">
          {/* Left column */}
          <div className="dash-col-main">
            {/* Table zones */}
            {zonesLoading ? <div className="dash-loading"><Spinner /></div> : <RiskTable />}

            {/* Charts */}
            <div className="dash-charts-row">
              <RainfallChart />
              {/* Flood history bar chart */}
              <FloodHistoryWidget stats={stats} />
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="dash-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <h3 className="sidebar-section-title font-display">Alertes récentes</h3>
                {recentAlerts.length > 0 && (
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {recentAlerts.length} total
                  </span>
                )}
              </div>
              {alertsLoading ? (
                <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
              ) : recentAlerts.length === 0 ? (
                <EmptyState icon="✅" title="Aucune alerte" message="Tout est normal pour le moment" />
              ) : (
                <div className="alerts-list">
                  {recentAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
                </div>
              )}
            </div>

            {/* Risk distribution */}
            <RiskDistributionWidget stats={stats} />
          </aside>
        </div>
      </main>

      {showModal && <CreateAlertModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// Mini widget distribution risques
function RiskDistributionWidget({ stats }) {
  const dist = stats.risk_distribution || [];
  const COLORS = { 1: 'var(--risk-1)', 2: 'var(--risk-2)', 3: 'var(--risk-3)', 4: 'var(--risk-4)' };
  const LABELS = { 1: 'Faible', 2: 'Modéré', 3: 'Élevé', 4: 'Critique' };
  const total = dist.reduce((s, d) => s + parseInt(d.zone_count), 0) || 1;

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-header">
        <h3 className="sidebar-section-title font-display">Distribution des risques</h3>
      </div>
      <div className="risk-dist">
        {dist.filter(d => d.risk_level > 0).map(d => (
          <div key={d.risk_level} className="rd-row">
            <span className="rd-label" style={{ color: COLORS[d.risk_level] }}>
              {LABELS[d.risk_level] || `Niv.${d.risk_level}`}
            </span>
            <div className="rd-bar-track">
              <div className="rd-bar-fill"
                   style={{ width: `${(parseInt(d.zone_count) / total) * 100}%`, background: COLORS[d.risk_level] }} />
            </div>
            <span className="rd-count font-mono">{d.zone_count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloodHistoryWidget({ stats }) {
  const events = stats.recent_events || [];
  const SEV_COLOR = { catastrophic: 'var(--risk-4)', severe: 'var(--risk-3)', moderate: 'var(--risk-2)', minor: 'var(--risk-1)' };

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3 className="chart-title font-display">Événements récents</h3>
        <span className="chart-subtitle">5 derniers enregistrements confirmés</span>
      </div>
      {events.length === 0 ? (
        <EmptyState icon="📅" title="Aucun événement récent" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', minWidth: 50 }}>
                {new Date(ev.event_date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
              </span>
              <span style={{ fontWeight: 700, color: SEV_COLOR[ev.severity] || 'var(--text-dim)', fontSize: 10, minWidth: 80 }}>
                {ev.severity}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{ev.commune}</span>
              {ev.deaths > 0 && <span style={{ color: 'var(--risk-4)', fontSize: 10 }}>☠ {ev.deaths}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
