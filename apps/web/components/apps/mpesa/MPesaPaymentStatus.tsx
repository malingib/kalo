import { useEffect, useState } from "react";

type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "RECONCILIATION_REQUIRED";

type Props = { bookingUid: string; initialSuccess: boolean };

export function MPesaPaymentStatus({ bookingUid, initialSuccess }: Props) {
  const [status, setStatus] = useState<PaymentStatus>(initialSuccess ? "SUCCESS" : "PENDING");

  useEffect(() => {
    if (status !== "PENDING") return;
    let active = true;
    let inFlight = false;
    const check = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/mpesa/payment-status?bookingUid=${encodeURIComponent(bookingUid)}`);
        if (!response.ok) return;
        const result = (await response.json()) as { status?: PaymentStatus };
        if (
          active &&
          (result.status === "SUCCESS" ||
            result.status === "FAILED" ||
            result.status === "RECONCILIATION_REQUIRED")
        ) {
          setStatus(result.status);
        }
      } catch {
        // A transient status request failure must not change the payment state.
      } finally {
        inFlight = false;
      }
    };
    void check();
    const interval = setInterval(() => void check(), 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [bookingUid, status]);

  if (status === "SUCCESS") return <p className="mt-4 text-center text-green-700">M-Pesa payment confirmed.</p>;
  if (status === "FAILED") return <p className="mt-4 text-center text-red-600">M-Pesa payment was not completed. Please contact the booking host.</p>;
  if (status === "RECONCILIATION_REQUIRED") {
    return <p className="mt-4 text-center text-amber-700">Your payment needs verification. The booking host will confirm it after reconciliation.</p>;
  }
  return <p className="mt-4 text-center text-default">Check your phone and enter your M-Pesa PIN. Waiting for payment confirmation…</p>;
}
