"use client";

import { useState } from "react";

import { isDelegationCredential } from "@kalo/lib/delegationCredential";
import { useLocale } from "@kalo/lib/hooks/useLocale";
import { trpc } from "@kalo/trpc/react";
import type { ButtonProps } from "@kalo/ui/components/button";
import { DisconnectIntegrationComponent } from "@kalo/ui/components/disconnect-calendar-integration";
import { showToast } from "@kalo/ui/components/toast";

export default function DisconnectIntegration(props: {
  credentialId: number;
  teamId?: number | null;
  label?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  onSuccess?: () => void;
  buttonProps?: ButtonProps;
}) {
  const { t } = useLocale();
  const { onSuccess, credentialId, teamId } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.credentials.delete.useMutation({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
      setModalOpen(false);
      onSuccess && onSuccess();
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
      setModalOpen(false);
    },
    async onSettled() {
      await utils.viewer.calendars.connectedCalendars.invalidate();
      await utils.viewer.apps.integrations.invalidate();
    },
  });

  // Such a credential is added in-memory and removed when Delegation credential is disabled.
  const disableDisconnect = isDelegationCredential({ credentialId });
  return (
    <DisconnectIntegrationComponent
      onDeletionConfirmation={() => mutation.mutate({ id: credentialId, ...(teamId ? { teamId } : {}) })}
      isModalOpen={modalOpen}
      onModalOpen={() => setModalOpen((prevValue) => !prevValue)}
      disabled={disableDisconnect}
      {...props}
    />
  );
}
