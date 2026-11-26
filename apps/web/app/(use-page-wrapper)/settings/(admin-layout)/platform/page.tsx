"use client";

import React, { useEffect, useState } from "react";
import { trpc } from "@kalo/trpc/react";

interface SubscriptionPlan {
  slug: string;
  label: string;
  maxServices: number;
  feePercent: number;
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
  { slug: "basic", label: "Basic", maxServices: 3, feePercent: 5 },
  { slug: "pro", label: "Pro", maxServices: 20, feePercent: 2 },
  { slug: "enterprise", label: "Enterprise", maxServices: 999, feePercent: 1 },
];

export default function PlatformSettingsPage() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.viewer.admin.getPlatformSettings.useQuery({});
  const saveSettings = trpc.viewer.admin.updatePlatformSettings.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.getPlatformSettings.invalidate();
    },
  });
  const [fee, setFee] = useState(3);
  const [requireApproval, setRequireApproval] = useState(true);
  const [centralWaEnabled, setCentralWaEnabled] = useState(false);
  const [centralWaPhone, setCentralWaPhone] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setFee(settings.platformFeePercent);
    setRequireApproval(settings.requireVendorApproval);
    setCentralWaEnabled(settings.centralWhatsappEnabled);
    setCentralWaPhone(settings.centralWhatsappPhone ?? "");
    setPlans((settings.subscriptionPlans as unknown as SubscriptionPlan[] | null) ?? DEFAULT_PLANS);
  }, [settingsQuery.data]);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveSettings.mutate({
      platformFeePercent: fee,
      platformFeeCurrency: "KES",
      subscriptionPlans: plans,
      requireVendorApproval: requireApproval,
      centralWhatsappEnabled: centralWaEnabled,
      centralWhatsappPhone: centralWaPhone.trim() || null,
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Platform Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Global configuration for the platform. Only accessible by the Super Admin.
        </p>
      </div>

      {settingsQuery.isLoading && <p className="text-sm text-gray-500">Loading platform settings…</p>}
      {settingsQuery.isError && <p role="alert" className="text-sm text-red-600">Could not load platform settings.</p>}
      {saveSettings.isSuccess && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">Platform settings saved.</p>}
      {saveSettings.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{saveSettings.error.message}</p>}

      <form onSubmit={handleSave} className="space-y-8">
        {/* ── Monetisation ───────────────────────────────── */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">💰 Monetisation & Fees</h2>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform Commission (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Deducted from every completed booking payment before vendor payout.</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Subscription Plans</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4">Max Services</th>
                    <th className="pb-2">Fee %</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan, i) => (
                    <tr key={plan.slug} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{plan.label}</td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          value={plan.maxServices}
                          onChange={(e) => {
                            const updated = [...plans];
                            updated[i] = { ...plan, maxServices: Number(e.target.value) };
                            setPlans(updated);
                          }}
                          className="w-20 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={plan.feePercent}
                          onChange={(e) => {
                            const updated = [...plans];
                            updated[i] = { ...plan, feePercent: Number(e.target.value) };
                            setPlans(updated);
                          }}
                          className="w-20 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Vendor Onboarding ──────────────────────────── */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🏪 Vendor Onboarding</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-0"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Require admin approval before a vendor goes live
            </span>
          </label>
        </section>

        {/* ── Master Daraja (Platform M-Pesa) ───────────── */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            💚 Master M-Pesa / Safaricom Daraja
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Daraja is configured through server-side deployment environment variables, not this browser form.
            Credentials are never returned by the settings API or stored in platform settings.
          </p>
          <ul className="list-disc pl-5 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <li>DARAJA_CONSUMER_KEY</li>
            <li>DARAJA_CONSUMER_SECRET</li>
            <li>DARAJA_CALLBACK_URL</li>
            <li>DARAJA_CALLBACK_SECRET</li>
            <li>DARAJA_ENVIRONMENT (sandbox or production)</li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            STK Push remains unavailable until the production credentials, callback URL, and payment reconciliation
            are configured and verified.
          </p>
        </section>

        {/* ── Central WhatsApp Gateway ───────────────────── */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📱 Central WhatsApp Gateway</h2>
          <p className="text-xs text-gray-500">
            A single shared WhatsApp number for all vendors. Customers can discover any vendor from one chat.
            Individual Pro vendors can also pair their own dedicated WhatsApp line.
          </p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={centralWaEnabled}
              onChange={(e) => setCentralWaEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-0"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable central WhatsApp discovery line</span>
          </label>

          {centralWaEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform WhatsApp Phone Number (+254...)
              </label>
              <input
                type="text"
                value={centralWaPhone}
                onChange={(e) => setCentralWaPhone(e.target.value)}
                placeholder="+254 700 000 000"
                className="mt-1 w-64 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={settingsQuery.isLoading || settingsQuery.isError || saveSettings.isPending}
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg text-sm hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveSettings.isPending ? "Saving…" : "Save Platform Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
