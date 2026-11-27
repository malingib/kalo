"use client";

import { useCallback, useEffect, useState } from "react";

type BillingPeriod = "MONTHLY" | "ANNUALLY";
type Plan = { planName: string; billingPeriod: BillingPeriod; amountKes: number };
type Subscription = {
  id: string;
  planName: string;
  amountKes: number;
  billingPeriod: BillingPeriod | null;
  status: string;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  phoneNumber: string;
} | null;
type Workspace = {
  id: number;
  name: string;
  isOrganization: boolean;
  subscriptionType: "TEAM" | "ORGANIZATION";
  plans: Plan[];
  configurationAvailable: boolean;
  subscription: Subscription;
};

export default function WorkspaceBillingPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [phones, setPhones] = useState<Record<number, string>>({});
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [periods, setPeriods] = useState<Record<number, BillingPeriod>>({});
  const [loading, setLoading] = useState(true);
  const [busyTeamId, setBusyTeamId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/mpesa/workspace-subscription-options");
    if (!response.ok) throw new Error("Could not load workspace billing.");
    const result = (await response.json()) as { workspaces: Workspace[] };
    setWorkspaces(result.workspaces);
  }, []);

  useEffect(() => {
    void refresh()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load workspace billing."))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!workspaces.some((workspace) => workspace.subscription?.status === "PAYMENT_PENDING" ||
      workspace.subscription?.status === "RENEWAL_INITIATING")) return;
    const interval = setInterval(() => {
      void refresh().catch(() => undefined);
    }, 5000);
    return () => clearInterval(interval);
  }, [refresh, workspaces]);

  const startSubscription = async (workspace: Workspace) => {
    const planName = selections[workspace.id];
    const billingPeriod = periods[workspace.id] ?? "MONTHLY";
    const phoneNumber = phones[workspace.id]?.trim();
    if (!planName || !phoneNumber) {
      setError("Select a plan and enter the M-Pesa phone number.");
      return;
    }
    setBusyTeamId(workspace.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/mpesa/workspace-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: workspace.id,
          subscriptionType: workspace.subscriptionType,
          planName,
          billingPeriod,
          phoneNumber,
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Could not start the M-Pesa subscription.");
      setNotice(result.message || "M-Pesa prompt sent. Enter your PIN to authorize payment.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the M-Pesa subscription.");
    } finally {
      setBusyTeamId(null);
    }
  };

  const renewSubscription = async (workspace: Workspace) => {
    if (!workspace.subscription) return;
    setBusyTeamId(workspace.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/mpesa/workspace-subscription-renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: workspace.id, subscriptionId: workspace.subscription.id }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Could not start the renewal.");
      setNotice(result.message || "M-Pesa renewal prompt sent.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the renewal.");
    } finally {
      setBusyTeamId(null);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-emphasis">Workspace billing</h1>
        <p className="mt-1 text-sm text-subtle">
          Manage team and organization subscriptions using customer-authorized M-Pesa STK Push.
        </p>
      </header>

      {loading && <p className="text-sm text-subtle">Loading workspaces…</p>}
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {!loading && workspaces.length === 0 && (
        <p className="text-sm text-subtle">No team or organization workspaces with billing administrator access were found.</p>
      )}

      {workspaces.map((workspace) => {
        const subscription = workspace.subscription;
        const plans = workspace.plans;
        const availablePlanNames = [...new Set(plans.map((plan) => plan.planName))];
        const selectedPlanName = selections[workspace.id] ?? availablePlanNames[0] ?? "";
        const availablePeriods = plans
          .filter((plan) => plan.planName === selectedPlanName)
          .map((plan) => plan.billingPeriod);
        const selectedPeriod =
          periods[workspace.id] ?? (availablePeriods.includes("MONTHLY") ? "MONTHLY" : availablePeriods[0] ?? "MONTHLY");
        const selectedPrice = plans.find(
          (plan) => plan.planName === selectedPlanName && plan.billingPeriod === selectedPeriod
        )?.amountKes;

        return (
          <section key={workspace.id} className="space-y-4 border-b border-subtle pb-6">
            <div>
              <h2 className="text-lg font-medium text-emphasis">{workspace.name}</h2>
              <p className="text-xs text-subtle">
                {workspace.subscriptionType === "ORGANIZATION" ? "Organization" : "Team"} · ID {workspace.id}
              </p>
            </div>

            {subscription?.status === "ACTIVE" && (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-green-700">Active · {subscription.planName}</p>
                <p className="text-subtle">
                  KES {subscription.amountKes.toLocaleString()} / {subscription.billingPeriod?.toLowerCase() ?? "month"}
                </p>
                {subscription.currentPeriodEnd && (
                  <p className="text-subtle">Next renewal: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                )}
              </div>
            )}

            {(subscription?.status === "PAYMENT_PENDING" || subscription?.status === "RENEWAL_INITIATING") && (
              <p className="text-sm text-subtle" role="status">
                Payment prompt sent to the registered phone. Enter your M-Pesa PIN and wait for confirmation.
              </p>
            )}

            {subscription?.status === "PAST_DUE" && (
              <div className="space-y-2 text-sm">
                <p className="text-amber-700">Subscription payment is due. A new STK prompt requires your authorization.</p>
                <p className="text-subtle">Registered phone: {subscription.phoneNumber}</p>
                <button
                  type="button"
                  onClick={() => void renewSubscription(workspace)}
                  disabled={busyTeamId === workspace.id}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black">
                  {busyTeamId === workspace.id ? "Sending prompt…" : "Renew with M-Pesa"}
                </button>
              </div>
            )}

            {(!subscription || ["FAILED", "PAYMENT_FAILED", "CANCELLED"].includes(subscription.status)) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {!workspace.configurationAvailable || plans.length === 0 ? (
                  <p className="text-sm text-amber-700">
                    Subscription pricing is not configured. Contact the platform administrator.
                  </p>
                ) : (
                  <>
                    <label className="block text-sm">
                      Plan
                      <select
                        value={selectedPlanName}
                        onChange={(event) => {
                          const nextPlan = event.target.value;
                          const nextPeriods = plans
                            .filter((plan) => plan.planName === nextPlan)
                            .map((plan) => plan.billingPeriod);
                          setSelections((current) => ({ ...current, [workspace.id]: nextPlan }));
                          setPeriods((current) => ({
                            ...current,
                            [workspace.id]: nextPeriods.includes(current[workspace.id] ?? "MONTHLY")
                              ? current[workspace.id] ?? "MONTHLY"
                              : nextPeriods[0] ?? "MONTHLY",
                          }));
                        }}
                        className="mt-1 block w-full rounded-md border border-subtle bg-default px-3 py-2">
                        {availablePlanNames.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm">
                      Billing period
                      <select
                        value={selectedPeriod}
                        onChange={(event) => setPeriods((current) => ({
                          ...current,
                          [workspace.id]: event.target.value as BillingPeriod,
                        }))}
                        className="mt-1 block w-full rounded-md border border-subtle bg-default px-3 py-2">
                        {[...new Set(availablePeriods)].map((period) => (
                          <option key={period} value={period}>{period === "ANNUALLY" ? "Annually" : "Monthly"}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm sm:col-span-2">
                      M-Pesa phone number
                      <input
                        value={phones[workspace.id] ?? ""}
                        onChange={(event) => setPhones((current) => ({ ...current, [workspace.id]: event.target.value }))}
                        placeholder="0712345678"
                        inputMode="tel"
                        autoComplete="tel"
                        className="mt-1 block w-full rounded-md border border-subtle bg-default px-3 py-2" />
                    </label>
                    {selectedPrice !== undefined && (
                      <p className="text-sm font-medium text-emphasis sm:col-span-2">
                        KES {selectedPrice.toLocaleString()} · {selectedPeriod.toLowerCase()}
                      </p>
                    )}
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => void startSubscription(workspace)}
                        disabled={busyTeamId === workspace.id || !selectedPrice}
                        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black">
                        {busyTeamId === workspace.id ? "Sending prompt…" : "Subscribe with M-Pesa"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {subscription && !["ACTIVE", "PAYMENT_PENDING", "RENEWAL_INITIATING", "PAST_DUE", "FAILED", "PAYMENT_FAILED", "CANCELLED"].includes(subscription.status) && (
              <p className="text-sm text-amber-700">Subscription status: {subscription.status}. Contact the platform administrator if this does not resolve.</p>
            )}
          </section>
        );
      })}
    </main>
  );
}
