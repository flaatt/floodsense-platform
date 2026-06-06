# FloodSense Kinshasa — Backend Operational Command Center v2

Backend Node.js/Express pour une plateforme opérationnelle de prévention et gestion du risque d'inondation à Kinshasa.

## Capacités incluses

- PostgreSQL/PostGIS + Redis.
- Zones géospatiales de Kinshasa.
- Météo temps réel et historique.
- Prédictions de risque.
- Évaluation d'impact : population, bâtiments, routes, écoles, santé, profondeur estimée.
- Alert Center multi-canal.
- Signalements citoyens géolocalisés.
- Export GeoJSON/CSV.
- Command Center API pour frontend professionnel.
- Data quality flags pour suivre la fiabilité des sources.

## Installation locale

```bash
cp .env.example .env
npm install --legacy-peer-deps --no-audit --no-fund --fetch-retries=10 --fetch-timeout=300000
docker compose up -d db redis
npm run db:doctor
npm run db:init
npm run db:seed
npm run dev
```

API : `http://localhost:3001/api`

## Scripts

```bash
npm run dev        # serveur avec nodemon
npm start          # serveur production
npm run db:doctor  # diagnostic connexion PostgreSQL
npm run db:init    # création schéma PostGIS complet
npm run db:seed    # données de démonstration opérationnelles
npm run db:reset   # reset contrôlé
```

## Endpoints principaux

| Route | Description |
|---|---|
| `GET /health` | Health check |
| `GET /api/zones` | Zones + météo + prédiction + impact + risque opérationnel |
| `GET /api/zones/:id` | Détail zone + historique |
| `GET /api/operations/command-center` | Vue complète Command Center |
| `GET /api/operations/data-quality` | Indicateurs qualité des sources |
| `GET /api/impact/city` | Synthèse impact ville |
| `GET /api/impact/zones/:id` | Profil opérationnel d'une zone |
| `POST /api/impact/run` | Recalcul impact opérationnel |
| `GET /api/incidents` | Signalements citoyens |
| `POST /api/incidents` | Créer un signalement citoyen |
| `GET /api/export/zones.geojson` | Export zones GeoJSON |
| `GET /api/export/dashboard.csv` | Export CSV dashboard |
| `GET /api/alerts/active` | Alertes actives |
| `POST /api/alerts` | Créer une alerte manuelle |
| `GET /api/predictions/current` | Prédictions courantes |
| `POST /api/predictions/trigger` | Recalcul IA / risque |

## Identifiants seed

- Email : `admin@floodsense.cd`
- Mot de passe : `Admin2026!`

## Note géospatiale

Le seed fournit des géométries de démonstration pour lancer l'interface. Pour une version production, remplacer ces géométries par les limites administratives officielles HDX/OSM et intégrer Sentinel/GLOFAS/IMERG dans les tables existantes.
