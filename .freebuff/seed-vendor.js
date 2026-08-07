const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const PASSWORD = "VendorPass!123";

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const existing = await c.query(`SELECT id FROM "users" WHERE email = 'vendor@kalo.test'`);
  let userId = existing.rows[0]?.id;
  if (userId) {
    console.log("VENDOR_ALREADY_EXISTS id=" + userId);
  } else {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const u = await c.query(
      `INSERT INTO "users" (uuid, email, username, name, "emailVerified", "timeZone", "completedOnboarding")
       VALUES (gen_random_uuid(), $1, $2, $3, now(), 'Africa/Nairobi', true)
       RETURNING id, email`,
      ["vendor@kalo.test", "kalovendor", "Kalo Barbershop"]
    );
    userId = u.rows[0].id;
    console.log("VENDOR_CREATED id=" + userId);
    await c.query(`INSERT INTO "UserPassword" (hash, "userId") VALUES ($1, $2)`, [hash, userId]);
  }

  const plans = [
    { title: "Executive Haircut", slug: "executive-haircut", length: 45, price: 1500, deposit: 0 },
    { title: "Beard Grooming", slug: "beard-grooming", length: 30, price: 800, deposit: 300 },
  ];
  for (const [i, p] of plans.entries()) {
    const found = await c.query(`SELECT id FROM "EventType" WHERE slug = $1 AND "userId" = $2`, [
      p.slug,
      userId,
    ]);
    let etId = found.rows[0]?.id;
    if (!etId) {
      const ins = await c.query(
        `INSERT INTO "EventType" (title, slug, length, price, "depositAmount", hidden, position, "userId")
         VALUES ($1, $2, $3, $4, $5, false, $6, $7) RETURNING id`,
        [p.title, p.slug, p.length, p.price, p.deposit, i + 1, userId]
      );
      etId = ins.rows[0].id;
    }
    await c.query(`INSERT INTO "_user_eventtype" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      etId,
      userId,
    ]);
    console.log("EVENT_TYPE " + p.title + " id=" + etId + " deposit=" + p.deposit);
  }

  console.log("SEED_DONE");
  await c.end();
})().catch((e) => {
  console.error("SEED_ERR:", e.message);
  process.exit(1);
});
