import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@kalo/feature-auth/lib/getServerSession";
import { getOptions } from "@kalo/feature-auth/lib/next-auth-options";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession({
    req: context.req,
    authOptions: getOptions(),
  });
  // Disable this check if we ever make this self serve.
  if (session?.user.role !== "ADMIN") {
    return {
      notFound: true,
    } as const;
  }

  return {
    props: {},
  };
};
