const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  const want = ['MPesaTransaction','WhatsAppSession','WhatsAppMessageLog','Alert','AlertPreference','Receipt','InventoryItem','InventoryTransaction'];
  const t = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  const have = new Set(t.rows.map(r => r.tablename));
  console.log('MISSING:', JSON.stringify(want.filter(w => !have.has(w))));
  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
