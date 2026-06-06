// ─────────────────────────────────────────────────────────────
//  src/components/Map/FloodMap.js
//  Carte principale Leaflet avec zones de risque
// ─────────────────────────────────────────────────────────────
import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, ZoomControl } from 'react-leaflet';
import { useZonesStore, RISK_CONFIG } from '../../store/zonesStore';
import ZonePopup  from './ZonePopup';
import MapLegend  from './MapLegend';
import MapControls from './MapControls';
import './map.css';

// Kinshasa centre
const CENTER = [-4.325, 15.322];
const ZOOM   = 11;

// Tile sombre qui ressemble à un écran de radar
const TILE_URL     = 'https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png';
const TILE_ATTRIB  = '© OpenStreetMap © CARTO';

function zoneStyle(feature) {
  const level = feature.properties?.risk_level || 0;
  const score = feature.properties?.risk_score || 0;
  const cfg   = RISK_CONFIG[level] || RISK_CONFIG[0];
  return {
    fillColor:   cfg.hex,
    fillOpacity: 0.30 + score * 0.25,  // plus opaque = plus de risque
    color:       level >= 3 ? cfg.hex : 'rgba(0,200,255,0.3)',
    weight:      level >= 3 ? 2 : 1,
    dashArray:   level >= 4 ? null : '4,3',
  };
}

function zoneHoverStyle(feature) {
  const level = feature.properties?.risk_level || 0;
  const cfg   = RISK_CONFIG[level] || RISK_CONFIG[0];
  return {
    fillColor:   cfg.hex,
    fillOpacity: 0.6,
    color:       cfg.hex,
    weight:      2.5,
  };
}

export default function FloodMap() {
  const zones       = useZonesStore(s => s.getFilteredZones());
  const setSelected = useZonesStore(s => s.setSelectedZone);
  const selected    = useZonesStore(s => s.selectedZone);
  const geoJsonRef  = useRef(null);

  // Convertir les zones en GeoJSON FeatureCollection
  const geoData = {
    type: 'FeatureCollection',
    features: zones
      .filter(z => z.geometry)
      .map(z => ({
        type: 'Feature',
        geometry: z.geometry,
        properties: {
          id:            z.id,
          commune:       z.commune,
          quartier:      z.quartier,
          risk_level:    z.risk_level,
          risk_score:    z.risk_score,
          population:    z.population,
          rainfall_1h:   z.rainfall_1h,
          rainfall_24h:  z.rainfall_24h,
          temperature:   z.temperature,
          humidity:      z.humidity,
          weather_desc:  z.weather_desc,
          last_updated:  z.last_updated,
          recommendation: z.last_recommendation,
          total_flood_events: z.total_flood_events,
          last_flood_date:    z.last_flood_date,
        }
      }))
  };

  function onEachFeature(feature, layer) {
    // Hover
    layer.on({
      mouseover: (e) => {
        e.target.setStyle(zoneHoverStyle(feature));
        e.target.bringToFront();
      },
      mouseout: (e) => {
        e.target.setStyle(zoneStyle(feature));
      },
      click: () => {
        setSelected(feature.properties);
      }
    });
    // Tooltip léger sur hover
    layer.bindTooltip(
      `<div class="zone-tooltip">
         <strong>${feature.properties.commune}</strong>
         <span class="zt-risk" style="color:${RISK_CONFIG[feature.properties.risk_level]?.hex}">
           ● ${RISK_CONFIG[feature.properties.risk_level]?.label || '—'}
         </span>
       </div>`,
      { permanent: false, direction: 'top', className: 'leaflet-tooltip-dark', sticky: true }
    );
  }

  return (
    <div className="map-wrapper">
      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        className="leaflet-map"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIB} />
        <ZoomControl position="bottomright" />

        {geoData.features.length > 0 && (
          <GeoJSON
            key={JSON.stringify(zones.map(z => `${z.id}:${z.risk_level}`))}
            data={geoData}
            style={zoneStyle}
            onEachFeature={onEachFeature}
            ref={geoJsonRef}
          />
        )}

        <MapLegend />
        <MapControls />
      </MapContainer>

      {/* Panneau de détail zone */}
      {selected && <ZonePopup zone={selected} onClose={() => setSelected(null)} />}

      {/* Scan line effect */}
      <div className="map-scanline" aria-hidden="true" />
    </div>
  );
}
