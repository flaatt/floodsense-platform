require('dotenv').config();
const { Pool } = require('pg');

console.log('DATABASE_URL utilisée:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SQL = `
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS flood_zones (
  id SERIAL PRIMARY KEY,
  commune VARCHAR(100) NOT NULL UNIQUE,
  quartier VARCHAR(100),
  geometry GEOMETRY(MULTIPOLYGON, 4326),
  risk_level INTEGER DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 4),
  risk_score FLOAT DEFAULT 0.0 CHECK (risk_score BETWEEN 0.0 AND 1.0),
  elevation_avg FLOAT,
  elevation_min FLOAT,
  elevation_max FLOAT,
  slope_avg FLOAT,
  area_sqkm FLOAT,
  population INTEGER DEFAULT 0,
  impervious_ratio FLOAT DEFAULT 0.5,
  drainage_density FLOAT DEFAULT 0.0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weather_readings (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
  location GEOMETRY(POINT, 4326),
  commune VARCHAR(100),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  rainfall_1h FLOAT DEFAULT 0,
  rainfall_3h FLOAT DEFAULT 0,
  rainfall_24h FLOAT DEFAULT 0,
  rainfall_72h FLOAT DEFAULT 0,
  temperature FLOAT,
  humidity FLOAT,
  wind_speed FLOAT,
  wind_direction FLOAT,
  pressure FLOAT,
  weather_code INTEGER,
  weather_desc VARCHAR(100),
  source VARCHAR(50) DEFAULT 'openweather',
  raw_data JSONB
);

CREATE TABLE IF NOT EXISTS weather_forecasts (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
  forecast_time TIMESTAMP WITH TIME ZONE NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rainfall_mm FLOAT DEFAULT 0,
  temperature FLOAT,
  humidity FLOAT,
  pop FLOAT DEFAULT 0,
  raw_data JSONB
);

CREATE TABLE IF NOT EXISTS flood_events (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('minor','moderate','severe','catastrophic')),
  deaths INTEGER DEFAULT 0,
  injured INTEGER DEFAULT 0,
  displaced INTEGER DEFAULT 0,
  houses_dmg INTEGER DEFAULT 0,
  source VARCHAR(200),
  source_url VARCHAR(500),
  confirmed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
  predicted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  flood_probability FLOAT NOT NULL CHECK (flood_probability BETWEEN 0 AND 1),
  risk_level INTEGER NOT NULL CHECK (risk_level BETWEEN 1 AND 4),
  horizon_hours INTEGER DEFAULT 24,
  features_used JSONB,
  model_version VARCHAR(50) DEFAULT 'xgboost_v1',
  recommendation TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE SET NULL,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('watch','warning','emergency')),
  risk_level INTEGER CHECK (risk_level BETWEEN 1 AND 4),
  message_fr TEXT NOT NULL,
  message_ln TEXT,
  channels TEXT[] DEFAULT ARRAY['web'],
  recipients_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by VARCHAR(100) DEFAULT 'system',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(200),
  whatsapp VARCHAR(20),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password VARCHAR(200) NOT NULL,
  role VARCHAR(20) DEFAULT 'operator' CHECK (role IN ('admin','operator','viewer')),
  active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Plateforme opérationnelle DRM / FloodSense v2 ─────────────
ALTER TABLE flood_zones ADD COLUMN IF NOT EXISTS centroid GEOMETRY(POINT,4326);
ALTER TABLE flood_zones ADD COLUMN IF NOT EXISTS risk_trend VARCHAR(20) DEFAULT 'stable' CHECK (risk_trend IN ('rising','stable','falling'));
ALTER TABLE flood_zones ADD COLUMN IF NOT EXISTS admin_priority INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS critical_infrastructure (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE SET NULL,
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('school','health','market','water','power','bridge','shelter','admin')),
  name VARCHAR(200) NOT NULL,
  location GEOMETRY(POINT,4326),
  capacity INTEGER DEFAULT 0,
  vulnerability_score FLOAT DEFAULT 0 CHECK (vulnerability_score BETWEEN 0 AND 1),
  operational_status VARCHAR(30) DEFAULT 'unknown' CHECK (operational_status IN ('operational','limited','closed','unknown')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS road_segments (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE SET NULL,
  road_name VARCHAR(200),
  road_class VARCHAR(50) DEFAULT 'local',
  geometry GEOMETRY(LINESTRING,4326),
  length_km FLOAT DEFAULT 0,
  criticality_score FLOAT DEFAULT 0 CHECK (criticality_score BETWEEN 0 AND 1),
  flood_susceptibility FLOAT DEFAULT 0 CHECK (flood_susceptibility BETWEEN 0 AND 1),
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','at_risk','closed','unknown')),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS evacuation_centers (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  location GEOMETRY(POINT,4326),
  capacity INTEGER DEFAULT 0,
  current_occupancy INTEGER DEFAULT 0,
  contact_phone VARCHAR(30),
  status VARCHAR(30) DEFAULT 'available' CHECK (status IN ('available','limited','full','closed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS impact_assessments (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
  assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scenario_name VARCHAR(100) DEFAULT 'current_operational',
  hazard_probability FLOAT DEFAULT 0 CHECK (hazard_probability BETWEEN 0 AND 1),
  mean_depth_m FLOAT DEFAULT 0,
  max_depth_m FLOAT DEFAULT 0,
  population_exposed INTEGER DEFAULT 0,
  buildings_exposed INTEGER DEFAULT 0,
  roads_km_exposed FLOAT DEFAULT 0,
  schools_exposed INTEGER DEFAULT 0,
  health_facilities_exposed INTEGER DEFAULT 0,
  markets_exposed INTEGER DEFAULT 0,
  estimated_damage_usd NUMERIC(14,2) DEFAULT 0,
  method VARCHAR(100) DEFAULT 'deterministic_composite_v2',
  confidence VARCHAR(20) DEFAULT 'medium' CHECK (confidence IN ('low','medium','high')),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS citizen_reports (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE SET NULL,
  reporter_name VARCHAR(200),
  reporter_phone VARCHAR(30),
  location GEOMETRY(POINT,4326) NOT NULL,
  water_depth_cm INTEGER DEFAULT 0,
  road_blocked BOOLEAN DEFAULT FALSE,
  house_affected BOOLEAN DEFAULT FALSE,
  description TEXT,
  photo_url TEXT,
  status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new','verified','rejected','resolved')),
  verified_by VARCHAR(100),
  verified_at TIMESTAMP WITH TIME ZONE,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS risk_snapshots (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
  snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  horizon_hours INTEGER DEFAULT 24,
  hazard_score FLOAT DEFAULT 0,
  exposure_score FLOAT DEFAULT 0,
  vulnerability_score FLOAT DEFAULT 0,
  response_capacity_score FLOAT DEFAULT 0,
  operational_risk_score FLOAT DEFAULT 0,
  operational_risk_level INTEGER DEFAULT 1 CHECK (operational_risk_level BETWEEN 1 AND 4),
  drivers JSONB DEFAULT '{}'::jsonb,
  recommendation TEXT
);

CREATE TABLE IF NOT EXISTS data_quality_flags (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES flood_zones(id) ON DELETE SET NULL,
  source_name VARCHAR(100) NOT NULL,
  quality_level VARCHAR(20) NOT NULL CHECK (quality_level IN ('low','medium','high')),
  issue_type VARCHAR(100),
  message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL,
  recipient VARCHAR(200),
  status VARCHAR(30) DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','delivered','acknowledged')),
  provider_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_runs (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL DEFAULT 'floodsense_operational_risk',
  model_version VARCHAR(50) DEFAULT 'v2',
  run_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  run_finished_at TIMESTAMP WITH TIME ZONE,
  zones_processed INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'running' CHECK (status IN ('running','success','failed')),
  metrics JSONB DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS flood_zones_geom_idx ON flood_zones USING GIST(geometry);
CREATE INDEX IF NOT EXISTS flood_zones_centroid_idx ON flood_zones USING GIST(centroid);
CREATE INDEX IF NOT EXISTS weather_readings_zone_time_idx ON weather_readings(zone_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS predictions_zone_time_idx ON predictions(zone_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS alerts_zone_time_idx ON alerts(zone_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS impact_zone_time_idx ON impact_assessments(zone_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS citizen_reports_geom_idx ON citizen_reports USING GIST(location);
CREATE INDEX IF NOT EXISTS citizen_reports_status_idx ON citizen_reports(status, reported_at DESC);
CREATE INDEX IF NOT EXISTS critical_infra_geom_idx ON critical_infrastructure USING GIST(location);
CREATE INDEX IF NOT EXISTS road_segments_geom_idx ON road_segments USING GIST(geometry);
CREATE INDEX IF NOT EXISTS evacuation_centers_geom_idx ON evacuation_centers USING GIST(location);

`;

async function initDb() {
  try {
    console.log('Connexion PostgreSQL...');
    await pool.query('SELECT NOW()');

    console.log('Création des tables FloodSense...');
    await pool.query(SQL);

    console.log('✅ Tables créées avec succès.');
  } catch (err) {
    console.error('❌ ERREUR INIT DB:', err.message);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDb();