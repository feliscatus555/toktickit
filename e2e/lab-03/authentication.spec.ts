import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.describe("Playwright End-to-End — Lab 03 Authentication Foundation (Feature-9)", () => {
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

  test("E2E-01: Full authentication and role navigation flow (AC-01, FR-01)", async ({
    page,
  }) => {
    // 1. Verify unauthenticated user sees Zen Green Login Card
    await expect(page.getByRole("heading", { name: "TokTickIT" })).toBeVisible();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();

    // 2. Attempt invalid login
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // 3. Verify safe error message is displayed
    await expect(page.locator("#login-error")).toBeVisible();
    await expect(page.locator("#login-error")).toContainText(/Invalid email.*password/i);

    // 4. Enter valid credentials for active requester Somchai
    await page.locator("#login-email").fill("somchai.p@kmutt.ac.th");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // 5. Verify transition to authenticated application shell
    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.locator("#user-identity-badge").getByText("Somchai Pattana")).toBeVisible();
    await expect(page.getByText("👤 Requester")).toBeVisible();

    // 6. Verify permitted Requester navigation options
    await expect(page.getByRole("button", { name: /My Tickets/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Ticket/i }).first()).toBeVisible();

    // 7. Verify simulated Development Requester Selector is absent
    await expect(page.getByRole("button", { name: /Change Requester/i })).not.toBeVisible();
    await expect(page.locator("#requester-select")).not.toBeVisible();

    // 8. Sign out and verify session termination (AC-06, FR-06)
    await page.locator("#profile-dropdown-trigger").click();
    const logoutBtn = page.locator("#logout-button");
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // 9. Verify redirected back to Login screen
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page.locator("#login-email")).toBeVisible();

    // 10. Direct access blocked: reload page and verify still gated at login
    await page.reload();
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#nav-my-tickets")).not.toBeVisible();
    await expect(page.locator("#user-identity-badge")).not.toBeVisible();

    // 11. Verify token and user session cleared from localStorage
    const storedToken = await page.evaluate(() => localStorage.getItem("toktickit_auth_token"));
    const storedUser = await page.evaluate(() => localStorage.getItem("toktickit_auth_user"));
    expect(storedToken).toBeNull();
    expect(storedUser).toBeNull();

    // 12. Direct API call blocked with 401 Unauthorized
    const apiRes = await page.request.get("http://localhost:3000/api/auth/me");
    expect(apiRes.status()).toBe(401);
  });

  test("E2E-02: Initial password login and mandatory change flow (AC-02, FR-03)", async ({
    page,
  }) => {
    // 1. Log in with initial password account
    await page.locator("#login-email").fill("initial.user@kmutt.ac.th");
    await page.locator("#login-password").fill("InitialPassword123!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // 2. Verify mandatory interception onto Change Your Password screen
    await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();
    await expect(page.getByText("You must change your password to continue")).toBeVisible();
    await expect(page.locator("#current-password")).toBeVisible();
    await expect(page.locator("#new-password")).toBeVisible();
    await expect(page.locator("#confirm-password")).toBeVisible();

    // 3. Normal app navigation must NOT be visible
    await expect(page.getByRole("button", { name: /My Tickets/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Create Ticket/i })).not.toBeVisible();

    // 4. Fill current password
    await page.locator("#current-password").fill("InitialPassword123!");

    // 5. Test rule checklist interactivity
    const continueBtn = page.locator("#change-password-submit-button");
    expect(await continueBtn.isDisabled()).toBe(true);

    // Enter weak password
    await page.locator("#new-password").fill("weak");
    expect(await continueBtn.isDisabled()).toBe(true);

    // Enter compliant password
    const secureNewPass = "SecureNewPassword2026!";
    await page.locator("#new-password").fill(secureNewPass);

    // Check that all rules show satisfied checkmarks
    await expect(page.locator("#rule-min-length")).toContainText("✓");
    await expect(page.locator("#rule-upper-lower")).toContainText("✓");
    await expect(page.locator("#rule-number-special")).toContainText("✓");

    // Enter mismatched confirmation
    await page.locator("#confirm-password").fill("MismatchedPassword123!");
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
    expect(await continueBtn.isDisabled()).toBe(true);

    // Enter matching confirmation
    await page.locator("#confirm-password").fill(secureNewPass);
    expect(await continueBtn.isDisabled()).toBe(false);

    // 6. Submit new password
    await continueBtn.click();

    // 7. Verify advance into normal application shell
    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.locator("#user-identity-badge").getByText("Initial Password User")).toBeVisible();
    await expect(page.getByRole("button", { name: /My Tickets/i }).first()).toBeVisible();

    // 8. Sign out and verify login with new credentials works
    await page.locator("#profile-dropdown-trigger").click();
    await page.locator("#logout-button").click();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    await page.locator("#login-email").fill("initial.user@kmutt.ac.th");
    await page.locator("#login-password").fill(secureNewPass);
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.locator("#user-identity-badge")).toBeVisible();
    await expect(page.locator("#user-identity-badge").getByText("Initial Password User")).toBeVisible();
  });
});
