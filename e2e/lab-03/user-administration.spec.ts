import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.describe("Playwright End-to-End — Lab 03 Administrator User Management (Feature-12)", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure database is in fresh seeded state
    try {
      execSync("npm --prefix server run prisma:seed", { stdio: "ignore" });
    } catch (e) {
      console.error("Failed to seed database in test hook", e);
    }

    await page.goto("http://localhost:5173");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("E2E-05: Administrator user administration lifecycle (AC-15..19, AC-20)", async ({
    page,
  }) => {
    // 1. Log in as Administrator John Smith
    await page.locator("#login-email").fill("john.smith@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // 2. Verify identity and role badge
    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.locator("#user-identity-badge")).toContainText("John Smith");
    await expect(page.locator("#user-identity-badge").getByText(/Admin/i)).toBeVisible();

    // 3. Verify landing on User Management screen (AC-15)
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.locator("#user-table")).toBeVisible();
    await expect(page.locator("#create-user-btn")).toBeVisible();

    // 4. Test search and role filtering
    await page.locator("#user-search-input").fill("sarah");
    await page.locator("#search-submit-btn").click();
    await page.waitForTimeout(300);
    await expect(page.locator("#user-table")).toContainText("Sarah Johnson");
    await expect(page.locator("#user-table")).not.toContainText("Somchai Pattana");

    // Clear search
    await page.locator("#clear-filters-btn").click();
    await page.waitForTimeout(300);
    await expect(page.locator("#user-table")).toContainText("Somchai Pattana");

    // Filter by role
    await page.locator("#user-role-filter").selectOption("IT_STAFF");
    await page.waitForTimeout(300);
    await expect(page.locator("#user-table")).toContainText("Sarah Johnson");
    await expect(page.locator("#user-table")).not.toContainText("Somchai Pattana");

    // Reset filter to ALL
    await page.locator("#user-role-filter").selectOption("ALL");
    await page.waitForTimeout(300);

    // 5. Create a new user (AC-16, FR-34)
    await page.locator("#create-user-btn").click();
    await expect(page.locator("#create-user-modal")).toBeVisible();

    const testUserEmail = `alex.e2e.${Date.now()}@kmutt.ac.th`;
    const testInitialPass = "InitialPass2026!";

    await page.locator("#create-user-name").fill("Alex Thompson E2E");
    await page.locator("#create-user-email").fill(testUserEmail);
    await page.locator("#create-user-role").selectOption("IT_STAFF");
    await page.locator("#create-user-password").fill(testInitialPass);

    await page.locator("#save-user-btn").click();
    await expect(page.locator("#create-user-modal")).not.toBeVisible();

    // 6. Verify newly created user appears in table
    await expect(page.locator("#user-table")).toContainText("Alex Thompson E2E");
    await expect(page.locator("#user-table")).toContainText(testUserEmail);

    // 7. Edit user (AC-16, FR-36)
    // Find row with Alex Thompson E2E and click Edit
    const alexRow = page.locator("#user-table tbody tr", { hasText: testUserEmail });
    await alexRow.getByRole("button", { name: /Edit/i }).click();

    await expect(page.locator("#edit-user-modal")).toBeVisible();
    await page.locator("#edit-user-name").fill("Alex Thompson Updated");
    await page.locator("#save-edit-user-btn").click();
    await expect(page.locator("#edit-user-modal")).not.toBeVisible();

    await expect(page.locator("#user-table")).toContainText("Alex Thompson Updated");

    // 8. Reset initial password for user (FR-37, API-21)
    const updatedAlexRow = page.locator("#user-table tbody tr", { hasText: testUserEmail });
    await updatedAlexRow.getByRole("button", { name: /Edit/i }).click();
    await expect(page.locator("#edit-user-modal")).toBeVisible();

    await page.locator("#reset-password-btn").click();
    await expect(page.locator("#reset-password-input")).toBeVisible();

    const resetPass = "NewResetPass2026!";
    await page.locator("#reset-password-input").fill(resetPass);
    await page.locator("#confirm-reset-password-btn").click();
    await page.waitForTimeout(400);

    // Close edit modal
    await page.locator("#cancel-edit-user-btn").click();
    await expect(page.locator("#edit-user-modal")).not.toBeVisible();

    // 9. Verify self-deactivation guard (AC-17, FR-38)
    const johnRow = page.locator("#user-table tbody tr", { hasText: "john.smith@kmutt.ac.th" });
    await johnRow.getByRole("button", { name: /Edit/i }).click();
    await expect(page.locator("#edit-user-modal")).toBeVisible();

    const selfActiveToggle = page.locator("#edit-user-active");
    expect(await selfActiveToggle.isDisabled()).toBe(true);
    await expect(page.locator("#self-deactivation-warning")).toBeVisible();
    await page.locator("#cancel-edit-user-btn").click();

    // 10. Verify non-admin (Requester) access isolation (AC-19, FR-41)
    // Sign out from Admin session
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    // Log in as Requester
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Wait for login to complete
    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.locator("#user-identity-badge")).toContainText("Somchai Pattana");

    // Verify Requester does NOT see User Management nav button
    await expect(page.locator("#nav-user-management")).not.toBeVisible();
    await expect(page.locator("#mobile-nav-user-management")).not.toBeVisible();

    // Verify direct API call returns 403 Forbidden
    const forbiddenApi = await page.evaluate(async () => {
      const token = localStorage.getItem("toktickit_auth_token");
      const res = await fetch("http://localhost:3000/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.status;
    });
    expect(forbiddenApi).toBe(403);

    // 11. Test responsive layout adaptation (AC-20)
    // Sign out and re-login as Admin
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    await page.locator("#login-email").fill("john.smith@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();
    await expect(page.locator("#user-identity-badge")).toContainText("John Smith");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    // Resize viewport to mobile width (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    // Verify zero horizontal scrolling
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify mobile cards are rendered
    await expect(page.locator("#mobile-nav-user-management")).toBeVisible();
    await expect(page.locator("#mobile-user-cards").getByText(testUserEmail)).toBeVisible();
  });
});
