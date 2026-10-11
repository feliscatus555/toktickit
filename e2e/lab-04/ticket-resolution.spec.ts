import { test, expect } from "@playwright/test";

test.describe("Playwright End-to-End — Lab 04 Ticket Resolution Gate & Workflow (Feature-14, E2E-02)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("E2E-02: Ticket Resolution Gate blocks resolution without Action Taken, unlocks with Action Taken, and enforces workflow rules", async ({
    page,
  }) => {
    // =========================================================================
    // Part 1: Requester logs in and creates a new ticket
    // =========================================================================
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.getByText("👤 Requester")).toBeVisible();

    await page.locator("#nav-create-ticket").click();
    await expect(page.getByRole("heading", { name: /Create IT Support Ticket/i })).toBeVisible();

    const uniqueSummary = `Resolution Gate E2E Ticket ${Date.now()}`;
    await page.locator("#summary").fill(uniqueSummary);
    await page.locator("#description").fill("Switch port in Server Room B is flapping and disconnecting NAS.");
    await page.locator("#categoryId").selectOption({ index: 1 });
    await page.locator("#relatedSystemId").selectOption({ index: 1 });
    await page.locator("#requestedPriority").selectOption("HIGH");

    await page.getByRole("button", { name: /Submit Ticket/i }).click();
    await expect(page.getByText("Ticket Created Successfully!")).toBeVisible();

    // Sign out Requester
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    // =========================================================================
    // Part 2: IT Staff logs in and locates the ticket
    // =========================================================================
    await page.locator("#login-email").fill("sarah.johnson@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.getByText("🛠 IT Staff")).toBeVisible();
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

    // Locate the created ticket
    const searchInput = page.getByPlaceholder(/Search by ticket number or summary.../i);
    await searchInput.fill(uniqueSummary);
    await expect(page.getByText(uniqueSummary).first()).toBeVisible();

    // Open ticket detail
    await page.waitForTimeout(400);
    const ticketRow = page.locator("#staff-queue-table tbody tr").first();
    await expect(ticketRow).toBeVisible();
    await ticketRow.locator("button").first().click();
    await expect(page.getByText("Official Ticket Number")).toBeVisible();

    // =========================================================================
    // Part 3: Assign ticket and transition from New -> Open
    // =========================================================================
    // Claim ticket if unassigned
    const claimBtn = page.locator("#claim-ticket-btn");
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await page.waitForTimeout(300);
    }

    // Verify initial status is New and permitted next is Open
    const statusSelect = page.locator("#next-status-select");
    await expect(statusSelect).toBeVisible();

    // Move to Open
    await statusSelect.selectOption("Open");
    await page.waitForTimeout(400);
    await expect(page.getByText(/●\s*Open/i).first()).toBeVisible();

    // =========================================================================
    // Part 4: Attempt Resolution Gate with 0 Actions Taken (Must be Blocked)
    // =========================================================================
    // Select Resolved from dropdown
    await statusSelect.selectOption("Resolved");
    await expect(page.locator("#resolution-summary-input")).toBeVisible();

    // Verify Resolution Gate warning banner is shown
    const gateWarning = page.locator("#resolution-gate-warning");
    await expect(gateWarning).toBeVisible();
    await expect(gateWarning).toContainText("Resolution requires at least one recorded Action Taken.");

    // Verify Confirm Resolve button is DISABLED
    const confirmResolveBtn = page.locator("#confirm-resolve-btn");
    await expect(confirmResolveBtn).toBeDisabled();

    // Cancel inline resolution box
    await page.getByRole("button", { name: /Cancel/i }).first().click();

    // =========================================================================
    // Part 5: Add an Action Taken to satisfy the Resolution Gate
    // =========================================================================
    await page.locator("#btn-add-action-taken").click();
    await expect(page.getByRole("heading", { name: /Record Action Taken/i })).toBeVisible();

    await page.locator("#input-action-description").fill("Replaced faulty SFP+ transceiver on switch port 24.");
    await page.locator("#input-action-result").fill("Port link stable at 10Gbps with zero CRC error drops.");
    await page.locator("#btn-save-action-taken").click();

    // Verify action appears in table
    await expect(page.locator("#actions-taken-table")).toBeVisible();
    await expect(page.getByText("Replaced faulty SFP+ transceiver on switch port 24.")).toBeVisible();

    // =========================================================================
    // Part 6: Unblock Resolution Gate and formally Resolve Ticket
    // =========================================================================
    await statusSelect.selectOption("Resolved");
    await expect(page.locator("#resolution-summary-input")).toBeVisible();

    // Verify warning is gone and button is ENABLED
    await expect(page.locator("#resolution-gate-warning")).not.toBeVisible();
    await expect(confirmResolveBtn).toBeEnabled();

    // Enter mandatory resolution summary
    await page.locator("#resolution-summary-input").fill("Replaced SFP+ transceiver on port 24 and verified stable link.");
    await confirmResolveBtn.click();

    // Verify ticket status badge updates immediately to Resolved
    await expect(page.getByText(/●\s*Resolved/i).first()).toBeVisible();

    // Sign out IT Staff
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    // =========================================================================
    // Part 7: Requester logs back in, verifies Resolved status & read-only actions
    // =========================================================================
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator("#user-identity-badge")).toBeVisible();

    // Open the ticket from My Tickets
    await page.locator("#nav-my-tickets").click();
    const myTicketRow = page.locator("table tbody tr").filter({ hasText: uniqueSummary });
    await expect(myTicketRow).toBeVisible();
    await myTicketRow.locator("button").click();

    // Verify ticket is Resolved and displays resolution summary
    await expect(page.getByText(/●\s*Resolved/i).first()).toBeVisible();
    await expect(page.getByText("Replaced SFP+ transceiver on port 24 and verified stable link.")).toBeVisible();

    // Verify Actions Taken is in read-only mode for Requester
    await expect(page.locator("#actions-taken-table")).toBeVisible();
    await expect(page.locator("#btn-add-action-taken")).not.toBeVisible();
    await expect(page.locator("#next-status-select")).not.toBeVisible();
  });

  test("E2E-02 (Advisory Indicator): Requester problem resolved indicator updates flag without altering ticket status", async ({
    page,
  }) => {
    // =========================================================================
    // Part 1: Requester creates a ticket
    // =========================================================================
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await page.locator("#nav-create-ticket").click();
    const uniqueSummary = `Advisory Resolution Test ${Date.now()}`;
    await page.locator("#summary").fill(uniqueSummary);
    await page.locator("#description").fill("Wi-Fi keeps dropping intermittent packets.");
    await page.locator("#categoryId").selectOption({ index: 1 });
    await page.locator("#relatedSystemId").selectOption({ index: 1 });
    await page.locator("#requestedPriority").selectOption("MEDIUM");
    await page.getByRole("button", { name: /Submit Ticket/i }).click();
    await expect(page.getByText("Ticket Created Successfully!")).toBeVisible();

    // Open the created ticket
    await page.locator("#nav-my-tickets").click();
    const myTicketRow = page.locator("table tbody tr").filter({ hasText: uniqueSummary });
    await expect(myTicketRow).toBeVisible();
    await myTicketRow.locator("button").click();

    // Sign out Requester and sign in IT Staff to move ticket to Open so problem-resolved banner appears
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();

    await page.locator("#login-email").fill("sarah.johnson@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    const searchInput = page.getByPlaceholder(/Search by ticket number or summary.../i);
    await searchInput.fill(uniqueSummary);
    await page.waitForTimeout(400);
    const staffRow = page.locator("#staff-queue-table tbody tr").first();
    await staffRow.locator("button").first().click();

    // Move to Open
    await page.locator("#next-status-select").selectOption("Open");
    await page.waitForTimeout(400);

    // Sign out IT Staff
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();

    // Requester logs back in
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await page.locator("#nav-my-tickets").click();
    const row = page.locator("table tbody tr").filter({ hasText: uniqueSummary });
    await row.locator("button").click();

    // Click Problem Appears Resolved button
    const resolvedBtn = page.locator("#problem-appears-resolved-btn");
    await expect(resolvedBtn).toBeVisible();
    await resolvedBtn.click();

    // Advisory confirmation banner should appear
    await expect(page.getByText("You indicated this issue appears resolved.")).toBeVisible();

    // Ticket status MUST remain Open, NOT Resolved (FR-56, BR-05)
    await expect(page.getByText(/●\s*Open/i).first()).toBeVisible();
  });
});
