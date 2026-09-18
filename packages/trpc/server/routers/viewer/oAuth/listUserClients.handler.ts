import { OAuthClientRepository } from "@kalo/features/oauth/repositories/OAuthClientRepository";
import type { PrismaClient } from "@kalo/prisma";

type ListUserClientsOptions = {
  ctx: {
    user: {
      id: number;
    };
    prisma: PrismaClient;
  };
};

export const listUserClientsHandler = async ({ ctx }: ListUserClientsOptions) => {
  const userId = ctx.user.id;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  return oAuthClientRepository.findByUserId(userId);
};
