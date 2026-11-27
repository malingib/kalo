import { prisma } from "@kalo/prisma";
import type { Prisma } from "@kalo/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateAppCredentialsInputSchema } from "./updateAppCredentials.schema";

export type UpdateAppCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateAppCredentialsInputSchema;
};

export const handleCustomValidations = async ({
  input,
  appId,
}: UpdateAppCredentialsOptions & { appId: string }) => {
  // No third-party payment app credential validators remain in this deployment.
  return input.key;
};

export const updateAppCredentialsHandler = async ({ ctx, input }: UpdateAppCredentialsOptions) => {
  const { user } = ctx;

  // Find user credential
  const credential = await prisma.credential.findFirst({
    where: {
      id: input.credentialId,
      userId: user.id,
    },
  });
  // Check if credential exists
  if (!credential) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Could not find credential ${input.credentialId}`,
    });
  }

  const validatedKeys = await handleCustomValidations({ ctx, input, appId: credential.appId || "" });

  const updated = await prisma.credential.update({
    where: {
      id: credential.id,
    },
    data: {
      key: {
        ...(credential.key as Prisma.JsonObject),
        ...(validatedKeys as Prisma.JsonObject),
      },
    },
  });

  return !!updated;
};
