import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests.
 *
 * Playwright starts both the commerce backend and the storefront itself, so
 * a developer runs `pnpm test:e2e` and CI runs the same command — no separate
 * "remember to start the server" step that only works on one of them.
 *
 * The viewports are the ones from the brief: a small phone, a tablet and a
 * desktop. Mobile is first, because that is where most of the traffic is and
 * where layouts actually break.
 */
const PORT = 8000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Deterministic tests only: a flaky e2e suite gets ignored, and an ignored
  // suite is worse than none.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),

  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    // Some CI images ship a pre-installed Chromium whose build number does
    // not match the pinned Playwright version. Pointing at it explicitly is
    // faster and more reliable than re-downloading ~150 MB per run.
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
    locale: "da-DK",
    timezoneId: "Europe/Copenhagen",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "mobil-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 780 }, isMobile: false },
    },
    {
      name: "tablet-768",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: [
    {
      command: "pnpm --filter @nordprint/commerce-backend start",
      url: "http://127.0.0.1:9000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      cwd: "../..",
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "pnpm --filter @nordprint/storefront start",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: "../..",
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
