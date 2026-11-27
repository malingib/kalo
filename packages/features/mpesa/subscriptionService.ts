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
      status: { in: ["ACTIVE", "PAYMENT_PENDING"] },
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

  try {
    const response = await DarajaClient.initiateStkPush({
      consumerKey: requiredEnv("DARAJA_CONSUMER_KEY"),
      consumerSecret: requiredEnv("DARAJA_CONSUMER_SECRET"),
      businessShortCode: requiredEnv("DARAJA_SHORTCODE"),
      passkey: requiredEnv("DARAJA_PASSKEY"),
      phoneNumber,
      amount: amountKes,
      accountReference: input.username,
      transactionDesc: "Premium subscription",
      callbackUrl: callbackUrl(),
      isSandbox: process.env.DARAJA_ENVIRONMENT !== "production",
    });

    await prisma.$transaction(async (tx) => {
      await tx.mPesaTransaction.update({
        where: { id: transaction.id },
        data: {
          checkoutRequestId: response.CheckoutRequestID,
          merchantRequestId: response.MerchantRequestID,
          status: "PENDING",
        },
      });
      await tx.mPesaSubscription.update({
        where: { id: subscription.id },
        data: { status: "PAYMENT_PENDING" },
      });
    });

    return { subscriptionId: subscription.id, status: "PAYMENT_PENDING" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "M-Pesa subscription payment could not be started";
    await prisma.$transaction([
      prisma.mPesaTransaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED", resultDesc: message },
      }),
      prisma.mPesaSubscription.update({
        where: { id: subscription.id },
        data: { status: "PAYMENT_FAILED" },
      }),
    ]);
    throw new Error("M-Pesa subscription payment could not be started");
  }
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

  try {
    const response = await DarajaClient.initiateStkPush({
      consumerKey: requiredEnv("DARAJA_CONSUMER_KEY"),
      consumerSecret: requiredEnv("DARAJA_CONSUMER_SECRET"),
      businessShortCode: requiredEnv("DARAJA_SHORTCODE"),
      passkey: requiredEnv("DARAJA_PASSKEY"),
      phoneNumber: subscription.phoneNumber,
      amount: subscription.amountKes,
      accountReference: subscription.username || subscription.id,
      transactionDesc: "Premium renewal",
      callbackUrl: callbackUrl(),
      isSandbox: process.env.DARAJA_ENVIRONMENT !== "production",
    });

    await prisma.$transaction(async (tx) => {
      await tx.mPesaTransaction.update({
        where: { id: transaction.id },
        data: {
          checkoutRequestId: response.CheckoutRequestID,
          merchantRequestId: response.MerchantRequestID,
          status: "PENDING",
        },
      });
      await tx.mPesaSubscription.update({
        where: { id: subscription.id },
        data: { status: "PAYMENT_PENDING" },
      });
    });
    return { subscriptionId: subscription.id, status: "PAYMENT_PENDING" as const };
  } catch {
    await prisma.$transaction([
      prisma.mPesaTransaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED", resultDesc: "Daraja renewal STK Push failed" },
      }),
      prisma.mPesaSubscription.update({
        where: { id: subscription.id },
        data: { status: "PAST_DUE" },
      }),
    ]);
    throw new Error("M-Pesa renewal prompt could not be started");
  }
}


const workspaceSubscriptionPlansSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.enum(["MONTHLY", "ANNUALLY"]), z.number().int().positive()))
);

export type WorkspaceSubscriptionType = "TEAM" | "ORGANIZATION";
export type WorkspaceBillingPeriod = "MONTHLY" | "ANNUALLY";

/** Resolve prices only from server configuration; never trust a client-supplied amount. */
export function getWorkspaceSubscriptionAmount(
  subscriptionType: WorkspaceSubscriptionType,
  planName: string,
  billingPeriod: WorkspaceBillingPeriod
): number {
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
  const amount = parsed.data[subscriptionType]?.[planName]?.[billingPeriod];
  if (!amount || !Number.isSafeInteger(amount)) {
    throw new Error("The requested M-Pesa subscription plan is not configured");
  }
  return amount;
}

async function sendWorkspaceSubscriptionPrompt(input: {
  subscriptionId: string;
  phoneNumber: string;
  amountKes: number;
  accountReference: string;
  transactionDesc: string;
}) {
  let transactionId: string | undefined;
  try {
    const transaction = await prisma.mPesaTransaction.create({
      data: {
        subscriptionId: input.subscriptionId,
        phoneNumber: input.phoneNumber,
        amount: input.amountKes,
        source: "subscription-payment",
        status: "INITIATING",
      },
    });
    transactionId = transaction.id;

    const response = await DarajaClient.initiateStkPush({
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

    await prisma.$transaction(async (tx) => {
      await tx.mPesaTransaction.update({
        where: { id: transaction.id },
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
  } catch {
    await prisma.$transaction([
      ...(transactionId
        ? [
            prisma.mPesaTransaction.update({
              where: { id: transactionId },
              data: { status: "FAILED", resultDesc: "Daraja subscription STK Push failed" },
            }),
          ]
        : []),
      prisma.mPesaSubscription.update({
        where: { id: input.subscriptionId },
        data: { status: "PAST_DUE" },
      }),
    ]);
    throw new Error("M-Pesa subscription payment could not be started");
  }
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
      status: { in: ["PENDING", "PAYMENT_PENDING", "ACTIVE"] },
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
