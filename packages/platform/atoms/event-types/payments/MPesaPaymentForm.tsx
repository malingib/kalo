import { useEffect, useState } from "react";

type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "RECONCILIATION_REQUIRED";

type Props = {
  booking: { uid: string };
  payment: { success: boolean };
};

export default function MPesaPaymentForm({ booking, payment }: Props) {
  const [status, setStatus] = useState<PaymentStatus>(payment.success ? "SUCCESS" : "PENDING");

  useEffect(() => {
    if (status !== "PENDING") return;
    let active = true;
    let inFlight = false;

    const check = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/mpesa/payment-status?bookingUid=${encodeURIComponent(booking.uid)}`);
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
        // Keep waiting through transient network failures.
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
  }, [booking.uid, status]);

  return (
    <div className="mt-4 text-center" role="status" aria-live="polite">
      {status === "SUCCESS" && <p className="text-green-700">M-Pesa payment confirmed.</p>}
      {status === "FAILED" && (
        <p className="text-red-600">M-Pesa payment was not completed. Please contact the booking host.</p>
      )}
      {status === "RECONCILIATION_REQUIRED" && (
        <p className="text-amber-700">
          Safaricom reported a payment that needs verification. The booking host will confirm it after reconciliation.
        </p>
      )}
      {status === "PENDING" && <p>Check your phone and enter your M-Pesa PIN. Waiting for payment confirmation…</p>}
    </div>
  );
}
