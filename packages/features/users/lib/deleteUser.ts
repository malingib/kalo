import prisma from "@kalo/prisma";
import type { User } from "@kalo/prisma/client";

export async function deleteUser(user: Pick<User, "id" | "email" | "metadata">) {
  // Remove my account
  // TODO: Move this to Repository pattern.
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });
}
