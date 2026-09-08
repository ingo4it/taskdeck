import { defineConfig, devices } from "@playwright/test";

/**
 * Core-flow e2e. Runs against the real Next.js app (built + started by
 * `webServer`) but with every `**​/api/**` call intercepted by
 * `e2e/fixtures/mock-backend.ts`, so it needs no keystone / pulseq / modelgate.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_PRESENCE_WS_URL: "ws://localhost:3000/none",
      KEYSTONE_URL: "http://localhost:9",
      PULSEQ_ADMIN_URL: "http://localhost:9",
      MODELGATE_URL: "http://localhost:9",
      SESSION_SECRET: "e2e-session-secret-that-is-32-bytes!!",
    },
  },
});
