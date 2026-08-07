"use client";

import React, { useState } from "react";

interface LineItem { description: string; qty: number; unitPrice: number; total: number; }
interface Receipt {
  id: string; receiptNumber: string; customerName: string; customerPhone: string;
  totalAmount: number; depositPaid: number; mpesaReceiptNumber: string;
  paymentMethod: string; issuedAt: string; lineItemsJson: LineItem[];
  sentViaWhatsapp: boolean;
}

const MOCK_RECEIPTS: Receipt[] = [
  {
    id: "r1", receiptNumber: "RCP-20260805-0001", customerName: "Brian Otieno",
    customerPhone: "0712345678", totalAmount: 1500, depositPaid: 500,
    mpesaReceiptNumber: "QGH89210SK", paymentMethod: "M-Pesa",
    issuedAt: "2026-08-05T10:30:00Z", sentViaWhatsapp: true,
    lineItemsJson: [
      { description: "Executive Haircut & Facial", qty: 1, unitPrice: 1500, total: 1500 },
    ],
  },
  {
    id: "r2", receiptNumber: "RCP-20260805-0002", customerName: "Grace Wanjiku",
    customerPhone: "0722987654", totalAmount: 800, depositPaid: 0,
    mpesaReceiptNumber: "QKL12345RT", paymentMethod: "M-Pesa",
    issuedAt: "2026-08-05T14:15:00Z", sentViaWhatsapp: false,
    lineItemsJson: [
      { description: "Beard Trim & Styling", qty: 1, unitPrice: 800, total: 800 },
    ],
  },
];

export default function ReceiptsPage() {
  const [receipts] = useState<Receipt[]>(MOCK_RECEIPTS);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [search, setSearch] = useState("");

  const filtered = receipts.filter(r =>
    r.customerName.toLowerCase().includes(search.toLowerCase()) ||
    r.mpesaReceiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
    r.receiptNumber.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (v: number) => `KES ${v.toLocaleString()}`;
  const fmtDate = (s: string) => new Date(s).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🧾 Receipts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            All customer receipts generated after M-Pesa payment confirmation.
          </p>
        </div>
      </div>

      {/* Search */}
      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by customer, M-Pesa code, or receipt number..."
        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
      />

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Receipt #</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">M-Pesa Code</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Issued (EAT)</th>
                <th className="px-4 py-3 text-left">WA Sent</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{r.receiptNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{r.customerName}</p>
                    <p className="text-xs text-gray-400">{r.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-green-700 dark:text-green-400">{r.mpesaReceiptNumber}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{fmt(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{fmtDate(r.issuedAt)}</td>
                  <td className="px-4 py-3">
                    {r.sentViaWhatsapp
                      ? <span className="text-green-500 text-lg">✅</span>
                      : <span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => setSelected(r)}
                      className="text-xs px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                      View
                    </button>
                    {!r.sentViaWhatsapp && (
                      <button className="text-xs px-3 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 transition">
                        📱 Send
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No receipts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            {/* Receipt Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">🧾 Receipt</h2>
                  <p className="font-mono text-xs text-gray-500">{selected.receiptNumber}</p>
                  <p className="text-xs text-gray-400 mt-1">{fmtDate(selected.issuedAt)}</p>
                </div>
                <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                  PAID
                </span>
              </div>
            </div>

            {/* Customer */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{selected.customerName}</p>
              <p className="text-xs text-gray-500">{selected.customerPhone}</p>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Services</p>
              {selected.lineItemsJson.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{item.description} × {item.qty}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{fmt(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1">
              {selected.depositPaid > 0 && (
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Deposit Paid</span><span>-{fmt(selected.depositPaid)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white">
                <span>Total Paid</span><span>{fmt(selected.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Payment Method</span><span>{selected.paymentMethod}</span>
              </div>
              {selected.mpesaReceiptNumber && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>M-Pesa Code</span>
                  <span className="font-mono text-green-600 dark:text-green-400">{selected.mpesaReceiptNumber}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setSelected(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Close
              </button>
              <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition">
                📱 Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
