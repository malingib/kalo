import { useEffect, useState } from "react";

type Props = { bookingUid: string; initialSuccess: boolean };

export function MPesaPaymentStatus({ bookingUid, initialSuccess }: Props) {
  const [status, setStatus] = useState<"PENDING" | "SUCCESS" | "FAILED">(initialSuccess ? "SUCCESS" : "PENDING");

  useEffect(() => {
    if (status !== "PENDING") return;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch(`/api/mpesa/payment-status?bookingUid=${encodeURIComponent(bookingUid)}`);
        if (!response.ok) return;
        const result = (await response.json()) as { status?: string };
        if (active && (result.status === "SUCCESS" || result.status === "FAILED")) {
          setStatus(result.status);
        }
      } catch {
        // A transient status request failure must not change the payment state.
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
  return <p className="mt-4 text-center text-default">Check your phone and enter your M-Pesa PIN. Waiting for payment confirmation…</p>;
}
