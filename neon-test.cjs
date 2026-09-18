const { Client } = require("pg");
const { readFileSync } = require("fs");
const raw = readFileSync(".env", "utf8");
const m = raw.match(/^DATABASE_DIRECT_URL="([^"]+)"/m);
const url = m[1];
const c = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
c.connect()
  .then(async () => {
    const r = await c.query(
      "select current_database() as db, current_user as u"
    );
    console.log("CONNECT OK:", JSON.stringify(r.rows[0]));
    await c.end();
  })
  .catch((e) => {
    console.log("FAIL:", e.message);
    process.exit(1);
  });
