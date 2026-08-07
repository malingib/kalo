const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  for (const t of ['users', 'EventType']) {
    const r = await c.query(`SELECT column_name, column_default FROM information_schema.columns
      WHERE table_name=$1 AND table_schema='public' AND is_nullable='NO' AND column_default IS NULL
      ORDER BY ordinal_position`, [t]);
    console.log(t + ' NOT_NULL_NO_DEFAULT:', JSON.stringify(r.rows));
  }
  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
