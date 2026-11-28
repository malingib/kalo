import { ErrorCode } from "@kalo/features/auth/lib/ErrorCode";
import { prisma } from "@kalo/prisma";
import { IdentityProvider } from "@kalo/prisma/enums";
import type { TrpcSessionUser } from "@kalo/trpc/server/types";

type DeleteMeWithoutPasswordOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const deleteMeWithoutPasswordHandler = async ({ ctx }: DeleteMeWithoutPasswordOptions) => {
  const user = await prisma.user.findUnique({
    where: {
      email: ctx.user.email.toLowerCase(),
    },
  });
  if (!user) {
    throw new Error(ErrorCode.UserNotFound);
  }

  if (user.identityProvider === IdentityProvider.CAL) {
    throw new Error(ErrorCode.SocialIdentityProviderRequired);
  }

  if (user.twoFactorEnabled) {
    throw new Error(ErrorCode.SocialIdentityProviderRequired);
  }

  // Remove my account
  await prisma.user.delete({
    where: {
      id: ctx.user.id,
    },
  });

  return;
};
