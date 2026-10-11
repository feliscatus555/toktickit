import { test, expect } from "@playwright/test";

test.describe("Playwright End-to-End — Lab 04 Staff & Role Dashboards (Feature-15, E2E-03)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("E2E-03: IT Staff dashboard displays 5 operational metric cards, recent tickets, and drill-downs into filtered queues", async ({
    page,
  }) => {
    // =========================================================================
    // Part 1: IT Staff login & navigate to Dashboard
    // =========================================================================
    await page.locator("#login-email").fill("sarah.johnson@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.getByText("🛠 IT Staff")).toBeVisible();

    // Verify Dashboard navigation button is visible and click it
    const dashboardNavBtn = page.locator("#nav-dashboard");
    await expect(dashboardNavBtn).toBeVisible();
    await dashboardNavBtn.click();

    // =========================================================================
    // Part 2: Verify Dashboard layout, header, 5 metric cards, and recent list
    // =========================================================================
    await expect(page.locator("#staff-dashboard-container")).toBeVisible();
    await expect(page.locator("#staff-dashboard-welcome-msg")).toContainText("Welcome back, Sarah Johnson!");

    // Verify manual Refresh button
    const refreshBtn = page.locator("#staff-dashboard-refresh-btn");
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // Verify 5 metric cards
    const cardNew = page.locator("#metric-card-new");
    const cardOpen = page.locator("#metric-card-open");
    const cardInProgress = page.locator("#metric-card-inprogress");
    const cardWaiting = page.locator("#metric-card-waiting");
    const cardMyAssigned = page.locator("#metric-card-my-assigned");

    await expect(cardNew).toBeVisible();
    await expect(cardOpen).toBeVisible();
    await expect(cardInProgress).toBeVisible();
    await expect(cardWaiting).toBeVisible();
    await expect(cardMyAssigned).toBeVisible();

    // Verify metric counts are numeric
    const newCountText = await page.locator("#metric-count-new").innerText();
    expect(Number.parseInt(newCountText, 10)).toBeGreaterThanOrEqual(0);

    const openCountText = await page.locator("#metric-count-open").innerText();
    expect(Number.parseInt(openCountText, 10)).toBeGreaterThanOrEqual(0);

    const inProgressCountText = await page.locator("#metric-count-inprogress").innerText();
    expect(Number.parseInt(inProgressCountText, 10)).toBeGreaterThanOrEqual(0);

    const waitingCountText = await page.locator("#metric-count-waiting").innerText();
    expect(Number.parseInt(waitingCountText, 10)).toBeGreaterThanOrEqual(0);

    const myAssignedCountText = await page.locator("#metric-count-my-assigned").innerText();
    expect(Number.parseInt(myAssignedCountText, 10)).toBeGreaterThanOrEqual(0);

    // Verify Quick Actions panel
    await expect(page.locator("#qa-create-ticket")).toBeVisible();
    await expect(page.locator("#qa-search-tickets")).toBeVisible();
    await expect(page.locator("#qa-my-queue")).toBeVisible();

    // =========================================================================
    // Part 3: Metric Card Drill-Down — New Tickets
    // =========================================================================
    await cardNew.click();
    await expect(page.locator("#staff-queue-table")).toBeVisible();
    const statusSelect = page.locator("select[aria-label='Filter by status']");
    await expect(statusSelect).toHaveValue("New");

    // =========================================================================
    // Part 4: Metric Card Drill-Down — InProgress Tickets
    // =========================================================================
    await page.locator("#nav-dashboard").click();
    await expect(page.locator("#staff-dashboard-container")).toBeVisible();
    await page.locator("#metric-card-inprogress").click();
    await expect(page.locator("#staff-queue-table")).toBeVisible();
    await expect(statusSelect).toHaveValue("InProgress");

    // =========================================================================
    // Part 5: Metric Card Drill-Down — My Assigned Tickets
    // =========================================================================
    await page.locator("#nav-dashboard").click();
    await expect(page.locator("#staff-dashboard-container")).toBeVisible();
    await page.locator("#metric-card-my-assigned").click();
    await expect(page.locator("#staff-queue-table")).toBeVisible();
    const ownerSelect = page.locator("select[aria-label='Filter by owner']");
    await expect(ownerSelect).toHaveValue("me");

    // =========================================================================
    // Part 6: Quick Actions — "+ Create Ticket" and "My Queue"
    // =========================================================================
    await page.locator("#nav-dashboard").click();
    await expect(page.locator("#staff-dashboard-container")).toBeVisible();
    await page.locator("#qa-create-ticket").click();
    await expect(page.getByRole("heading", { name: /Create IT Support Ticket/i })).toBeVisible();

    await page.locator("#nav-dashboard").click();
    await expect(page.locator("#staff-dashboard-container")).toBeVisible();
    await page.locator("#qa-my-queue").click();
    await expect(page.locator("#staff-queue-table")).toBeVisible();
    await expect(ownerSelect).toHaveValue("me");

    // =========================================================================
    // Part 7: Sign Out IT Staff
    // =========================================================================
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });

  test("E2E-03b: Administrator accesses Dashboard with system user counts overview (FR-69)", async ({
    page,
  }) => {
    // Administrator login
    await page.locator("#login-email").fill("john.smith@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.locator("#user-identity-badge")).toContainText("🛡 Admin");

    // Navigate to Staff Dashboard
    await page.locator("#nav-dashboard").click();
    await expect(page.locator("#staff-dashboard-container")).toBeVisible();
    await expect(page.locator("#staff-dashboard-welcome-msg")).toContainText("Welcome back, John Smith!");

    // Verify Admin User Overview card is rendered
    const adminUserCard = page.locator("#admin-user-summary-card");
    await expect(adminUserCard).toBeVisible();
    await expect(adminUserCard).toContainText("Total Users");
    await expect(adminUserCard).toContainText("Active Users");

    // Sign out Admin
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });

  test("E2E-03c: Requester is prevented from accessing IT Staff Dashboard (FR-70, AC-15)", async ({
    page,
  }) => {
    // Requester login
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.getByText("👤 Requester")).toBeVisible();

    // Verify Staff Dashboard button is completely hidden from Requester navigation
    await expect(page.locator("#nav-dashboard")).toHaveCount(0);
    await expect(page.locator("#mobile-nav-dashboard")).toHaveCount(0);
  });
});
