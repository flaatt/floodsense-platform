import React from 'react';
import { StatCard } from '../UI/StatCard';
import { useSummary } from '../../hooks/useStats';

export function KpiRow() {
  const { data, isLoading } = useSummary();
  const d = data || {};

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
      <StatCard label="ZONES CRITIQUES"   value={d.critical_zones}   sub="risque niveau 4"     icon="🔴" color="#E8314A" loading={isLoading} />
      <StatCard label="ZONES À RISQUE"    value={d.high_risk_zones}  sub="niveaux 3 & 4"       icon="🟠" color="#F07B1D" loading={isLoading} />
      <StatCard label="POPULATION EXP."   value={d.population_at_risk ? Math.round(d.population_at_risk / 1000) + 'K' : '—'} sub="habitants en zone à risque" icon="👥" color="#F5C542" loading={isLoading} />
      <StatCard label="ALERTES (24H)"     value={d.alerts_24h}       sub="notifications envoyées" icon="📡" color="#00C8FF" loading={isLoading} />
      <StatCard label="TOTAL ZONES"       value={d.total_zones}      sub="communes surveillées"  icon="🗺️" color="#1DB954" loading={isLoading} />
    </div>
  );
}
