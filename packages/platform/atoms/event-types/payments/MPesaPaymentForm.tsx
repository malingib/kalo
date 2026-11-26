import { useEffect, useState } from "react";

type Props = {
  booking: { uid: string };
  payment: { success: boolean };
};

export default function MPesaPaymentForm({ booking, payment }: Props) {
  const [status, setStatus] = useState<"PENDING" | "SUCCESS" | "FAILED">(payment.success ? "SUCCESS" : "PENDING");

  useEffect(() => {
    if (status !== "PENDING") return;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch(`/api/mpesa/payment-status?bookingUid=${encodeURIComponent(booking.uid)}`);
        if (!response.ok) return;
        const result = (await response.json()) as { status?: string };
        if (active && (result.status === "SUCCESS" || result.status === "FAILED")) {
          setStatus(result.status);
        }
      } catch {
        // Keep waiting through transient network failures.
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
      {status === "FAILED" && <p className="text-red-600">M-Pesa payment was not completed. Please contact the booking host.</p>}
      {status === "PENDING" && <p>Check your phone and enter your M-Pesa PIN. Waiting for payment confirmation…</p>}
    </div>
  );
}
