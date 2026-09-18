import { createContainer } from "@kalo/features/di/di";
import { moduleLoader as userRepositoryModuleLoader } from "@kalo/features/di/modules/User";
import type { UserRepository } from "@kalo/features/users/repositories/UserRepository";

const userRepositoryContainer = createContainer();

export function getUserRepository(): UserRepository {
  userRepositoryModuleLoader.loadModule(userRepositoryContainer);
  return userRepositoryContainer.get<UserRepository>(userRepositoryModuleLoader.token);
}
