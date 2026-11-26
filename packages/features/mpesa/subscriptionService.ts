import { DarajaClient, normalizeKenyanPhone } from "./index";
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
