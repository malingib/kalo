import type { GetServerSidePropsContext } from "next";

const ENABLED_APP_SETUP_SLUGS = new Set(["google-calendar"]);

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { slug } = ctx.params || {};
  if (typeof slug !== "string" || !ENABLED_APP_SETUP_SLUGS.has(slug)) {
    return { notFound: true } as const;
  }

  // Google Calendar uses the shared setup flow; no third-party payment
  // provider setup pages are exposed by Kalo.
  return { props: {} };
};
