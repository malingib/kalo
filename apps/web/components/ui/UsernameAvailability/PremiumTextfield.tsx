import classNames from "classnames";
// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import { useSession } from "next-auth/react";
import type { RefCallback } from "react";
import { useEffect, useState } from "react";

import { Dialog } from "@kalo/features/components/controlled-dialog";
import { fetchUsername } from "@kalo/lib/fetchUsername";
import hasKeyInMetadata from "@kalo/lib/hasKeyInMetadata";
import { useDebounce } from "@kalo/lib/hooks/useDebounce";
import { useLocale } from "@kalo/lib/hooks/useLocale";
import { trpc } from "@kalo/trpc/react";
import type { AppRouter } from "@kalo/trpc/types/server/routers/_app";
import { Button } from "@kalo/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@kalo/ui/components/dialog";
import { Label, Input } from "@kalo/ui/components/form";
import { Icon } from "@kalo/ui/components/icon";
import { CheckIcon } from "@coss/ui/icons";
import type { TRPCClientErrorLike } from "@trpc/client";

export enum UsernameChangeStatusEnum {
  UPGRADE = "UPGRADE",
}

interface ICustomUsernameProps {
  currentUsername: string | undefined;
  setCurrentUsername?: (newUsername: string) => void;
  inputUsernameValue: string | undefined;
  usernameRef: RefCallback<HTMLInputElement>;
  setInputUsernameValue: (value: string) => void;
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
  readonly?: boolean;
}

const obtainNewUsernameChangeCondition = ({
  userIsPremium,
  isNewUsernamePremium,
}: {
  userIsPremium: boolean;
  isNewUsernamePremium: boolean;
}) => {
  if (!userIsPremium && isNewUsernamePremium) return UsernameChangeStatusEnum.UPGRADE;
};

const PremiumTextfield = (props: ICustomUsernameProps) => {
  const { t } = useLocale();
  const { update } = useSession();
  const {
    currentUsername,
    setCurrentUsername = noop,
    inputUsernameValue,
    setInputUsernameValue,
    usernameRef,
    onSuccessMutation,
    onErrorMutation,
    readonly: disabled,
  } = props;
  const [user] = trpc.viewer.me.get.useSuspenseQuery();
  const { data: mpesaSubscription } = trpc.viewer.loggedInViewerRouter.mpesaSubscription.useQuery({
    refetchInterval: 5000,
  });
  const [usernameIsAvailable, setUsernameIsAvailable] = useState(false);
  const [markAsError, setMarkAsError] = useState(false);
  const [openDialogSaveUsername, setOpenDialogSaveUsername] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [subscriptionPromptSent, setSubscriptionPromptSent] = useState(false);
  const [isInputUsernamePremium, setIsInputUsernamePremium] = useState(false);
  const debouncedUsername = useDebounce(inputUsernameValue, 600);

  const isCurrentUsernamePremium =
    user && user.metadata && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;

  useEffect(() => {
    if (!currentUsername && mpesaSubscription?.username) {
      setInputUsernameValue(mpesaSubscription.username);
    }
  }, [setInputUsernameValue, currentUsername, mpesaSubscription?.username]);

  useEffect(() => {
    async function checkUsername(username: string | undefined) {
      if (!username) {
        setUsernameIsAvailable(false);
        setMarkAsError(false);
        setIsInputUsernamePremium(false);
        return;
      }
      const { data } = await fetchUsername(username, null);
      setMarkAsError(!data.available && !!currentUsername && username !== currentUsername);
      setIsInputUsernamePremium(data.premium);
      setUsernameIsAvailable(data.available);
    }
    void checkUsername(debouncedUsername);
  }, [debouncedUsername, currentUsername]);

  useEffect(() => {
    if (mpesaSubscription?.status === "ACTIVE" && mpesaSubscription.username && !currentUsername) {
      setCurrentUsername(mpesaSubscription.username);
      setInputUsernameValue(mpesaSubscription.username);
      void update({ username: mpesaSubscription.username });
      void onSuccessMutation?.();
    }
  }, [mpesaSubscription?.status, mpesaSubscription?.username, currentUsername, setCurrentUsername, setInputUsernameValue, update, onSuccessMutation]);

  const updateUsername = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      onSuccessMutation && (await onSuccessMutation());
      await update({ username: inputUsernameValue });
      setOpenDialogSaveUsername(false);
    },
    onError: (error) => onErrorMutation && onErrorMutation(error),
  });

  const usernameChangeCondition = obtainNewUsernameChangeCondition({
    userIsPremium: isCurrentUsernamePremium && mpesaSubscription?.status === "ACTIVE",
    isNewUsernamePremium: isInputUsernamePremium,
  });

  const renewPremiumSubscription = async () => {
    if (!mpesaSubscription?.id) return;
    setSubscriptionError(null);
    try {
      const response = await fetch("/api/mpesa/subscription-renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: mpesaSubscription.id }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "M-Pesa renewal could not be started");
      setSubscriptionPromptSent(true);
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : "M-Pesa renewal could not be started");
    }
  };

  const startPremiumSubscription = async () => {
    setSubscriptionError(null);
    if (
      mpesaSubscription?.status === "PAST_DUE" &&
      mpesaSubscription.username === inputUsernameValue
    ) {
      await renewPremiumSubscription();
      return;
    }
    if (!inputUsernameValue || !phoneNumber.trim()) {
      setSubscriptionError("Enter the username and Kenyan mobile number to continue.");
      return;
    }
    try {
      const response = await fetch("/api/mpesa/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentUsername: inputUsernameValue, phoneNumber }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "M-Pesa subscription could not be started");
      setSubscriptionPromptSent(true);
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : "M-Pesa subscription could not be started");
    }
  };

  const ActionButtons = () => {
    if ((usernameIsAvailable || isInputUsernamePremium) && currentUsername !== inputUsernameValue) {
      return (
        <div className="flex flex-row">
          <Button
            type="button"
            color="primary"
            className="mx-2"
            onClick={() => setOpenDialogSaveUsername(true)}
            data-testid="update-username-btn">
            {usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE ? "Reserve with M-Pesa" : t("update")}
          </Button>
          <Button
            type="button"
            color="secondary"
            onClick={() => currentUsername && setInputUsernameValue(currentUsername)}>
            {t("cancel")}
          </Button>
        </div>
      );
    }
    return <></>;
  };

  const saveUsername = () => {
    if (usernameChangeCondition !== UsernameChangeStatusEnum.UPGRADE) {
      updateUsername.mutate({ username: inputUsernameValue });
      setCurrentUsername(inputUsernameValue);
    }
  };

  let paymentMsg = !currentUsername ? (
    <span className="text-xs text-orange-400">Premium usernames require a monthly M-Pesa subscription.</span>
  ) : null;
  if (mpesaSubscription?.status === "PAYMENT_PENDING" || mpesaSubscription?.status === "RENEWAL_INITIATING") {
    paymentMsg = <span className="text-xs text-orange-400">M-Pesa prompt sent. Enter your PIN to authorize payment.</span>;
  } else if (mpesaSubscription?.status === "PAST_DUE") {
    paymentMsg = <span className="text-xs text-red-500">Your premium subscription is past due. Renew to keep premium username access.</span>;
  } else if (mpesaSubscription?.status === "RECONCILIATION_REQUIRED") {
    paymentMsg = <span className="text-xs text-orange-400">Your M-Pesa payment needs reconciliation. Please contact support; do not retry yet.</span>;
  } else if (subscriptionPromptSent) {
    paymentMsg = <span className="text-xs text-orange-400">M-Pesa prompt sent. Complete payment to reserve your username.</span>;
  }

  return (
    <div>
      <div className="flex justify-items-center">
        <Label htmlFor="username">{t("username")}</Label>
      </div>
      <div className="flex rounded-md">
        <span
          className={classNames(
            isInputUsernamePremium ? "border border-orange-400 " : "",
            "border-default bg-cal-muted text-subtle hidden h-8 items-center rounded-l-md border border-r-0 px-3 text-sm md:inline-flex"
          )}>
          {process.env.NEXT_PUBLIC_WEBSITE_URL.replace("https://", "").replace("http://", "")}/
        </span>
        <div className="relative w-full">
          <Input
            ref={usernameRef}
            name="username"
            autoComplete="none"
            autoCapitalize="none"
            autoCorrect="none"
            disabled={disabled}
            className={classNames(
              "border-l my-0 rounded-md font-sans text-sm leading-4 focus:ring-0! sm:rounded-l-none",
              isInputUsernamePremium ? "border border-orange-400 focus:border focus:border-orange-400" : "border focus:border",
              markAsError
                ? "focus:shadow-0 focus:ring-shadow-0 border-red-500 focus:border-red-500 focus:outline-none"
                : "border-l-default",
              disabled ? "bg-subtle text-muted focus:border-0" : ""
            )}
            value={inputUsernameValue}
            onChange={(event) => {
              event.preventDefault();
              setSubscriptionPromptSent(false);
              setInputUsernameValue(event.target.value);
            }}
            data-testid="username-input"
          />
          <div className="absolute right-2 top-0 flex flex-row">
            <span className={classNames("mx-2 py-2", isInputUsernamePremium ? "text-transparent" : "")}>
              {isInputUsernamePremium ? <Icon name="star" className="mt-[2px] h-4 w-4 fill-orange-400" /> : null}
              {!isInputUsernamePremium && usernameIsAvailable ? <CheckIcon className="mt-[2px] h-4 w-4" /> : null}
            </span>
          </div>
        </div>
        {(usernameIsAvailable || isInputUsernamePremium) && currentUsername !== inputUsernameValue && (
          <div className="flex justify-end">
            <ActionButtons />
          </div>
        )}
      </div>
      {paymentMsg}
      {mpesaSubscription?.status === "PAST_DUE" && (
        <div className="mt-2">
          <Button type="button" color="primary" size="sm" onClick={() => void renewPremiumSubscription()}>
            Renew premium username with M-Pesa
          </Button>
          {subscriptionError && <p className="mt-1 text-xs text-red-500">{subscriptionError}</p>}
          {subscriptionPromptSent && <p className="mt-1 text-xs text-orange-400">Renewal prompt sent. Enter your M-Pesa PIN.</p>}
        </div>
      )}
      {markAsError && <p className="mt-1 text-xs text-red-500">{t("username_already_taken")}</p>}

      <Dialog open={openDialogSaveUsername}>
        <DialogContent
          Icon="pencil"
          title={t("confirm_username_change_dialog_title")}
          description={
            usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE
              ? "Premium username access is billed monthly through M-Pesa."
              : undefined
          }>
          <div className="mb-4 w-full px-4 pt-1">
            <div className="bg-subtle flex w-full flex-wrap rounded-sm py-3 text-sm">
              <div className="flex-1 px-2">
                <p className="text-subtle">{t("current_username")}</p>
                <p className="text-emphasis mt-1 break-all" data-testid="current-username">{currentUsername || "—"}</p>
              </div>
              <div className="ml-6 flex-1">
                <p className="text-subtle" data-testid="new-username">{t("new_username")}</p>
                <p className="text-emphasis break-all">{inputUsernameValue}</p>
              </div>
            </div>
          </div>
          {usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE && (
            <div className="mb-4 px-4">
              <Label htmlFor="mpesa-phone">M-Pesa phone number</Label>
              <Input
                id="mpesa-phone"
                name="mpesa-phone"
                type="tel"
                autoComplete="tel"
                placeholder="07XXXXXXXX"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
              {subscriptionError && <p className="mt-2 text-xs text-red-500">{subscriptionError}</p>}
              {subscriptionPromptSent && <p className="mt-2 text-xs text-green-700">Prompt sent. Enter your M-Pesa PIN.</p>}
            </div>
          )}
          <DialogFooter className="mt-4">
            {usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE ? (
              <Button
                type="button"
                loading={false}
                data-testid="start-mpesa-subscription"
                onClick={() => void startPremiumSubscription()}>
                Pay with M-Pesa
              </Button>
            ) : (
              <Button
                type="button"
                loading={updateUsername.isPending}
                data-testid="save-username"
                onClick={saveUsername}>
                {t("save")}
              </Button>
            )}
            <DialogClose color="secondary" onClick={() => setOpenDialogSaveUsername(false)}>
              {t("cancel")}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { PremiumTextfield };
