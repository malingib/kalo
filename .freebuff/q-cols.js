const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  for (const t of ['users', 'event_types', '_user_eventtype']) {
    const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position`, [t]);
    console.log(t + ':', JSON.stringify(r.rows.map(x => x.column_name).slice(0, 25)));
  }
  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
