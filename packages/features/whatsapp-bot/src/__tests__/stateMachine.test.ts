import { describe, expect, it } from "vitest";
import type { EventTypeItem } from "../stateMachine";
import { WhatsAppStateMachine } from "../stateMachine";
import type { UserSessionContext } from "../types";

describe("WhatsAppStateMachine", () => {
  const mockContext: UserSessionContext = {
    customerPhone: "0712345678",
    vendorUserId: 1,
    state: "IDLE",
  };

  const mockServices: EventTypeItem[] = [
    { id: 101, title: "Executive Haircut", price: 1500, depositAmount: 500, duration: 45 },
    { id: 102, title: "Beard Trim & Styling", price: 800, depositAmount: 0, duration: 30 },
  ];

  it("renders main menu when customer says Hi", async () => {
    const res = await WhatsAppStateMachine.processMessage(
      "Hi",
      mockContext,
      "BarberHub Nairobi",
      mockServices
    );
    expect(res.replyText).toContain("Welcome to BarberHub Nairobi");
    expect(res.nextContext.state).toBe("MAIN_MENU");
  });

  it("shows service list when selecting option 1", async () => {
    const context: UserSessionContext = { ...mockContext, state: "MAIN_MENU" };
    const res = await WhatsAppStateMachine.processMessage("1", context, "BarberHub Nairobi", mockServices);
    expect(res.replyText).toContain("*Executive Haircut* - KES 1,500");
    expect(res.replyText).toContain("*Beard Trim & Styling* - KES 800");
    expect(res.nextContext.state).toBe("SELECTING_SERVICE");
  });

  it("handles service selection and deposit information", async () => {
    const context: UserSessionContext = { ...mockContext, state: "SELECTING_SERVICE" };
    const res = await WhatsAppStateMachine.processMessage("1", context, "BarberHub Nairobi", mockServices);
    expect(res.replyText).toContain("Selected: *Executive Haircut*");
    expect(res.replyText).toContain("Deposit Required: KES 500");
    expect(res.nextContext.state).toBe("SELECTING_SLOT");
    expect(res.nextContext.depositAmount).toBe(500);
  });

  it("triggers STK Push when deposit is required and vendor credentials exist", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "ENTERING_NAME",
      selectedEventTypeId: 101,
      depositAmount: 500,
    };

    const vendorMpesa = {
      shortcode: "174379",
      passkey: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
    };

    const res = await WhatsAppStateMachine.processMessage(
      "John Kamau",
      context,
      "BarberHub Nairobi",
      mockServices,
      vendorMpesa
    );
    expect(res.replyText).toContain("M-Pesa STK Push prompt to *254712345678*");
    expect(res.triggerStkPush).toBeDefined();
    expect(res.triggerStkPush?.amount).toBe(500);
    expect(res.nextContext.state).toBe("WAITING_MPESA_STK");
  });

  it("does NOT trigger STK Push when the customer phone is invalid — falls back to manual receipt", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      customerPhone: "12345",
      state: "ENTERING_NAME",
      selectedEventTypeId: 101,
      depositAmount: 500,
    };

    const vendorMpesa = {
      tillNumber: "892341",
      shortcode: "174379",
      passkey: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
    };

    const res = await WhatsAppStateMachine.processMessage(
      "John Kamau",
      context,
      "BarberHub Nairobi",
      mockServices,
      vendorMpesa
    );
    expect(res.triggerStkPush).toBeUndefined();
    expect(res.replyText).toContain("Till Number *892341*");
    expect(res.nextContext.state).toBe("WAITING_MANUAL_RECEIPT");
  });

  it("collects the M-Pesa transaction code in WAITING_MANUAL_RECEIPT and confirms", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "WAITING_MANUAL_RECEIPT",
      customerName: "John Kamau",
      depositAmount: 500,
    };

    const res = await WhatsAppStateMachine.processMessage(
      "RCD1234567",
      context,
      "BarberHub Nairobi",
      mockServices
    );
    expect(res.replyText).toContain("M-Pesa Receipt: *RCD1234567*");
    expect(res.nextContext.state).toBe("CONFIRMED");
    expect(res.nextContext.mpesaReceiptCode).toBe("RCD1234567");
  });

  it("confirms the booking from WAITING_MPESA_STK after the customer pays", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "WAITING_MPESA_STK",
      customerName: "John Kamau",
      depositAmount: 500,
    };

    const res = await WhatsAppStateMachine.processMessage("done", context, "BarberHub Nairobi", mockServices);
    expect(res.replyText).toContain("Payment Confirmed");
    expect(res.nextContext.state).toBe("CONFIRMED");
  });

  it("collects a manual deposit when no Daraja credentials exist but a paybill is set", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "ENTERING_NAME",
      selectedEventTypeId: 101,
      depositAmount: 1000,
    };

    const vendorMpesa = { paybill: "522522" };

    const res = await WhatsAppStateMachine.processMessage(
      "Brian Otieno",
      context,
      "BarberHub Nairobi",
      mockServices,
      vendorMpesa
    );
    expect(res.triggerStkPush).toBeUndefined();
    expect(res.replyText).toContain("Paybill *522522*");
    expect(res.nextContext.state).toBe("WAITING_MANUAL_RECEIPT");
  });

  it("surfaces a server-side payment failure instead of accepting 'done' as confirmation", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "WAITING_MPESA_STK",
      customerName: "John Kamau",
      depositAmount: 500,
      paymentFailed: true,
    };

    // Even an explicit "done" must NOT confirm a payment the callback said failed.
    const res = await WhatsAppStateMachine.processMessage("done", context, "BarberHub Nairobi", mockServices);
    expect(res.replyText).toContain("Payment Not Completed");
    expect(res.replyText).not.toContain("Payment Confirmed");
    expect(res.nextContext.state).toBe("MAIN_MENU");
    // The failed booking is void — a re-book must start clean.
    expect(res.nextContext.paymentFailed).toBe(false);
    expect(res.nextContext.bookingUid).toBeUndefined();
  });

  it("does not confirm payment on an unrelated message in WAITING_MPESA_STK", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "WAITING_MPESA_STK",
      customerName: "John Kamau",
      depositAmount: 500,
    };

    const res = await WhatsAppStateMachine.processMessage(
      "what time is my booking?",
      context,
      "BarberHub Nairobi",
      mockServices
    );
    expect(res.replyText).toContain("reply *done*");
    expect(res.nextContext.state).toBe("WAITING_MPESA_STK");
  });

  it("resolves WAITING_MPESA_STK from the server-side paymentVerified flag set by the Daraja callback", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "WAITING_MPESA_STK",
      customerName: "John Kamau",
      depositAmount: 500,
      checkoutRequestId: "ws_CO_123456789",
      paymentVerified: true,
    };

    // Any message resolves the state once the callback has confirmed the payment.
    const res = await WhatsAppStateMachine.processMessage(
      "what time is my booking?",
      context,
      "BarberHub Nairobi",
      mockServices
    );
    expect(res.replyText).toContain("Payment Confirmed");
    expect(res.nextContext.state).toBe("CONFIRMED");
  });

  it("does not inherit paymentVerified when the customer re-books after a confirmed payment", async () => {
    // Simulates a full re-book: confirmed payment -> main menu -> new booking.
    const confirmed: UserSessionContext = {
      ...mockContext,
      state: "CONFIRMED",
      customerName: "John Kamau",
      depositAmount: 500,
      paymentVerified: true,
      mpesaReceiptCode: "RCD1234567",
    };

    const menuRes = await WhatsAppStateMachine.processMessage(
      "0",
      confirmed,
      "BarberHub Nairobi",
      mockServices
    );
    expect(menuRes.nextContext.state).toBe("MAIN_MENU");
    expect(menuRes.nextContext.paymentVerified).toBe(false);
    expect(menuRes.nextContext.paymentFailed).toBe(false);

    const servicesRes = await WhatsAppStateMachine.processMessage(
      "1",
      menuRes.nextContext,
      "BarberHub Nairobi",
      mockServices
    );
    const serviceRes = await WhatsAppStateMachine.processMessage(
      "1",
      servicesRes.nextContext,
      "BarberHub Nairobi",
      mockServices
    );
    const slotRes = await WhatsAppStateMachine.processMessage(
      "1",
      serviceRes.nextContext,
      "BarberHub Nairobi",
      mockServices
    );
    const nameRes = await WhatsAppStateMachine.processMessage(
      "Jane Wanjiru",
      slotRes.nextContext,
      "BarberHub Nairobi",
      mockServices,
      { shortcode: "174379", passkey: "x" }
    );
    expect(nameRes.nextContext.state).toBe("WAITING_MPESA_STK");
    expect(nameRes.nextContext.paymentVerified).toBe(false);
    expect(nameRes.nextContext.paymentFailed).toBe(false);

    // Before the new STK push is paid, a random message must NOT confirm.
    const early = await WhatsAppStateMachine.processMessage(
      "hi there",
      nameRes.nextContext,
      "BarberHub Nairobi",
      mockServices
    );
    expect(early.nextContext.state).toBe("WAITING_MPESA_STK");
    expect(early.replyText).not.toContain("Payment Confirmed");
  });

  it("confirms from WAITING_MPESA_STK without leaking an empty customer name", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "WAITING_MPESA_STK",
      depositAmount: 500,
    };

    const res = await WhatsAppStateMachine.processMessage("paid", context, "BarberHub Nairobi", mockServices);
    expect(res.replyText).not.toContain("Thank you !");
    expect(res.replyText).toContain("Your payment is confirmed");
    expect(res.nextContext.state).toBe("CONFIRMED");
  });

  it("re-prompts for the receipt code when the reply is empty in WAITING_MANUAL_RECEIPT", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "WAITING_MANUAL_RECEIPT",
      customerName: "John Kamau",
      depositAmount: 500,
    };

    const res = await WhatsAppStateMachine.processMessage("   ", context, "BarberHub Nairobi", mockServices);
    expect(res.replyText).toContain("transaction code");
    expect(res.nextContext.state).toBe("WAITING_MANUAL_RECEIPT");
  });

  it("sanitizes markdown characters out of the echoed receipt code", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "WAITING_MANUAL_RECEIPT",
      customerName: "John Kamau",
      depositAmount: 500,
    };

    const res = await WhatsAppStateMachine.processMessage(
      "RCD*12_34`567",
      context,
      "BarberHub Nairobi",
      mockServices
    );
    expect(res.replyText).toContain("M-Pesa Receipt: *RCD1234567*");
    expect(res.nextContext.mpesaReceiptCode).toBe("RCD1234567");
  });

  it("re-prompts for the full name when ENTERING_NAME receives an empty reply", async () => {
    const context: UserSessionContext = {
      ...mockContext,
      state: "ENTERING_NAME",
      selectedEventTypeId: 101,
      depositAmount: 500,
    };

    const res = await WhatsAppStateMachine.processMessage("  ", context, "BarberHub Nairobi", mockServices);
    expect(res.replyText).toContain("*Full Name*");
    expect(res.nextContext.state).toBe("ENTERING_NAME");
  });
});
