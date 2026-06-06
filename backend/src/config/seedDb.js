// ─────────────────────────────────────────────────────────────
//  src/config/seedDb.js — Données initiales Kinshasa
//  Communes avec coordonnées approximatives + données terrain
// ─────────────────────────────────────────────────────────────
require('dotenv').config();
const { pool } = require('./database');
const bcrypt = require('bcryptjs');

// 24 communes de Kinshasa avec données terrain réelles
const KINSHASA_ZONES = [
  { commune: 'Ndjili',       lat: -4.420, lon: 15.408, elev_avg: 295, elev_min: 285, area: 18.2, pop: 750000, risk: 4, impervious: 0.65, drainage: 0.8 },
  { commune: 'Bumbu',        lat: -4.390, lon: 15.290, elev_avg: 310, elev_min: 295, area: 9.8,  pop: 520000, risk: 4, impervious: 0.70, drainage: 0.6 },
  { commune: 'Kimbanseke',   lat: -4.450, lon: 15.430, elev_avg: 280, elev_min: 265, area: 56.4, pop: 890000, risk: 3, impervious: 0.45, drainage: 1.2 },
  { commune: 'Selembao',     lat: -4.370, lon: 15.270, elev_avg: 340, elev_min: 310, area: 22.3, pop: 650000, risk: 3, impervious: 0.55, drainage: 0.9 },
  { commune: 'Limete',       lat: -4.340, lon: 15.340, elev_avg: 300, elev_min: 285, area: 20.7, pop: 480000, risk: 3, impervious: 0.60, drainage: 0.7 },
  { commune: 'Masina',       lat: -4.380, lon: 15.430, elev_avg: 270, elev_min: 255, area: 38.9, pop: 720000, risk: 4, impervious: 0.50, drainage: 1.1 },
  { commune: 'Kisenso',      lat: -4.410, lon: 15.340, elev_avg: 360, elev_min: 320, area: 14.2, pop: 430000, risk: 2, impervious: 0.55, drainage: 0.5 },
  { commune: 'Makala',       lat: -4.380, lon: 15.300, elev_avg: 320, elev_min: 305, area: 7.9,  pop: 370000, risk: 2, impervious: 0.68, drainage: 0.4 },
  { commune: 'Kalamu',       lat: -4.340, lon: 15.310, elev_avg: 318, elev_min: 308, area: 5.2,  pop: 320000, risk: 2, impervious: 0.75, drainage: 0.3 },
  { commune: 'Matete',       lat: -4.360, lon: 15.350, elev_avg: 302, elev_min: 292, area: 6.8,  pop: 290000, risk: 2, impervious: 0.72, drainage: 0.4 },
  { commune: 'Ngaba',        lat: -4.370, lon: 15.310, elev_avg: 315, elev_min: 305, area: 6.1,  pop: 280000, risk: 2, impervious: 0.70, drainage: 0.3 },
  { commune: 'Ngiri-Ngiri',  lat: -4.350, lon: 15.300, elev_avg: 322, elev_min: 312, area: 4.3,  pop: 260000, risk: 1, impervious: 0.78, drainage: 0.2 },
  { commune: 'Bandalungwa',  lat: -4.340, lon: 15.290, elev_avg: 328, elev_min: 318, area: 5.6,  pop: 270000, risk: 1, impervious: 0.76, drainage: 0.2 },
  { commune: 'Kintambo',     lat: -4.320, lon: 15.280, elev_avg: 312, elev_min: 295, area: 3.8,  pop: 180000, risk: 2, impervious: 0.72, drainage: 0.4 },
  { commune: 'Lingwala',     lat: -4.305, lon: 15.295, elev_avg: 308, elev_min: 298, area: 3.2,  pop: 160000, risk: 1, impervious: 0.80, drainage: 0.2 },
  { commune: 'Gombe',        lat: -4.300, lon: 15.315, elev_avg: 330, elev_min: 315, area: 6.7,  pop: 80000,  risk: 1, impervious: 0.85, drainage: 0.2 },
  { commune: 'Barumbu',      lat: -4.315, lon: 15.325, elev_avg: 310, elev_min: 300, area: 5.1,  pop: 200000, risk: 1, impervious: 0.78, drainage: 0.3 },
  { commune: 'Kinshasa',     lat: -4.310, lon: 15.310, elev_avg: 315, elev_min: 300, area: 4.9,  pop: 190000, risk: 1, impervious: 0.80, drainage: 0.2 },
  { commune: 'Kasavubu',     lat: -4.330, lon: 15.310, elev_avg: 320, elev_min: 310, area: 4.4,  pop: 230000, risk: 1, impervious: 0.77, drainage: 0.2 },
  { commune: 'Mont-Ngafula', lat: -4.430, lon: 15.270, elev_avg: 500, elev_min: 350, area: 197,  pop: 540000, risk: 2, impervious: 0.25, drainage: 2.1 },
  { commune: 'Nsele',        lat: -4.330, lon: 15.500, elev_avg: 290, elev_min: 270, area: 544,  pop: 320000, risk: 3, impervious: 0.20, drainage: 1.8 },
  { commune: 'Maluku',       lat: -4.050, lon: 15.580, elev_avg: 320, elev_min: 290, area: 6920, pop: 210000, risk: 2, impervious: 0.10, drainage: 2.5 },
  { commune: 'Ngaliema',     lat: -4.340, lon: 15.250, elev_avg: 420, elev_min: 300, area: 110,  pop: 610000, risk: 2, impervious: 0.35, drainage: 1.5 },
  { commune: 'Lemba',        lat: -4.400, lon: 15.330, elev_avg: 345, elev_min: 315, area: 24.3, pop: 490000, risk: 2, impervious: 0.58, drainage: 0.6 },
];

// Événements historiques d'inondation (données OCHA/presse)
const HISTORICAL_EVENTS = [
  { commune: 'Ndjili',     date: '2024-04-15', severity: 'catastrophic', deaths: 12, displaced: 4500 },
  { commune: 'Bumbu',      date: '2024-04-15', severity: 'severe',       deaths: 5,  displaced: 2100 },
  { commune: 'Masina',     date: '2024-04-15', severity: 'severe',       deaths: 3,  displaced: 1800 },
  { commune: 'Kimbanseke', date: '2024-02-20', severity: 'moderate',     deaths: 1,  displaced: 800  },
  { commune: 'Ndjili',     date: '2023-11-08', severity: 'severe',       deaths: 8,  displaced: 3200 },
  { commune: 'Selembao',   date: '2023-11-08', severity: 'moderate',     deaths: 2,  displaced: 950  },
  { commune: 'Limete',     date: '2023-11-08', severity: 'minor',        deaths: 0,  displaced: 300  },
  { commune: 'Ndjili',     date: '2023-04-22', severity: 'catastrophic', deaths: 15, displaced: 5800 },
  { commune: 'Bumbu',      date: '2023-04-22', severity: 'severe',       deaths: 6,  displaced: 2400 },
  { commune: 'Masina',     date: '2023-04-22', severity: 'catastrophic', deaths: 9,  displaced: 4100 },
  { commune: 'Kimbanseke', date: '2022-12-05', severity: 'moderate',     deaths: 2,  displaced: 1100 },
  { commune: 'Ndjili',     date: '2022-12-05', severity: 'severe',       deaths: 7,  displaced: 2900 },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Démarrage du seed...\n');

    // 1. Admin user
    const hash = await bcrypt.hash('Admin2026!', 12);
    await client.query(`
      INSERT INTO users (username, email, password, role)
      VALUES ('admin', 'admin@floodsense.cd', $1, 'admin')
      ON CONFLICT (email) DO NOTHING
    `, [hash]);
    console.log('✅ Utilisateur admin créé (mot de passe: Admin2026!)');

    // 2. Zones
    let inserted = 0;
    for (const z of KINSHASA_ZONES) {
      // Créer un polygone approximatif (carré ~2km) autour du centroïde
      const delta = 0.01;
      const geomWKT = `MULTIPOLYGON(((
        ${z.lon - delta} ${z.lat - delta},
        ${z.lon + delta} ${z.lat - delta},
        ${z.lon + delta} ${z.lat + delta},
        ${z.lon - delta} ${z.lat + delta},
        ${z.lon - delta} ${z.lat - delta}
      )))`;

      const result = await client.query(`
        INSERT INTO flood_zones
          (commune, geometry, risk_level, risk_score, elevation_avg, elevation_min,
           area_sqkm, population, impervious_ratio, drainage_density)
        VALUES ($1, ST_GeomFromText($2, 4326), $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        z.commune, geomWKT, z.risk, z.risk / 4.0,
        z.elev_avg, z.elev_min, z.area, z.pop,
        z.impervious, z.drainage
      ]);

      if (result.rows.length > 0) inserted++;
    }
    console.log(`✅ ${inserted} zones de Kinshasa créées`);

    // 3. Événements historiques
    let eventsInserted = 0;
    for (const e of HISTORICAL_EVENTS) {
      const zone = await client.query(
        'SELECT id FROM flood_zones WHERE commune = $1 LIMIT 1', [e.commune]
      );
      if (zone.rows.length === 0) continue;

      await client.query(`
        INSERT INTO flood_events (zone_id, event_date, severity, deaths, displaced, source, confirmed)
        VALUES ($1, $2, $3, $4, $5, 'OCHA/Presse locale', TRUE)
        ON CONFLICT DO NOTHING
      `, [zone.rows[0].id, e.date, e.severity, e.deaths, e.displaced]);
      eventsInserted++;
    }
    console.log(`✅ ${eventsInserted} événements historiques importés`);

    // 4. Contacts exemple
    const ndjiliZone = await client.query("SELECT id FROM flood_zones WHERE commune='Ndjili' LIMIT 1");
    if (ndjiliZone.rows.length > 0) {
      await client.query(`
        INSERT INTO contacts (zone_id, name, role, phone, email)
        VALUES ($1, 'Chef de quartier Ndjili', 'Chef de Quartier', '+243812345678', 'chef.ndjili@example.cd')
        ON CONFLICT DO NOTHING
      `, [ndjiliZone.rows[0].id]);
    }
    console.log('✅ Contacts exemples créés');

    // 5. Données opérationnelles v2 : météo, prédictions, impacts, infrastructures, qualité
    const zones = await client.query('SELECT * FROM flood_zones ORDER BY id');
    for (const zone of zones.rows) {
      const baseRisk = Number(zone.risk_score || 0.15);
      const rainfall1h = Number((baseRisk * 22 + Math.random() * 4).toFixed(1));
      const rainfall24h = Number((baseRisk * 95 + Math.random() * 12).toFixed(1));
      const rainfall72h = Number((rainfall24h * 1.9 + Math.random() * 20).toFixed(1));

      await client.query(`
        INSERT INTO weather_readings
          (zone_id, commune, timestamp, rainfall_1h, rainfall_24h, rainfall_72h,
           temperature, humidity, wind_speed, weather_desc, source, raw_data)
        VALUES ($1,$2,NOW(),$3,$4,$5,$6,$7,$8,$9,'seed_demo', '{}'::jsonb)
      `, [zone.id, zone.commune, rainfall1h, rainfall24h, rainfall72h,
          Number((25 + Math.random() * 5).toFixed(1)), Math.round(70 + baseRisk * 22),
          Number((2 + Math.random() * 3).toFixed(1)), rainfall24h > 50 ? 'pluie forte' : 'nuageux']);

      await client.query(`
        INSERT INTO predictions (zone_id, flood_probability, risk_level, horizon_hours, features_used, model_version, recommendation)
        VALUES ($1,$2,$3,24,$4,'operational_composite_v2',$5)
      `, [zone.id, baseRisk, zone.risk_level,
          JSON.stringify({ rainfall_1h: rainfall1h, rainfall_24h: rainfall24h, rainfall_72h: rainfall72h, source: 'seed' }),
          zone.risk_level >= 4 ? 'Déclencher alerte critique et préparer évacuation préventive.' : zone.risk_level >= 3 ? 'Pré-alerte : surveiller les quartiers bas et informer les relais.' : 'Surveillance standard renforcée.']);

      const exposedRatio = Math.min(0.8, Math.max(0.04, baseRisk * 0.72 + Number(zone.impervious_ratio || 0) * 0.12));
      const exposedPopulation = Math.round(Number(zone.population || 0) * exposedRatio);
      const buildingsExposed = Math.round(exposedPopulation / 5.2);
      const roadsKm = Number((Number(zone.area_sqkm || 1) * exposedRatio * 0.55).toFixed(2));
      const maxDepth = Number((baseRisk * 1.15 + Number(zone.drainage_density || 0) * 0.07).toFixed(2));
      await client.query(`
        INSERT INTO impact_assessments
          (zone_id, scenario_name, hazard_probability, mean_depth_m, max_depth_m,
           population_exposed, buildings_exposed, roads_km_exposed,
           schools_exposed, health_facilities_exposed, markets_exposed,
           estimated_damage_usd, method, confidence)
        VALUES ($1,'current_operational',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'seed_operational_v2','medium')
      `, [zone.id, baseRisk, Number((maxDepth * 0.52).toFixed(2)), maxDepth,
          exposedPopulation, buildingsExposed, roadsKm,
          Math.round(exposedPopulation / 45000), Math.round(exposedPopulation / 120000), Math.round(exposedPopulation / 90000),
          Math.round(buildingsExposed * 450 + roadsKm * 60000)]);

      const lon = zone.geometry ? null : null;
      // Infrastructures stylisées à proximité du centroïde approximatif initial.
      const coord = KINSHASA_ZONES.find(k => k.commune === zone.commune) || { lat: -4.32, lon: 15.32 };
      await client.query(`
        INSERT INTO critical_infrastructure (zone_id, asset_type, name, location, capacity, vulnerability_score, operational_status)
        VALUES
          ($1,'school',$2,ST_SetSRID(ST_MakePoint($3,$4),4326),1200,$5,'operational'),
          ($1,'health',$6,ST_SetSRID(ST_MakePoint($7,$8),4326),120,$9,'operational')
        ON CONFLICT DO NOTHING
      `, [zone.id, `École principale ${zone.commune}`, coord.lon + 0.003, coord.lat + 0.002, baseRisk,
          `Centre de santé ${zone.commune}`, coord.lon - 0.003, coord.lat - 0.002, baseRisk * 0.8]);

      await client.query(`
        INSERT INTO evacuation_centers (zone_id, name, location, capacity, status)
        VALUES ($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326),$5,'available')
        ON CONFLICT DO NOTHING
      `, [zone.id, `Point refuge ${zone.commune}`, coord.lon + 0.006, coord.lat, Math.round(1000 + Number(zone.population || 0) * 0.006)]);

      await client.query(`
        INSERT INTO road_segments (zone_id, road_name, road_class, geometry, length_km, criticality_score, flood_susceptibility, status)
        VALUES ($1,$2,'primary',ST_SetSRID(ST_MakeLine(ST_MakePoint($3,$4), ST_MakePoint($5,$6)),4326),$7,$8,$9,$10)
      `, [zone.id, `Axe stratégique ${zone.commune}`, coord.lon - 0.008, coord.lat - 0.005, coord.lon + 0.008, coord.lat + 0.005,
          Number((Number(zone.area_sqkm || 1) * 0.08).toFixed(2)), baseRisk, baseRisk, baseRisk > 0.75 ? 'at_risk' : 'open']);

      await client.query(`
        INSERT INTO data_quality_flags (zone_id, source_name, quality_level, issue_type, message, metadata)
        VALUES
          ($1,'OpenWeatherMap','medium','temporal_resolution','Donnée météo horaire opérationnelle, à consolider avec IMERG.', '{}'::jsonb),
          ($1,'PostGIS geometry','medium','demo_geometry','Polygone de démonstration à remplacer par limites administratives HDX/OSM.', '{}'::jsonb),
          ($1,'Impact model','medium','synthetic_seed','Impact estimé par modèle déterministe v2 pour démonstration.', '{}'::jsonb)
      `, [zone.id]);
    }
    console.log(`✅ Données opérationnelles v2 générées pour ${zones.rows.length} zones`);

    // 6. Signalement citoyen de démonstration
    const nZone = await client.query("SELECT id FROM flood_zones WHERE commune='Ndjili' LIMIT 1");
    if (nZone.rows.length > 0) {
      await client.query(`
        INSERT INTO citizen_reports
          (zone_id, reporter_name, reporter_phone, location, water_depth_cm, road_blocked, house_affected, description, status)
        VALUES ($1,'Relais communautaire Ndjili','+243810000001',ST_SetSRID(ST_MakePoint(15.408,-4.420),4326),45,true,true,'Eau signalée dans plusieurs rues basses.','verified')
      `, [nZone.rows[0].id]);
    }
    console.log('✅ Signalement citoyen exemple créé');

    console.log('\n🎉 Seed terminé avec succès!');
    console.log('📌 Login admin: admin / Admin2026!');

  } catch (err) {
    console.error('❌ Erreur seed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
