// ─────────────────────────────────────────────────────────────
//  src/pages/MapPage.js — Page principale (carte publique)
// ─────────────────────────────────────────────────────────────
import React from 'react';
import TopBar       from '../components/Layout/TopBar';
import FloodMap     from '../components/Map/FloodMap';
import AlertsBanner from '../components/Alerts/AlertsBanner';
import { useZones }       from '../hooks/useZones';
import { useActiveAlerts } from '../hooks/useAlerts';
import { Spinner } from '../components/UI';
import './pages.css';

export default function MapPage() {
  const { isLoading: zonesLoading } = useZones();
  useActiveAlerts(); // preload alerts into store

  return (
    <div className="page-map">
      <TopBar />
      <AlertsBanner />

      <main className="map-main">
        {zonesLoading ? (
          <div className="map-loading">
            <Spinner size={40} />
            <p>Chargement des zones de Kinshasa...</p>
          </div>
        ) : (
          <FloodMap />
        )}
      </main>

      {/* Bottom status strip */}
      <div className="map-status-strip">
        <span className="mss-dot mss-dot-live" />
        <span className="mss-text font-mono">Live — Mise à jour automatique toutes les 5 min</span>
        <span className="mss-sep" />
        <span className="mss-text font-mono">OpenStreetMap • NASA SRTM • OpenWeatherMap</span>
      </div>
    </div>
  );
}
