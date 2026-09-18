import crypto from "node:crypto";
import process from "node:process";
import { whatsAppWebhookService } from "@kalo/features/whatsapp-bot/src/webhookService";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";

// We read the raw body ourselves so Meta's X-Hub-Signature-256 (an HMAC over
// the exact bytes) can be verified.
export const config = { api: { bodyParser: false } };

/**
 * Verifies Meta's X-Hub-Signature-256 header against the raw request body.
 * Returns true when the signature is valid, false otherwise.
 */
function verifyHubSignature(rawBody: Buffer, expectedSignature: string, appSecret: string): boolean {
  // Reject anything that isn't a valid hex digest before converting: Buffer.from
  // silently truncates on non-hex input, which would turn a length match into a
  // buffer-length mismatch and make timingSafeEqual throw instead of returning
  // false — an easy way to force 500s.
  if (!/^[0-9a-f]+$/i.test(expectedSignature)) return false;
  const computed = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const actual = Buffer.from(computed, "hex");
  const expected = Buffer.from(expectedSignature, "hex");
  // timingSafeEqual throws on length mismatch — check first, like the BTCPay
  // webhook does.
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

type WhatsAppTextMessage = {
  from: string;
  text: { body: string };
  direction?: string;
};

/**
 * Extracts the sender + text from the two payload shapes we accept:
 * - Meta Cloud API envelope: { entry: [{ changes: [{ value: { messages: [...] } }] }] }
 * - Bare shape used by local bridges/simulators: { from, body }
 *
 * Returns null for anything that isn't an inbound text message (status updates,
 * echoes of the bot's own outbound messages, empty text) so it can be acked
 * silently instead of being processed as customer input.
 */
function extractIncomingMessage(payload: Record<string, unknown>): { from: string; body: string } | null {
  const entry = payload?.entry;
  const change = Array.isArray(entry) ? entry[0]?.changes?.[0] : undefined;
  const message: WhatsAppTextMessage | undefined = change?.value?.messages?.[0];

  // Meta delivers the bot's own outbound messages through the same webhook when
  // subscribed to all messages. Skip anything that isn't an inbound customer
  // message to avoid the bot responding to itself.
  if (message?.direction && message.direction !== "inbound") {
    return null;
  }
  if (message?.from && typeof message.text?.body === "string") {
    return { from: String(message.from), body: message.text.body };
  }

  if (typeof payload?.from === "string" && typeof payload?.body === "string") {
    return { from: payload.from, body: payload.body };
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Meta Cloud API webhook verification handshake: on first registration Meta
  // calls GET /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ message: "Verification token mismatch" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const rawBody = await getRawBody(req);

  // Meta signs Graph API webhook deliveries with X-Hub-Signature-256 when the
  // app secret is configured. Verification is opt-in via
  // WHATSAPP_WEBHOOK_APP_SECRET so local bridges/simulators (which send bare
  // { from, body } payloads without signing) keep working in development — but
  // in production the secret should be set so forged messages can't drive the
  // bot.
  const appSecret = process.env.WHATSAPP_WEBHOOK_APP_SECRET;
  if (appSecret) {
    const signature = req.headers["x-hub-signature-256"];
    if (
      typeof signature !== "string" ||
      !signature.startsWith("sha256=") ||
      !verifyHubSignature(rawBody, signature.slice("sha256=".length), appSecret)
    ) {
      return res.status(401).json({ message: "Invalid signature" });
    }
  }

  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  const incoming = extractIncomingMessage(parsedBody);

  // Meta sends non-message events (status updates, echo) and empty text.
  // Acknowledge silently so Meta doesn't retry them.
  if (!incoming || !incoming.body.trim()) {
    return res.status(200).json({ status: "ignored" });
  }

  try {
    const result = await whatsAppWebhookService.handleMessage({
      from: incoming.from,
      body: incoming.body,
    });
    // Returning the reply as JSON; the WhatsApp engine (Baileys bridge) is what
    // actually delivers it back to the customer.
    return res.status(200).json(result);
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return res.status(200).json({
      replyText:
        "⚠️ Something went wrong on our side. Please try again in a moment, or reply *0* for the main menu.",
      state: "IDLE",
      stkPushTriggered: false,
    });
  }
}
