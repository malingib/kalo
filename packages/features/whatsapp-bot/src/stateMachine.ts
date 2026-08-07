import { normalizeKenyanPhone } from "../../mpesa/normalizePhone";
import type { UserSessionContext } from "./types";

export interface BotResponse {
  replyText: string;
  nextContext: UserSessionContext;
  triggerStkPush?: {
    phoneNumber: string;
    amount: number;
    accountRef: string;
  };
}

export interface EventTypeItem {
  id: number;
  title: string;
  price: number;
  depositAmount: number;
  duration: number;
}

export class WhatsAppStateMachine {
  /**
   * Processes incoming text message and returns appropriate reply and state transition
   */
  public static async processMessage(
    inputMessage: string,
    context: UserSessionContext,
    vendorName: string,
    eventTypes: EventTypeItem[],
    vendorMpesaDetails?: { paybill?: string; tillNumber?: string; shortcode?: string; passkey?: string }
  ): Promise<BotResponse> {
    const text = inputMessage.trim();
    const normalizedPhone = normalizeKenyanPhone(context.customerPhone);

    // Reset command
    if (
      text.toLowerCase() === "menu" ||
      text.toLowerCase() === "hi" ||
      text.toLowerCase() === "habari" ||
      text.toLowerCase() === "0"
    ) {
      return WhatsAppStateMachine.renderMainMenu(context, vendorName, eventTypes);
    }

    switch (context.state) {
      case "IDLE":
      case "MAIN_MENU": {
        if (text === "1") {
          return WhatsAppStateMachine.renderServiceList(context, vendorName, eventTypes);
        }
        if (text === "2") {
          return {
            replyText:
              `📌 *${vendorName} Payment Info*\n\n` +
              `Mobile Payments (M-Pesa):\n` +
              (vendorMpesaDetails?.tillNumber
                ? `• Buy Goods (Till): *${vendorMpesaDetails.tillNumber}*\n`
                : "") +
              (vendorMpesaDetails?.paybill ? `• Paybill: *${vendorMpesaDetails.paybill}*\n` : "") +
              `\nReply *1* to view services & book, or *0* for main menu.`,
            nextContext: { ...context, state: "MAIN_MENU" },
          };
        }
        if (text === "3") {
          return {
            replyText:
              `❓ *Questions & Enquiries*\n\n` +
              `For custom requests or direct support, reply with your question or call us directly.\n\n` +
              `Reply *0* to return to the main menu.`,
            nextContext: { ...context, state: "MAIN_MENU" },
          };
        }

        return WhatsAppStateMachine.renderMainMenu(context, vendorName, eventTypes);
      }

      case "SELECTING_SERVICE": {
        const selectionIndex = parseInt(text, 10) - 1;
        if (Number.isNaN(selectionIndex) || selectionIndex < 0 || selectionIndex >= eventTypes.length) {
          return {
            replyText: `⚠️ Invalid selection. Please reply with a number between 1 and ${eventTypes.length}.\n\nReply *0* for menu.`,
            nextContext: context,
          };
        }

        const selectedEvent = eventTypes[selectionIndex];
        const depositText =
          selectedEvent.depositAmount > 0
            ? ` (Deposit Required: KES ${selectedEvent.depositAmount.toLocaleString()})`
            : " (No Deposit)";

        return {
          replyText:
            `✅ Selected: *${selectedEvent.title}*\n` +
            `⏱ Duration: ${selectedEvent.duration} mins\n` +
            `💰 Price: KES ${selectedEvent.price.toLocaleString()}${depositText}\n\n` +
            `Please select preferred time:\n` +
            `1️⃣ Today 2:00 PM\n` +
            `2️⃣ Today 4:00 PM\n` +
            `3️⃣ Tomorrow 10:00 AM\n` +
            `4️⃣ Tomorrow 2:30 PM\n\n` +
            `Reply with 1, 2, 3, or 4 (or *0* for menu):`,
          nextContext: {
            ...context,
            state: "SELECTING_SLOT",
            selectedEventTypeId: selectedEvent.id,
            depositAmount: selectedEvent.depositAmount,
          },
        };
      }

      case "SELECTING_SLOT": {
        if (!["1", "2", "3", "4"].includes(text)) {
          return {
            replyText: `⚠️ Please select a valid slot number (1-4).`,
            nextContext: context,
          };
        }

        return {
          replyText: `📝 Great! Please enter your *Full Name* to finalize the booking reservation:`,
          nextContext: {
            ...context,
            state: "ENTERING_NAME",
            selectedSlotIso: new Date().toISOString(), // Mock slot choice
          },
        };
      }

      case "ENTERING_NAME": {
        const customerName = text;
        const deposit = context.depositAmount || 0;

        if (!customerName) {
          return {
            replyText: `⚠️ Please reply with your *Full Name* to finalize the booking reservation:`,
            nextContext: context,
          };
        }

        // STK push is only possible when we have a valid phone AND the vendor's
        // Daraja credentials — otherwise never claim a push was sent.
        if (deposit > 0 && normalizedPhone && vendorMpesaDetails?.shortcode && vendorMpesaDetails?.passkey) {
          return {
            replyText:
              `📲 *M-Pesa Deposit Request*\n\n` +
              `Customer: ${customerName}\n` +
              `Deposit Due: *KES ${deposit.toLocaleString()}*\n\n` +
              `We are sending an M-Pesa STK Push prompt to *${normalizedPhone}*.\n` +
              `Please enter your M-Pesa PIN on your phone to complete your deposit reservation.`,
            nextContext: {
              ...context,
              state: "WAITING_MPESA_STK",
              customerName,
              // A fresh deposit flow must not inherit a previously confirmed
              // payment, or a failure from an earlier attempt.
              paymentVerified: false,
              paymentFailed: false,
            },
            triggerStkPush: {
              phoneNumber: normalizedPhone,
              amount: deposit,
              accountRef: `ORD-${Date.now().toString().slice(-4)}`,
            },
          };
        }

        // Deposit due but no STK path available → collect payment manually.
        if (deposit > 0 && (vendorMpesaDetails?.tillNumber || vendorMpesaDetails?.paybill)) {
          return {
            replyText:
              `📝 *Booking Reservation Pending Deposit*\n\n` +
              `Name: *${customerName}*\n` +
              `Deposit Due: *KES ${deposit.toLocaleString()}*\n\n` +
              (vendorMpesaDetails?.tillNumber
                ? `Please pay to Till Number *${vendorMpesaDetails.tillNumber}*\n`
                : `Please pay to Paybill *${vendorMpesaDetails.paybill}*\n`) +
              `then reply with the M-Pesa transaction code (e.g., RCD1234567).`,
            nextContext: {
              ...context,
              state: "WAITING_MANUAL_RECEIPT",
              customerName,
              // A fresh deposit flow must not inherit a previously confirmed
              // payment, or a failure from an earlier attempt.
              paymentVerified: false,
              paymentFailed: false,
            },
          };
        }

        // No deposit or no payment method configured → direct confirmation.
        return {
          replyText:
            `🎉 *Booking Reservation Received!*\n\n` +
            `Name: *${customerName}*\n` +
            `Status: *Confirmed*\n\n` +
            `Thank you for choosing ${vendorName}!`,
          nextContext: {
            ...context,
            state: "CONFIRMED",
            customerName,
          },
        };
      }

      case "WAITING_MPESA_STK": {
        // The Daraja STK callback (see apps/web/pages/api/mpesa/callback.ts) sets
        // `paymentFailed` server-side when Daraja reports the payment failed and
        // the reservation was cancelled. That evidence beats the customer's word —
        // never accept a "done" as confirmation for a payment that failed.
        if (context.paymentFailed) {
          return {
            replyText:
              `⚠️ *Payment Not Completed*\n\n` +
              `Your M-Pesa payment did not go through, so the reservation was cancelled.\n` +
              `If any amount was deducted, M-Pesa will refund it automatically.\n\n` +
              `Reply *1* to book again, or *0* for the main menu.`,
            nextContext: {
              ...context,
              state: "MAIN_MENU",
              // The failed booking is void — a re-book starts clean.
              paymentVerified: false,
              paymentFailed: false,
              bookingUid: undefined,
            },
          };
        }

        // The Daraja STK callback (see apps/web/pages/api/mpesa/callback.ts) sets
        // `paymentVerified` server-side once it confirms the payment via
        // CheckoutRequestID. That evidence beats the customer's word — any message
        // resolves the state when the callback has already landed.
        if (context.paymentVerified) {
          return {
            replyText:
              `✅ *Payment Confirmed — Booking Reserved!*\n\n` +
              (context.customerName ? `Thank you ${context.customerName}! ` : "") +
              `Your payment is confirmed and your reservation has been booked.\n\n` +
              `Reply *0* for the main menu.`,
            nextContext: {
              ...context,
              state: "CONFIRMED",
            },
          };
        }

        // The STK push is fired by the caller after this function returns, so the
        // state machine cannot see whether it succeeded. Only treat an explicit
        // confirmation from the customer as paid — never a random message.
        const confirmations = new Set([
          "done",
          "paid",
          "yes",
          "ok",
          "confirmed",
          "complete",
          "completed",
          "finished",
          "received",
          "sent",
        ]);
        if (!confirmations.has(text.toLowerCase())) {
          return {
            replyText: `⚠️ Please complete the M-Pesa payment on your phone and reply *done* once it goes through (or *0* for the main menu).`,
            nextContext: context,
          };
        }

        return {
          replyText:
            `✅ *Payment Confirmed — Booking Reserved!*\n\n` +
            (context.customerName ? `Thank you ${context.customerName}! ` : "") +
            `Your payment is confirmed and your reservation has been booked.\n\n` +
            `Reply *0* for the main menu.`,
          nextContext: {
            ...context,
            state: "CONFIRMED",
          },
        };
      }

      case "WAITING_MANUAL_RECEIPT": {
        const receiptCode = text.slice(0, 50);
        if (!receiptCode) {
          return {
            replyText: `⚠️ Please reply with the M-Pesa transaction code shown after you pay (or *0* for the main menu).`,
            nextContext: context,
          };
        }

        // Receipt codes are echoed into WhatsApp markdown — strip formatting
        // characters so user input cannot break the message layout.
        const sanitizedCode = receiptCode.replace(/[*_~`]/g, "");
        return {
          replyText:
            `✅ *Payment Confirmed — Booking Reserved!*\n\n` +
            (context.customerName ? `Name: *${context.customerName}*\n` : "") +
            `M-Pesa Receipt: *${sanitizedCode}*\n` +
            `Status: *Confirmed*\n\n` +
            `Reply *0* for the main menu.`,
          nextContext: {
            ...context,
            state: "CONFIRMED",
            mpesaReceiptCode: sanitizedCode,
          },
        };
      }

      default:
        return WhatsAppStateMachine.renderMainMenu(context, vendorName, eventTypes);
    }
  }

  private static renderMainMenu(
    context: UserSessionContext,
    vendorName: string,
    eventTypes: EventTypeItem[]
  ): BotResponse {
    return {
      replyText:
        `👋 *Sasa! Welcome to ${vendorName}*\n\n` +
        `How can we assist you today?\n` +
        `1️⃣ View Services & Book Appointment\n` +
        `2️⃣ M-Pesa Payment Details\n` +
        `3️⃣ Ask a Question / Contact Us\n\n` +
        `Reply with *1*, *2*, or *3*:`,
      nextContext: {
        ...context,
        state: "MAIN_MENU",
        // Reset server-side payment evidence so a re-booked conversation starts clean.
        paymentVerified: false,
        paymentFailed: false,
        // A fresh booking flow must materialize a new Booking record — drop the
        // previous booking's uid so the webhook service creates a new one.
        bookingUid: undefined,
      },
    };
  }

  private static renderServiceList(
    context: UserSessionContext,
    vendorName: string,
    eventTypes: EventTypeItem[]
  ): BotResponse {
    if (eventTypes.length === 0) {
      return {
        replyText: `Currently no services are listed for ${vendorName}. Please contact us directly.\n\nReply *0* for main menu.`,
        nextContext: { ...context, state: "MAIN_MENU" },
      };
    }

    let menu = `📋 *${vendorName} Services Catalog*\n\n`;
    eventTypes.forEach((item, index) => {
      const dep = item.depositAmount > 0 ? ` (Dep: KES ${item.depositAmount})` : "";
      menu += `${index + 1}️⃣ *${item.title}* - KES ${item.price.toLocaleString()}${dep}\n`;
    });
    menu += `\nReply with the service number to select (e.g., *1*):`;

    return {
      replyText: menu,
      nextContext: {
        ...context,
        state: "SELECTING_SERVICE",
      },
    };
  }
}
