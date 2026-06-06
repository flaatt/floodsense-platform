// ─────────────────────────────────────────────────────────────
//  DashboardPage — Dashboard administrateur
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { KpiRow } from '../components/Dashboard/KpiRow';
import { RiskDistributionChart, RainfallTrendChart } from '../components/Dashboard/RiskChart';
import { ZonesTable } from '../components/Dashboard/ZonesTable';
import { AlertsFeed } from '../components/Alerts/AlertsFeed';
import { CreateAlertForm } from '../components/Dashboard/CreateAlertForm';
import { useAppStore } from '../store/useAppStore';
import { predictionsAPI } from '../services/api';
import toast from 'react-hot-toast';

export function DashboardPage() {
  const { isAuthenticated } = useAppStore();
  const [triggering, setTriggering] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontFamily: 'Barlow Condensed', fontSize: 28, color: '#EEF2F7', marginBottom: 8 }}>ACCÈS RESTREINT</h2>
          <p style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#8FA3BA' }}>Connectez-vous pour accéder au dashboard.</p>
          <a href="/login" style={{
            display: 'inline-block', marginTop: 20, padding: '10px 24px',
            fontFamily: 'Barlow Condensed', fontSize: 16, fontWeight: 600,
            color: '#0A0E14', background: '#00C8FF', borderRadius: 4, textDecoration: 'none',
          }}>SE CONNECTER</a>
        </div>
      </div>
    );
  }

  const handleTriggerPredictions = async () => {
    setTriggering(true);
    try {
      const r = await predictionsAPI.trigger({});
      toast.success(`✅ ${r.data.message}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du déclenchement');
    } finally {
      setTriggering(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'VUE D\'ENSEMBLE' },
    { id: 'zones',    label: 'ZONES' },
    { id: 'alerts',   label: 'ALERTES' },
  ];

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: 36, fontWeight: 700, color: '#EEF2F7', letterSpacing: '0.02em' }}>
            OPERATIONS CENTER
          </h1>
          <p style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#5D6D7E', marginTop: 4 }}>
            FloodSense Kinshasa — Vue administrative
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E' }}>
            Prochain recalcul IA: dans ~{60 - new Date().getMinutes()}min
          </div>
          <button onClick={handleTriggerPredictions} disabled={triggering} style={{
            padding: '8px 16px', fontFamily: 'Barlow Condensed', fontSize: 14, fontWeight: 600, letterSpacing: '0.05em',
            color: '#00C8FF', background: 'rgba(0,200,255,0.08)',
            border: '1px solid rgba(0,200,255,0.3)', borderRadius: 4, cursor: triggering ? 'not-allowed' : 'pointer',
            opacity: triggering ? 0.6 : 1, transition: 'all 0.2s',
          }}>
            {triggering ? '⏳ CALCUL...' : '🔄 FORCER RECALCUL IA'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #1A2332', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 16px', fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.08em',
            color: activeTab === t.id ? '#00C8FF' : '#8FA3BA',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === t.id ? '2px solid #00C8FF' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <KpiRow />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <RiskDistributionChart />
            <RainfallTrendChart />
          </div>
        </div>
      )}

      {activeTab === 'zones' && <ZonesTable />}

      {activeTab === 'alerts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20 }}>
          <AlertsFeed />
          <CreateAlertForm />
        </div>
      )}
    </div>
  );
}
