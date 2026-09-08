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
  await expect(page.getByText("AI review")).toBeVisible();

  // streamed Q&A
  await page.getByLabel("Question").fill("What is the termination notice period?");
  await page.getByRole("button", { name: "Ask" }).click();

  await expect(page.getByText(/30 days \[1\]\./)).toBeVisible();
  await expect(page.getByText("claude-sonnet-5")).toBeVisible();
  await expect(page.getByText(/Either party may terminate on 30 days/)).toBeVisible(); // citation quote
});

test("upload adds an optimistic row immediately", async ({ page }) => {
  await page.goto("/dashboard");
  await page.setInputFiles('input[type="file"]', {
    name: "new-contract.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 fake"),
  });
  // optimistic card shows before the POST resolves
  await expect(page.getByText("uploading…")).toBeVisible();
});
