// ─────────────────────────────────────────────────────────────
//  ZonePopup — Panneau latéral détail d'une zone
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { zonesAPI } from '../../services/api';
import { RiskBadge, RiskGauge } from '../UI/RiskBadge';
import { Spinner } from '../UI/Spinner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function ZonePopup({ zone, onClose }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['zone', zone.id],
    queryFn: () => zonesAPI.getById(zone.id).then(r => r.data.data),
    staleTime: 2 * 60 * 1000,
  });

  const chartData = detail?.weather_history?.map(d => ({
    day: format(parseISO(d.day), 'dd/MM', { locale: fr }),
    pluie: parseFloat(d.daily_rainfall || 0).toFixed(1),
    temp: parseFloat(d.avg_temp || 0).toFixed(0),
  })) || [];

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 340, zIndex: 600,
      background: 'rgba(17,24,32,0.97)', backdropFilter: 'blur(12px)',
      borderLeft: '1px solid #2E3D50',
      display: 'flex', flexDirection: 'column',
      animation: 'slideRight 0.3s ease',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #2E3D50',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        position: 'sticky', top: 0,
        background: 'rgba(17,24,32,0.98)', zIndex: 1,
      }}>
        <div>
          <h2 style={{ fontFamily: 'Barlow Condensed', fontSize: 26, fontWeight: 700, color: '#EEF2F7', letterSpacing: '0.02em' }}>
            {zone.commune}
          </h2>
          {zone.quartier && <p style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#8FA3BA', marginTop: 2 }}>{zone.quartier}</p>}
          <div style={{ marginTop: 8 }}>
            <RiskBadge level={zone.risk_level} size="lg" pulse />
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#8FA3BA', fontSize: 20, padding: '4px 8px',
          lineHeight: 1, borderRadius: 4,
          transition: 'color 0.2s',
        }}>✕</button>
      </div>

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={32} />
        </div>
      ) : (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Jauge de probabilité */}
          <div style={{ background: '#111820', borderRadius: 6, padding: '14px 16px', border: '1px solid #2E3D50' }}>
            <RiskGauge score={zone.risk_score || 0} />
          </div>

          {/* Météo actuelle */}
          <Section title="MÉTÉO ACTUELLE">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <MeteoItem label="PLUIE 1H" value={`${(zone.rainfall_1h || 0).toFixed(1)} mm`} color="#00C8FF" />
              <MeteoItem label="PLUIE 24H" value={`${(zone.rainfall_24h || 0).toFixed(1)} mm`} color="#00C8FF" />
              <MeteoItem label="TEMP." value={`${(zone.temperature || 0).toFixed(0)}°C`} color="#F5C542" />
              <MeteoItem label="HUMIDITÉ" value={`${(zone.humidity || 0).toFixed(0)}%`} color="#8FA3BA" />
            </div>
          </Section>

          {/* Info géo */}
          <Section title="DONNÉES TERRAIN">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <MeteoItem label="ALTITUDE MOY." value={`${zone.elevation_avg?.toFixed(0) || '—'} m`} color="#8FA3BA" />
              <MeteoItem label="ALT. MIN." value={`${zone.elevation_min?.toFixed(0) || '—'} m`} color="#E8314A" />
              <MeteoItem label="POPULATION" value={zone.population ? (zone.population / 1000).toFixed(0) + 'K' : '—'} color="#8FA3BA" />
              <MeteoItem label="SUPERFICIE" value={zone.area_sqkm ? zone.area_sqkm.toFixed(1) + ' km²' : '—'} color="#8FA3BA" />
            </div>
          </Section>

          {/* Graphique pluie 30j */}
          {chartData.length > 0 && (
            <Section title="PLUIE — 30 DERNIERS JOURS (mm)">
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00C8FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00C8FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontFamily: 'DM Mono', fontSize: 9, fill: '#8FA3BA' }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fontFamily: 'DM Mono', fontSize: 9, fill: '#8FA3BA' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#111820', border: '1px solid #2E3D50', borderRadius: 4, fontFamily: 'DM Mono', fontSize: 11 }} itemStyle={{ color: '#00C8FF' }} labelStyle={{ color: '#8FA3BA' }} />
                  <Area type="monotone" dataKey="pluie" stroke="#00C8FF" strokeWidth={1.5} fill="url(#rainGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
          )}

          {/* Recommandation IA */}
          {zone.last_recommendation && (
            <div style={{
              background: 'rgba(0,200,255,0.05)',
              border: '1px solid rgba(0,200,255,0.2)',
              borderLeft: '3px solid #00C8FF',
              borderRadius: '0 6px 6px 0',
              padding: '12px 14px',
            }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: '#00C8FF', letterSpacing: '0.1em', marginBottom: 6 }}>
                IA RECOMMANDE
              </div>
              <p style={{ fontFamily: 'Barlow', fontSize: 13, color: '#C4D1DE', lineHeight: 1.5 }}>
                {zone.last_recommendation}
              </p>
            </div>
          )}

          {/* Historique inondations */}
          {detail?.recent_predictions?.length > 0 && (
            <Section title="HISTORIQUE PRÉDICTIONS">
              {detail.recent_predictions.slice(0, 5).map((p, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: i < 4 ? '1px solid #1A2332' : 'none'
                }}>
                  <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#8FA3BA' }}>
                    {format(parseISO(p.predicted_at), 'dd/MM HH:mm')}
                  </span>
                  <RiskBadge level={p.risk_level} size="sm" showDot={false} />
                  <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#C4D1DE' }}>
                    {Math.round(p.flood_probability * 100)}%
                  </span>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: '#8FA3BA', letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>
        — {title}
      </div>
      {children}
    </div>
  );
}

function MeteoItem({ label, value, color }) {
  return (
    <div style={{
      background: '#0A0E14', borderRadius: 4, padding: '8px 10px',
      border: '1px solid #1A2332',
    }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: '#5D6D7E', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 600, color: color || '#EEF2F7', letterSpacing: '0.01em' }}>{value}</div>
    </div>
  );
}
