// ─────────────────────────────────────────────────────────────
// FloodSense Operational Risk Engine
// Calcule un risque opérationnel : aléa × exposition × vulnérabilité × capacité.
// Ce module est volontairement déterministe pour rester robuste même sans service IA.
// ─────────────────────────────────────────────────────────────

function clamp(value, min = 0, max = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalize(value, max) {
  return clamp((Number(value) || 0) / max);
}

function toRiskLevel(score) {
  if (score >= 0.75) return 4;
  if (score >= 0.5) return 3;
  if (score >= 0.25) return 2;
  return 1;
}

function riskLabel(level) {
  return ({ 1: 'Faible', 2: 'Modéré', 3: 'Élevé', 4: 'Critique' })[level] || 'Inconnu';
}

function actionRecommendation(level, zone = {}) {
  if (level >= 4) {
    return `ALERTE CRITIQUE — déclencher la cellule de crise, préparer l'évacuation des zones basses de ${zone.commune || 'la zone'} et informer immédiatement les relais communautaires.`;
  }
  if (level >= 3) {
    return `PRÉ-ALERTE — surveiller les points bas, prépositionner les équipes et envoyer une information préventive aux chefs de quartier de ${zone.commune || 'la zone'}.`;
  }
  if (level >= 2) {
    return `SURVEILLANCE RENFORCÉE — suivre l'évolution pluviométrique, vérifier les drains et maintenir les contacts locaux disponibles.`;
  }
  return 'Situation normale : surveillance standard et mise à jour périodique.';
}

function computeOperationalRisk({ zone = {}, weather = {}, prediction = {}, impact = {} }) {
  const rainfall1h = Number(weather.rainfall_1h || 0);
  const rainfall24h = Number(weather.rainfall_24h || 0);
  const rainfall72h = Number(weather.rainfall_72h || 0);
  const forecast24h = Number(weather.forecast_rain_24h || weather.forecast_rain || 0);
  const aiProbability = Number(prediction.flood_probability ?? zone.risk_score ?? 0);

  const hazard = clamp(
    0.18 * normalize(rainfall1h, 35) +
    0.24 * normalize(rainfall24h, 100) +
    0.26 * normalize(rainfall72h, 180) +
    0.18 * normalize(forecast24h, 90) +
    0.14 * clamp(aiProbability)
  );

  const population = Number(zone.population || 0);
  const area = Math.max(Number(zone.area_sqkm || 1), 0.1);
  const density = population / area;
  const exposedPopulation = Number(impact.population_exposed || population * clamp(aiProbability || zone.risk_score || 0.15));
  const exposedBuildings = Number(impact.buildings_exposed || 0);

  const exposure = clamp(
    0.45 * normalize(exposedPopulation, 250000) +
    0.25 * normalize(population, 900000) +
    0.2 * normalize(density, 70000) +
    0.1 * normalize(exposedBuildings, 25000)
  );

  const vulnerability = clamp(
    0.35 * normalize(zone.impervious_ratio || 0, 0.85) +
    0.25 * (1 - normalize(zone.elevation_min || zone.elevation_avg || 350, 550)) +
    0.2 * normalize(zone.drainage_density || 0, 2.5) +
    0.2 * normalize(zone.slope_avg || 0, 12)
  );

  const responseCapacity = clamp(
    0.45 * normalize(impact.evacuation_centers_count || 0, 8) +
    0.35 * (1 - normalize(impact.road_segments_exposed || 0, 80)) +
    0.2 * normalize(impact.contacts_count || 0, 10)
  );

  const score = clamp(
    0.38 * hazard +
    0.27 * exposure +
    0.22 * vulnerability +
    0.13 * (1 - responseCapacity)
  );
  const level = toRiskLevel(score);

  return {
    risk_score: Number(score.toFixed(4)),
    risk_level: level,
    risk_label: riskLabel(level),
    components: {
      hazard: Number(hazard.toFixed(4)),
      exposure: Number(exposure.toFixed(4)),
      vulnerability: Number(vulnerability.toFixed(4)),
      response_capacity: Number(responseCapacity.toFixed(4)),
    },
    recommendation: actionRecommendation(level, zone),
  };
}

module.exports = { clamp, normalize, toRiskLevel, riskLabel, actionRecommendation, computeOperationalRisk };
