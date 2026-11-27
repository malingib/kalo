"use client";

import { trpc } from "@kalo/trpc/react";
import { useEffect, useState } from "react";

export default function MpesaSettingsPage() {
  const utils = trpc.useUtils();
  const profileQuery = trpc.viewer.vendor.getProfile.useQuery({});
  const saveProfile = trpc.viewer.vendor.upsertProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.vendor.getProfile.invalidate();
    },
  });

  const [tillNumber, setTillNumber] = useState("");
  const [paybill, setPaybill] = useState("");
  const [accountName, setAccountName] = useState("");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [darajaShortcode, setDarajaShortcode] = useState("");
  const [darajaPasskey, setDarajaPasskey] = useState("");
  const credentialsStatus = trpc.viewer.vendor.getMpesaCredentialsStatus.useQuery();
  const saveCredentials = trpc.viewer.vendor.updateMpesaCredentials.useMutation({
    onSuccess: async () => {
      setDarajaPasskey("");
      await credentialsStatus.refetch();
    },
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setTillNumber(profileQuery.data.mpesaTillNumber ?? "");
    setPaybill(profileQuery.data.mpesaPaybill ?? "");
    setAccountName(profileQuery.data.mpesaAccountName ?? "");
    setPayoutPhone(profileQuery.data.mpesaPayoutPhone ?? "");
  }, [profileQuery.data]);

  const handleSaveCredentials = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveCredentials.mutate({
      shortcode: darajaShortcode.trim(),
      ...(darajaPasskey.trim() ? { passkey: darajaPasskey.trim() } : {}),
    });
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveProfile.mutate({
      mpesaTillNumber: tillNumber.trim() || null,
      mpesaPaybill: paybill.trim() || null,
      mpesaAccountName: accountName.trim() || null,
      mpesaPayoutPhone: payoutPhone.trim() || null,
    });
  };

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">M-Pesa payment settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your business settlement details and the Daraja credentials used for booking STK Push.
        </p>
      </header>

      {profileQuery.isLoading && <p className="text-sm text-gray-500">Loading payment settings…</p>}
      {profileQuery.isError && (
        <p role="alert" className="text-sm text-red-600">
          Could not load payment settings. Please refresh and try again.
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Business settlement details</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              These details are stored on your vendor profile for settlement records and reconciliation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Buy Goods / Till number
              <input
                value={tillNumber}
                onChange={(event) => setTillNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 892341"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Paybill number
              <input
                value={paybill}
                onChange={(event) => setPaybill(event.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 522522"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Account name
              <input
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                maxLength={50}
                autoComplete="organization"
                placeholder="Business account name"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payout phone number
              <input
                value={payoutPhone}
                onChange={(event) => setPayoutPhone(event.target.value.replace(/[^+\d]/g, "").slice(0, 15))}
                inputMode="tel"
                autoComplete="tel"
                placeholder="e.g. 0712345678"
                className={inputClass}
              />
            </label>
          </div>

          {saveProfile.isSuccess && (
            <p role="status" className="text-sm text-green-700">
              Business settlement details saved.
            </p>
          )}
          {saveProfile.isError && (
            <p role="alert" className="text-sm text-red-600">
              {saveProfile.error.message}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileQuery.isLoading || profileQuery.isError || saveProfile.isPending}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {saveProfile.isPending ? "Saving…" : "Save settlement details"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
        <form onSubmit={handleSaveCredentials} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Daraja STK Push credentials</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Enter the shortcode and passkey issued for your business. The passkey is encrypted before storage and is never returned to the browser.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Configuration status:{" "}
              {credentialsStatus.isLoading
                ? "Checking…"
                : credentialsStatus.data?.hasShortcode && credentialsStatus.data?.hasPasskey
                  ? "Configured"
                  : "Not configured"}
            </p>
          </div>

          {credentialsStatus.isError && (
            <p role="alert" className="text-sm text-red-600">
              Could not load Daraja credential status.
            </p>
          )}

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Daraja Business Shortcode
            <input
              value={darajaShortcode}
              onChange={(event) => setDarajaShortcode(event.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              autoComplete="off"
              required
              placeholder="Re-enter your business shortcode"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Daraja Passkey
            <input
              type="password"
              value={darajaPasskey}
              onChange={(event) => setDarajaPasskey(event.target.value)}
              autoComplete="new-password"
              required={!credentialsStatus.data?.hasPasskey}
              placeholder={credentialsStatus.data?.hasPasskey ? "Saved securely — leave blank to keep current" : "Enter passkey"}
              className={inputClass}
            />
          </label>

          {saveCredentials.isError && (
            <p role="alert" className="text-sm text-red-600">
              {saveCredentials.error.message}
            </p>
          )}
          {saveCredentials.isSuccess && (
            <p role="status" className="text-sm text-green-700">
              Daraja credentials saved securely.
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                saveCredentials.isPending ||
                credentialsStatus.isLoading ||
                !darajaShortcode.trim() ||
                (!credentialsStatus.data?.hasPasskey && !darajaPasskey.trim())
              }
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saveCredentials.isPending ? "Saving…" : "Save Daraja credentials"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
