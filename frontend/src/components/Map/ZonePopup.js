import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { zonesApi } from '../../services/api';
import { RISK_CONFIG } from '../../store/zonesStore';
import { RiskBadge, RiskBar } from '../UI';
import { formatNumber, formatDate, timeAgo } from '../../utils/format';
import { subscribeToZone } from '../../services/socket';
import './zonepopup.css';

export default function ZonePopup({ zone, onClose }) {
  const cfg = RISK_CONFIG[zone.risk_level] || RISK_CONFIG[0];

  // Charger détails complets + historique pluie
  const { data: detail } = useQuery({
    queryKey: ['zone-detail', zone.id],
    queryFn:  () => zonesApi.getById(zone.id),
    enabled: !!zone.id,
  });

  const { data: history } = useQuery({
    queryKey: ['zone-history', zone.id],
    queryFn:  () => zonesApi.getHistory(zone.id),
    enabled: !!zone.id,
  });

  // Souscrire aux updates temps réel de cette zone
  useEffect(() => { subscribeToZone(zone.id); }, [zone.id]);

  const weatherHistory = detail?.data?.weather_history || [];
  const chartData = weatherHistory.map(w => ({
    day:      formatDate(w.day, 'dd/MM'),
    pluie:    parseFloat(w.daily_rainfall || 0).toFixed(1),
    temp:     parseFloat(w.avg_temp || 0).toFixed(0),
  }));

  const events = history?.data || [];
  const criticalEvents = events.filter(e => e.severity === 'catastrophic' || e.severity === 'severe');

  return (
    <aside className="zone-popup animate-slide-right">
      {/* Header */}
      <div className="zp-header" style={{ borderColor: cfg.hex + '44' }}>
        <div className="zp-header-content">
          <div className="zp-commune font-display">{zone.commune}</div>
          {zone.quartier && <div className="zp-quartier">{zone.quartier}</div>}
          <div className="zp-badges">
            <RiskBadge level={zone.risk_level} size="lg" pulse={zone.risk_level >= 3} />
          </div>
        </div>
        <button className="zp-close" onClick={onClose} aria-label="Fermer">✕</button>
      </div>

      {/* Probabilité IA */}
      <div className="zp-section">
        <div className="zp-section-title">Probabilité d'inondation — IA</div>
        <RiskBar score={zone.risk_score} level={zone.risk_level} />
        {zone.recommendation && (
          <div className="zp-recommendation" style={{ borderColor: cfg.hex + '44', color: cfg.hex }}>
            {zone.recommendation}
          </div>
        )}
      </div>

      {/* Météo */}
      <div className="zp-section">
        <div className="zp-section-title">Météo actuelle</div>
        <div className="zp-weather-grid">
          <div className="zp-weather-item">
            <div className="zwi-icon">🌧</div>
            <div className="zwi-val font-mono">{zone.rainfall_1h?.toFixed(1) || '0.0'} mm</div>
            <div className="zwi-label">Pluie/h</div>
          </div>
          <div className="zp-weather-item">
            <div className="zwi-icon">💧</div>
            <div className="zwi-val font-mono">{zone.rainfall_24h?.toFixed(1) || '0.0'} mm</div>
            <div className="zwi-label">Cumul 24h</div>
          </div>
          <div className="zp-weather-item">
            <div className="zwi-icon">🌡</div>
            <div className="zwi-val font-mono">{zone.temperature?.toFixed(0) || '—'}°C</div>
            <div className="zwi-label">Température</div>
          </div>
          <div className="zp-weather-item">
            <div className="zwi-icon">💦</div>
            <div className="zwi-val font-mono">{zone.humidity?.toFixed(0) || '—'}%</div>
            <div className="zwi-label">Humidité</div>
          </div>
        </div>
      </div>

      {/* Graphique 7 jours */}
      {chartData.length > 0 && (
        <div className="zp-section">
          <div className="zp-section-title">Précipitations — 30 jours</div>
          <div className="zp-chart">
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${zone.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cfg.hex} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={cfg.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#3d6080', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#3d6080', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px' }}
                  formatter={(v) => [`${v} mm`, 'Pluie']}
                />
                <Area type="monotone" dataKey="pluie" stroke={cfg.hex} strokeWidth={1.5}
                      fill={`url(#grad-${zone.id})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Terrain */}
      <div className="zp-section">
        <div className="zp-section-title">Données terrain</div>
        <div className="zp-terrain-grid">
          <div className="zp-terrain-row">
            <span>Altitude moy.</span>
            <span className="font-mono">{zone.elevation_avg?.toFixed(0) || '—'} m</span>
          </div>
          <div className="zp-terrain-row">
            <span>Altitude min.</span>
            <span className="font-mono">{zone.elevation_min?.toFixed(0) || '—'} m</span>
          </div>
          <div className="zp-terrain-row">
            <span>Population</span>
            <span className="font-mono">{formatNumber(zone.population)}</span>
          </div>
          <div className="zp-terrain-row">
            <span>Surface</span>
            <span className="font-mono">{zone.area_sqkm?.toFixed(1) || '—'} km²</span>
          </div>
          <div className="zp-terrain-row">
            <span>Imperméabilité</span>
            <span className="font-mono">{zone.impervious_ratio ? Math.round(zone.impervious_ratio * 100) + '%' : '—'}</span>
          </div>
        </div>
      </div>

      {/* Historique inondations */}
      {events.length > 0 && (
        <div className="zp-section">
          <div className="zp-section-title">Historique ({events.length} événements)</div>
          <div className="zp-events">
            {events.slice(0, 4).map(ev => (
              <div key={ev.id} className="zp-event-row">
                <span className="ev-date font-mono">{formatDate(ev.event_date, 'MM/yyyy')}</span>
                <span className={`ev-sev ev-sev-${ev.severity}`}>{ev.severity}</span>
                {ev.deaths > 0 && <span className="ev-deaths">☠ {ev.deaths}</span>}
                {ev.displaced > 0 && <span className="ev-displaced">⛺ {formatNumber(ev.displaced)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="zp-footer">
        <span className="text-dim">MAJ {timeAgo(zone.last_updated)}</span>
        {events.length > 0 && (
          <span className="zp-events-count">{criticalEvents.length} événement{criticalEvents.length > 1 ? 's' : ''} sévère{criticalEvents.length > 1 ? 's' : ''}</span>
        )}
      </div>
    </aside>
  );
}
