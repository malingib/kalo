import type { IFeatureRepository } from "@kalo/features/flags/repositories/PrismaFeatureRepository";
import { moduleLoader as cachedFeatureRepositoryModuleLoader } from "../../flags/di/CachedFeatureRepository.module";
import { type Container, createContainer } from "../di";

const featureRepositoryContainer: Container = createContainer();

export function getFeatureRepository(): IFeatureRepository {
  cachedFeatureRepositoryModuleLoader.loadModule(featureRepositoryContainer);
  return featureRepositoryContainer.get<IFeatureRepository>(cachedFeatureRepositoryModuleLoader.token);
}
