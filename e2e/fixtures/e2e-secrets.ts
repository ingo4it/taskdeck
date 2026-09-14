/**
 * Fixed values shared between `playwright.config.ts` (which starts the Next
 * server subprocess and the mock upstream server, and sets the subprocess's
 * env) and the fixtures that run inside the Playwright test process itself.
 * They have to agree out of band like this because the two live in
 * different Node processes with no shared runtime state.
 */
export const E2E_SESSION_SECRET = "e2e-session-secret-that-is-32-bytes!!";
export const E2E_UPSTREAM_PORT = 4100;
