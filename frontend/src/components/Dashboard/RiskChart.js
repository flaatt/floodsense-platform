import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import './RiskChart.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rc-tooltip">
      <p className="rct-label">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="rct-value" style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

export function RainfallChart({ data = [] }) {
  return (
    <div className="risk-chart">
      <h3 className="rc-title">Précipitations — 7 derniers jours</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="rf1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2e86de" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2e86de" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="day" tick={{ fill: '#4a6278', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
          <YAxis tick={{ fill: '#4a6278', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="max_rainfall" name="Max mm" stroke="#2e86de" fill="url(#rf1)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="avg_rainfall" name="Moy mm" stroke="#5dade2" fill="none" strokeWidth={1} dot={false} strokeDasharray="4 2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const RISK_COLORS = { 1: '#27ae60', 2: '#f39c12', 3: '#e67e22', 4: '#e74c3c' };

export function RiskDistributionChart({ data = [] }) {
  const chartData = data.map(d => ({
    level: `Niv.${d.risk_level}`,
    zones: parseInt(d.zone_count),
    pop:   parseInt(d.total_population || 0),
    color: RISK_COLORS[d.risk_level] || '#4a6278',
  }));

  return (
    <div className="risk-chart">
      <h3 className="rc-title">Distribution des risques par zone</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="level" tick={{ fill: '#4a6278', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
          <YAxis tick={{ fill: '#4a6278', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="zones" name="Zones" radius={[3, 3, 0, 0]}>
            {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
