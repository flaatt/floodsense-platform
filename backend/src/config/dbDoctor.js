require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  console.log('DATABASE_URL =', process.env.DATABASE_URL || '(absente)');
  if (!process.env.DATABASE_URL) process.exit(1);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    const r = await pool.query(`
      SELECT
        current_user,
        current_database(),
        inet_server_addr()::text AS server_addr,
        inet_server_port() AS server_port,
        version()
    `);
    console.table(r.rows);

    const ext = await pool.query("SELECT extname FROM pg_extension WHERE extname IN ('postgis','postgis_topology') ORDER BY extname");
    console.log('Extensions:', ext.rows.map(x => x.extname).join(', ') || '(aucune)');

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public'
      ORDER BY table_name
    `);
    console.log('Tables public:', tables.rows.map(x => x.table_name).join(', ') || '(aucune)');

    console.log('✅ DB doctor OK');
  } catch (e) {
    console.error('❌ DB doctor failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main();
