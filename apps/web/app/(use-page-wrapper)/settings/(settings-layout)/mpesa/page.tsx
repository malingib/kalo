"use client";

import React, { useState } from "react";

export default function MpesaSettingsPage() {
  const [tillNumber, setTillNumber] = useState("");
  const [paybill, setPaybill] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [passkey, setPasskey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          🇰🇪 M-Pesa & WhatsApp Commerce Settings
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure mobile payments (Lipa Na M-Pesa) and WhatsApp automated bookings for your store.
        </p>
      </div>

      {isSaved && (
        <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
          ✅ Settings saved successfully!
        </div>
      )}

      {/* M-Pesa Settings Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          💚 Lipa Na M-Pesa Payment Details
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Buy Goods / Till Number
              </label>
              <input
                type="text"
                placeholder="e.g. 892341"
                value={tillNumber}
                onChange={(e) => setTillNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Paybill Number
              </label>
              <input
                type="text"
                placeholder="e.g. 522522"
                value={paybill}
                onChange={(e) => setPaybill(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <hr className="my-4 border-gray-200 dark:border-gray-700" />

          <h3 className="text-md font-medium text-gray-900 dark:text-white">
            📲 Automated STK Push (Safaricom Daraja API)
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Required if you want M-Pesa STK Push prompts sent directly to customer phones during WhatsApp checkout.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Business Shortcode
              </label>
              <input
                type="text"
                placeholder="e.g. 174379"
                value={shortcode}
                onChange={(e) => setShortcode(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Passkey
              </label>
              <input
                type="password"
                placeholder="Daraja Passkey"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg text-sm hover:opacity-90 transition"
            >
              Save Payment Settings
            </button>
          </div>
        </form>
      </div>

      {/* WhatsApp Connection Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          📱 WhatsApp Automated Channel
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect your vendor phone number to automate bookings, answers, deposits, and orders via Baileys.
        </p>

        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Disconnected
            </span>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
              No WhatsApp device paired yet
            </p>
          </div>

          <button className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg text-sm hover:bg-green-700 transition">
            Scan QR Code to Pair
          </button>
        </div>
      </div>
    </div>
  );
}
