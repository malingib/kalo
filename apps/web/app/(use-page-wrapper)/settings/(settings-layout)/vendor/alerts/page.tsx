"use client";

import { trpc } from "@calcom/trpc/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type AlertType =
  | "LOW_STOCK"
  | "NEW_BOOKING"
  | "PAYMENT_RECEIVED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REMINDER"
  | "DEPOSIT_OVERDUE"
  | "VENDOR_APPROVAL_NEEDED"
  | "PLATFORM_ANNOUNCEMENT";
type AlertChannel = "IN_APP" | "WHATSAPP" | "EMAIL" | "SMS";

interface AlertItem {
  id: string;
  type: AlertType;
  channel: AlertChannel;
  title: string;
  body: string;
  isRead: boolean;
  isDismissed: boolean;
  metadata?: { bookingUid?: string } | null;
  createdAt: string;
}

type AlertPrefs = Partial<Record<AlertType, AlertChannel[]>>;

const ALERT_LABELS: Record<AlertType, string> = {
  LOW_STOCK: "📦 Low Stock",
  NEW_BOOKING: "📅 New Booking",
  PAYMENT_RECEIVED: "💰 Payment Received",
  BOOKING_CANCELLED: "❌ Booking Cancelled",
  BOOKING_REMINDER: "🔔 Booking Reminder",
  DEPOSIT_OVERDUE: "⏰ Deposit Overdue",
  VENDOR_APPROVAL_NEEDED: "✅ Vendor Approval",
  PLATFORM_ANNOUNCEMENT: "📣 Platform Announcement",
};

const CHANNELS: { key: AlertChannel; label: string }[] = [
  { key: "IN_APP", label: "In-App" },
  { key: "WHATSAPP", label: "WhatsApp" },
  { key: "EMAIL", label: "Email" },
  { key: "SMS", label: "SMS" },
];

const DEFAULT_PREFS: AlertPrefs = {
  LOW_STOCK: ["IN_APP", "WHATSAPP"],
  NEW_BOOKING: ["IN_APP", "WHATSAPP"],
  PAYMENT_RECEIVED: ["IN_APP", "WHATSAPP"],
  BOOKING_CANCELLED: ["IN_APP", "WHATSAPP"],
  BOOKING_REMINDER: ["IN_APP"],
  DEPOSIT_OVERDUE: ["IN_APP", "WHATSAPP"],
  VENDOR_APPROVAL_NEEDED: ["IN_APP"],
  PLATFORM_ANNOUNCEMENT: ["IN_APP"],
};

const TYPE_COLORS: Record<AlertType, string> = {
  LOW_STOCK: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300",
  NEW_BOOKING: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
  PAYMENT_RECEIVED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  BOOKING_CANCELLED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  BOOKING_REMINDER: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
  DEPOSIT_OVERDUE: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
  VENDOR_APPROVAL_NEEDED: "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300",
  PLATFORM_ANNOUNCEMENT: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
};

/** Alert types whose metadata carries a bookingUid we can deep-link to. */
const BOOKING_LINKED_TYPES = new Set<AlertType>(["NEW_BOOKING", "BOOKING_CANCELLED"]);

/** Booking detail page for a booking-linked alert, or null when there's no link. */
const bookingUrlFor = (alert: AlertItem): string | null => {
  const uid = alert.metadata?.bookingUid;
  return uid && BOOKING_LINKED_TYPES.has(alert.type) ? `/booking/${uid}` : null;
};

export default function AlertsPage() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"alerts" | "preferences">("alerts");
  const [prefSaved, setPrefSaved] = useState(false);
  const [prefsDraft, setPrefsDraft] = useState<AlertPrefs>(DEFAULT_PREFS);
  // Becomes true the moment the user toggles a channel; suppresses re-seeding.
  // A ref (not state) so flipping it doesn't itself re-run the seeding effect.
  const prefsDirtyRef = useRef(false);

  const listQuery = trpc.viewer.vendor.listAlerts.useQuery({ unreadOnly: false, take: 100, skip: 0 });
  const prefsQuery = trpc.viewer.vendor.getAlertPreferences.useQuery();

  const invalidateAlerts = () =>
    Promise.all([
      utils.viewer.vendor.listAlerts.invalidate(),
      utils.viewer.vendor.getUnreadAlertsCount.invalidate(),
    ]);

  const markReadMutation = trpc.viewer.vendor.markAlertsRead.useMutation();
  const dismissMutation = trpc.viewer.vendor.dismissAlert.useMutation({
    onSuccess: invalidateAlerts,
  });
  const savePrefsMutation = trpc.viewer.vendor.updateAlertPreferences.useMutation({
    onSuccess: () => {
      // The saved server state becomes canonical, so the refetch may re-seed the draft.
      prefsDirtyRef.current = false;
      utils.viewer.vendor.getAlertPreferences.invalidate();
    },
  });

  // Seed the preference draft from the server, but never while the user has unsaved
  // toggles — an unrelated refetch would otherwise wipe their in-progress edits.
  useEffect(() => {
    if (prefsQuery.data?.prefs && !prefsDirtyRef.current) setPrefsDraft(prefsQuery.data.prefs as AlertPrefs);
  }, [prefsQuery.data]);

  const alerts = (listQuery.data?.items ?? []) as unknown as AlertItem[];
  const unread = listQuery.data?.unreadCount ?? alerts.filter((a) => !a.isRead && !a.isDismissed).length;

  // Mark-read calls are serialized: clicks that land while one is in flight queue up
  // and drain when it settles, instead of being silently dropped.
  const markQueue = useRef<string[]>([]);
  const markInFlight = useRef(false);

  const startMarkRead = (ids: string[]) => {
    if (ids.length === 0) return;
    markInFlight.current = true;
    markReadMutation.mutate(
      { ids },
      {
        onSettled: () => {
          markInFlight.current = false;
          invalidateAlerts();
          if (markQueue.current.length > 0) {
            const next = markQueue.current;
            markQueue.current = [];
            startMarkRead(next);
          }
        },
      }
    );
  };

  const markRead = (id: string) => {
    markQueue.current.push(id);
    if (!markInFlight.current) startMarkRead(markQueue.current.splice(0));
  };

  const markAllRead = () => {
    const ids = alerts.filter((a) => !a.isRead).map((a) => a.id);
    if (ids.length > 0) startMarkRead(ids);
  };

  const dismiss = (id: string) => dismissMutation.mutate({ id });

  const togglePref = (type: AlertType, ch: AlertChannel) => {
    const current = prefsDraft[type] ?? [];
    prefsDirtyRef.current = true;
    setPrefsDraft({
      ...prefsDraft,
      [type]: current.includes(ch) ? current.filter((c) => c !== ch) : [...current, ch],
    });
  };

  const savePrefs = () => {
    savePrefsMutation.mutate({ prefs: prefsDraft });
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString("en-KE", {
      timeZone: "Africa/Nairobi",
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🔔 Alerts
            {unread > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                {unread}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Stay on top of stock, bookings, and payments.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["alerts", "preferences"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition capitalize ${
              tab === t
                ? "bg-white dark:bg-gray-800 border border-b-white dark:border-gray-700 dark:border-b-gray-800 text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}>
            {t === "alerts" ? "🔔 Notifications" : "⚙️ Preferences"}
          </button>
        ))}
      </div>

      {/* ── ALERTS TAB ─────────────────────────────────────── */}
      {tab === "alerts" && (
        <div className="space-y-4">
          {unread > 0 && (
            <div className="flex justify-end">
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Mark all as read
              </button>
            </div>
          )}

          {listQuery.isLoading && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Loading alerts…</p>
            </div>
          )}

          {listQuery.isError && !listQuery.isLoading && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Couldn&apos;t load alerts. Please try again.</p>
            </div>
          )}

          {!listQuery.isLoading && !listQuery.isError && alerts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-sm">You&apos;re all caught up!</p>
            </div>
          )}

          <div className="space-y-3">
            {alerts.map((alert) => {
              const bookingUrl = bookingUrlFor(alert);
              return (
                <div
                  key={alert.id}
                  onClick={() => !alert.isRead && markRead(alert.id)}
                  className={`flex gap-4 p-4 rounded-xl border transition cursor-pointer ${
                    alert.isRead
                      ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500 shadow-sm"
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!alert.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[alert.type]}`}>
                        {ALERT_LABELS[alert.type]}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">{fmtDate(alert.createdAt)}</span>
                    </div>
                    {bookingUrl ? (
                      <Link
                        href={bookingUrl}
                        title={alert.title}
                        className="group inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition">
                        <span className="truncate">{alert.title}</span>
                        <span className="text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition">
                          ↗
                        </span>
                      </Link>
                    ) : (
                      <p
                        className="text-sm font-semibold text-gray-900 dark:text-white truncate"
                        title={alert.title}>
                        {alert.title}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{alert.body}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(alert.id);
                    }}
                    className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-lg self-start"
                    title="Dismiss">
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PREFERENCES TAB ────────────────────────────────── */}
      {tab === "preferences" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Alert Type</th>
                {CHANNELS.map((ch) => (
                  <th key={ch.key} className="px-4 py-3 text-center">
                    {ch.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(Object.keys(ALERT_LABELS) as AlertType[]).map((type) => (
                <tr key={type} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[type]}`}>
                      {ALERT_LABELS[type]}
                    </span>
                  </td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.key} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={(prefsDraft[type] ?? []).includes(ch.key)}
                        onChange={() => togglePref(type, ch.key)}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-0 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={savePrefs}
              className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-lg hover:opacity-80 transition">
              {prefSaved ? "✅ Saved!" : "Save Preferences"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
