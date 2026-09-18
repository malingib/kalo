import { vi } from "vitest";

const featuresRepositoryModuleMock = {
  FeaturesRepository: vi.fn().mockImplementation(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
    checkIfUserHasFeature: vi.fn().mockResolvedValue(true),
    checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(true),
  })),
};

vi.mock("@kalo/features/flags/features.repository", () => featuresRepositoryModuleMock);
