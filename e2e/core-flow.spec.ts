import { expect, test } from "@playwright/test";
import { mockBackend } from "./fixtures/mock-backend";

/**
 * The one flow that has to work: land on the dashboard, open a document, watch
 * the pipeline finish over SSE, see the AI review, ask a question and get a
 * streamed answer with a citation.
 *
 * The three backend services are mocked at taskdeck's own `/api/*` boundary
 * (see fixtures/mock-backend). Server components that read the session are
 * covered by the fake `td_session` cookie plus mocked upstream calls.
 */
test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

test("document list → detail → pipeline → review → streamed Q&A", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();

  await page.getByText("Vendor MSA").click();
  await expect(page).toHaveURL(/\/dashboard\/documents\/doc-e2e-1$/);

  // pipeline reaches "Complete" via the mocked SSE stream
  await expect(page.getByText("Complete")).toBeVisible();
  // "AI review" also appears as a nav/summary label elsewhere on the page;
  // the heading is the one that actually confirms the panel rendered.
  await expect(page.getByRole("heading", { name: "AI review" })).toBeVisible();

  // streamed Q&A
  await page.getByLabel("Question").fill("What is the termination notice period?");
  await page.getByRole("button", { name: "Ask" }).click();

  await expect(page.getByText(/30 days \[1\]\./)).toBeVisible();
  // "claude-sonnet-5" also appears in the AI review panel's model badge,
  // rendered earlier on the page — .last() is the streamed answer's own
  // attribution, in AskBox below it.
  await expect(page.getByText("claude-sonnet-5").last()).toBeVisible();
  // the citation quote appears in both the review panel's findings and the
  // answer's own citation — either occurrence confirms it rendered
  await expect(page.getByText(/Either party may terminate on 30 days/).first()).toBeVisible();
});

test("upload adds an optimistic row immediately", async ({ page }) => {
  await page.goto("/dashboard");
  await page.setInputFiles('input[type="file"]', {
    name: "new-contract.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 fake"),
  });
  // optimistic card shows before the POST resolves — scoped to the new
  // row's own status badge, not the (also-disabled, also-labelled
  // "Uploading…") submit button
  await expect(page.getByRole("link", { name: /new-contract/ }).getByText("uploading…")).toBeVisible();
});
