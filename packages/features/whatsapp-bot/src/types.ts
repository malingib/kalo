export type ConversationState =
  | "IDLE"
  | "MAIN_MENU"
  | "SELECTING_SERVICE"
  | "SELECTING_SLOT"
  | "ENTERING_NAME"
  | "WAITING_MPESA_STK"
  | "WAITING_MANUAL_RECEIPT"
  | "CONFIRMED";

export interface UserSessionContext {
  customerPhone: string;
  vendorUserId: number;
  state: ConversationState;
  selectedEventTypeId?: number;
  selectedSlotIso?: string;
  customerName?: string;
  depositAmount?: number;
  bookingUid?: string;
  checkoutRequestId?: string;
  mpesaReceiptCode?: string;
  /** Set server-side by the M-Pesa STK callback once Daraja confirms the payment. */
  paymentVerified?: boolean;
  /** Set server-side by the M-Pesa STK callback when Daraja reports the payment failed. */
  paymentFailed?: boolean;
}
