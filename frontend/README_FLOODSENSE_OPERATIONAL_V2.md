# FloodSense Frontend Operational v2

Interface React/Leaflet alignée avec le backend `backend-floodsense-operational-v2`.

## Endpoints utilisés

- `GET /api/operations/command-center`
- `GET /api/impact/city`
- `GET /api/incidents`
- `GET /api/operations/data-quality`
- `GET /api/alerts`
- `GET /api/weather/current`
- fallback : `GET /api/zones`
- exports : `/api/export/zones.geojson`, `/api/export/zones.csv`
- actions : `POST /api/alerts`, `POST /api/incidents`

## Lancement

```bash
cp .env.example .env
npm install --legacy-peer-deps --no-audit --no-fund --fetch-retries=10 --fetch-timeout=300000
npm start
```

Backend attendu :

```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Améliorations intégrées

- Command Center opérationnel, pas seulement visualisation.
- Couche risque composite.
- Couche profondeur estimée.
- Couche pluie 72h.
- Couche population exposée.
- Couche qualité de données.
- Couche signalements citoyens.
- Panneau priorités communales.
- Analyse d'impact : population, bâtiments, routes, écoles, santé.
- Formulaire de signalement terrain rapide.
- Préparation et envoi d'alerte web.
- Exports GeoJSON / CSV.
- Fallback si les géométries PostGIS ne sont pas encore disponibles.
