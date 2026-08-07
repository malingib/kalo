const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  const t = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ILIKE '%event%' ORDER BY tablename");
  console.log('EVENT_TABLES:', JSON.stringify(t.rows.map(r => r.tablename)));
  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
