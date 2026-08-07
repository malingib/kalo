import { WhatsAppStateMachine } from "./stateMachine";
import type { UserSessionContext } from "./types";

/**
 * Local simulation runner for the WhatsApp Booking & M-Pesa State Machine.
 * Can be run with: npx tsx packages/features/whatsapp-bot/src/simulator.ts
 */
async function runSimulation() {
  console.log("=================================================");
  console.log("🤖 Kalo WhatsApp Bot + M-Pesa Interactive Simulator");
  console.log("=================================================\n");

  const vendorName = "BarberHub Westlands";
  const eventTypes = [
    { id: 101, title: "Executive Haircut & Wash", price: 1500, depositAmount: 500, duration: 45 },
    { id: 102, title: "Beard Sculpt & Styling", price: 800, depositAmount: 0, duration: 30 },
    { id: 103, title: "Full Grooming Package", price: 2800, depositAmount: 1000, duration: 75 },
  ];

  const vendorMpesa = {
    tillNumber: "892341",
    paybill: "522522",
    shortcode: "174379",
    passkey: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
  };

  let session: UserSessionContext = {
    state: "IDLE",
    customerPhone: "254712345678",
    vendorUserId: 1,
  };

  const steps = [
    "Hi", // 1. Initial greeting
    "1", // 2. Select "View Services"
    "1", // 3. Select "Executive Haircut"
    "2", // 4. Select slot "Today 4:00 PM"
    "Brian Otieno", // 5. Enter customer name -> Triggers M-Pesa STK Push
  ];

  for (const input of steps) {
    console.log(`👤 Customer (+${session.customerPhone}): "${input}"`);
    const res = await WhatsAppStateMachine.processMessage(
      input,
      session,
      vendorName,
      eventTypes,
      vendorMpesa
    );

    console.log(`🤖 Bot Response:\n-------------------------------------------------`);
    console.log(res.replyText);
    if (res.triggerStkPush) {
      console.log(
        `⚡ [STK PUSH TRIGGERED] -> Phone: ${res.triggerStkPush.phoneNumber}, Amount: KES ${res.triggerStkPush.amount}, AccountRef: ${res.triggerStkPush.accountRef}`
      );
    }
    console.log("-------------------------------------------------\n");

    session = res.nextContext;
  }

  // Simulate the Daraja STK callback landing server-side: it marks the session
  // paymentVerified via CheckoutRequestID (see apps/web/pages/api/mpesa/callback.ts),
  // so the state machine resolves WAITING_MPESA_STK without the customer's word.
  if (session.state === "WAITING_MPESA_STK") {
    console.log(`📡 [M-PESA CALLBACK] Daraja confirms CheckoutRequestID for ${session.customerPhone}...`);
    session = { ...session, paymentVerified: true, mpesaReceiptCode: "RCD1234567" };
    const res = await WhatsAppStateMachine.processMessage(
      "done",
      session,
      vendorName,
      eventTypes,
      vendorMpesa
    );
    console.log(`🤖 Bot Response:\n-------------------------------------------------`);
    console.log(res.replyText);
    console.log("-------------------------------------------------\n");
    session = res.nextContext;
  }

  console.log("✅ Simulation complete! Conversation state successfully reached:", session.state);
}

runSimulation().catch(console.error);
