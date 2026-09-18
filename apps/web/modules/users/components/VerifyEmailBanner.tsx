import { useFlagMap } from "@kalo/features/flags/context/provider";
import { APP_NAME } from "@kalo/lib/constants";
import { useLocale } from "@kalo/lib/hooks/useLocale";
import { trpc } from "@kalo/trpc/react";
import { showToast } from "@kalo/ui/components/toast";
import { TopBanner } from "@kalo/ui/components/top-banner";

export type VerifyEmailBannerProps = {
  data: boolean;
};

function VerifyEmailBanner({ data }: VerifyEmailBannerProps) {
  const flags = useFlagMap();
  const { t } = useLocale();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();

  if (!data || !flags["email-verification"]) return null;

  return (
    <>
      <TopBanner
        icon="mail"
        text={t("verify_email_banner_body", { appName: APP_NAME })}
        variant="warning"
        actions={
          <a
            className="underline hover:cursor-pointer"
            onClick={() => {
              mutation.mutate();
              showToast(t("email_sent"), "success");
            }}>
            {t("resend_email")}
          </a>
        }
      />
    </>
  );
}

export default VerifyEmailBanner;
