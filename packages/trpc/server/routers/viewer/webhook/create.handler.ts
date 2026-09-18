import { v4 } from "uuid";

import { updateTriggerForExistingBookings } from "@kalo/features/webhooks/lib/scheduleTrigger";
import { validateUrlForSSRFSync } from "@kalo/lib/ssrfProtection";
import { prisma } from "@kalo/prisma";
import type { Webhook } from "@kalo/prisma/client";
import type { Prisma } from "@kalo/prisma/client";
import { EventTypeMetaDataSchema } from "@kalo/prisma/zod-utils";
import type { TrpcSessionUser } from "@kalo/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { user } = ctx;

  const validation = validateUrlForSSRFSync(input.subscriberUrl);
  if (!validation.isValid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Webhook URL is not allowed: ${validation.error}`,
    });
  }

  const { webhookId: _webhookId, ...inputWithoutWebhookId } = input;
  const webhookData: Prisma.WebhookCreateInput = {
    id: v4(),
    ...inputWithoutWebhookId,
  };
  if (input.platform && user.role !== "ADMIN") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!input.platform && !input.eventTypeId) {
    webhookData.user = { connect: { id: user.id } };
  }

  if (input.eventTypeId) {
    const parentManagedEvt = await prisma.eventType.findFirst({
      where: {
        id: input.eventTypeId,
        parentId: {
          not: null,
        },
      },
      select: {
        parentId: true,
        metadata: true,
      },
    });

    if (parentManagedEvt?.parentId) {
      const isLocked = !EventTypeMetaDataSchema.parse(parentManagedEvt.metadata)?.managedEventConfig
        ?.unlockedFields?.webhooks;
      if (isLocked) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }
  }

  let newWebhook: Webhook;
  try {
    newWebhook = await prisma.webhook.create({
      data: webhookData,
    });
  } catch (error) {
    // Avoid printing raw prisma error on frontend
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create webhook" });
  }

  await updateTriggerForExistingBookings(newWebhook, [], newWebhook.eventTriggers);

  return newWebhook;
};
