import { useLocale } from "@kalo/lib/hooks/useLocale";
import classNames from "@kalo/ui/classNames";
import { Button } from "@kalo/ui/components/button";
import { showToast } from "@kalo/ui/components/toast";
import useAddAppMutation from "../_utils/useAddAppMutation";
import { InstallAppButton } from "../InstallAppButton";
import type { AppCardApp } from "../types";

type AppData = Pick<AppCardApp, "type" | "variant" | "slug">;

/**
 * Use this component to allow installing an app from anywhere on the app.
 * Use of this component requires you to remove custom InstallAppButtonComponent so that it can manage the redirection itself.
 *
 * The `app` prop must be provided with the necessary app data.
 * This avoids redundant API calls and prevents the app-store package from depending on the features package.
 */
export default function OmniInstallAppButton({
  app,
  className,
  returnTo,
  teamId,
  onAppInstallSuccess,
}: {
  app: AppData;
  className: string;
  onAppInstallSuccess: () => void;
  returnTo?: string;
  teamId?: number;
}) {
  const { t } = useLocale();

  const mutation = useAddAppMutation(null, {
    returnTo,
    onSuccess: (data) => {
      onAppInstallSuccess();
      if (data?.setupPending) return;
      showToast(t("app_successfully_installed"), "success");
    },
    onError: (error) => {
      if (error instanceof Error) showToast(error.message || t("app_could_not_be_installed"), "error");
    },
  });

  return (
    <InstallAppButton
      type={app.type}
      wrapperClassName={classNames("[@media(max-width:260px)]:w-full", className)}
      render={({ useDefaultComponent, ...props }) => {
        if (useDefaultComponent) {
          props = {
            ...props,
            onClick: () => {
              mutation.mutate({
                type: app.type,
                variant: app.variant,
                slug: app.slug,
                ...(teamId && { teamId }),
              });
            },
          };
        }

        return (
          <Button
            loading={mutation.isPending}
            color="secondary"
            className="[@media(max-width:260px)]:w-full [@media(max-width:260px)]:justify-center"
            StartIcon="plus"
            {...props}>
            {t("add")}
          </Button>
        );
      }}
    />
  );
}
