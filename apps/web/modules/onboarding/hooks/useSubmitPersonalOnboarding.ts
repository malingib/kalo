import { useRouter } from "next/navigation";

import { useLocale } from "@kalo/lib/hooks/useLocale";
import { sessionStorage } from "@kalo/lib/webstorage";
import { trpc } from "@kalo/trpc/react";
import { showToast } from "@kalo/ui/components/toast";
import { setShowWelcomeToKaloModalFlag } from "@kalo/web/modules/shell/hooks/useWelcomeToCalcomModal";

const ONBOARDING_REDIRECT_KEY = "onBoardingRedirect";
const ORG_MODAL_STORAGE_KEY = "showNewOrgModal";

const DEFAULT_EVENT_TYPES = [
  { title: "15min_meeting", slug: "15min", length: 15 },
  { title: "30min_meeting", slug: "30min", length: 30 },
  { title: "secret_meeting", slug: "secret", length: 15, hidden: true },
];

export const useSubmitPersonalOnboarding = () => {
  const router = useRouter();
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const createEventType = trpc.viewer.eventTypesHeavy.create.useMutation();

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      try {
        if (eventTypes?.length === 0) {
          await Promise.all(
            DEFAULT_EVENT_TYPES.map(async (event) =>
              createEventType.mutateAsync({
                title: t(event.title),
                slug: event.slug,
                length: event.length,
                hidden: event.hidden,
              })
            )
          );
        }
      } catch (error) {
        console.error(error);
      }

      await utils.viewer.me.get.refetch();

      const redirectUrl = localStorage.getItem(ONBOARDING_REDIRECT_KEY);
      if (redirectUrl) {
        localStorage.removeItem(ONBOARDING_REDIRECT_KEY);
        router.push(redirectUrl);
        return;
      }

      const hasOrgModalFlag = sessionStorage.getItem(ORG_MODAL_STORAGE_KEY) === "true";
      if (!hasOrgModalFlag) {
        setShowWelcomeToKaloModalFlag();
        router.push("/event-types?welcomeToCalcomModal=true");
      } else {
        router.push("/event-types?newOrganizationModal=true");
      }
    },
    onError: (error) => {
      showToast(t("something_went_wrong"), "error");
      console.error(error);
    },
  });

  const submitPersonalOnboarding = () => {
    mutation.mutate({ completedOnboarding: true });
  };

  return {
    submitPersonalOnboarding,
    isSubmitting: mutation.isPending,
  };
};
