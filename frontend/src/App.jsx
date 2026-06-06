import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import axios from 'axios';
import { CircleMarker, GeoJSON, MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const KINSHASA_CENTER = [-4.325, 15.322];

const RISK = {
  0: { label: 'Inconnu', short: 'UNK', color: '#64748b', fill: '#475569', glow: 'rgba(100,116,139,.35)', action: 'Données insuffisantes : vérifier les flux météo, Sentinel/GLOFAS et les observations terrain.' },
  1: { label: 'Faible', short: 'LOW', color: '#22c55e', fill: '#16a34a', glow: 'rgba(34,197,94,.30)', action: 'Surveillance standard, mise à jour périodique et maintien des relais communautaires.' },
  2: { label: 'Modéré', short: 'WATCH', color: '#facc15', fill: '#eab308', glow: 'rgba(250,204,21,.30)', action: 'Surveillance renforcée : suivre la pluie 24/72h, informer les chefs de quartier et vérifier les drains.' },
  3: { label: 'Élevé', short: 'WARN', color: '#fb923c', fill: '#f97316', glow: 'rgba(251,146,60,.32)', action: 'Pré-alerte : préparer messages communautaires, points de rassemblement et contrôle des routes basses.' },
  4: { label: 'Critique', short: 'CRIT', color: '#ef4444', fill: '#dc2626', glow: 'rgba(239,68,68,.38)', action: 'Alerte critique : coordonner autorités, évacuation préventive ciblée et suivi terrain continu.' },
};

const COMMUNE_POINTS = {
  ndjili: [15.365, -4.393], bumbu: [15.305, -4.342], kimbanseke: [15.405, -4.425], limete: [15.340, -4.350],
  matete: [15.349, -4.385], bandalungwa: [15.286, -4.336], barumbu: [15.315, -4.314], gombe: [15.313, -4.305],
  kalamu: [15.318, -4.340], kisenso: [15.363, -4.420], lemba: [15.329, -4.382], makala: [15.304, -4.375],
  masina: [15.389, -4.386], ngaba: [15.326, -4.360], selembao: [15.280, -4.370], lingwala: [15.300, -4.320],
  montngafula: [15.250, -4.420], 'mont-ngafula': [15.250, -4.420], ngaliema: [15.240, -4.325],
};

const LAYERS = [
  { id: 'risk', label: 'Risque', hint: 'score composite' },
  { id: 'depth', label: 'Profondeur', hint: 'mètres' },
  { id: 'rain72h', label: 'Pluie 72h', hint: 'cumul' },
  { id: 'exposure', label: 'Exposition', hint: 'population' },
  { id: 'quality', label: 'Qualité', hint: 'fiabilité' },
  { id: 'incidents', label: 'Signalements', hint: 'terrain' },
];

function cleanKey(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '');
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.zones)) return payload.data.zones;
  if (Array.isArray(payload?.zones)) return payload.zones;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function parseGeometry(geometry) {
  if (!geometry) return null;
  if (typeof geometry === 'string') {
    try { return JSON.parse(geometry); } catch { return null; }
  }
  return geometry;
}

function fallbackGeometry(zone, index) {
  const key = cleanKey(zone.commune || zone.name || '');
  const center = COMMUNE_POINTS[key] || [15.22 + (index % 7) * 0.035, -4.29 - Math.floor(index / 7) * 0.033];
  const [lon, lat] = center;
  const dx = Number(zone.area_sqkm || 35) > 100 ? 0.032 : 0.018;
  const dy = Number(zone.area_sqkm || 35) > 100 ? 0.026 : 0.015;
  return {
    type: 'Polygon',
    coordinates: [[[lon - dx, lat - dy], [lon + dx, lat - dy * .75], [lon + dx * 1.1, lat + dy], [lon - dx * .9, lat + dy * .9], [lon - dx, lat - dy]]]
  };
}

function centroidOf(feature) {
  try {
    const layer = L.geoJSON(feature);
    const c = layer.getBounds().getCenter();
    return [c.lat, c.lng];
  } catch {
    return KINSHASA_CENTER;
  }
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function num(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function pct(value) { return `${Math.round(clamp(num(value), 0, 1) * 100)}%`; }
function fmt(value, opts = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (opts.unit) return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: opts.decimals ?? 1 }).format(n)} ${opts.unit}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: opts.decimals ?? 0 }).format(n);
}
function timeLabel(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function normalizeZone(zone, index) {
  const sourceGeometry = parseGeometry(zone.geometry) || parseGeometry(zone.geom);
  const geometry = sourceGeometry || fallbackGeometry(zone, index);
  const syntheticGeometry = !sourceGeometry;
  const operational = zone.operational_risk || {};
  const computedLevel = num(operational.risk_level ?? zone.risk_level ?? zone.riskLevel ?? zone.risk, 0);
  const riskLevel = clamp(Math.round(computedLevel), 0, 4);
  const probability = num(zone.flood_probability ?? zone.last_prediction_score ?? operational.score ?? zone.risk_score ?? zone.riskScore ?? zone.probability, 0);
  const riskScore = probability > 1 ? probability / 100 : probability;
  const quality = zone.impact_confidence || zone.confidence || operational.confidence || (riskScore > .5 ? 'medium' : 'low');

  return {
    type: 'Feature',
    geometry,
    properties: {
      ...zone,
      id: zone.id ?? `${zone.commune || 'zone'}-${index}`,
      commune: zone.commune || zone.name || `Zone ${index + 1}`,
      quartier: zone.quartier || zone.neighborhood || '—',
      risk_level: riskLevel,
      risk_score: clamp(riskScore, 0, 1),
      operational_risk: operational,
      population: num(zone.population ?? zone.population_est, 0),
      population_exposed: num(zone.population_exposed, 0),
      buildings_exposed: num(zone.buildings_exposed, 0),
      roads_km_exposed: num(zone.roads_km_exposed, 0),
      schools_exposed: num(zone.schools_exposed, 0),
      health_facilities_exposed: num(zone.health_facilities_exposed, 0),
      max_depth_m: num(zone.max_depth_m, 0),
      mean_depth_m: num(zone.mean_depth_m, 0),
      rainfall_1h: num(zone.rainfall_1h ?? zone.rainfall_mm ?? zone.rainfall, 0),
      rainfall_24h: num(zone.rainfall_24h, 0),
      rainfall_72h: num(zone.rainfall_72h, 0),
      elevation_avg: num(zone.elevation_avg ?? zone.elevation, 0),
      area_sqkm: num(zone.area_sqkm, 0),
      quality,
      synthetic_geometry: syntheticGeometry,
    }
  };
}

function useFloodSenseOperationalData() {
  const [state, setState] = useState({ zones: [], priority: [], summary: {}, impact: null, alerts: [], incidents: [], quality: [], weather: null });
  const [status, setStatus] = useState({ loading: true, error: null, lastSync: null, source: 'api' });
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus((s) => ({ ...s, loading: true, error: null }));

    try {
      const [commandRes, impactRes, incidentsRes, qualityRes, alertsRes, weatherRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/operations/command-center`, { timeout: 15000, signal: controller.signal }),
        axios.get(`${API_BASE}/impact/city`, { timeout: 15000, signal: controller.signal }),
        axios.get(`${API_BASE}/incidents`, { timeout: 15000, signal: controller.signal }),
        axios.get(`${API_BASE}/operations/data-quality`, { timeout: 15000, signal: controller.signal }),
        axios.get(`${API_BASE}/alerts`, { timeout: 15000, signal: controller.signal }),
        axios.get(`${API_BASE}/weather/current`, { timeout: 15000, signal: controller.signal }),
      ]);

      let commandPayload = null;
      if (commandRes.status === 'fulfilled') commandPayload = commandRes.value.data?.data || commandRes.value.data;
      if (!commandPayload?.zones) {
        const zonesFallback = await axios.get(`${API_BASE}/zones`, { timeout: 15000, signal: controller.signal });
        commandPayload = { zones: normalizeList(zonesFallback.data), priority_zones: normalizeList(zonesFallback.data).slice(0, 10), summary: {} };
      }

      const zones = normalizeList(commandPayload.zones || commandPayload).map(normalizeZone);
      const priority = normalizeList(commandPayload.priority_zones).map(normalizeZone);
      const impact = impactRes.status === 'fulfilled' ? (impactRes.value.data?.data || impactRes.value.data) : null;
      const incidents = incidentsRes.status === 'fulfilled' ? normalizeList(incidentsRes.value.data) : [];
      const quality = qualityRes.status === 'fulfilled' ? normalizeList(qualityRes.value.data) : [];
      const alerts = alertsRes.status === 'fulfilled' ? normalizeList(alertsRes.value.data) : [];
      const weather = weatherRes.status === 'fulfilled' ? (weatherRes.value.data?.data || weatherRes.value.data) : null;

      setState({ zones, priority: priority.length ? priority : zones.slice(0, 10), summary: commandPayload.summary || {}, impact, alerts, incidents, quality, weather });
      setStatus({ loading: false, error: null, lastSync: new Date(), source: commandRes.status === 'fulfilled' ? 'operations' : 'zones' });
    } catch (error) {
      if (axios.isCancel(error)) return;
      setStatus({ loading: false, error: error?.message || 'API indisponible', lastSync: null, source: 'offline' });
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 3 * 60 * 1000);
    return () => { window.clearInterval(id); abortRef.current?.abort?.(); };
  }, [load]);

  return { ...state, status, reload: load };
}

function FitBounds({ features }) {
  const map = useMap();
  useEffect(() => {
    if (!features.length) return;
    const bounds = L.geoJSON(features).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.12), { animate: true, duration: .7 });
  }, [features, map]);
  return null;
}
function FlyToFeature({ feature }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    const bounds = L.geoJSON(feature).getBounds();
    if (bounds.isValid()) map.flyToBounds(bounds.pad(.32), { duration: .8, maxZoom: 13 });
  }, [feature, map]);
  return null;
}

function Header({ status, onReload }) {
  return <header className="fs-header">
    <div className="brand-lockup">
      <div className="brand-mark"><span>FS</span></div>
      <div><p className="eyebrow">GeoData for Smart Cities · Kinshasa</p><h1>FloodSense Operational Command Center</h1></div>
    </div>
    <div className="header-actions">
      <div className={`connection-pill ${status.error ? 'offline' : 'online'}`}><span />{status.error ? 'API hors ligne' : `API ${status.source}`}</div>
      <div className="sync-time">MAJ {status.lastSync ? timeLabel(status.lastSync) : '—'}</div>
      <button className="ghost-button" onClick={onReload} type="button">Synchroniser</button>
    </div>
  </header>;
}

function StatCard({ label, value, note, tone = 'neutral' }) {
  return <section className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></section>;
}
function RiskBadge({ level }) {
  const cfg = RISK[level] || RISK[0];
  return <span className="risk-badge" style={{ '--risk': cfg.color, '--riskGlow': cfg.glow }}>{cfg.label}</span>;
}
function QualityBadge({ value }) {
  const v = String(value || 'low').toLowerCase();
  return <span className={`quality-badge ${v}`}>{v.toUpperCase()}</span>;
}
function confidenceFromZone(z) {
  const q = String(z.quality || '').toLowerCase();
  if (q === 'high') return 0.92;
  if (q === 'medium') return 0.74;
  if (q === 'low') return 0.55;
  return clamp((num(z.risk_score) * .35) + .48, .45, .9);
}
function trendFromZone(z) {
  const current = num(z.risk_score);
  const rainfall = num(z.rainfall_72h || z.rainfall_24h || z.rainfall_1h);
  const depth = num(z.max_depth_m);
  const signal = current * .52 + clamp(rainfall / 140, 0, 1) * .28 + clamp(depth / 1.2, 0, 1) * .20;
  if (signal >= .66) return { label: 'Hausse probable', icon: '↗', tone: 'up' };
  if (signal <= .26) return { label: 'Stable / faible', icon: '→', tone: 'flat' };
  return { label: 'Surveillance', icon: '↗', tone: 'watch' };
}
function DecisionStrip({ z }) {
  const confidence = confidenceFromZone(z);
  const trend = trendFromZone(z);
  const urgency = z.risk_level >= 4 ? 'Immédiate' : z.risk_level >= 3 ? 'Pré-alerte' : z.risk_level >= 2 ? 'Vigilance' : 'Routine';
  return <section className="decision-strip">
    <div><span>Horizon critique</span><strong>24–48h</strong></div>
    <div><span>Tendance</span><strong className={`trend-${trend.tone}`}>{trend.icon} {trend.label}</strong></div>
    <div><span>Confiance IA</span><strong>{pct(confidence)}</strong></div>
    <div><span>Priorité action</span><strong>{urgency}</strong></div>
  </section>;
}
function QualityMatrix({ z }) {
  const base = confidenceFromZone(z);
  const items = [
    ['Sentinel', z.risk_level >= 3 ? base - .04 : base - .08],
    ['GLOFAS', base - .03],
    ['DEM', .88],
    ['Météo', clamp(base + (z.rainfall_72h ? .04 : -.12), .42, .94)],
  ];
  return <section className="quality-matrix mini-section"><h3>Qualité scientifique</h3>{items.map(([label, value]) => <div className="quality-row" key={label}><span>{label}</span><div><i style={{ width: `${Math.round(value * 100)}%` }} /></div><b>{pct(value)}</b></div>)}</section>;
}
function AlertCenter({ alerts, incidents }) {
  const activeAlerts = alerts.slice(0, 3);
  const activeIncidents = incidents.slice(0, 3);
  return <section className="alert-center-card">
    <div className="section-heading compact"><h3>Alert Center</h3><span>{alerts.length + incidents.length}</span></div>
    {activeAlerts.length ? activeAlerts.map((a, idx) => <article className="ops-event warning" key={a.id || `a-${idx}`}><strong>{a.alert_type || 'alerte'}</strong><p>{a.commune || 'Zone'} · {a.message_fr || a.message || 'Alerte FloodSense'}</p></article>) : <article className="ops-event"><strong>Aucune alerte active</strong><p>Le système reste en veille opérationnelle.</p></article>}
    {activeIncidents.length ? activeIncidents.map((i, idx) => <article className="ops-event incident" key={i.id || `i-${idx}`}><strong>Signalement terrain</strong><p>{i.description || 'Observation citoyenne'} · {i.water_depth_cm || 0} cm</p></article>) : null}
  </section>;
}

function getLayerColor(zone, layer) {
  if (layer === 'depth') {
    const d = num(zone.max_depth_m);
    if (d >= 1) return '#ef4444';
    if (d >= .5) return '#fb923c';
    if (d >= .2) return '#facc15';
    return '#22c55e';
  }
  if (layer === 'rain72h') {
    const r = num(zone.rainfall_72h || zone.rainfall_24h || zone.rainfall_1h);
    if (r >= 120) return '#ef4444';
    if (r >= 70) return '#fb923c';
    if (r >= 35) return '#facc15';
    return '#22c55e';
  }
  if (layer === 'exposure') {
    const e = num(zone.population_exposed);
    if (e >= 150000) return '#ef4444';
    if (e >= 75000) return '#fb923c';
    if (e >= 25000) return '#facc15';
    return '#22c55e';
  }
  if (layer === 'quality') {
    const q = String(zone.quality || '').toLowerCase();
    if (q === 'high') return '#22c55e';
    if (q === 'medium') return '#facc15';
    return '#ef4444';
  }
  return (RISK[zone.risk_level] || RISK[0]).color;
}

function LeftPanel({ zones, priority, selectedId, setSelectedId, search, setSearch, layer, setLayer, metrics, alerts = [], incidents = [] }) {
  const filtered = useMemo(() => {
    const q = cleanKey(search);
    return zones.filter(f => !q || cleanKey(`${f.properties.commune} ${f.properties.quartier}`).includes(q))
      .sort((a, b) => b.properties.risk_level - a.properties.risk_level || b.properties.risk_score - a.properties.risk_score);
  }, [zones, search]);

  return <aside className="left-panel glass-panel">
    <div className="panel-title-row">
      <div><p className="eyebrow">Surveillance territoriale</p><h2>Priorités opérationnelles</h2></div>
      <span className="zone-count">{zones.length}</span>
    </div>

    <div className="metric-grid four">
      <StatCard label="Critiques" value={metrics.critical} note="zones rouges" tone="critical" />
      <StatCard label="Pop. exposée" value={fmt(metrics.exposedPopulation)} note="48h" tone="warning" />
      <StatCard label="Bâtiments" value={fmt(metrics.exposedBuildings)} note="exposés" />
      <StatCard label="Profondeur max" value={fmt(metrics.maxDepth, { unit: 'm', decimals: 2 })} note="simulation" />
    </div>

    <label className="search-box"><span>Recherche commune/quartier</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ndjili, Limete, Mont-Ngafula…" /></label>

    <div className="layer-grid" role="group" aria-label="Couches">
      {LAYERS.map(item => <button key={item.id} className={layer === item.id ? 'active' : ''} onClick={() => setLayer(item.id)} type="button"><strong>{item.label}</strong><small>{item.hint}</small></button>)}
    </div>

    <section className="ops-health-card">
      <div><span>Posture ville</span><strong>{metrics.critical > 0 ? 'Alerte' : metrics.high > 0 ? 'Vigilance' : 'Veille'}</strong></div>
      <div><span>Score moyen</span><strong>{pct(metrics.avgScore || 0)}</strong></div>
      <div><span>Zones hautes</span><strong>{metrics.high}</strong></div>
    </section>

    <section className="priority-box">
      <div className="section-heading"><h3>Top zones à traiter</h3><span>{priority.length}</span></div>
      {priority.slice(0, 8).map((feature, idx) => {
        const z = feature.properties;
        const cfg = RISK[z.risk_level] || RISK[0];
        return <button key={`${z.id}-${idx}`} className={`priority-row ${String(selectedId) === String(z.id) ? 'active' : ''}`} onClick={() => setSelectedId(z.id)} type="button">
          <span className="rank">{idx + 1}</span><i style={{ background: cfg.color, boxShadow: `0 0 18px ${cfg.glow}` }} />
          <span><strong>{z.commune}</strong><small>{fmt(z.population_exposed)} pers. · {fmt(z.max_depth_m, { unit: 'm', decimals: 2 })}</small></span>
          <b>{pct(z.risk_score)}</b>
        </button>;
      })}
    </section>

    <AlertCenter alerts={alerts} incidents={incidents} />

    <div className="zone-list">
      {filtered.map(feature => {
        const z = feature.properties;
        const cfg = RISK[z.risk_level] || RISK[0];
        return <button key={z.id} className={`zone-row ${String(selectedId) === String(z.id) ? 'active' : ''}`} onClick={() => setSelectedId(z.id)} type="button">
          <span className="risk-dot" style={{ background: cfg.color, boxShadow: `0 0 18px ${cfg.glow}` }} />
          <span className="zone-row-main"><strong>{z.commune}</strong><small>{z.quartier} · pop. exposée {fmt(z.population_exposed)}</small></span>
          <span className="zone-row-level">{cfg.short}</span>
        </button>;
      })}
    </div>
  </aside>;
}

function Legend({ layer }) {
  const palettes = {
    risk: Object.values(RISK).slice(1).map(r => [r.color, r.label]),
    depth: [['#22c55e', '< 0.2 m'], ['#facc15', '0.2–0.5 m'], ['#fb923c', '0.5–1 m'], ['#ef4444', '> 1 m']],
    rain72h: [['#22c55e', '< 35 mm'], ['#facc15', '35–70'], ['#fb923c', '70–120'], ['#ef4444', '>120']],
    exposure: [['#22c55e', '<25k'], ['#facc15', '25–75k'], ['#fb923c', '75–150k'], ['#ef4444', '>150k']],
    quality: [['#22c55e', 'High'], ['#facc15', 'Medium'], ['#ef4444', 'Low']],
    incidents: [['#38bdf8', 'signalement'], ['#ef4444', 'vérifié']],
  };
  return <div className="map-legend glass-panel">{(palettes[layer] || palettes.risk).map(([color, label]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>;
}

function valueForLayer(zone, layer) {
  if (layer === 'depth') return clamp(num(zone.max_depth_m) / 1.2, 0.12, 1);
  if (layer === 'rain72h') return clamp(num(zone.rainfall_72h || zone.rainfall_24h || zone.rainfall_1h) / 130, 0.12, 1);
  if (layer === 'exposure') return clamp(num(zone.population_exposed) / 180000, 0.12, 1);
  if (layer === 'quality') {
    const q = String(zone.quality || '').toLowerCase();
    return q === 'high' ? .32 : q === 'medium' ? .62 : .92;
  }
  return clamp(num(zone.risk_score), 0.12, 1);
}

function HeatSpotLayer({ features, layer, selectedId, onSelect }) {
  return <>{features.map((feature, idx) => {
    const z = feature.properties;
    const [lat, lng] = centroidOf(feature);
    const intensity = valueForLayer(z, layer);
    const color = getLayerColor(z, layer);
    const selected = String(selectedId) === String(z.id);
    const size = Math.round(58 + intensity * 76 + (selected ? 34 : 0));
    const pulse = z.risk_level >= 3 || selected ? ' pulse' : '';
    const html = `<span style="--heat:${color};--heat-size:${size}px"><b>${z.risk_level || ''}</b></span>`;
    return <Marker
      key={`heat-${z.id}-${layer}-${idx}`}
      position={[lat, lng]}
      icon={L.divIcon({ className: `risk-heat-spot${pulse}`, html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })}
      eventHandlers={{ click: () => onSelect?.(z.id) }}
    >
      <Popup><strong>{z.commune}</strong><br />{LAYERS.find(l => l.id === layer)?.label} : {layer === 'depth' ? fmt(z.max_depth_m, { unit: 'm', decimals: 2 }) : layer === 'rain72h' ? fmt(z.rainfall_72h, { unit: 'mm', decimals: 1 }) : layer === 'exposure' ? fmt(z.population_exposed) : pct(z.risk_score)}<br />Population exposée : {fmt(z.population_exposed)}</Popup>
    </Marker>;
  })}</>;
}

function IncidentLayer({ incidents, onSelect }) {
  return <>{incidents.map((inc, idx) => {
    const geom = parseGeometry(inc.geometry || inc.location);
    let lat = num(inc.latitude, null); let lng = num(inc.longitude, null);
    if (geom?.type === 'Point') { [lng, lat] = geom.coordinates; }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const verified = String(inc.status).toLowerCase() === 'verified';
    return <CircleMarker key={inc.id || idx} center={[lat, lng]} radius={verified ? 9 : 7} pathOptions={{ color: verified ? '#ef4444' : '#38bdf8', fillColor: verified ? '#ef4444' : '#38bdf8', fillOpacity: .82, weight: 2 }} eventHandlers={{ click: () => onSelect?.(inc) }}>
      <Popup><strong>Signalement terrain</strong><br />Profondeur : {inc.water_depth_cm || 0} cm<br />Route coupée : {inc.road_blocked ? 'oui' : 'non'}<br />{inc.description || ''}</Popup>
    </CircleMarker>;
  })}</>;
}

function CommandMap({ features, selectedFeature, setSelectedId, layer, incidents, setSelectedIncident }) {
  const styleFeature = useCallback((feature) => {
    const z = feature.properties;
    const selected = selectedFeature?.properties?.id === z.id;
    const color = getLayerColor(z, layer);
    return { color: selected ? '#0f172a' : color, fillColor: color, weight: selected ? 3.5 : 1.2, opacity: selected ? 1 : .72, fillOpacity: selected ? .18 : .055, dashArray: selected ? '' : '4 5', className: selected ? 'selected-zone-shape' : '' };
  }, [layer, selectedFeature]);

  const onEachFeature = useCallback((feature, layerInstance) => {
    const z = feature.properties;
    layerInstance.on({ click: () => setSelectedId(z.id), mouseover: () => layerInstance.setStyle({ weight: 3, fillOpacity: .70 }), mouseout: () => layerInstance.setStyle(styleFeature(feature)) });
    layerInstance.bindTooltip(`<strong>${z.commune}</strong><br/>Risque: ${(RISK[z.risk_level] || RISK[0]).label}<br/>Score: ${pct(z.risk_score)}<br/>Pop. exposée: ${fmt(z.population_exposed)}`, { sticky: true, className: 'fs-tooltip' });
  }, [setSelectedId, styleFeature]);

  const showIncidents = layer === 'incidents';
  const showInfra = layer === 'exposure' || layer === 'depth';

  return <section className="map-shell">
    <MapContainer center={KINSHASA_CENTER} zoom={11} zoomControl={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer attribution="&copy; OpenStreetMap &copy; CARTO" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      <ZoomControl position="bottomright" />
      <FitBounds features={features} />
      {selectedFeature && <FlyToFeature feature={selectedFeature} />}
      <HeatSpotLayer features={features} layer={layer} selectedId={selectedFeature?.properties?.id} onSelect={setSelectedId} />
      {features.filter(feature => !feature.properties.synthetic_geometry).map(feature => <GeoJSON key={`${feature.properties.id}-${layer}-${feature.properties.risk_level}-${feature.properties.max_depth_m}`} data={feature} style={() => styleFeature(feature)} pointToLayer={(_, latlng) => L.circleMarker(latlng, { radius: 12 })} onEachFeature={onEachFeature} />)}
      {showInfra && features.slice(0, 12).map((feature, idx) => {
        const [lat, lng] = centroidOf(feature);
        const z = feature.properties;
        return <Marker key={`infra-${z.id}`} position={[lat + ((idx % 3) - 1) * .006, lng + ((idx % 4) - 1.5) * .006]} icon={L.divIcon({ className: 'infra-marker', html: `<span>${z.health_facilities_exposed > 0 ? '✚' : '⌂'}</span>` })}><Popup><strong>{z.commune}</strong><br />Infrastructures exposées : écoles {z.schools_exposed}, santé {z.health_facilities_exposed}</Popup></Marker>;
      })}
      {showIncidents && <IncidentLayer incidents={incidents} onSelect={setSelectedIncident} />}
    </MapContainer>
    <div className="map-vignette" />
    <Legend layer={layer} />
    <div className="map-toolbar glass-panel"><span>Mode opérationnel</span><strong>{LAYERS.find(l => l.id === layer)?.label}</strong></div>
  </section>;
}

function RiskComponents({ risk }) {
  const components = risk?.components || risk?.drivers || {};
  const entries = [
    ['Aléa', num(components.hazard ?? components.hazard_score ?? risk?.hazard, .35)],
    ['Exposition', num(components.exposure ?? components.exposure_score ?? risk?.exposure, .25)],
    ['Vulnérabilité', num(components.vulnerability ?? components.vulnerability_score ?? risk?.vulnerability, .20)],
    ['Réponse', num(components.response_capacity ?? components.response ?? risk?.response_capacity, .20)],
  ];
  return <div className="component-bars">{entries.map(([label, value]) => <div key={label}><span>{label}</span><div><i style={{ width: `${clamp(value, 0, 1) * 100}%` }} /></div><b>{pct(value)}</b></div>)}</div>;
}

function DetailsPanel({ feature, alerts, weather, incident, onClose, onCreateAlert, onSubmitIncident }) {
  const [report, setReport] = useState({ water_depth_cm: '', road_blocked: false, house_affected: false, description: '' });
  if (!feature) return <aside className="details-panel glass-panel empty-state"><div className="radar-orb" /><h2>Sélectionne une zone</h2><p>Clique une commune pour afficher impact, aléa, vulnérabilité et actions recommandées.</p></aside>;
  const z = feature.properties;
  const cfg = RISK[z.risk_level] || RISK[0];
  const relatedAlerts = alerts.filter(a => String(a.zone_id) === String(z.id) || cleanKey(a.commune) === cleanKey(z.commune)).slice(0, 3);
  const recommendation = z.operational_risk?.recommendation || z.last_recommendation || cfg.action;

  const submit = (e) => {
    e.preventDefault();
    onSubmitIncident?.({ ...report, zone_id: z.id });
    setReport({ water_depth_cm: '', road_blocked: false, house_affected: false, description: '' });
  };

  return <aside className="details-panel glass-panel">
    <button className="close-button" onClick={onClose} type="button">×</button>
    <p className="eyebrow">Zone sélectionnée</p>
    <div className="detail-heading"><h2>{z.commune}</h2><RiskBadge level={z.risk_level} /></div>
    <p className="detail-subtitle">{z.quartier} · MAJ {timeLabel(z.predicted_at || z.last_updated || z.updated_at)} · <QualityBadge value={z.quality} /></p>

    <div className="risk-meter" style={{ '--risk': cfg.color, '--score': `${Math.max(4, Math.round(z.risk_score * 100))}%` }}>
      <div className="risk-meter-top"><span>Score opérationnel</span><strong>{pct(z.risk_score)}</strong></div>
      <div className="meter-track"><span /></div>
    </div>

    <DecisionStrip z={z} />

    <RiskComponents risk={z.operational_risk} />

    <div className="detail-grid ops">
      <div><span>Pop. exposée</span><strong>{fmt(z.population_exposed)}</strong></div>
      <div><span>Bâtiments</span><strong>{fmt(z.buildings_exposed)}</strong></div>
      <div><span>Routes</span><strong>{fmt(z.roads_km_exposed, { unit: 'km', decimals: 1 })}</strong></div>
      <div><span>Profondeur max</span><strong>{fmt(z.max_depth_m, { unit: 'm', decimals: 2 })}</strong></div>
      <div><span>Écoles</span><strong>{fmt(z.schools_exposed)}</strong></div>
      <div><span>Santé</span><strong>{fmt(z.health_facilities_exposed)}</strong></div>
    </div>

    <section className="recommendation-card" style={{ borderColor: cfg.color }}><span>Recommandation opérationnelle</span><p>{recommendation}</p><button type="button" onClick={() => onCreateAlert?.(z)}>Préparer une alerte</button></section>

    <section className="mini-section"><h3>Météo & aléa</h3><div className="weather-strip">
      <span>Pluie 1h <strong>{fmt(z.rainfall_1h, { unit: 'mm', decimals: 1 })}</strong></span>
      <span>Pluie 24h <strong>{fmt(z.rainfall_24h, { unit: 'mm', decimals: 1 })}</strong></span>
      <span>Pluie 72h <strong>{fmt(z.rainfall_72h, { unit: 'mm', decimals: 1 })}</strong></span>
      <span>Altitude <strong>{z.elevation_avg ? fmt(z.elevation_avg, { unit: 'm', decimals: 0 }) : '—'}</strong></span>
      <span>Temp. Kinshasa <strong>{weather?.temperature ?? weather?.main?.temp ?? '—'}°C</strong></span>
      <span>Humidité <strong>{weather?.humidity ?? weather?.main?.humidity ?? '—'}%</strong></span>
    </div></section>

    <QualityMatrix z={z} />

    {incident && <section className="mini-section"><h3>Dernier signalement sélectionné</h3><article className="alert-chip incident"><strong>{incident.status || 'nouveau'}</strong><p>{incident.description || 'Signalement citoyen'} · profondeur {incident.water_depth_cm || 0} cm</p></article></section>}

    <section className="mini-section"><h3>Alertes récentes</h3>{relatedAlerts.length ? relatedAlerts.map((a, idx) => <article className="alert-chip" key={a.id || idx}><strong>{a.alert_type || 'alerte'}</strong><p>{a.message_fr || a.message || 'Alerte FloodSense enregistrée.'}</p></article>) : <p className="muted-copy">Aucune alerte récente pour cette zone.</p>}</section>

    <form className="incident-form" onSubmit={submit}>
      <h3>Signalement terrain rapide</h3>
      <div className="form-row"><input value={report.water_depth_cm} onChange={e => setReport(r => ({ ...r, water_depth_cm: e.target.value }))} placeholder="Profondeur eau (cm)" inputMode="numeric" /><input value={report.description} onChange={e => setReport(r => ({ ...r, description: e.target.value }))} placeholder="Observation" /></div>
      <label><input type="checkbox" checked={report.road_blocked} onChange={e => setReport(r => ({ ...r, road_blocked: e.target.checked }))} /> Route coupée</label>
      <label><input type="checkbox" checked={report.house_affected} onChange={e => setReport(r => ({ ...r, house_affected: e.target.checked }))} /> Habitation touchée</label>
      <button type="submit">Enregistrer signalement</button>
    </form>
  </aside>;
}

function BottomOpsBar({ metrics, horizon, setHorizon, onExportGeojson, onExportCsv, alertDraft, setAlertDraft, sendAlert }) {
  const horizons = ['Maintenant', '+6h', '+12h', '+24h', '+48h'];
  return <section className="bottom-ops glass-panel">
    <div className="timeline-control"><span>Horizon</span>{horizons.map(h => <button key={h} className={horizon === h ? 'active' : ''} onClick={() => setHorizon(h)} type="button">{h}</button>)}</div>
    <div className="ops-kpis"><span>Population <b>{fmt(metrics.exposedPopulation)}</b></span><span>Bâtiments <b>{fmt(metrics.exposedBuildings)}</b></span><span>Routes exposées <b>{fmt(metrics.roadsKm, { unit: 'km', decimals: 1 })}</b></span><span>Écoles <b>{fmt(metrics.schools)}</b></span><span>Santé <b>{fmt(metrics.health)}</b></span></div>
    <div className="export-actions"><button onClick={onExportGeojson} type="button">GeoJSON</button><button onClick={onExportCsv} type="button">CSV</button></div>
    {alertDraft && <div className="alert-draft"><strong>Alerte préparée : {alertDraft.commune}</strong><input value={alertDraft.message} onChange={e => setAlertDraft({ ...alertDraft, message: e.target.value })} /><button onClick={sendAlert} type="button">Envoyer</button><button onClick={() => setAlertDraft(null)} type="button">Annuler</button></div>}
  </section>;
}

export default function App() {
  const { zones, priority, summary, impact, alerts, incidents, quality, weather, status, reload } = useFloodSenseOperationalData();
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [search, setSearch] = useState('');
  const [layer, setLayer] = useState('risk');
  const [horizon, setHorizon] = useState('Maintenant');
  const [alertDraft, setAlertDraft] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { if (!selectedId && zones.length) setSelectedId(zones[0].properties.id); }, [zones, selectedId]);
  const selectedFeature = useMemo(() => zones.find(f => String(f.properties.id) === String(selectedId)) || null, [zones, selectedId]);

  const metrics = useMemo(() => {
    const base = zones.reduce((acc, f) => {
      const z = f.properties;
      acc.critical += z.risk_level >= 4 ? 1 : 0;
      acc.high += z.risk_level >= 3 ? 1 : 0;
      acc.exposedPopulation += num(z.population_exposed);
      acc.exposedBuildings += num(z.buildings_exposed);
      acc.roadsKm += num(z.roads_km_exposed);
      acc.schools += num(z.schools_exposed);
      acc.health += num(z.health_facilities_exposed);
      acc.maxDepth = Math.max(acc.maxDepth, num(z.max_depth_m));
      acc.avgScore += num(z.risk_score);
      return acc;
    }, { critical: 0, high: 0, exposedPopulation: 0, exposedBuildings: 0, roadsKm: 0, schools: 0, health: 0, maxDepth: 0, avgScore: 0 });
    base.avgScore = zones.length ? base.avgScore / zones.length : 0;
    return {
      ...base,
      critical: summary.critical_zones ?? base.critical,
      exposedPopulation: summary.exposed_population ?? impact?.summary?.population_exposed ?? base.exposedPopulation,
      exposedBuildings: summary.exposed_buildings ?? impact?.summary?.buildings_exposed ?? base.exposedBuildings,
      roadsKm: summary.roads_km_exposed ?? impact?.summary?.roads_km_exposed ?? base.roadsKm,
      maxDepth: summary.max_depth_m ?? impact?.summary?.max_depth_m ?? base.maxDepth,
    };
  }, [zones, summary, impact]);

  const createAlert = (zone) => setAlertDraft({ zone_id: zone.id, commune: zone.commune, message: `[ALERTE FLOODSENSE] ${zone.commune} : niveau ${(RISK[zone.risk_level] || RISK[0]).label}. ${zone.operational_risk?.recommendation || (RISK[zone.risk_level] || RISK[0]).action}` });
  const sendAlert = async () => {
    if (!alertDraft) return;
    try { await axios.post(`${API_BASE}/alerts`, { zone_id: alertDraft.zone_id, alert_type: 'warning', message_fr: alertDraft.message, channel: 'web' }); setToast('Alerte envoyée ou enregistrée.'); setAlertDraft(null); reload(); }
    catch (e) { setToast(`Alerte non envoyée : ${e?.message || 'erreur'}`); }
  };
  const submitIncident = async (body) => {
    const center = selectedFeature ? centroidOf(selectedFeature) : KINSHASA_CENTER;
    try { await axios.post(`${API_BASE}/incidents`, { ...body, latitude: center[0], longitude: center[1] }); setToast('Signalement terrain enregistré.'); reload(); }
    catch (e) { setToast(`Signalement non enregistré : ${e?.message || 'erreur'}`); }
  };

  const openExport = (type) => { window.open(`${API_BASE}/export/${type === 'csv' ? 'zones.csv' : 'zones.geojson'}`, '_blank', 'noopener,noreferrer'); };

  return <div className="floodsense-app">
    <Header status={status} onReload={reload} />
    <main className="command-layout">
      <LeftPanel zones={zones} priority={priority} selectedId={selectedId} setSelectedId={setSelectedId} search={search} setSearch={setSearch} layer={layer} setLayer={setLayer} metrics={metrics} alerts={alerts} incidents={incidents} quality={quality} />
      <CommandMap features={zones} selectedFeature={selectedFeature} setSelectedId={setSelectedId} layer={layer} incidents={incidents} setSelectedIncident={setSelectedIncident} />
      <DetailsPanel feature={selectedFeature} alerts={alerts} weather={weather} incident={selectedIncident} onClose={() => setSelectedId(null)} onCreateAlert={createAlert} onSubmitIncident={submitIncident} />
    </main>
    <BottomOpsBar metrics={metrics} horizon={horizon} setHorizon={setHorizon} onExportGeojson={() => openExport('geojson')} onExportCsv={() => openExport('csv')} alertDraft={alertDraft} setAlertDraft={setAlertDraft} sendAlert={sendAlert} />
    {status.loading && <div className="loading-overlay"><div className="loader" /><span>Synchronisation FloodSense Operational v2…</span></div>}
    {status.error && <div className="error-banner"><strong>Backend non joignable.</strong><span>Vérifie que l’API tourne sur {API_BASE}. Détail : {status.error}</span><button onClick={reload} type="button">Réessayer</button></div>}
    {toast && <div className="toast" onAnimationEnd={() => setToast(null)}>{toast}</div>}
  </div>;
}
