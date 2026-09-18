vi.mock("@kalo/lib/next-seo.config", () => ({
  default: {
    headSeo: {
      siteName: "Kalo",
    },
    defaultNextSeo: {
      title: "Kalo",
      description: "Scheduling infrastructure for everyone.",
    },
  },
  seoConfig: {
    headSeo: {
      siteName: "Kalo",
    },
  },
  buildSeoMeta: vi.fn().mockReturnValue({}),
}));
