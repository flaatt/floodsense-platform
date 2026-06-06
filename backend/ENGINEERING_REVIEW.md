# Engineering Review — FloodSense Backend v2

## Diagnostic du backend reçu

Le backend reçu était déjà fonctionnel comme base API Node/Express/PostGIS/Redis, avec les modules essentiels : zones, météo, prédictions, alertes, événements et statistiques. La base était correcte pour une démo, mais insuffisante pour une plateforme opérationnelle de gestion du risque.

## Faiblesses identifiées

1. Le modèle métier restait centré sur `risk_level` et `risk_score`, sans vraie analyse d'impact.
2. La carte frontend recevait surtout des marqueurs/zones simplifiées, pas une API Command Center structurée.
3. Les alertes existaient mais sans journal fin de notification.
4. Les signalements citoyens n'étaient pas intégrés comme source terrain.
5. Il manquait les entités clés d'une plateforme DRM : routes, infrastructures critiques, refuges, exposition, qualité des sources.
6. Les endpoints étaient bons pour une API classique, mais pas encore pour un tableau de bord opérationnel.

## Travail réalisé

### Schéma PostGIS étendu

Ajout des tables :

- `critical_infrastructure`
- `road_segments`
- `evacuation_centers`
- `impact_assessments`
- `citizen_reports`
- `risk_snapshots`
- `data_quality_flags`
- `notification_logs`
- `model_runs`

### Moteur de risque opérationnel

Ajout de `src/utils/riskEngine.js`.

Il calcule :

- hazard
- exposure
- vulnerability
- response capacity
- operational risk score
- operational risk level
- recommendation

### Nouveaux modules API

- `/api/operations/command-center`
- `/api/operations/data-quality`
- `/api/impact/city`
- `/api/impact/zones/:id`
- `/api/impact/run`
- `/api/incidents`
- `/api/export/zones.geojson`
- `/api/export/dashboard.csv`

### Enrichissement `/api/zones`

L'endpoint retourne maintenant :

- météo récente
- prédiction récente
- population exposée
- bâtiments exposés
- routes exposées
- écoles/santé exposées
- profondeur moyenne/max
- risque opérationnel composite

### Seed opérationnel

Le seed ne crée plus seulement des zones : il crée aussi :

- météo de démonstration
- prédictions
- impacts
- infrastructures critiques
- centres d'évacuation
- axes routiers
- data quality flags
- signalement citoyen vérifié

## Validation réalisée

- Vérification syntaxique Node sur tous les fichiers JS.
- Nettoyage du ZIP : exclusion de `node_modules` et logs volumineux.

## Prochaine amélioration critique

Remplacer les géométries de démonstration par les limites administratives officielles de Kinshasa depuis HDX/OSM, puis brancher les couches Sentinel/GLOFAS/IMERG sur les tables opérationnelles déjà préparées.
