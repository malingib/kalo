import { getFeatureRepository } from "@kalo/features/di/containers/FeatureRepository";
import publicProcedure from "@kalo/trpc/server/procedures/publicProcedure";

/**
 * TRPC procedure that returns a map of all feature flags and their enabled status.
 * Uses the CachedFeatureRepository to handle caching and database access.
 */
export const map = publicProcedure.query(async () => {
  const featuresRepository = getFeatureRepository();
  return featuresRepository.getFeatureFlagMap();
});
