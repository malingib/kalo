const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  const t = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%user%' OR tablename ILIKE '%customer%') ORDER BY tablename");
  console.log('USER_LIKE_TABLES:', JSON.stringify(t.rows.map(r => r.tablename)));
  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
