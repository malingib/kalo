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

  useEffect(() => {
    if (!profileQuery.data) return;
    setTillNumber(profileQuery.data.mpesaTillNumber ?? "");
    setPaybill(profileQuery.data.mpesaPaybill ?? "");
    setAccountName(profileQuery.data.mpesaAccountName ?? "");
    setPayoutPhone(profileQuery.data.mpesaPayoutPhone ?? "");
  }, [profileQuery.data]);

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveProfile.mutate({
      mpesaTillNumber: tillNumber.trim() || null,
      mpesaPaybill: paybill.trim() || null,
      mpesaAccountName: accountName.trim() || null,
      mpesaPayoutPhone: payoutPhone.trim() || null,
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">M-Pesa payment settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Save your business's M-Pesa settlement details for reconciliation and vendor payouts.
        </p>
      </div>

      {profileQuery.isLoading && <p className="text-sm text-gray-500">Loading payment settings…</p>}
      {profileQuery.isError && (
        <p role="alert" className="text-sm text-red-600">
          Could not load payment settings. Please refresh and try again.
        </p>
      )}
      {saveProfile.isSuccess && (
        <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Payment details saved.
        </p>
      )}
      {saveProfile.isError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {saveProfile.error.message}
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Business payment details</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter your business Till or Paybill and the phone number used for settlements. These details are stored on your vendor profile.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Buy Goods / Till number
              <input
                value={tillNumber}
                onChange={(event) => setTillNumber(event.target.value.replace(/\\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 892341"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Paybill number
              <input
                value={paybill}
                onChange={(event) => setPaybill(event.target.value.replace(/\\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 522522"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Account name
              <input
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                maxLength={50}
                autoComplete="organization"
                placeholder="Name shown to the customer"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payout phone number
              <input
                value={payoutPhone}
                onChange={(event) => setPayoutPhone(event.target.value.replace(/[^+\\d]/g, "").slice(0, 15))}
                inputMode="tel"
                autoComplete="tel"
                placeholder="e.g. 0712345678"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </label>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">STK Push is platform-managed</p>
            <p className="mt-1">
              Daraja credentials are not collected on this page. The platform-managed integration will be enabled
              after its secure credential, callback, and payment-reconciliation setup is completed.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileQuery.isLoading || profileQuery.isError || saveProfile.isPending}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {saveProfile.isPending ? "Saving…" : "Save payment details"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
