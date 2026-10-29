import type { LightningAddress } from "@getalby/lightning-tools";

export * from "./PaymentService";
export * from "./albyCredentialKeysSchema";

export type AlbyInvoice = Awaited<ReturnType<LightningAddress["requestInvoice"]>>;
