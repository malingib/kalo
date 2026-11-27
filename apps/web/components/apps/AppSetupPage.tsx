import { DynamicComponent } from "@kalo/app-store/_components/DynamicComponent";

// Retired third-party integrations no longer expose generic setup screens.
// Google Calendar uses the first-party OAuth flow and M-Pesa has dedicated settings.
export const AppSetupMap = {};

export const AppSetupPage = (props: { slug: string }) => {
  return <DynamicComponent<typeof AppSetupMap> componentMap={AppSetupMap} {...props} />;
};

export default AppSetupPage;
