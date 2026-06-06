// ─────────────────────────────────────────────────────────────
//  src/components/Map/FloodMap.jsx
//  Carte principale Leaflet avec zones de risque
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useZones } from '../../hooks/useZones';
import { useAppStore } from '../../store/useAppStore';
import { getRiskColor, getRiskFill } from '../UI/RiskBadge';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { ZonePopup } from './ZonePopup';
import { Spinner } from '../UI/Spinner';

// Couche de tuiles sombre adaptée à notre palette
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function FlyToZone({ zone }) {
  const map = useMap();
  React.useEffect(() => {
    if (!zone?.geometry) return;
    // Centrer la carte sur le centroïde de la zone
    try {
      const coords = zone.geometry.coordinates[0][0];
      if (coords?.length >= 2) {
        const lats = coords.map(c => c[1]);
        const lons = coords.map(c => c[0]);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
        map.flyTo([centerLat, centerLon], 13, { duration: 1.2 });
      }
    } catch {}
  }, [zone, map]);
  return null;
}

export function FloodMap() {
  const { data: zones, isLoading } = useZones();
  const { selectedZone, setSelectedZone, activeLayer } = useAppStore();

  // Convertir chaque zone en Feature GeoJSON
  const features = useMemo(() => {
    if (!zones) return [];
    return zones.filter(z => z.geometry).map(z => ({
      type: 'Feature',
      geometry: z.geometry,
      properties: z,
    }));
  }, [zones]);

  const styleFeature = useCallback((feature) => {
    const z = feature.properties;
    const isSelected = selectedZone?.id === z.id;

    if (activeLayer === 'rainfall') {
      // Colorer par intensité de pluie
      const rain = z.rainfall_1h || 0;
      const color = rain > 30 ? '#E8314A' : rain > 15 ? '#F07B1D' : rain > 5 ? '#F5C542' : '#1DB954';
      return {
        fillColor: color + '88', color,
        weight: isSelected ? 3 : 1.5,
        fillOpacity: isSelected ? 0.85 : 0.55,
        dashArray: isSelected ? null : null,
      };
    }

    if (activeLayer === 'elevation') {
      // Gradient par altitude
      const elev = z.elevation_avg || 300;
      const t = Math.min((elev - 260) / 200, 1);
      const r = Math.round(30 + t * 100);
      const g = Math.round(80 + t * 80);
      const b = Math.round(160 - t * 60);
      const color = `rgb(${r},${g},${b})`;
      return { fillColor: color, color: '#8FA3BA', weight: 1, fillOpacity: 0.6 };
    }

    // Default: risk layer
    return {
      fillColor: getRiskFill(z.risk_level),
      color: isSelected ? '#00C8FF' : getRiskColor(z.risk_level),
      weight: isSelected ? 3 : 1.5,
      fillOpacity: isSelected ? 0.85 : 0.5,
      opacity: 1,
    };
  }, [activeLayer, selectedZone]);

  const onEachFeature = useCallback((feature, layer) => {
    const z = feature.properties;
    layer.on({
      click: () => setSelectedZone(z),
      mouseover: (e) => {
        e.target.setStyle({ weight: 3, fillOpacity: 0.75 });
        e.target.bindTooltip(`
          <div style="font-family:DM Mono,monospace;font-size:12px;padding:4px 0">
            <strong style="font-family:Barlow Condensed;font-size:15px">${z.commune}</strong><br/>
            Risque: ${['—','FAIBLE','MODÉRÉ','ÉLEVÉ','CRITIQUE'][z.risk_level] || '—'}<br/>
            Pluie: ${(z.rainfall_1h || 0).toFixed(1)} mm/h
          </div>
        `, { sticky: true, direction: 'top', className: '' }).openTooltip();
      },
      mouseout: (e) => {
        layer.closeTooltip();
        layer.setStyle(styleFeature(feature));
      },
    });
  }, [setSelectedZone, styleFeature]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,14,20,0.7)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <Spinner size={40} color="#00C8FF" />
            <p style={{ marginTop: 12, fontFamily: 'DM Mono', fontSize: 12, color: '#8FA3BA' }}>
              CHARGEMENT DES ZONES...
            </p>
          </div>
        </div>
      )}

      <MapContainer
        center={[-4.322, 15.322]}
        zoom={11}
        zoomControl={false}
        style={{ width: '100%', height: '100%', background: '#0A0E14' }}
      >
        <TileLayer url={TILE_URL} />
        <ZoomControl position="bottomright" />

        {features.map((f, i) => (
          <GeoJSON
            key={`${f.properties.id}-${activeLayer}-${f.properties.risk_level}`}
            data={f}
            style={() => styleFeature(f)}
            onEachFeature={onEachFeature}
          />
        ))}

        {selectedZone && <FlyToZone zone={selectedZone} />}
      </MapContainer>

      {/* Map overlays */}
      <MapControls />
      <MapLegend activeLayer={activeLayer} />
      {selectedZone && <ZonePopup zone={selectedZone} onClose={() => setSelectedZone(null)} />}
    </div>
  );
}
