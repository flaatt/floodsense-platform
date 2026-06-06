require('dotenv').config();
const { Pool } = require('pg');

const sql = `
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS flood_events CASCADE;
DROP TABLE IF EXISTS weather_forecasts CASCADE;
DROP TABLE IF EXISTS weather_readings CASCADE;
DROP TABLE IF EXISTS flood_zones CASCADE;
`;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log('✅ Tables métier supprimées. Lance maintenant npm run db:init puis npm run db:seed');
  } catch (e) {
    console.error('❌ Reset failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main();
