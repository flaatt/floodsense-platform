# FloodSense Operational Frontend v2.1 — Carte claire + Heatmap

Cette version remplace la représentation en petits carrés par une lecture cartographique plus professionnelle :

- fond de carte clair CartoDB/OpenStreetMap ;
- heatmap opérationnelle basée sur les centroïdes de zones ;
- contours communaux uniquement quand de vraies géométries PostGIS existent ;
- suppression visuelle des polygones synthétiques carrés ;
- points d’incidents conservés comme couche terrain secondaire ;
- panneau décisionnel et métriques v2 conservés.

## Lancement

```powershell
cp .env.example .env
npm install --legacy-peer-deps --no-audit --no-fund --fetch-retries=10 --fetch-timeout=300000
npm start
```

Backend attendu :

```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Principe cartographique

La carte suit désormais cette hiérarchie :

1. fond clair institutionnel ;
2. heatmap risque/profondeur/pluie/exposition ;
3. contours de communes réelles si disponibles ;
4. incidents citoyens en couche secondaire ;
5. détail zone au clic.

Aucun package supplémentaire n’est requis pour la heatmap : elle est rendue par des marqueurs Leaflet à gradient radial, ce qui évite les échecs d’installation liés à des dépendances supplémentaires sous Windows.
