"use client";

import React, { useState } from "react";

type Day = { day: number; label: string; open: string; close: string; closed: boolean };
type Faq = { question: string; answer: string };

const DAYS: Day[] = [
  { day: 0, label: "Sunday",    open: "08:00", close: "17:00", closed: true  },
  { day: 1, label: "Monday",    open: "08:00", close: "19:00", closed: false },
  { day: 2, label: "Tuesday",   open: "08:00", close: "19:00", closed: false },
  { day: 3, label: "Wednesday", open: "08:00", close: "19:00", closed: false },
  { day: 4, label: "Thursday",  open: "08:00", close: "19:00", closed: false },
  { day: 5, label: "Friday",    open: "08:00", close: "19:00", closed: false },
  { day: 6, label: "Saturday",  open: "09:00", close: "17:00", closed: false },
];

export default function VendorProfileSettingsPage() {
  // ── Storefront ──────────────────────────────────────────
  const [businessName, setBusinessName]   = useState("");
  const [slug, setSlug]                   = useState("");
  const [bio, setBio]                     = useState("");
  const [locationText, setLocationText]   = useState("");

  // ── M-Pesa ──────────────────────────────────────────────
  const [tillNumber, setTillNumber]       = useState("");
  const [paybill, setPaybill]             = useState("");
  const [accountName, setAccountName]     = useState("");
  const [payoutPhone, setPayoutPhone]     = useState("");
  const [ownDarajaKey, setOwnDarajaKey]   = useState("");
  const [ownDarajaSecret, setOwnDarajaSecret] = useState("");
  const [ownDarajaShortcode, setOwnDarajaShortcode] = useState("");
  const [ownDarajaPasskey, setOwnDarajaPasskey]     = useState("");

  // ── WhatsApp ─────────────────────────────────────────────
  const [waEnabled, setWaEnabled]         = useState(false);
  const [greeting, setGreeting]           = useState("Sasa! Welcome to [Your Business Name]!\n\nHow can we help you today?");
  const [offlineMsg, setOfflineMsg]       = useState("Sorry, we are currently offline. We'll be back soon!");
  const [autoConfirm, setAutoConfirm]     = useState(false);
  const [faqs, setFaqs]                   = useState<Faq[]>([{ question: "", answer: "" }]);

  // ── Operating Hours ──────────────────────────────────────
  const [hours, setHours]                 = useState<Day[]>(DAYS);

  const [saved, setSaved]                 = useState(false);
  const [activeTab, setActiveTab]         = useState<"storefront" | "mpesa" | "whatsapp" | "hours">("storefront");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { key: "storefront", label: "🏪 Storefront"  },
    { key: "mpesa",      label: "💚 M-Pesa"      },
    { key: "whatsapp",   label: "📱 WhatsApp"    },
    { key: "hours",      label: "🕐 Store Hours" },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your storefront, M-Pesa payments, WhatsApp automation, and store hours.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
          ✅ Settings saved successfully!
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === tab.key
                ? "bg-white dark:bg-gray-800 border border-b-white dark:border-gray-700 dark:border-b-gray-800 text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* ── STOREFRONT TAB ─────────────────────────────── */}
        {activeTab === "storefront" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🏪 Storefront Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Name</label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="BarberHub Nairobi"
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  URL Slug
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 text-gray-500 text-sm">
                    /vendor/
                  </span>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="barberhub-nairobi"
                    className="flex-1 rounded-r-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio / Description</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Professional barbershop offering executive cuts, beard trims, and facials..."
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Location (Address / Area)
              </label>
              <input
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="2nd Floor, Westlands Mall, Nairobi"
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* ── M-PESA TAB ─────────────────────────────────── */}
        {activeTab === "mpesa" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">💚 M-Pesa Payment Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buy Goods / Till Number</label>
                <input
                  value={tillNumber}
                  onChange={(e) => setTillNumber(e.target.value)}
                  placeholder="e.g. 892341"
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paybill Number</label>
                <input
                  value={paybill}
                  onChange={(e) => setPaybill(e.target.value)}
                  placeholder="e.g. 522522"
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Name</label>
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Name shown to customer"
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  M-Pesa Payout Number
                </label>
                <input
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  placeholder="07XXXXXXXX (receives payouts)"
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                📲 Own Daraja STK Push Credentials
                <span className="ml-2 text-xs font-normal text-gray-500">(Pro Plan only)</span>
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Leave blank to use the platform's master M-Pesa gateway instead.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Consumer Key",    value: ownDarajaKey,       onChange: setOwnDarajaKey       },
                  { label: "Consumer Secret", value: ownDarajaSecret,    onChange: setOwnDarajaSecret    },
                  { label: "Shortcode",       value: ownDarajaShortcode, onChange: setOwnDarajaShortcode },
                  { label: "Passkey",         value: ownDarajaPasskey,   onChange: setOwnDarajaPasskey   },
                ].map(({ label, value, onChange }) => (
                  <div key={label}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                    <input
                      type="password"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── WHATSAPP TAB ───────────────────────────────── */}
        {activeTab === "whatsapp" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📱 WhatsApp Automation</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waEnabled}
                  onChange={(e) => setWaEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enabled</span>
              </label>
            </div>

            {/* QR Pairing */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Disconnected
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">No WhatsApp device paired yet</p>
                <p className="text-xs text-gray-500">Scan with your business WhatsApp to begin automation.</p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg text-sm hover:bg-green-700 transition"
              >
                Scan QR to Pair
              </button>
            </div>

            {/* Greeting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Welcome Greeting Message</label>
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Offline Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Offline / Away Message</label>
              <textarea
                value={offlineMsg}
                onChange={(e) => setOfflineMsg(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Auto-Confirm */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoConfirm}
                onChange={(e) => setAutoConfirm(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-confirm booking once deposit is received via M-Pesa
              </span>
            </label>

            {/* FAQ Builder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Automated FAQ Answers
                </label>
                <button
                  type="button"
                  onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add FAQ
                </button>
              </div>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <input
                      value={faq.question}
                      onChange={(e) => {
                        const updated = [...faqs];
                        updated[i] = { ...faq, question: e.target.value };
                        setFaqs(updated);
                      }}
                      placeholder="Q: Where are you located?"
                      className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <input
                      value={faq.answer}
                      onChange={(e) => {
                        const updated = [...faqs];
                        updated[i] = { ...faq, answer: e.target.value };
                        setFaqs(updated);
                      }}
                      placeholder="A: 2nd Floor, Westlands Mall, Nairobi"
                      className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STORE HOURS TAB ────────────────────────────── */}
        {activeTab === "hours" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🕐 Operating Hours (EAT)</h2>
            <p className="text-xs text-gray-500">All times are in East Africa Time (Africa/Nairobi, UTC+3).</p>

            <div className="space-y-3">
              {hours.map((day, i) => (
                <div key={day.day} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium text-gray-700 dark:text-gray-300">{day.label}</div>
                  <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!day.closed}
                      onChange={(e) => {
                        const updated = [...hours];
                        updated[i] = { ...day, closed: !e.target.checked };
                        setHours(updated);
                      }}
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                    Open
                  </label>
                  {!day.closed && (
                    <>
                      <input
                        type="time"
                        value={day.open}
                        onChange={(e) => {
                          const updated = [...hours];
                          updated[i] = { ...day, open: e.target.value };
                          setHours(updated);
                        }}
                        className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        type="time"
                        value={day.close}
                        onChange={(e) => {
                          const updated = [...hours];
                          updated[i] = { ...day, close: e.target.value };
                          setHours(updated);
                        }}
                        className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </>
                  )}
                  {day.closed && (
                    <span className="text-xs text-gray-400 italic">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg text-sm hover:opacity-90 transition"
          >
            Save Vendor Settings
          </button>
        </div>
      </form>
    </div>
  );
}
