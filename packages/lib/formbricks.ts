import type { Feedback } from "@kalo/emails/templates/feedback-email";

/** Formbricks has been removed; feedback remains handled by KALO's first-party channels. */
export const sendFeedbackFormbricks = async (_userId: number, _feedback: Feedback): Promise<void> => {};
