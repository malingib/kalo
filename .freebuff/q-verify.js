const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const alerts = await c.query(
    `SELECT id, type, title, "isRead", metadata, "createdAt"
     FROM "Alert" WHERE "userId" = 2 ORDER BY "createdAt" DESC`
  );
  console.log("=== ALERTS (vendor 2) ===");
  for (const a of alerts.rows) {
    console.log(
      `${a.type} | read=${a.isRead} | ${a.title} | meta=${JSON.stringify(a.metadata)} | ${a.createdAt}`
    );
  }

  const bookings = await c.query(
    `SELECT b.uid, b.title, b.status, b."paymentStatus", b.metadata,
            (SELECT att."phoneNumber" FROM "Attendee" att WHERE att."bookingId" = b.id) AS phone
     FROM "Booking" b
     WHERE b."userId" = 2 AND b.metadata ? 'whatsappBooking' = true
     ORDER BY b."createdAt" DESC`
  );
  console.log("=== WHATSAPP BOOKINGS ===");
  for (const b of bookings.rows) {
    console.log(`${b.uid} | ${b.title} | ${b.status} | ${b.paymentStatus} | phone=${b.phone}`);
  }

  const txs = await c.query(
    `SELECT id, "checkoutRequestId", "bookingUid", status, amount, "phoneNumber"
     FROM "MPesaTransaction" ORDER BY "createdAt" DESC LIMIT 5`
  );
  console.log("=== MPESA TRANSACTIONS ===");
  for (const t of txs.rows) {
    console.log(`${t.checkoutRequestId} | ${t.status} | ${t.amount} | booking=${t.bookingUid} | ${t.phoneNumber}`);
  }

  await c.end();
})().catch((e) => {
  console.error("Q_ERR:", e.message);
  process.exit(1);
});
