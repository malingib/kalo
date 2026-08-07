"use client";

import React, { useState } from "react";

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
  const [fee, setFee] = useState(3);
  const [isSandbox, setIsSandbox] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [centralWaEnabled, setCentralWaEnabled] = useState(false);
  const [centralWaPhone, setCentralWaPhone] = useState("");
  const [darajaKey, setDarajaKey] = useState("");
  const [darajaSecret, setDarajaSecret] = useState("");
  const [darajaShortcode, setDarajaShortcode] = useState("");
  const [darajaPasskey, setDarajaPasskey] = useState("");
  const [darajaCallbackUrl, setDarajaCallbackUrl] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Platform Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Global configuration for the platform. Only accessible by the Super Admin.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
          ✅ Platform settings saved.
        </div>
      )}

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
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            💚 Master M-Pesa / Safaricom Daraja Credentials
          </h2>
          <p className="text-xs text-gray-500">
            Used by the platform for centralised STK Push and automated vendor payouts. Individual Pro vendors can
            override with their own credentials.
          </p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isSandbox}
              onChange={(e) => setIsSandbox(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-0"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Use Daraja Sandbox (test mode)</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Consumer Key", value: darajaKey, onChange: setDarajaKey },
              { label: "Consumer Secret", value: darajaSecret, onChange: setDarajaSecret },
              { label: "Business Shortcode", value: darajaShortcode, onChange: setDarajaShortcode },
              { label: "Passkey", value: darajaPasskey, onChange: setDarajaPasskey },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={`Platform ${label}`}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Callback URL</label>
              <input
                type="url"
                value={darajaCallbackUrl}
                onChange={(e) => setDarajaCallbackUrl(e.target.value)}
                placeholder="https://yourdomain.com/api/mpesa/callback"
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
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
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg text-sm hover:opacity-90 transition"
          >
            Save Platform Settings
          </button>
        </div>
      </form>
    </div>
  );
}
