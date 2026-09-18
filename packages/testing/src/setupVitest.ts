import process from "node:process";
import type { CalendarService } from "@kalo/types/Calendar";
import matchers from "@testing-library/jest-dom/matchers";
import ResizeObserver from "resize-observer-polyfill";
import { expect, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

global.ResizeObserver = ResizeObserver;

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const fetchMocker = createFetchMock(vi);

// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();

expect.extend(matchers);

class MockExchangeCalendarService implements CalendarService {
  async createEvent() {
    return {
      uid: "mock",
      id: "mock",
      password: "",
      type: "",
      url: "",
      additionalInfo: {},
    };
  }
  async updateEvent() {
    return {
      uid: "mock",
      id: "mock",
      password: "",
      type: "",
      url: "",
      additionalInfo: {},
    };
  }
  async deleteEvent() {}
  async getAvailability() {
    return [];
  }
  async listCalendars() {
    return [];
  }
}

vi.mock("@kalo/exchangecalendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

vi.mock("@kalo/exchange2013calendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

vi.mock("@kalo/exchange2016calendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

const MOCK_PAYMENT_UID = "MOCK_PAYMENT_UID";

function createMockPaymentService(_credentials?: unknown) {
  return {
    async create(
      payment: { amount: number; currency: string },
      bookingId: number,
      _userId: number,
      _username: string | null,
      _bookerName: string | null,
      paymentOption: string,
      _bookerEmail: string,
      _bookerPhoneNumber?: string | null,
      _selectedEventTypeTitle?: string,
      _eventTitle?: string
    ) {
      const { default: prismaMock } = await import("@kalo/testing/lib/__mocks__/prisma");
      const externalId = "mock_payment_external_id";

      const paymentCreateData = {
        uid: MOCK_PAYMENT_UID,
        appId: null,
        bookingId,
        fee: 10,
        success: false,
        refunded: false,
        data: {},
        externalId,
        paymentOption,
        amount: payment.amount,
        currency: payment.currency,
      };

      const createdPayment = await prismaMock.payment.create({
        data: paymentCreateData,
      });

      return createdPayment;
    },
    async collectCard() {
      return { success: true };
    },
    async chargeCard() {
      return { success: true };
    },
    async refund() {
      return { success: true };
    },
    async deletePayment() {
      return { success: true };
    },
    async afterPayment(
      event: Record<string, unknown>,
      _booking: Record<string, unknown>,
      paymentData: { paymentOption?: string; amount: number; currency: string }
    ) {
      const { sendAwaitingPaymentEmailAndSMS } = await import("@kalo/emails/email-manager");
      await sendAwaitingPaymentEmailAndSMS({
        ...event,
        paymentInfo: {
          link: "http://mock-payment.example.com/",
          paymentOption: paymentData.paymentOption || "ON_BOOKING",
          amount: paymentData.amount,
          currency: paymentData.currency,
        },
      });
      return { success: true };
    },
  };
}

vi.mock("@kalo/app-store/stripepayment/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@kalo/app-store/paypal/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@kalo/app-store/alby/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@kalo/app-store/hitpay/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@kalo/app-store/btcpayserver/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@kalo/app-store/mock-payment-app/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@kalo/app-store/payment.services.generated", () => ({
  PaymentServiceMap: {
    stripepayment: Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    paypal: Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    alby: Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    hitpay: Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    btcpayserver: Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    "mock-payment-app": Promise.resolve({ BuildPaymentService: createMockPaymentService }),
  },
}));

class MockCrmService {
  async createEvent() {
    return [];
  }
  async updateEvent() {
    return [];
  }
  async deleteEvent() {}
  async getContacts() {
    return [];
  }
  async createContacts() {
    return [];
  }
}

vi.mock("@kalo/app-store/crm.apps.generated", () => ({
  CrmServiceMap: {
    closecom: Promise.resolve({ default: MockCrmService }),
    hubspot: Promise.resolve({ default: MockCrmService }),
    "pipedrive-crm": Promise.resolve({ default: MockCrmService }),
    salesforce: Promise.resolve({ default: MockCrmService }),
    "zoho-bigin": Promise.resolve({ default: MockCrmService }),
    zohocrm: Promise.resolve({ default: MockCrmService }),
  },
}));

if (!process.env.INTEGRATION_TESTS) {
  vi.mock("@kalo/app-store/salesforce/lib/graphql/documents/queries", () => ({
    GetAccountRecordsForRRSkip: {},
  }));
}
