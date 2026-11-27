import { DarajaClient } from "./darajaClient";
import { normalizeKenyanPhone } from "./normalizePhone";
import { z } from "zod";
import prisma from "@kalo/prisma";

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

const callbackUrl = () => {
  const url = new URL(requiredEnv("DARAJA_CALLBACK_URL"));
  url.searchParams.set("secret", requiredEnv("DARAJA_CALLBACK_SECRET"));
  return url.toString();
};

async function initiateSubscriptionStkPush(input: {
  subscriptionId: string;
  transactionId: string;
  phoneNumber: string;
  amountKes: number;
  accountReference: string;
  transactionDesc: string;
  failureStatus: "PAYMENT_FAILED" | "PAST_DUE";
}) {
  let response: Awaited<ReturnType<typeof DarajaClient.initiateStkPush>>;
  try {
    response = await DarajaClient.initiateStkPush({
      consumerKey: requiredEnv("DARAJA_CONSUMER_KEY"),
      consumerSecret: requiredEnv("DARAJA_CONSUMER_SECRET"),
      businessShortCode: requiredEnv("DARAJA_SHORTCODE"),
      passkey: requiredEnv("DARAJA_PASSKEY"),
      phoneNumber: input.phoneNumber,
      amount: input.amountKes,
      accountReference: input.accountReference,
      transactionDesc: input.transactionDesc,
      callbackUrl: callbackUrl(),
      isSandbox: process.env.DARAJA_ENVIRONMENT !== "production",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daraja STK Push failed";
    await prisma.$transaction([
      prisma.mPesaTransaction.update({
        where: { id: input.transactionId },
        data: { status: "FAILED", resultDesc: message },
      }),
      prisma.mPesaSubscription.update({
        where: { id: input.subscriptionId },
        data: { status: input.failureStatus },
      }),
    ]);
    throw new Error("M-Pesa subscription payment could not be started");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.mPesaTransaction.update({
        where: { id: input.transactionId },
        data: {
          checkoutRequestId: response.CheckoutRequestID,
          merchantRequestId: response.MerchantRequestID,
          status: "PENDING",
        },
      });
      await tx.mPesaSubscription.update({
        where: { id: input.subscriptionId },
        data: { status: "PAYMENT_PENDING" },
      });
    });
    return { subscriptionId: input.subscriptionId, status: "PAYMENT_PENDING" as const };
  } catch (error) {
    console.error("Daraja accepted a subscription prompt but local checkout persistence failed.", {
      subscriptionId: input.subscriptionId,
      transactionId: input.transactionId,
      checkoutRequestId: response.CheckoutRequestID,
      error: error instanceof Error ? error.message : "Unknown persistence error",
    });
    try {
      // Save the callback identifiers even when the first atomic update fails;
      // the callback handler can then reconcile the customer's actual payment.
      await prisma.$transaction(async (tx) => {
        await tx.mPesaTransaction.update({
          where: { id: input.transactionId },
          data: {
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID,
            status: "RECONCILIATION_REQUIRED",
            resultDesc: "Daraja accepted STK push; subscription checkout requires reconciliation",
          },
        });
        await tx.mPesaSubscription.update({
          where: { id: input.subscriptionId },
          data: { status: "RECONCILIATION_REQUIRED" },
        });
      });
      return { subscriptionId: input.subscriptionId, status: "RECONCILIATION_REQUIRED" as const };
    } catch (reconciliationError) {
      console.error("Could not persist subscription reconciliation identifiers.", {
        subscriptionId: input.subscriptionId,
        transactionId: input.transactionId,
        error: reconciliationError instanceof Error ? reconciliationError.message : "Unknown error",
      });
      throw new Error("M-Pesa prompt was sent but its subscription record requires manual reconciliation");
    }
  }
}

export async function startPremiumUsernameSubscription(input: {
  userId: number;
  username: string;
  phoneNumber: string;
}) {
  const amountKes = Number(requiredEnv("MPESA_PREMIUM_MONTHLY_AMOUNT_KES"));
  if (!Number.isSafeInteger(amountKes) || amountKes <= 0) {
    throw new Error("MPESA_PREMIUM_MONTHLY_AMOUNT_KES must be a positive whole KES amount");
  }
  const phoneNumber = normalizeKenyanPhone(input.phoneNumber);
  if (!phoneNumber) throw new Error("A valid Kenyan mobile number is required");

  const existing = await prisma.mPesaSubscription.findFirst({
    where: {
      userId: input.userId,
      subscriptionType: "PREMIUM_USERNAME",
      status: { in: ["PENDING", "PAYMENT_PENDING", "RENEWAL_INITIATING", "RECONCILIATION_REQUIRED", "ACTIVE"] },
    },
  });
  if (existing) throw new Error("An active or pending premium subscription already exists");

  const subscription = await prisma.mPesaSubscription.create({
    data: {
      userId: input.userId,
      subscriptionType: "PREMIUM_USERNAME",
      planName: "Premium username",
      username: input.username,
      amountKes,
      phoneNumber,
      status: "PENDING",
    },
  });
  const transaction = await prisma.mPesaTransaction.create({
    data: {
      subscriptionId: subscription.id,
      phoneNumber,
      amount: amountKes,
      source: "subscription-payment",
      status: "INITIATING",
    },
  });

  return initiateSubscriptionStkPush({
    subscriptionId: subscription.id,
    transactionId: transaction.id,
    phoneNumber,
    amountKes,
    accountReference: input.username,
    transactionDesc: "Premium subscription",
    failureStatus: "PAYMENT_FAILED",
  });
}
/** Initiate a user-authorized renewal for an existing subscription. */
export async function initiatePremiumSubscriptionRenewal(input: {
  subscriptionId: string;
  userId: number;
}) {
  const subscription = await prisma.mPesaSubscription.findFirst({
    where: {
      id: input.subscriptionId,
      userId: input.userId,
      subscriptionType: "PREMIUM_USERNAME",
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
  });
  if (!subscription) throw new Error("No renewable subscription was found");

  const claimed = await prisma.mPesaSubscription.updateMany({
    where: { id: subscription.id, userId: input.userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    data: { status: "RENEWAL_INITIATING" },
  });
  if (claimed.count !== 1) throw new Error("Subscription renewal is already being processed");

  const transaction = await prisma.mPesaTransaction.create({
    data: {
      subscriptionId: subscription.id,
      phoneNumber: subscription.phoneNumber,
      amount: subscription.amountKes,
      source: "subscription-payment",
      status: "INITIATING",
    },
  });

  return initiateSubscriptionStkPush({
    subscriptionId: subscription.id,
    transactionId: transaction.id,
    phoneNumber: subscription.phoneNumber,
    amountKes: subscription.amountKes,
    accountReference: subscription.username || subscription.id,
    transactionDesc: "Premium renewal",
    failureStatus: "PAST_DUE",
  });
}


const workspaceSubscriptionPlansSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.enum(["MONTHLY", "ANNUALLY"]), z.number().int().positive()))
);

export type WorkspaceSubscriptionType = "TEAM" | "ORGANIZATION";
export type WorkspaceBillingPeriod = "MONTHLY" | "ANNUALLY";

function loadWorkspaceSubscriptionPlans() {
  let raw: unknown;
  try {
    raw = JSON.parse(requiredEnv("MPESA_SUBSCRIPTION_PLANS_JSON"));
  } catch {
    throw new Error("MPESA_SUBSCRIPTION_PLANS_JSON must contain valid server-side plan pricing");
  }
  const parsed = workspaceSubscriptionPlansSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("MPESA_SUBSCRIPTION_PLANS_JSON has an invalid plan pricing structure");
  }
  return parsed.data;
}

/** Resolve prices only from server configuration; never trust a client-supplied amount. */
export function getWorkspaceSubscriptionAmount(
  subscriptionType: WorkspaceSubscriptionType,
  planName: string,
  billingPeriod: WorkspaceBillingPeriod
): number {
  const amount = loadWorkspaceSubscriptionPlans()[subscriptionType]?.[planName]?.[billingPeriod];
  if (!amount || !Number.isSafeInteger(amount)) {
    throw new Error("The requested M-Pesa subscription plan is not configured");
  }
  return amount;
}

export function listWorkspaceSubscriptionPlans(subscriptionType: WorkspaceSubscriptionType) {
  const plans = loadWorkspaceSubscriptionPlans()[subscriptionType] ?? {};
  return Object.entries(plans).flatMap(([planName, periods]) =>
    Object.entries(periods).map(([billingPeriod, amountKes]) => ({
      planName,
      billingPeriod: billingPeriod as WorkspaceBillingPeriod,
      amountKes,
    }))
  );
}

async function sendWorkspaceSubscriptionPrompt(input: {
  subscriptionId: string;
  phoneNumber: string;
  amountKes: number;
  accountReference: string;
  transactionDesc: string;
}) {
  const transaction = await prisma.mPesaTransaction.create({
    data: {
      subscriptionId: input.subscriptionId,
      phoneNumber: input.phoneNumber,
      amount: input.amountKes,
      source: "subscription-payment",
      status: "INITIATING",
    },
  });

  return initiateSubscriptionStkPush({
    subscriptionId: input.subscriptionId,
    transactionId: transaction.id,
    phoneNumber: input.phoneNumber,
    amountKes: input.amountKes,
    accountReference: input.accountReference,
    transactionDesc: input.transactionDesc,
    failureStatus: "PAST_DUE",
  });
}

/** Start a first-party M-Pesa subscription for a team or organization. */
export async function startWorkspaceSubscription(input: {
  teamId: number;
  subscriptionType: WorkspaceSubscriptionType;
  planName: string;
  billingPeriod: WorkspaceBillingPeriod;
  phoneNumber: string;
}) {
  const phoneNumber = normalizeKenyanPhone(input.phoneNumber);
  if (!phoneNumber) throw new Error("A valid Kenyan mobile number is required");
  const amountKes = getWorkspaceSubscriptionAmount(
    input.subscriptionType,
    input.planName,
    input.billingPeriod
  );

  const existing = await prisma.mPesaSubscription.findFirst({
    where: {
      teamId: input.teamId,
      subscriptionType: input.subscriptionType,
      status: { in: ["PENDING", "PAYMENT_PENDING", "RENEWAL_INITIATING", "RECONCILIATION_REQUIRED", "ACTIVE", "PAST_DUE"] },
    },
  });
  if (existing) throw new Error("A pending or active subscription already exists for this workspace");

  const subscription = await prisma.mPesaSubscription.create({
    data: {
      teamId: input.teamId,
      subscriptionType: input.subscriptionType,
      planName: input.planName,
      amountKes,
      phoneNumber,
      billingPeriod: input.billingPeriod,
      billingMode: "SEATS",
      status: "PENDING",
    },
  });

  return sendWorkspaceSubscriptionPrompt({
    subscriptionId: subscription.id,
    phoneNumber,
    amountKes,
    accountReference: `${input.subscriptionType === "ORGANIZATION" ? "ORG" : "TEAM"}-${input.teamId}`,
    transactionDesc: "KALO workspace subscription",
  });
}

/** Send a new customer-authorized STK prompt for a due workspace subscription. */
export async function initiateWorkspaceSubscriptionRenewal(input: { subscriptionId: string; teamId: number }) {
  const subscription = await prisma.mPesaSubscription.findFirst({
    where: {
      id: input.subscriptionId,
      teamId: input.teamId,
      subscriptionType: { in: ["TEAM", "ORGANIZATION"] },
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
  });
  if (!subscription) throw new Error("No renewable workspace subscription was found");

  const claimed = await prisma.mPesaSubscription.updateMany({
    where: {
      id: subscription.id,
      teamId: input.teamId,
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    data: { status: "RENEWAL_INITIATING" },
  });
  if (claimed.count !== 1) throw new Error("Subscription renewal is already being processed");

  return sendWorkspaceSubscriptionPrompt({
    subscriptionId: subscription.id,
    phoneNumber: subscription.phoneNumber,
    amountKes: subscription.amountKes,
    accountReference: `${subscription.subscriptionType}-${subscription.teamId}`,
    transactionDesc: "KALO subscription renewal",
  });
}
