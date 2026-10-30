import { Webhook } from "svix";

export type AlbyInvoice = {
  amount: number;
};

export default function parseInvoice(
  body: string,
  headers: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
  },
  webhookEndpointSecret: string
): AlbyInvoice | null {
  try {
    const wh = new Webhook(webhookEndpointSecret);
    const payload: unknown = wh.verify(body, headers);
    if (
      typeof payload === "object" &&
      payload !== null &&
      "amount" in payload &&
      typeof payload.amount === "number"
    ) {
      return payload as AlbyInvoice;
    }
  } catch (err) {
    // Alby may send multiple webhooks for the same invoice; process valid payments only.
    // TODO: remove the Alby webhook when uninstalling the Alby app.
    console.error(err);
  }
  return null;
}
