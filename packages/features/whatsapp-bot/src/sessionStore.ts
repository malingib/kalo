import { prisma } from "@calcom/prisma";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import type { UserSessionContext } from "./types";

const whatsAppSessionSelect = {
  sessionData: true,
} satisfies Prisma.WhatsAppSessionSelect;

/**
 * Persists the WhatsApp booking state machine's `UserSessionContext` in the
 * `WhatsAppSession` table (sessionData JSON column) so a vendor's conversation
 * survives server restarts and works across multiple WhatsApp webhooks.
 *
 * The table is keyed by phone (`phone` is `@unique`), so lookups and upserts go
 * through that column rather than the row id.
 */
export class WhatsAppSessionRepository {
  private db: PrismaClient | Prisma.TransactionClient;

  constructor(deps: { prismaClient: PrismaClient | Prisma.TransactionClient }) {
    this.db = deps.prismaClient;
  }

  async getSession(phone: string): Promise<UserSessionContext | null> {
    const session = await this.db.whatsAppSession.findUnique({
      where: { phone },
      select: whatsAppSessionSelect,
    });
    return session ? (session.sessionData as unknown as UserSessionContext) : null;
  }

  async saveSession(phone: string, context: UserSessionContext): Promise<void> {
    const sessionData = context as unknown as Prisma.InputJsonValue;
    await this.db.whatsAppSession.upsert({
      where: { phone },
      create: {
        userId: context.vendorUserId,
        phone,
        sessionData,
        status: "CONNECTED",
      },
      update: {
        userId: context.vendorUserId,
        sessionData,
        status: "CONNECTED",
      },
    });
  }

  /**
   * Marks a conversation's payment as confirmed server-side (called from the
   * M-Pesa STK callback when Daraja reports a successful transaction). Leaves
   * the machine state untouched — the next customer message flips
   * WAITING_MPESA_STK -> CONFIRMED because paymentVerified is set.
   *
   * Success evidence beats a previously recorded failure, so any stale
   * paymentFailed flag is cleared in the same write.
   *
   * Returns the updated context, or null when no session exists for the phone.
   */
  async markPaymentVerified(phone: string, mpesaReceiptCode?: string): Promise<UserSessionContext | null> {
    const session = await this.getSession(phone);
    if (!session) return null;
    const updated: UserSessionContext = {
      ...session,
      paymentVerified: true,
      paymentFailed: false,
      ...(mpesaReceiptCode ? { mpesaReceiptCode } : {}),
    };
    await this.saveSession(phone, updated);
    return updated;
  }

  /**
   * Marks a conversation's payment as failed server-side (called from the M-Pesa
   * STK callback when Daraja reports a failed/cancelled transaction). The next
   * customer message in WAITING_MPESA_STK then surfaces the failure instead of
   * accepting a "done" reply as confirmation.
   *
   * Failure evidence is authoritative, so paymentVerified is cleared in the
   * same write.
   *
   * Returns the updated context, or null when no session exists for the phone.
   */
  async markPaymentFailed(phone: string): Promise<UserSessionContext | null> {
    const session = await this.getSession(phone);
    if (!session) return null;
    const updated: UserSessionContext = {
      ...session,
      paymentVerified: false,
      paymentFailed: true,
    };
    await this.saveSession(phone, updated);
    return updated;
  }
}

export const whatsAppSessionRepository = new WhatsAppSessionRepository({ prismaClient: prisma });
