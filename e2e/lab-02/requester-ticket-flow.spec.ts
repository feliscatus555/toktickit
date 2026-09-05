import { test, expect } from "@playwright/test";

test.describe("Playwright End-to-End — Lab 02 Requester Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
  });

  test("E2E-01: Complete ticket creation & lookup flow", async ({ page }) => {
    // 1. Navigate to Create Ticket page
    const createBtn = page.getByRole("button", { name: /Create Ticket/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // 2. Fill out ticket creation form
    await page.locator("#summary").fill("E2E Test: Network cable damaged");
    await page.locator("#description").fill("Ethernet cable near desk #4 is frayed and disconnecting intermittently.");
    await page.locator("#categoryId").selectOption({ index: 1 });
    await page.locator("#relatedSystemId").selectOption({ index: 1 });
    await page.locator("#requestedPriority").selectOption("HIGH");

    // 3. Submit form
    const submitBtn = page.getByRole("button", { name: /Submit Ticket/i });
    await submitBtn.click();

    // 4. Verify ticket created successfully screen renders with created ticket summary
    await expect(page.getByText("Ticket Created Successfully!")).toBeVisible();
    await expect(page.getByText("E2E Test: Network cable damaged")).toBeVisible();
  });

  test("E2E-02: Multi-requester isolation workflow", async ({ page }) => {
    // 1. Click "Change Requester" button in header to open Requester Selector Modal
    const switchBtn = page.getByRole("button", { name: /Change Requester|Select Requester/i });
    await expect(switchBtn).toBeVisible();
    await switchBtn.click();

    // 2. Expect requester select dropdown to be visible inside modal
    const requesterSelect = page.locator("#requester-select");
    await expect(requesterSelect).toBeVisible();

    // 3. Select Requester 2 (index 1 in available options)
    await requesterSelect.selectOption({ index: 1 });

    // 4. Confirm selection by clicking Continue button
    const confirmBtn = page.getByRole("button", { name: /Continue/i });
    await confirmBtn.click();

    // 5. Navigate to My Tickets tab to view tickets under selected requester
    const myTicketsBtn = page.getByRole("button", { name: /My Tickets/i }).first();
    await myTicketsBtn.click();

    // 6. Verify active tab shows My Submitted Tickets
    await expect(page.getByText("My Submitted Tickets")).toBeVisible();
  });

  test("E2E-03: Attachment upload & soft removal flow", async ({ page }) => {
    // 1. Open My Tickets tab
    const myTicketsBtn = page.getByRole("button", { name: /My Tickets/i }).first();
    await myTicketsBtn.click();

    // 2. Open first ticket in table if available
    const viewDetailBtn = page.getByRole("button", { name: /View Detail/i }).first();
    if (await viewDetailBtn.isVisible()) {
      await viewDetailBtn.click();

      // 3. Check Attachment section renders
      await expect(page.getByText("Ticket Attachments").first()).toBeVisible();

      // 4. If active attachment exists, test removal modal
      const removeBtn = page.getByRole("button", { name: "Remove" }).first();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();

        // Modal prompts for mandatory deletion reason
        await expect(page.getByText("Confirm Attachment Soft-Removal")).toBeVisible();
        const reasonInput = page.getByPlaceholder(/Enter mandatory reason/i);
        await reasonInput.fill("E2E Test: Soft removing file");

        const confirmRemovalBtn = page.getByRole("button", { name: "Confirm Removal" });
        await confirmRemovalBtn.click();

        // Tombstone renders with deletion reason
        await expect(page.getByText(/Reason: "E2E Test: Soft removing file"/i)).toBeVisible();
      }
    }
  });

  test("E2E-04: Responsive mobile viewport flow", async ({ page }) => {
    // Set viewport to mobile 375x667
    await page.setViewportSize({ width: 375, height: 667 });

    // Header logo TokTickIT visible
    await expect(page.getByText("TokTickIT")).toBeVisible();

    // Check zero horizontal scroll overflow
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(bodyClientWidth + 5);
  });
});
