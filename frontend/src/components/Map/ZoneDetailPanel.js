import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getRiskConfig, formatProbability, formatNumber, timeAgo } from '../../utils/risk';
import './ZoneDetailPanel.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="ct-label">{label}</p>
      <p className="ct-value">{payload[0]?.value?.toFixed(1)} mm</p>
    </div>
  );
};

export default function ZoneDetailPanel({ zone, onClose }) {
  const [tab, setTab] = useState('overview');
  const risk = getRiskConfig(zone.risk_level);

  const weatherHistory = zone.weather_history || [];
  const floodEvents    = zone.flood_events    || [];
  const predictions    = zone.recent_predictions || [];

  const chartData = weatherHistory.slice(-14).map(d => ({
    day:      new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    pluie:    parseFloat(d.daily_rainfall || 0),
    temp:     parseFloat(d.avg_temp || 0),
  }));

  return (
    <div className="zone-panel animate-slideInRight">
      {/* Header */}
      <div className="panel-header" style={{ '--risk-color': risk.color }}>
        <div className="panel-header-left">
          <div className="panel-risk-badge" style={{ background: risk.bg, borderColor: risk.border }}>
            <span className="badge-dot" style={{ background: risk.color }} />
            <span style={{ color: risk.color }}>{risk.label}</span>
          </div>
          <h2 className="panel-commune">{zone.commune}</h2>
          {zone.quartier && <p className="panel-quartier">{zone.quartier}</p>}
        </div>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      {/* Risk gauge */}
      <div className="panel-gauge-section">
        <div className="gauge-row">
          <span className="gauge-label">Probabilité inondation</span>
          <span className="gauge-value" style={{ color: risk.color }}>
            {formatProbability(zone.last_prediction_score || zone.risk_score)}
          </span>
        </div>
        <div className="gauge-track">
          <div
            className="gauge-fill"
            style={{
              width: formatProbability(zone.last_prediction_score || zone.risk_score),
              background: `linear-gradient(90deg, ${risk.bg}, ${risk.color})`,
            }}
          />
        </div>
        {zone.last_recommendation && (
          <p className="gauge-recommendation">{zone.last_recommendation}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        {['overview', 'météo', 'historique'].map(t => (
          <button key={t} className={`panel-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="panel-content">

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="tab-overview">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">🌧</span>
                <span className="stat-value">{zone.rainfall_1h || 0} <small>mm/h</small></span>
                <span className="stat-label">Pluie actuelle</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📊</span>
                <span className="stat-value">{zone.rainfall_24h || 0} <small>mm</small></span>
                <span className="stat-label">Cumul 24h</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🌡</span>
                <span className="stat-value">{zone.temperature || '—'} <small>°C</small></span>
                <span className="stat-label">Température</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">💧</span>
                <span className="stat-value">{zone.humidity || '—'} <small>%</small></span>
                <span className="stat-label">Humidité</span>
              </div>
            </div>

            <div className="info-rows">
              <div className="info-row">
                <span className="info-key">Population</span>
                <span className="info-val">{formatNumber(zone.population)}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Superficie</span>
                <span className="info-val">{zone.area_sqkm?.toFixed(1)} km²</span>
              </div>
              <div className="info-row">
                <span className="info-key">Altitude moy.</span>
                <span className="info-val">{zone.elevation_avg?.toFixed(0)} m</span>
              </div>
              <div className="info-row">
                <span className="info-key">Dernière mise à jour</span>
                <span className="info-val">{timeAgo(zone.last_updated)}</span>
              </div>
              {zone.last_flood_date && (
                <div className="info-row">
                  <span className="info-key">Dernière inondation</span>
                  <span className="info-val info-val-danger">
                    {new Date(zone.last_flood_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Météo ── */}
        {tab === 'météo' && (
          <div className="tab-meteo">
            <p className="chart-title">Précipitations — 14 derniers jours (mm)</p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2e86de" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2e86de" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: '#4a6278', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <YAxis tick={{ fill: '#4a6278', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="pluie" stroke="#2e86de" fill="url(#rainGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Données météo insuffisantes</div>
            )}

            <div className="weather-current">
              <span className="wc-label">Conditions actuelles</span>
              <span className="wc-desc">{zone.weather_desc || 'Non disponible'}</span>
            </div>
          </div>
        )}

        {/* ── Historique ── */}
        {tab === 'historique' && (
          <div className="tab-history">
            {floodEvents.length === 0 ? (
              <div className="empty-state">Aucun événement enregistré</div>
            ) : (
              floodEvents.slice(0, 8).map((ev, i) => (
                <div key={ev.id || i} className="event-item">
                  <div className="event-severity" data-sev={ev.severity}>
                    {ev.severity === 'catastrophic' ? '💀' : ev.severity === 'severe' ? '🔴' : ev.severity === 'moderate' ? '🟠' : '🟡'}
                  </div>
                  <div className="event-info">
                    <span className="event-date">{new Date(ev.event_date).toLocaleDateString('fr-FR')}</span>
                    <span className="event-stats">
                      {ev.deaths > 0 && <span className="ev-stat ev-deaths">{ev.deaths} décès</span>}
                      {ev.displaced > 0 && <span className="ev-stat">{formatNumber(ev.displaced)} déplacés</span>}
                    </span>
                  </div>
                  {ev.confirmed && <span className="event-confirmed">✓</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
