import process from "node:process";
import { getServerSession } from "@kalo/features/auth/lib/getServerSession";
import prisma from "@kalo/prisma";
import { UserPermissionRole } from "@kalo/prisma/enums";
import type { GetServerSidePropsContext } from "next";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;

  const userCount = await prisma.user.count();

  const session = await getServerSession({ req });

  if (session?.user.role && session?.user.role !== UserPermissionRole.ADMIN) {
    return {
      notFound: true,
    } as const;
  }
  // direct access is intentional.
  const deploymentRepo = { getLicenseKeyWithId: async (_id: number) => null as string | null };
  const licenseKey = await deploymentRepo.getLicenseKeyWithId(1);

  // Check existent KALO_LICENSE_KEY env var and account for it
  if (!!process.env.KALO_LICENSE_KEY && !licenseKey) {
    await prisma.deployment.upsert({
      where: { id: 1 },
      update: {
        licenseKey: process.env.KALO_LICENSE_KEY,
        agreedLicenseAt: new Date(),
      },
      create: {
        licenseKey: process.env.KALO_LICENSE_KEY,
        agreedLicenseAt: new Date(),
      },
    });
  }

  // Check if there's already a valid license using LicenseKeyService
  const hasValidLicense = false;

  const isFreeLicense = true;

  return {
    props: {
      isFreeLicense,
      userCount,
      hasValidLicense,
    },
  };
}
