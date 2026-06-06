import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { useDashboard } from '../../hooks/useStats';
import { Spinner } from '../UI/Spinner';

const RISK_COLORS = ['#1DB954', '#F5C542', '#F07B1D', '#E8314A'];
const RISK_LABELS = ['Faible', 'Modéré', 'Élevé', 'Critique'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111820', border: '1px solid #2E3D50', borderRadius: 4, padding: '8px 12px' }}>
      <p style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#C4D1DE', margin: 0 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: 'DM Mono', fontSize: 11, color: p.color || '#00C8FF', margin: '3px 0 0' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

export function RiskDistributionChart() {
  const { data, isLoading } = useDashboard();

  if (isLoading) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

  const chartData = (data?.risk_distribution || []).map(d => ({
    name: RISK_LABELS[d.risk_level - 1] || `Niveau ${d.risk_level}`,
    zones: parseInt(d.zone_count),
    population: Math.round(d.total_population / 1000),
    level: d.risk_level,
  }));

  return (
    <div style={{ background: '#111820', border: '1px solid #2E3D50', borderRadius: 8, padding: '16px 20px' }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#8FA3BA', letterSpacing: '0.1em', marginBottom: 16 }}>
        DISTRIBUTION DES NIVEAUX DE RISQUE
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} barSize={32}>
          <XAxis dataKey="name" tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: '#8FA3BA' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: '#8FA3BA' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="zones" radius={[3, 3, 0, 0]} name="Zones">
            {chartData.map((entry, i) => (
              <Cell key={i} fill={RISK_COLORS[entry.level - 1] || '#8FA3BA'} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RainfallTrendChart() {
  const { data, isLoading } = useDashboard();
  if (isLoading) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

  const chartData = (data?.rainfall_trend || []).map(d => ({
    day: d.day?.slice(5, 10).replace('-', '/'),
    max: parseFloat(d.max_rainfall || 0).toFixed(1),
    avg: parseFloat(d.avg_rainfall || 0).toFixed(2),
  }));

  return (
    <div style={{ background: '#111820', border: '1px solid #2E3D50', borderRadius: 8, padding: '16px 20px' }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#8FA3BA', letterSpacing: '0.1em', marginBottom: 16 }}>
        PRÉCIPITATIONS — 7 DERNIERS JOURS (mm/h)
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="maxGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00C8FF" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#00C8FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: '#8FA3BA' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: '#8FA3BA' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="max" name="Max" stroke="#00C8FF" strokeWidth={2} fill="url(#maxGrad)" dot={false} />
          <Area type="monotone" dataKey="avg" name="Moy" stroke="#8FA3BA" strokeWidth={1} strokeDasharray="4 2" fill="none" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
