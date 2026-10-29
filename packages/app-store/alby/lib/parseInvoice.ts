import type { LightningAddress } from "@getalby/lightning-tools";
import { Webhook } from "svix";

type Invoice = Awaited<ReturnType<LightningAddress["requestInvoice"]>>;

export default function parseInvoice(
  body: string,
  headers: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
  },
  webhookEndpointSecret: string
): Invoice | null {
  try {
    const wh = new Webhook(webhookEndpointSecret);
    return wh.verify(body, headers) as Invoice;
  } catch (err) {
    // Looks like alby might sent multiple webhooks for the same invoice but it should only work once
    // TODO: remove the Alby webhook when uninstalling the Alby app
    console.error(err);
  }
  return null;
}
