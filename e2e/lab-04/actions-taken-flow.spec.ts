import { test, expect } from "@playwright/test";

test.describe("Playwright End-to-End — Lab 04 Actions Taken Flow (Feature-13)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("E2E-01: Multi-role Actions Taken creation, verification, and requester read-only view", async ({
    page,
  }) => {
    // =========================================================================
    // Part 1: Requester creates a ticket
    // =========================================================================
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.getByText("👤 Requester")).toBeVisible();

    await page.locator("#nav-create-ticket").click();
    await expect(page.getByRole("heading", { name: /Create IT Support Ticket/i })).toBeVisible();

    const uniqueSummary = `Actions Taken Flow Test ${Date.now()}`;
    await page.locator("#summary").fill(uniqueSummary);
    await page.locator("#description").fill("Printer on 4th floor paper jam and network disconnect.");
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
    // Part 2: IT Staff logs in, views ticket detail, and adds an Action Taken
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

    // Verify Actions Taken section exists
    await expect(page.locator("#actions-taken-section")).toBeVisible();
    await expect(page.getByText("No actions taken recorded yet.")).toBeVisible();

    // Click "+ Add Action Taken"
    await page.locator("#btn-add-action-taken").click();
    await expect(page.getByRole("heading", { name: /Record Action Taken/i })).toBeVisible();

    // Fill Action Taken fields
    await page.locator("#input-action-description").fill("Cleared paper jam in roller tray 2 and replaced feed rollers.");
    await page.locator("#input-action-result").fill("Printer self-test passed; printed 5 test pages with zero jams.");
    await page.locator("#input-action-followup-required").check();
    await expect(page.locator("#input-action-followup-note")).toBeVisible();
    await page.locator("#input-action-followup-note").fill("Inspect roller wear during monthly preventive maintenance.");
    await page.locator("#input-action-attachment-notes").fill("jam-clear-photo.jpg");

    // Submit Action Taken
    await page.locator("#btn-save-action-taken").click();

    // Verify action appears in table
    await expect(page.locator("#actions-taken-table")).toBeVisible();
    await expect(page.getByText("Cleared paper jam in roller tray 2 and replaced feed rollers.")).toBeVisible();
    await expect(page.getByText("Printer self-test passed; printed 5 test pages with zero jams.")).toBeVisible();
    await expect(page.locator("#actions-taken-table").getByText("Sarah Johnson")).toBeVisible();
    await expect(page.locator("#actions-taken-table").getByText("Required")).toBeVisible();
    await expect(page.locator("#actions-taken-table").getByText("Inspect roller wear during monthly preventive maintenance.")).toBeVisible();
    await expect(page.locator("#actions-taken-table").getByText("📎 jam-clear-photo.jpg")).toBeVisible();

    // Sign out IT Staff
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    // =========================================================================
    // Part 3: Requester logs back in, views ticket detail, verifies read-only view
    // =========================================================================
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    const myTicketRow = page.locator("tr", { hasText: uniqueSummary });
    await expect(myTicketRow).toBeVisible();
    await myTicketRow.getByRole("button", { name: /View Detail/i }).click();

    // Verify Actions Taken section is visible to Requester
    await expect(page.locator("#actions-taken-section")).toBeVisible();
    await expect(page.locator("#actions-taken-table").getByText("Cleared paper jam in roller tray 2 and replaced feed rollers.")).toBeVisible();
    await expect(page.locator("#actions-taken-table").getByText("Printer self-test passed; printed 5 test pages with zero jams.")).toBeVisible();

    // Verify that Requester DOES NOT have Add or Edit buttons
    await expect(page.locator("#btn-add-action-taken")).not.toBeVisible();
    await expect(page.locator("#actions-taken-section").getByRole("button", { name: /Edit/i })).not.toBeVisible();
  });

  test("E2E-02: Validation failure handling, cancellation, and Action Taken edit workflow", async ({
    page,
  }) => {
    // IT Staff logs in
    await page.locator("#login-email").fill("sarah.johnson@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.getByText("🛠 IT Staff")).toBeVisible();
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

    // Open first ticket in queue
    const ticketRow = page.locator("#staff-queue-table tbody tr").first();
    await expect(ticketRow).toBeVisible();
    await ticketRow.locator("button").first().click();
    await expect(page.getByText("Official Ticket Number")).toBeVisible();

    // Open Add Action Taken form
    await page.locator("#btn-add-action-taken").click();
    await expect(page.getByRole("heading", { name: /Record Action Taken/i })).toBeVisible();

    // 1. Validation failure: empty description
    await page.locator("#btn-save-action-taken").click();
    await expect(page.locator("#action-taken-form-error")).toContainText("Action description is required.");

    // 2. Validation failure: empty result
    await page.locator("#input-action-description").fill("Inspected core switch rack 3");
    await page.locator("#btn-save-action-taken").click();
    await expect(page.locator("#action-taken-form-error")).toContainText("Action result is required.");

    // 3. Validation failure: follow-up required checked but note empty
    await page.locator("#input-action-result").fill("Found loose optical cable");
    await page.locator("#input-action-followup-required").check();
    await page.locator("#btn-save-action-taken").click();
    await expect(page.locator("#action-taken-form-error")).toContainText("Follow-up note is required");

    // 4. Cancel form
    await page.locator("#btn-cancel-action-taken").click();
    await expect(page.getByRole("heading", { name: /Record Action Taken/i })).not.toBeVisible();
    await expect(page.locator("#btn-add-action-taken")).toBeVisible();

    // 5. Create valid action
    await page.locator("#btn-add-action-taken").click();
    const uniqueDesc = `Core switch diagnostic ${Date.now()}`;
    await page.locator("#input-action-description").fill(uniqueDesc);
    await page.locator("#input-action-result").fill("Transceiver replaced and signal stable");
    await page.locator("#btn-save-action-taken").click();

    // Locate the newly created row
    const newActionRow = page.locator("tr", { hasText: uniqueDesc });
    await expect(newActionRow).toBeVisible();
    await expect(newActionRow.getByText("Transceiver replaced and signal stable")).toBeVisible();

    // 6. Edit workflow
    await newActionRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("#btn-update-action-taken")).toBeVisible();

    // 7. Update with new values
    const updatedDesc = `${uniqueDesc} [VERIFIED]`;
    await page.locator("textarea").filter({ hasText: uniqueDesc }).fill(updatedDesc);
    await page.locator("textarea").filter({ hasText: "Transceiver replaced and signal stable" }).fill("Optic dBm levels verified at -4.2 dBm");
    await page.locator("#btn-update-action-taken").click();

    // Verify row was updated in place
    const updatedRow = page.locator("tr", { hasText: updatedDesc });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.getByText("Optic dBm levels verified at -4.2 dBm")).toBeVisible();
  });
});

