import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MPesaStkPushOptions } from "./darajaClient";
import { DarajaClient } from "./darajaClient";

const baseOptions: MPesaStkPushOptions = {
  consumerKey: "test-consumer-key",
  consumerSecret: "test-consumer-secret",
  businessShortCode: "174379",
  passkey: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
  phoneNumber: "0712345678",
  amount: 500,
  accountReference: "ORD-1234567890-extra",
  transactionDesc: "Barber deposit",
  callbackUrl: "https://example.com/mpesa/callback",
  isSandbox: true,
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  fetchMock.mockReset();
});

function tokenResponse(): { ok: true; status: number; json: () => Promise<{ access_token: string }> } {
  return { ok: true, status: 200, json: async () => ({ access_token: "TEST_TOKEN" }) };
}

function stkResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      MerchantRequestID: "29115-34620561-1",
      CheckoutRequestID: "ws_CO_191202133218412",
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "Success. Request accepted for processing",
      ...overrides,
    }),
  };
}

function errorResponse(
  status = 500,
  text = "Internal Server Error"
): {
  ok: false;
  status: number;
  text: () => Promise<string>;
} {
  return { ok: false, status, text: async () => text };
}

describe("DarajaClient.initiateStkPush", () => {
  it("rejects invalid Kenyan phone numbers before calling Daraja", async () => {
    await expect(DarajaClient.initiateStkPush({ ...baseOptions, phoneNumber: "12345" })).rejects.toThrow(
      /Invalid Kenyan phone number/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects zero amounts", async () => {
    await expect(DarajaClient.initiateStkPush({ ...baseOptions, amount: 0 })).rejects.toThrow(
      /Invalid M-Pesa amount/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects negative amounts", async () => {
    await expect(DarajaClient.initiateStkPush({ ...baseOptions, amount: -50 })).rejects.toThrow(
      /Invalid M-Pesa amount/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects NaN amounts", async () => {
    await expect(DarajaClient.initiateStkPush({ ...baseOptions, amount: Number.NaN })).rejects.toThrow(
      /Invalid M-Pesa amount/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds the password from a 14-digit East Africa Time timestamp", async () => {
    vi.useFakeTimers();
    // 2026-08-06T10:00:00Z == 2026-08-06 13:00 EAT (UTC+3, Kenya has no DST)
    vi.setSystemTime(new Date("2026-08-06T10:00:00.000Z"));
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(stkResponse());

    await DarajaClient.initiateStkPush(baseOptions);

    const [, stkRequest] = fetchMock.mock.calls;
    const payload = JSON.parse((stkRequest[1] as { body: string }).body);
    expect(payload.Timestamp).toMatch(/^\d{14}$/);
    expect(payload.Timestamp).toBe("20260806130000");
    const expectedPassword = Buffer.from(
      `${baseOptions.businessShortCode}${baseOptions.passkey}20260806130000`
    ).toString("base64");
    expect(payload.Password).toBe(expectedPassword);
  });

  it("normalizes the phone number and caps the account reference in the payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T10:00:00.000Z"));
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(stkResponse());

    await DarajaClient.initiateStkPush(baseOptions);

    const [, stkRequest] = fetchMock.mock.calls;
    const payload = JSON.parse((stkRequest[1] as { body: string }).body);
    expect(payload.PartyA).toBe("254712345678");
    expect(payload.PhoneNumber).toBe("254712345678");
    expect(payload.Amount).toBe(500);
    expect(payload.AccountReference).toBe("ORD-12345678");
    expect(payload.TransactionDesc).toBe("Barber depos");
  });

  it("throws a descriptive error when the OAuth token request fails", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(401, "Unauthorized"));

    await expect(DarajaClient.initiateStkPush(baseOptions)).rejects.toThrow(/M-Pesa auth failed: 401/);
  });

  it("throws when the STK push request itself fails", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(errorResponse(500, "Oops"));

    await expect(DarajaClient.initiateStkPush(baseOptions)).rejects.toThrow(
      /M-Pesa STK Push request failed: 500/
    );
  });

  it("throws when the STK response is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    });

    await expect(DarajaClient.initiateStkPush(baseOptions)).rejects.toThrow(/non-JSON response/);
  });

  it("throws when Daraja rejects the request with a non-zero ResponseCode", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(stkResponse({ ResponseCode: "1037", ResponseDescription: "DS timeout" }));

    await expect(DarajaClient.initiateStkPush(baseOptions)).rejects.toThrow(/DS timeout/);
  });

  it("returns the Daraja response on success", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(stkResponse());

    const result = await DarajaClient.initiateStkPush(baseOptions);

    expect(result).toEqual({
      MerchantRequestID: "29115-34620561-1",
      CheckoutRequestID: "ws_CO_191202133218412",
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "Success. Request accepted for processing",
    });
  });
});
