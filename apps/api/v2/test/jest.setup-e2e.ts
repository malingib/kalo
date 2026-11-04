jest.retryTimes(process.env.CI ? 2 : 0); // Global retry for all tests

// API v2 E2E tests verify booking and calendar behavior, not the external Daily API.
// Use a deterministic meeting response so tests never depend on app-store availability
// or a live DAILY_API_KEY. Integration-specific provider behavior is tested separately.
jest.mock("@kalo/platform-libraries/conferencing", () => ({
  ...jest.requireActual("@kalo/platform-libraries/conferencing"),
  createMeeting: jest.fn().mockResolvedValue({
    appName: "daily-video",
    type: "daily_video",
    uid: "MOCK_UID",
    originalEvent: {},
    success: true,
    createdEvent: {
      type: "daily_video",
      id: "MOCK_DAILY_ID",
      password: "MOCK_DAILY_PASS",
      url: "https://mock-daily.example.com/mock-meeting",
    },
    credentialId: 0,
  }),
}));
