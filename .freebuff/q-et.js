const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='EventType' AND table_schema='public' ORDER BY ordinal_position`);
  console.log('EventType COLS:', JSON.stringify(r.rows.map(x => x.column_name)));
  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
