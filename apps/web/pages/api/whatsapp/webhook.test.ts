import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetRawBody, mockHandleMessage } = vi.hoisted(() => ({
  mockGetRawBody: vi.fn(),
  mockHandleMessage: vi.fn(),
}));

vi.mock("raw-body", () => ({ default: mockGetRawBody }));
vi.mock("@kalo/features/whatsapp-bot/src/webhookService", () => ({
  whatsAppWebhookService: { handleMessage: mockHandleMessage },
}));

import type { NextApiRequest, NextApiResponse } from "next";
import handler from "./webhook";

function createReq({
  method = "POST",
  headers = {},
  query = {},
}: {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | string[]>;
} = {}): NextApiRequest {
  return { method, headers, query } as unknown as NextApiRequest;
}

function createRes() {
  const res = {} as NextApiResponse & { _status?: number; _body?: unknown };
  res.status = vi.fn((code: number) => {
    res._status = code;
    return res;
  }) as unknown as NextApiResponse["status"];
  res.json = vi.fn((body: unknown) => {
    res._body = body;
    return res;
  }) as unknown as NextApiResponse["json"];
  res.send = vi.fn((body: unknown) => {
    res._body = body;
    return res;
  }) as unknown as NextApiResponse["send"];
  return res;
}

const META_PAYLOAD = {
  entry: [
    {
      changes: [{ value: { messages: [{ from: "254712345678", text: { body: "Hi" } }] } }],
    },
  ],
};

describe("WhatsApp webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("verifies a valid X-Hub-Signature-256 when the app secret is configured", async () => {
    vi.stubEnv("WHATSAPP_WEBHOOK_APP_SECRET", "appsecret");
    const rawBody = Buffer.from(JSON.stringify(META_PAYLOAD));
    mockGetRawBody.mockResolvedValue(rawBody);
    mockHandleMessage.mockResolvedValue({
      replyText: "Welcome",
      state: "MAIN_MENU",
      stkPushTriggered: false,
    });

    const signature = `sha256=${crypto.createHmac("sha256", "appsecret").update(rawBody).digest("hex")}`;
    const res = createRes();
    await handler(createReq({ headers: { "x-hub-signature-256": signature } }), res);

    expect(res._status).toBe(200);
    expect(mockHandleMessage).toHaveBeenCalledWith({ from: "254712345678", body: "Hi" });
  });

  it("rejects requests with an invalid signature before touching the service", async () => {
    vi.stubEnv("WHATSAPP_WEBHOOK_APP_SECRET", "appsecret");
    mockGetRawBody.mockResolvedValue(Buffer.from(JSON.stringify(META_PAYLOAD)));

    const res = createRes();
    await handler(createReq({ headers: { "x-hub-signature-256": "sha256=deadbeef" } }), res);

    expect(res._status).toBe(401);
    expect(mockHandleMessage).not.toHaveBeenCalled();
  });

  it("returns 401 (not 500) for a same-length non-hex signature instead of crashing", async () => {
    vi.stubEnv("WHATSAPP_WEBHOOK_APP_SECRET", "appsecret");
    mockGetRawBody.mockResolvedValue(Buffer.from(JSON.stringify(META_PAYLOAD)));

    // 64 characters of 'g' passes a string-length check but is not valid hex —
    // Buffer.from(..., "hex") would silently truncate and timingSafeEqual would
    // throw on the buffer-length mismatch.
    const res = createRes();
    await handler(createReq({ headers: { "x-hub-signature-256": `sha256=${"g".repeat(64)}` } }), res);

    expect(res._status).toBe(401);
    expect(mockHandleMessage).not.toHaveBeenCalled();
  });

  it("processes bare payloads without a signature when no secret is configured (dev bridges)", async () => {
    vi.stubEnv("WHATSAPP_WEBHOOK_APP_SECRET", "");
    mockGetRawBody.mockResolvedValue(Buffer.from(JSON.stringify({ from: "254712345678", body: "Hi" })));
    mockHandleMessage.mockResolvedValue({
      replyText: "Welcome",
      state: "MAIN_MENU",
      stkPushTriggered: false,
    });

    const res = createRes();
    await handler(createReq(), res);

    expect(res._status).toBe(200);
    expect(mockHandleMessage).toHaveBeenCalled();
  });

  it("answers the Meta verification handshake on GET", async () => {
    vi.stubEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "verify-token");

    const res = createRes();
    await handler(
      createReq({
        method: "GET",
        query: {
          "hub.mode": "subscribe",
          "hub.verify_token": "verify-token",
          "hub.challenge": "12345",
        },
      }),
      res
    );

    expect(res._status).toBe(200);
    expect(res._body).toBe("12345");
  });
});
