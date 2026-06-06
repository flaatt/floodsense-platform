/**
 * Migration — Creation de toutes les tables
 * Lancer avec : node src/config/migrate.js
 */

require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SQL = `
-- ════════════════════════════════════════════════════
--  EXTENSIONS
-- ════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════
--  TABLE : flood_zones
--  Zones geographiques de Kinshasa avec niveau de risque
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS flood_zones (
    id                SERIAL PRIMARY KEY,
    commune           VARCHAR(100) NOT NULL,
    quartier          VARCHAR(100),
    geometry          GEOMETRY(MULTIPOLYGON, 4326),
    centroid          GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_Centroid(geometry)) STORED,
    risk_level        INTEGER DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 4),
    risk_score        FLOAT   DEFAULT 0.0 CHECK (risk_score BETWEEN 0 AND 1),
    elevation_avg     FLOAT   DEFAULT 0,
    elevation_min     FLOAT   DEFAULT 0,
    elevation_max     FLOAT   DEFAULT 0,
    slope_avg         FLOAT   DEFAULT 0,
    area_sqkm         FLOAT   DEFAULT 0,
    population        INTEGER DEFAULT 0,
    drainage_density  FLOAT   DEFAULT 0,
    impervious_ratio  FLOAT   DEFAULT 0,
    color_hex         VARCHAR(7) DEFAULT '#95A5A6',
    last_updated      TIMESTAMP DEFAULT NOW(),
    created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flood_zones_geom_idx ON flood_zones USING GIST(geometry);
CREATE INDEX IF NOT EXISTS flood_zones_risk_idx  ON flood_zones(risk_level DESC);

-- ════════════════════════════════════════════════════
--  TABLE : weather_readings
--  Lectures meteorologiques historiques et temps reel
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS weather_readings (
    id              SERIAL PRIMARY KEY,
    zone_id         INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
    location        GEOMETRY(POINT, 4326),
    timestamp       TIMESTAMP NOT NULL DEFAULT NOW(),
    rainfall_1h     FLOAT DEFAULT 0,
    rainfall_3h     FLOAT DEFAULT 0,
    rainfall_24h    FLOAT DEFAULT 0,
    rainfall_72h    FLOAT DEFAULT 0,
    temperature     FLOAT,
    humidity        FLOAT,
    wind_speed      FLOAT,
    wind_direction  FLOAT,
    pressure        FLOAT,
    cloud_cover     INTEGER,
    description     VARCHAR(100),
    source          VARCHAR(50) DEFAULT 'openweather'
);

CREATE INDEX IF NOT EXISTS weather_timestamp_idx ON weather_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS weather_zone_idx      ON weather_readings(zone_id);
CREATE INDEX IF NOT EXISTS weather_location_idx  ON weather_readings USING GIST(location);

-- ════════════════════════════════════════════════════
--  TABLE : weather_forecasts
--  Previsions meteo (prochaines 48h)
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS weather_forecasts (
    id              SERIAL PRIMARY KEY,
    zone_id         INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
    forecast_for    TIMESTAMP NOT NULL,
    fetched_at      TIMESTAMP DEFAULT NOW(),
    rainfall_mm     FLOAT DEFAULT 0,
    temperature     FLOAT,
    humidity        FLOAT,
    description     VARCHAR(100),
    pop             FLOAT DEFAULT 0  -- Probability of Precipitation [0-1]
);

CREATE INDEX IF NOT EXISTS forecast_zone_time_idx ON weather_forecasts(zone_id, forecast_for);

-- ════════════════════════════════════════════════════
--  TABLE : flood_events
--  Historique des inondations confirmees
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS flood_events (
    id              SERIAL PRIMARY KEY,
    zone_id         INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
    event_date      DATE NOT NULL,
    started_at      TIMESTAMP,
    ended_at        TIMESTAMP,
    severity        VARCHAR(20) DEFAULT 'minor'
                    CHECK (severity IN ('minor','moderate','severe','catastrophic')),
    deaths          INTEGER DEFAULT 0,
    injured         INTEGER DEFAULT 0,
    displaced       INTEGER DEFAULT 0,
    houses_damaged  INTEGER DEFAULT 0,
    source          VARCHAR(100),
    confirmed       BOOLEAN DEFAULT FALSE,
    reported_by     VARCHAR(100),
    latitude        FLOAT,
    longitude       FLOAT,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flood_events_zone_idx ON flood_events(zone_id);
CREATE INDEX IF NOT EXISTS flood_events_date_idx ON flood_events(event_date DESC);

-- ════════════════════════════════════════════════════
--  TABLE : predictions
--  Historique des predictions IA
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS predictions (
    id                  SERIAL PRIMARY KEY,
    zone_id             INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
    predicted_at        TIMESTAMP DEFAULT NOW(),
    flood_probability   FLOAT NOT NULL CHECK (flood_probability BETWEEN 0 AND 1),
    risk_level          INTEGER NOT NULL CHECK (risk_level BETWEEN 1 AND 4),
    horizon_hours       INTEGER DEFAULT 24,
    features_snapshot   JSONB,
    model_version       VARCHAR(20) DEFAULT 'v1'
);

CREATE INDEX IF NOT EXISTS predictions_zone_time_idx ON predictions(zone_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS predictions_risk_idx      ON predictions(risk_level DESC);

-- ════════════════════════════════════════════════════
--  TABLE : alerts
--  Alertes envoyees
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alerts (
    id               SERIAL PRIMARY KEY,
    zone_id          INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
    alert_type       VARCHAR(20) DEFAULT 'watch'
                     CHECK (alert_type IN ('watch','warning','emergency')),
    risk_level       INTEGER,
    flood_probability FLOAT,
    message_fr       TEXT NOT NULL,
    message_ln       TEXT,
    sent_at          TIMESTAMP DEFAULT NOW(),
    recipients_count INTEGER DEFAULT 0,
    channel          VARCHAR(20) DEFAULT 'sms'
                     CHECK (channel IN ('sms','whatsapp','email','web','all')),
    status           VARCHAR(20) DEFAULT 'sent'
                     CHECK (status IN ('pending','sent','failed','cancelled')),
    sent_by          VARCHAR(50) DEFAULT 'system',
    expires_at       TIMESTAMP,
    is_active        BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS alerts_zone_idx       ON alerts(zone_id);
CREATE INDEX IF NOT EXISTS alerts_sent_at_idx    ON alerts(sent_at DESC);
CREATE INDEX IF NOT EXISTS alerts_active_idx     ON alerts(is_active) WHERE is_active = TRUE;

-- ════════════════════════════════════════════════════
--  TABLE : contacts
--  Contacts a alerter par zone
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contacts (
    id          SERIAL PRIMARY KEY,
    zone_id     INTEGER REFERENCES flood_zones(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    role        VARCHAR(50),
    phone       VARCHAR(20),
    email       VARCHAR(100),
    whatsapp    VARCHAR(20),
    channel     VARCHAR(20) DEFAULT 'sms',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contacts_zone_idx ON contacts(zone_id);

-- ════════════════════════════════════════════════════
--  TABLE : users
--  Administrateurs de la plateforme
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100),
    role            VARCHAR(20) DEFAULT 'viewer'
                    CHECK (role IN ('admin','operator','viewer')),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
--  TABLE : reports
--  Signalements citoyens d'inondations
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reports (
    id          SERIAL PRIMARY KEY,
    zone_id     INTEGER REFERENCES flood_zones(id),
    latitude    FLOAT NOT NULL,
    longitude   FLOAT NOT NULL,
    location    GEOMETRY(POINT, 4326),
    description TEXT,
    severity    VARCHAR(20) DEFAULT 'minor',
    photo_url   VARCHAR(255),
    reporter    VARCHAR(100),
    phone       VARCHAR(20),
    status      VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending','verified','rejected')),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_zone_idx     ON reports(zone_id);
CREATE INDEX IF NOT EXISTS reports_location_idx ON reports USING GIST(location);
CREATE INDEX IF NOT EXISTS reports_status_idx   ON reports(status);
`;

async function migrate() {
  console.log('🚀 Debut de la migration...');
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('✅ Migration reussie — toutes les tables creees');
  } catch (err) {
    console.error('❌ Erreur de migration:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
