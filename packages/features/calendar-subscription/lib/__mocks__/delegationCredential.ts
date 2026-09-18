import { vi } from "vitest";

export const getCredentialForSelectedCalendar = vi.fn();

vi.mock("@kalo/app-store/delegationCredential", () => ({
  getCredentialForSelectedCalendar,
}));
