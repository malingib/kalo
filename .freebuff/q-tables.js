const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  const t = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('TABLES:', JSON.stringify(t.rows.map(r => r.tablename).slice(0, 30)));
  console.log('COUNT:', t.rows.length);
  const u = await c.query("SELECT current_database() AS db");
  console.log('DB:', u.rows[0].db);
  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
