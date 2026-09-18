"use client";

import { useLocale } from "@kalo/lib/hooks/useLocale";
import { trpc } from "@kalo/trpc/react";
import { showToast } from "@kalo/ui/components/toast";
import { usePathname, useRouter } from "next/navigation";
import type { FormValues } from "../components/UserForm";
import { UserForm } from "../components/UserForm";

export default function UsersAddView() {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.users.add.useMutation({
    onSuccess: async () => {
      showToast(t("user_added_successfully"), "success");
      await utils.viewer.users.list.invalidate();
      if (pathname !== null) {
        router.replace(pathname.replace("/add", ""));
      }
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("error_adding_user"), "error");
    },
  });

  return (
    <UserForm
      submitLabel="add"
      onSubmit={(values: FormValues) => {
        const data: Record<string, unknown> = {
          name: values.name,
          email: values.email,
          username: values.username,
          bio: values.bio,
          timeZone: values.timeZone,
          weekStart: values.weekStart?.value,
          theme: values.theme,
          defaultScheduleId: values.defaultScheduleId,
          locale: values.locale?.value,
          timeFormat: values.timeFormat?.value,
          allowDynamicBooking: values.allowDynamicBooking,
          identityProvider: values.identityProvider?.value,
          role: values.role?.value,
          avatarUrl: values.avatarUrl,
        };
        mutation.mutate(data as Parameters<typeof mutation.mutate>[0]);
      }}
    />
  );
}
