import { normalizeKenyanPhone } from "./normalizePhone";

export interface MPesaStkPushOptions {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
  isSandbox?: boolean;
}

export interface MPesaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export class DarajaClient {
  private static getBaseUrl(isSandbox = false): string {
    return isSandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";
  }

  /**
   * Build the Daraja STK push timestamp. Daraja expects East Africa Time
   * (Africa/Nairobi, UTC+3) regardless of the server's own timezone — using
   * server-local time breaks the password hash on any host not running EAT.
   * Kenya observes no DST, so a fixed +3h offset is deterministic.
   */
  private static getEatTimestamp(): string {
    const eatTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    // toISOString() is UTC, so the +3h shift yields wall-clock EAT: YYYYMMDDHHmmss
    return eatTime.toISOString().replace(/\D/g, "").slice(0, 14);
  }

  /**
   * Fetch OAuth 2.0 Access Token from Daraja
   */
  public static async getAccessToken(
    consumerKey: string,
    consumerSecret: string,
    isSandbox = false
  ): Promise<string> {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const baseUrl = DarajaClient.getBaseUrl(isSandbox);

    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`M-Pesa auth failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  /**
   * Trigger Lipa Na M-Pesa Online STK Push to customer's phone
   */
  public static async initiateStkPush(options: MPesaStkPushOptions): Promise<MPesaStkPushResponse> {
    const formattedPhone = normalizeKenyanPhone(options.phoneNumber);
    if (!formattedPhone) {
      throw new Error(
        `Invalid Kenyan phone number: ${options.phoneNumber}. Must be a valid Safaricom/Airtel number.`
      );
    }

    if (!Number.isFinite(options.amount) || options.amount <= 0) {
      throw new Error(
        `Invalid M-Pesa amount: ${options.amount}. Must be a positive number of Kenya Shillings.`
      );
    }

    const accessToken = await DarajaClient.getAccessToken(
      options.consumerKey,
      options.consumerSecret,
      options.isSandbox
    );

    const timestamp = DarajaClient.getEatTimestamp();

    const password = Buffer.from(`${options.businessShortCode}${options.passkey}${timestamp}`).toString(
      "base64"
    );

    const baseUrl = DarajaClient.getBaseUrl(options.isSandbox);

    const payload = {
      BusinessShortCode: options.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(options.amount),
      PartyA: formattedPhone,
      PartyB: options.businessShortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: options.callbackUrl,
      AccountReference: options.accountReference.slice(0, 12),
      TransactionDesc: options.transactionDesc.slice(0, 12),
    };

    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`M-Pesa STK Push request failed: ${response.status} ${errorText.slice(0, 300)}`);
    }

    let data: MPesaStkPushResponse;
    try {
      data = (await response.json()) as MPesaStkPushResponse;
    } catch {
      throw new Error(`M-Pesa STK Push returned a non-JSON response (HTTP ${response.status})`);
    }

    if (!data?.ResponseCode || data.ResponseCode !== "0") {
      throw new Error(
        `M-Pesa STK Push failed: ${data?.ResponseDescription || data?.CustomerMessage || "unknown error"}`
      );
    }

    return data;
  }
}
