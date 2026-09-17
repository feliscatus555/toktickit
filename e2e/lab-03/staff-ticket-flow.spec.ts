import { test, expect } from "@playwright/test";

test.describe("Playwright End-to-End — Lab 03 Staff Operations & Collaboration (Feature-11)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("E2E-03 & E2E-04: Staff ticket claim, priority, status workflow, notes/comments, and requester resolution indicator", async ({
    page,
  }) => {
    // =========================================================================
    // Part 1: Requester creates a ticket to operate on
    // =========================================================================
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.getByText("👤 Requester")).toBeVisible();

    // Click "+ Create Ticket"
    await page.locator("#nav-create-ticket").click();
    await expect(page.getByRole("heading", { name: /Create IT Support Ticket/i })).toBeVisible();

    const uniqueSummary = `VPN Disconnection E2E ${Date.now()}`;
    await page.locator("#summary").fill(uniqueSummary);
    await page.locator("#description").fill("Cannot maintain tunnel connection during remote lecture.");
    await page.locator("#categoryId").selectOption({ index: 1 });
    await page.locator("#relatedSystemId").selectOption({ index: 1 });
    await page.locator("#requestedPriority").selectOption("HIGH");

    await page.getByRole("button", { name: /Submit Ticket/i }).click();

    // Verify success confirmation and click View My Tickets
    await expect(page.getByText("Ticket Created Successfully!")).toBeVisible();
    await page.getByRole("button", { name: /View My Tickets/i }).click();

    // Verify in My Tickets
    await expect(page.getByText(uniqueSummary).first()).toBeVisible();

    // Sign out Requester
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    // =========================================================================
    // Part 2: E2E-03 — IT Staff operational workflows (Claim, Priority, Status, Notes, Comments)
    // =========================================================================
    await page.locator("#login-email").fill("sarah.johnson@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.getByText("🛠 IT Staff")).toBeVisible();
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

    // Search for our created ticket
    const searchInput = page.getByPlaceholder(/Search by ticket number or summary.../i);
    await searchInput.fill(uniqueSummary);
    await page.waitForTimeout(400); // Debounce / table re-render

    const ticketRow = page.locator("#staff-queue-table tbody tr").first();
    await expect(ticketRow).toBeVisible();
    await expect(ticketRow.getByText(uniqueSummary)).toBeVisible();

    // Click on ticket number to open Ticket Detail
    const ticketLink = ticketRow.locator("button").first();
    const ticketNoText = (await ticketLink.textContent())?.trim() || "";
    await ticketLink.click();

    await expect(page.getByText("Official Ticket Number")).toBeVisible();
    await expect(page.getByText(ticketNoText)).toBeVisible();

    // 1. Claim Ticket
    const claimBtn = page.locator("#claim-ticket-btn");
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(claimBtn).not.toBeVisible();
      await expect(page.locator("#ticket-owner-display")).toContainText("Sarah Johnson");
    }

    // 2. Update IT Priority to Urgent
    await page.locator("#it-priority-select").selectOption("URGENT");
    await page.waitForTimeout(300);

    // 3. Status Transition: New -> Open -> In Progress
    const nextStatusSelect = page.locator("#next-status-select");
    const applyStatusBtn = page.locator("#apply-status-transition-btn");

    // Check if Open is in next status
    const options = await nextStatusSelect.locator("option").allTextContents();
    if (options.some((opt) => opt.includes("Open"))) {
      await nextStatusSelect.selectOption("Open");
      await applyStatusBtn.click();
      await page.waitForTimeout(300);
    }

    // Now transition Open -> InProgress
    const optionsAfterOpen = await nextStatusSelect.locator("option").allTextContents();
    if (optionsAfterOpen.some((opt) => opt.includes("In Progress"))) {
      await nextStatusSelect.selectOption("InProgress");
      await applyStatusBtn.click();
      await page.waitForTimeout(300);
    }

    // 4. Post Private Internal Note (Staff Only)
    const noteText = "Configured radius timeout and route table on gateway.";
    await page.locator("#internal-note-input").fill(noteText);
    await page.locator("#post-internal-note-btn").click();
    await expect(page.getByText(noteText)).toBeVisible();

    // 5. Post Public Comment
    const commentText = "We have updated the VPN server profiles. Please verify.";
    await page.locator("#public-comment-input").fill(commentText);
    await page.locator("#post-public-comment-btn").click();
    await expect(page.getByText(commentText)).toBeVisible();

    // Sign out IT Staff
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    // =========================================================================
    // Part 3: E2E-04 — Requester verification & resolution indication
    // =========================================================================
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.getByText("👤 Requester")).toBeVisible();

    // Find and open the ticket in My Tickets
    const myTicketRow = page.locator("tr").filter({ hasText: uniqueSummary }).first();
    await myTicketRow.getByRole("button", { name: /View Detail/i }).click();
    await expect(page.getByText("Official Ticket Number")).toBeVisible();

    // AC-04: Verify Internal Notes are completely absent from Requester DOM
    await expect(page.locator("#internal-notes-container")).not.toBeVisible();
    await expect(page.getByText(noteText)).not.toBeVisible();

    // Verify Public Comment IS visible
    await expect(page.getByText(commentText)).toBeVisible();

    // Click "Problem Appears Resolved"
    const resolvedBtn = page.locator("#problem-appears-resolved-btn");
    await expect(resolvedBtn).toBeVisible();
    await resolvedBtn.click();

    // Verify resolution banner appears
    await expect(page.getByText(/You indicated this issue appears resolved/i)).toBeVisible();

    // Sign out Requester
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    // =========================================================================
    // Part 4: Staff sees the resolution indicator flag
    // =========================================================================
    await page.locator("#login-email").fill("sarah.johnson@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await searchInput.fill(uniqueSummary);
    await page.waitForTimeout(400);

    await page.locator("#staff-queue-table tbody tr").first().locator("button").first().click();
    await expect(page.getByText("Official Ticket Number")).toBeVisible();

    // Verify badge "Problem Marked Resolved" is visible to Staff
    await expect(page.getByText(/Problem Marked Resolved/i)).toBeVisible();
  });
});
