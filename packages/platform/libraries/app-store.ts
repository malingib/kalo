import getEnabledAppsFromCredentials from "@kalo/app-store/_utils/getEnabledAppsFromCredentials";
import getApps, { type CredentialDataWithTeamName } from "@kalo/app-store/utils";
import handleDeleteCredential from "@kalo/features/credentials/handleDeleteCredential";

export type { TDependencyData } from "@kalo/app-store/_appRegistry";
export { BuildCalendarService } from "@kalo/app-store/applecalendar/lib";
export { BuildCalendarService as BuildIcsFeedCalendarService } from "@kalo/app-store/ics-feedcalendar/lib";
export type { CredentialOwner } from "@kalo/app-store/types";
export type { CredentialDataWithTeamName, LocationOption } from "@kalo/app-store/utils";
export { getAppFromSlug } from "@kalo/app-store/utils";

export { getApps };

export { handleDeleteCredential };

export type { App } from "@kalo/types/App";

export { getEnabledAppsFromCredentials };

export type { ConnectedApps } from "@kalo/app-store/_utils/getConnectedApps";
export { getConnectedApps } from "@kalo/app-store/_utils/getConnectedApps";
export { OAuth2UniversalSchema } from "@kalo/app-store/_utils/oauth/universalSchema";
export {
  CalendarAppDelegationCredentialClientIdNotAuthorizedError,
  CalendarAppDelegationCredentialConfigurationError,
  CalendarAppDelegationCredentialError,
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialNotSetupError,
  CalendarAppError,
} from "@kalo/lib/CalendarAppError";
export type { TServiceAccountKeySchema } from "@kalo/prisma/zod-utils";
export type { AppsStatus } from "@kalo/types/Calendar";
export type { CredentialPayload } from "@kalo/types/Credential";

// Delegation credentials removed (EE feature) — stub for API v2
export const DelegationCredentialRepository = {
  findByIdIncludeSensitiveServiceAccountKey(_args: {
    id: string;
  }): Promise<{ serviceAccountKey: { client_email: string; private_key: string } | null } | null> {
    return Promise.resolve(null);
  },
};

export { getUsersCredentialsIncludeServiceAccountKey } from "@kalo/app-store/delegationCredential";

// enrichUserWithDelegationConferencingCredentialsWithoutOrgId removed (EE feature) — stub for API v2
export async function enrichUserWithDelegationConferencingCredentialsWithoutOrgId(_args: {
  user: { credentials: unknown[]; [key: string]: unknown };
}): Promise<{ credentials: unknown[] }> {
  return { credentials: (_args.user.credentials as unknown[]) || [] };
}
