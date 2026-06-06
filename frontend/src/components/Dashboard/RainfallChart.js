import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useDashboardStats } from '../../hooks/useStats';
import { Spinner } from '../UI';
import { formatDate } from '../../utils/format';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: 'var(--text-dim)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ color: 'var(--cyan)' }}>Max: {payload[0]?.value} mm/h</div>
      <div style={{ color: '#7fa8c9' }}>Moy: {payload[1]?.value} mm/h</div>
    </div>
  );
};

export default function RainfallChart() {
  const { data, isLoading } = useDashboardStats();
  const trend = data?.data?.rainfall_trend || [];

  const chartData = trend.map(t => ({
    day:  formatDate(t.day, 'dd/MM'),
    max:  parseFloat(t.max_rainfall || 0).toFixed(2),
    avg:  parseFloat(t.avg_rainfall || 0).toFixed(2),
  }));

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3 className="chart-title font-display">Précipitations — 7 derniers jours</h3>
        <span className="chart-subtitle">mm/h maximum & moyenne sur toutes les zones</span>
      </div>
      {isLoading ? (
        <div className="chart-loading"><Spinner /></div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradMax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00c8ff" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#00c8ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7fa8c9" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#7fa8c9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,255,0.06)" />
            <XAxis dataKey="day" tick={{ fill: '#3d6080', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#3d6080', fontSize: 10 }} axisLine={false} tickLine={false} unit=" mm" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={20} stroke="#e07c3a" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Alerte 20mm', fill: '#e07c3a', fontSize: 9 }} />
            <Area type="monotone" dataKey="max" stroke="#00c8ff" strokeWidth={2} fill="url(#gradMax)" dot={false} name="Max" />
            <Area type="monotone" dataKey="avg" stroke="#7fa8c9" strokeWidth={1} fill="url(#gradAvg)" dot={false} name="Moy" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
