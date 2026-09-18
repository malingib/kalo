import { createModule, type ModuleLoader } from "@kalo/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@kalo/features/di/modules/Prisma";
import type { Module } from "@evyweb/ioctopus";
import { PrismaUserFeatureRepository } from "../repositories/PrismaUserFeatureRepository";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule: Module = createModule();
const token: symbol = FLAGS_DI_TOKENS.PRISMA_USER_FEATURE_REPOSITORY;
const moduleToken: symbol = FLAGS_DI_TOKENS.PRISMA_USER_FEATURE_REPOSITORY_MODULE;

thisModule.bind(token).toClass(PrismaUserFeatureRepository, [prismaModuleLoader.token]);

const loadModule = (container: ReturnType<typeof import("@kalo/features/di/di").createContainer>): void => {
  container.load(moduleToken, thisModule);
  prismaModuleLoader.loadModule(container);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaUserFeatureRepository };
