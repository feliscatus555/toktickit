import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.describe("Playwright End-to-End — Lab 03 IT Staff Ticket Queue (Feature-10)", () => {
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

  test("E2E-03: IT Staff ticket queue retrieval, filtering, and responsive view (AC-07, AC-08, AC-20)", async ({
    page,
  }) => {
    // 1. Log in as IT Staff (Sarah Johnson)
    await page.locator("#login-email").fill("sarah.johnson@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // 2. Verify identity badge and role
    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.locator("#user-identity-badge").getByText("Sarah Johnson")).toBeVisible();
    await expect(page.getByText("🛠 IT Staff")).toBeVisible();

    // 3. Verify landing directly on IT Staff Ticket Queue
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();
    await expect(page.locator("#nav-ticket-queue")).toBeVisible();

    // 4. Verify 8 justified table headers on desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    const table = page.locator("#staff-queue-table");
    await expect(table).toBeVisible();

    await expect(table.getByRole("columnheader", { name: /Ticket No/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /Created Date/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /Summary/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /Category/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /Req. Priority/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /IT Priority/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /Status/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /Owner/i })).toBeVisible();

    // 5. Verify search and filter toolbar interactivity
    const searchInput = page.getByPlaceholder(/Search by ticket number or summary.../i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("VPN");

    // Results counter updates
    await expect(page.locator("#queue-results-counter")).toBeVisible();

    // Clear filters button resets search
    const clearBtn = page.locator("#queue-clear-filters-button");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue("");

    // 6. Test Responsive Layout on Mobile Viewport (< 768px, AC-20)
    await page.setViewportSize({ width: 375, height: 667 });

    // Desktop table should be hidden and mobile cards visible
    await expect(table).not.toBeVisible();
    const mobileCards = page.locator(".staff-queue-mobile");
    await expect(mobileCards).toBeVisible();

    // Check absence of horizontal scrollbar on mobile viewport
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(hasHorizontalScroll).toBe(false);

    // Verify card content and action button
    const firstCard = mobileCards.locator("[data-ticket-id]").first();
    await expect(firstCard).toBeVisible();
    const viewDetailsBtn = firstCard.getByRole("button", { name: /View Details/i });
    await expect(viewDetailsBtn).toBeVisible();

    // 7. Click View Details and verify navigation to Ticket Detail
    await viewDetailsBtn.click();
    await expect(page.getByText("Official Ticket Number")).toBeVisible();

    // Back to Queue returns to Ticket Queue
    const backBtn = page.getByRole("button", { name: /Back/i }).first();
    await backBtn.click();
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

    // 8. Sign out
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });
});
