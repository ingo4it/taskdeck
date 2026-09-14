import { defineConfig, devices } from "@playwright/test";
import { E2E_SESSION_SECRET, E2E_UPSTREAM_PORT } from "./e2e/fixtures/e2e-secrets";
import { startMockUpstream } from "./e2e/fixtures/mock-upstream";

/**
 * Core-flow e2e. Runs against the real Next.js app (built + started by
 * `webServer`) with two layers of mocking:
 *  - client-initiated requests (uploads, SSE streams) go through taskdeck's
 *    own `/api/*` route handlers as usual and are intercepted in the
 *    browser by `e2e/fixtures/mock-backend.ts`'s `page.route()` calls;
 *  - the SSR fetches server components make directly (documents list/get,
 *    pipeline status, AI review) never touch the browser, so they're routed
 *    at `KEYSTONE_URL` / `PULSEQ_ADMIN_URL` / `MODELGATE_URL` to the real
 *    (if minimal) HTTP server `startMockUpstream` below — module-level, so
 *    it's listening before Playwright spawns the `next start` subprocess.
 * Either way, no keystone / pulseq / modelgate checkout is needed.
 */
startMockUpstream(E2E_UPSTREAM_PORT);

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
      KEYSTONE_URL: `http://localhost:${E2E_UPSTREAM_PORT}`,
      PULSEQ_ADMIN_URL: `http://localhost:${E2E_UPSTREAM_PORT}`,
      MODELGATE_URL: `http://localhost:${E2E_UPSTREAM_PORT}`,
      SESSION_SECRET: E2E_SESSION_SECRET,
    },
  },
});
