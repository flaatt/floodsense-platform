# FloodSense Operational Command Center v3

Version renforcée à partir de la version Heatmap Light.

## Corrections majeures

- Panneaux gauche et droit désormais scrollables : les sections `Top zones à traiter`, `Recommandation opérationnelle`, `Météo`, `Alertes` et `Signalement terrain` restent accessibles sur écrans 1366x768.
- Interface plus compacte et plus institutionnelle.
- Ajout d’une posture ville : veille / vigilance / alerte.
- Ajout d’un mini `Alert Center` dans le panneau gauche.
- Ajout d’une bande décisionnelle dans le panneau zone : horizon critique, tendance, confiance IA, priorité action.
- Ajout d’une matrice de qualité scientifique : Sentinel, GLOFAS, DEM, météo.
- Footer opérationnel enrichi : population, bâtiments, routes, écoles, santé.
- Priorisation étendue à 8 zones.
- Heatmap conservée comme couche principale, avec contours communaux si géométries réelles disponibles.

## Lancement

```powershell
cp .env.example .env
npm install --legacy-peer-deps --no-audit --no-fund --fetch-retries=10 --fetch-timeout=300000
npm start
```

## Backend attendu

```env
REACT_APP_API_URL=http://localhost:3001/api
```

Endpoints utilisés :

- `/api/operations/command-center`
- `/api/impact/city`
- `/api/incidents`
- `/api/operations/data-quality`
- `/api/alerts`
- `/api/weather/current`
- `/api/export/zones.geojson`
- `/api/export/zones.csv`

## Note importante

La heatmap est optimisée pour les données de démonstration et les centroïdes de communes. La qualité maximale sera atteinte lorsque le backend fournira les polygones PostGIS réels de Kinshasa.
