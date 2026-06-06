import React from 'react';
import { useZonesStore } from '../../store/zonesStore';
import { useSummary } from '../../hooks/useStats';
import { StatCard } from '../UI';
import { formatNumber } from '../../utils/format';

export default function KpiRow() {
  const summary = useZonesStore(s => s.getSummary());
  const { data: serverSummary } = useSummary();
  const s = serverSummary?.data || {};

  const kpis = [
    { icon: '🔴', label: 'Zones critiques', value: summary.critical, accent: 'var(--risk-4)', sub: 'Niveau 4', delay: 0 },
    { icon: '🟠', label: 'Zones élevées',   value: summary.high,     accent: 'var(--risk-3)', sub: 'Niveau 3', delay: 80 },
    { icon: '👥', label: 'Habitants à risque', value: formatNumber(summary.pop_at_risk), accent: 'var(--cyan)', sub: 'Niveaux 3+4', delay: 160 },
    { icon: '⚡', label: 'Alertes 24h',     value: s.alerts_24h || 0, accent: '#d69e2e', sub: 'Envoyées', delay: 240 },
    { icon: '📅', label: 'Événements/30j',  value: s.events_30d || 0, accent: '#7fa8c9', sub: 'Confirmés', delay: 320 },
    { icon: '🗺️', label: 'Zones totales',   value: summary.total,    accent: '#4a5568', sub: 'Kinshasa', delay: 400 },
  ];

  return (
    <div className="kpi-row">
      {kpis.map((k, i) => (
        <StatCard key={i} icon={k.icon} label={k.label} value={k.value}
                  sub={k.sub} accent={k.accent} delay={k.delay} />
      ))}
    </div>
  );
}
