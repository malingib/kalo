"use client";

import { trpc } from "@kalo/trpc/react";
import { useState } from "react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  quantity: number;
  lowStockAlert: number;
  costPrice: number | null;
  salePrice: number | null;
  isActive: boolean;
}

type TxType = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "WRITE_OFF";

const TX_LABELS: Record<TxType, string> = {
  STOCK_IN: "📥 Stock In (Restock)",
  STOCK_OUT: "📤 Stock Out (Sold / Used)",
  ADJUSTMENT: "🔧 Adjustment (Correction)",
  WRITE_OFF: "❌ Write-Off (Damaged / Expired)",
};

export default function InventoryPage() {
  const utils = trpc.useUtils();
  const listQuery = trpc.viewer.vendor.listInventory.useQuery({ includeInactive: false });
  const items = (listQuery.data ?? []) as unknown as InventoryItem[];

  // Stock changes can fire a LOW_STOCK alert, so refresh the nav badge too.
  const invalidate = () =>
    Promise.all([
      utils.viewer.vendor.listInventory.invalidate(),
      utils.viewer.vendor.getUnreadAlertsCount.invalidate(),
    ]);

  const createMutation = trpc.viewer.vendor.createInventoryItem.useMutation({ onSuccess: invalidate });
  const stockMutation = trpc.viewer.vendor.recordStockTransaction.useMutation({ onSuccess: invalidate });

  const [showAdd, setShowAdd] = useState(false);
  const [showTx, setShowTx] = useState<InventoryItem | null>(null);
  const [txType, setTxType] = useState<TxType>("STOCK_IN");
  const [txQty, setTxQty] = useState(1);
  const [txNote, setTxNote] = useState("");
  const [txError, setTxError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // New item form state
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newUnit, setNewUnit] = useState("pcs");
  const [newQty, setNewQty] = useState(0);
  const [newAlert, setNewAlert] = useState(5);
  const [newCost, setNewCost] = useState(0);
  const [newSale, setNewSale] = useState(0);

  const addItem = () => {
    setAddError(null);
    createMutation.mutate(
      {
        name: newName,
        sku: newSku || null,
        unit: newUnit,
        quantity: newQty,
        lowStockAlert: newAlert,
        costPrice: newCost,
        salePrice: newSale,
      },
      {
        onSuccess: () => {
          setShowAdd(false);
          setNewName("");
          setNewSku("");
          setNewUnit("pcs");
          setNewQty(0);
          setNewAlert(5);
          setNewCost(0);
          setNewSale(0);
        },
        onError: (error) => setAddError(error.message),
      }
    );
  };

  const applyTx = () => {
    if (!showTx) return;
    setTxError(null);
    stockMutation.mutate(
      { itemId: showTx.id, type: txType, quantity: txQty, note: txNote || null },
      {
        onSuccess: () => {
          setShowTx(null);
          setTxQty(1);
          setTxNote("");
        },
        onError: (error) => setTxError(error.message),
      }
    );
  };

  const isLow = (item: InventoryItem) => item.quantity <= item.lowStockAlert;
  const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString();

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📦 Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track stock levels, costs, and auto-get alerts when items run low.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-lg hover:opacity-80 transition">
          + Add Item
        </button>
      </div>

      {listQuery.isLoading && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Loading inventory…</p>
        </div>
      )}

      {listQuery.isError && !listQuery.isLoading && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Couldn&apos;t load inventory. Please try again.</p>
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📦</p>
          <p className="text-sm">No inventory items yet — add your first item to start tracking stock.</p>
        </div>
      )}

      {/* Low-stock banner */}
      {items.some(isLow) && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Low Stock Items</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {items
                .filter(isLow)
                .map((i) => i.name)
                .join(", ")}{" "}
              — restock soon.
            </p>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Alert At</th>
                <th className="px-4 py-3">Cost (KES)</th>
                <th className="px-4 py-3">Sale (KES)</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isLow(item) && <span title="Low stock">🔴</span>}
                      <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.sku || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        isLow(item) ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                      }`}>
                      {item.quantity} {item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {item.lowStockAlert} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(item.costPrice)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(item.salePrice)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setShowTx(item);
                        setTxType("STOCK_IN");
                        setTxError(null);
                      }}
                      className="text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 transition mr-2">
                      Stock In
                    </button>
                    <button
                      onClick={() => {
                        setShowTx(item);
                        setTxType("STOCK_OUT");
                        setTxError(null);
                      }}
                      className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 transition">
                      Stock Out
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Inventory Item</h2>
            {addError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2">
                {addError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Item Name *",
                  value: newName,
                  onChange: setNewName,
                  type: "text",
                  placeholder: "e.g. Premium Pomade",
                  span: 2,
                },
                { label: "SKU", value: newSku, onChange: setNewSku, type: "text", placeholder: "POM-001" },
                {
                  label: "Unit",
                  value: newUnit,
                  onChange: setNewUnit,
                  type: "text",
                  placeholder: "pcs / ml / kg",
                },
                {
                  label: "Opening Qty",
                  value: String(newQty),
                  onChange: (v: string) => setNewQty(Number(v)),
                  type: "number",
                },
                {
                  label: "Low Stock Alert",
                  value: String(newAlert),
                  onChange: (v: string) => setNewAlert(Number(v)),
                  type: "number",
                },
                {
                  label: "Cost Price (KES)",
                  value: String(newCost),
                  onChange: (v: string) => setNewCost(Number(v)),
                  type: "number",
                },
                {
                  label: "Sale Price (KES)",
                  value: String(newSale),
                  onChange: (v: string) => setNewSale(Number(v)),
                  type: "number",
                },
              ].map(({ label, value, onChange, type, placeholder, span }) => (
                <div key={label} className={span === 2 ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
                Cancel
              </button>
              <button
                onClick={addItem}
                disabled={!newName.trim() || createMutation.isPending}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-lg disabled:opacity-50">
                {createMutation.isPending ? "Adding…" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transaction Modal */}
      {showTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Record Stock Movement</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Item: <span className="font-medium text-gray-900 dark:text-white">{showTx.name}</span> —
              Current: {showTx.quantity} {showTx.unit}
            </p>
            {txError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2">
                {txError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Transaction Type
                </label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as TxType)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {(Object.keys(TX_LABELS) as TxType[]).map((t) => (
                    <option key={t} value={t}>
                      {TX_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={txQty}
                  onChange={(e) => setTxQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder="e.g. Purchased from supplier"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTx(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 transition">
                Cancel
              </button>
              <button
                onClick={applyTx}
                disabled={stockMutation.isPending}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-lg disabled:opacity-50">
                {stockMutation.isPending ? "Applying…" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
