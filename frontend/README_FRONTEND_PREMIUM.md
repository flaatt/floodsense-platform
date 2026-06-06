# FloodSense Frontend Premium

Interface React + Leaflet modernisée pour visualiser les zones d'inondation de Kinshasa.

## Démarrage local

```bash
cp .env.example .env
npm install
npm start
```

Ouvrir : http://localhost:3000

Le backend doit tourner sur : http://localhost:3001/api

## Build validé

Ce package a été testé avec :

```bash
CI=false npm run build
```

## Améliorations incluses

- Application stabilisée autour d'une seule entrée `App.jsx`.
- `App.js` redirige vers `App.jsx` pour éviter les conflits CRA.
- Design premium type command center.
- Carte Leaflet plein écran avec tuiles sombres CARTO.
- Recherche par commune/quartier.
- Couches : risque, pluie, altitude.
- Panneau gauche avec KPIs opérationnels.
- Panneau droit avec détail zone, score IA, météo et alertes.
- Gestion API robuste : `/zones`, `/alerts`, `/weather/current`.
- Fallback géométrique si une zone n'a pas encore de polygone.
- Bannière d'erreur claire si le backend n'est pas joignable.
- CSS responsive desktop/tablette/mobile.

## Fichiers principaux modifiés

- `src/App.jsx`
- `src/App.js`
- `src/index.js`
- `src/styles/premium.css`
- `.env.example`
- `package.json`
