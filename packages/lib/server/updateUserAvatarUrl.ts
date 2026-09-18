import prisma from "@kalo/prisma";

export const updateUserAvatarUrl = async ({ id, avatarUrl }: { id: number; avatarUrl: string }) => {
  await prisma.user.updateMany({
    where: {
      id,
      avatarUrl: { equals: null },
    },
    data: { avatarUrl },
  });
};
