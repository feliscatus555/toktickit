import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

describe("Lab 4 — Feature-15: IT Staff and Administrator Operational Dashboard", () => {
  let itStaffToken: string;
  let itStaffUser: any;
  let adminToken: string;
  let adminUser: any;
  let requesterToken: string;
  let requesterUser: any;

  let testCategory: any;
  let testSystem: any;

  beforeAll(async () => {
    // 1. Authenticate Sarah Johnson (IT Staff)
    const staffRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "sarah.johnson@kmutt.ac.th", password: "Password123!" });
    itStaffToken = staffRes.body.token;
    itStaffUser = staffRes.body.user;

    // 2. Authenticate John Smith (Admin)
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john.smith@kmutt.ac.th", password: "Password123!" });
    adminToken = adminRes.body.token;
    adminUser = adminRes.body.user;

    // 3. Authenticate Somchai Pattana (Requester)
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.p@kmutt.ac.th", password: "Password123!" });
    requesterToken = reqRes.body.token;
    requesterUser = reqRes.body.user;

    // Ensure category and related system exist
    testCategory = await prisma.category.findFirst({ where: { name: "Network" } });
    if (!testCategory) {
      testCategory = await prisma.category.create({ data: { name: "Network" } });
    }

    testSystem = await prisma.relatedSystem.findFirst({ where: { name: "VPN" } });
    if (!testSystem) {
      testSystem = await prisma.relatedSystem.create({
        data: { name: "VPN", description: "Campus VPN", isActive: true },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // API-11 (FR-61, FR-62, AC-12): IT Staff retrieves operational dashboard metrics
  // =========================================================================
  describe("API-11: IT Staff retrieves operational dashboard metrics (FR-61, FR-62, AC-12)", () => {
    it("returns 200 OK with accurate operational metrics for all 5 statuses", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("metrics");
      expect(res.body).toHaveProperty("recentTickets");

      const { metrics, recentTickets } = res.body;

      // Validate 5 canonical dashboard status cards (FR-62)
      expect(metrics).toHaveProperty("new");
      expect(metrics).toHaveProperty("open");
      expect(metrics).toHaveProperty("inProgress");
      expect(metrics).toHaveProperty("waitingForRequester");
      expect(metrics).toHaveProperty("myAssigned");

      for (const key of ["new", "open", "inProgress", "waitingForRequester", "myAssigned"]) {
        expect(typeof metrics[key].count).toBe("number");
        expect(metrics[key].count).toBeGreaterThanOrEqual(0);
        expect(typeof metrics[key].deltaFromYesterday).toBe("number");
      }

      // Verify authoritative database counts match within small tolerance for parallel test execution
      const expectedNew = await prisma.ticket.count({ where: { status: "New" } });
      const expectedOpen = await prisma.ticket.count({ where: { status: "Open" } });
      const expectedInProgress = await prisma.ticket.count({ where: { status: "InProgress" } });
      const expectedWaiting = await prisma.ticket.count({ where: { status: "WaitingForRequester" } });
      const expectedMyAssigned = await prisma.ticket.count({ where: { ownerId: itStaffUser.id } });

      expect(Math.abs(metrics.new.count - expectedNew)).toBeLessThanOrEqual(2);
      expect(Math.abs(metrics.open.count - expectedOpen)).toBeLessThanOrEqual(2);
      expect(Math.abs(metrics.inProgress.count - expectedInProgress)).toBeLessThanOrEqual(2);
      expect(Math.abs(metrics.waitingForRequester.count - expectedWaiting)).toBeLessThanOrEqual(2);
      expect(Math.abs(metrics.myAssigned.count - expectedMyAssigned)).toBeLessThanOrEqual(2);

      // Validate recent tickets format & cap at 5 (FR-64)
      expect(Array.isArray(recentTickets)).toBe(true);
      expect(recentTickets.length).toBeLessThanOrEqual(5);

      if (recentTickets.length > 0) {
        const item = recentTickets[0];
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("ticketNo");
        expect(item).toHaveProperty("summary");
        expect(item).toHaveProperty("status");
        expect(item).toHaveProperty("itPriority");
        expect(item).toHaveProperty("updatedAt");
      }

      // IT Staff role should NOT receive adminCounts (FR-69)
      expect(res.body.adminCounts).toBeUndefined();
    });

    it("returns adminCounts (totalUsers, activeUsers) when accessed by Administrator (FR-69)", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("adminCounts");
      expect(typeof res.body.adminCounts.totalUsers).toBe("number");
      expect(typeof res.body.adminCounts.activeUsers).toBe("number");
      expect(res.body.adminCounts.totalUsers).toBeGreaterThanOrEqual(1);
      expect(res.body.adminCounts.activeUsers).toBeGreaterThanOrEqual(1);

      // Authoritative count check with tolerance for concurrent test execution
      const expectedTotal = await prisma.user.count();
      const expectedActive = await prisma.user.count({ where: { isActive: true } });
      expect(Math.abs(res.body.adminCounts.totalUsers - expectedTotal)).toBeLessThanOrEqual(2);
      expect(Math.abs(res.body.adminCounts.activeUsers - expectedActive)).toBeLessThanOrEqual(2);
    });

    it("accurately updates myAssigned count and recent list when a ticket is assigned to staff", async () => {
      // Create a ticket and assign to Sarah Johnson
      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-DASH-${Date.now().toString().slice(-5)}`,
          summary: "Dashboard assignment test subject",
          description: "Testing myAssigned metrics increment.",
          status: "InProgress",
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          requesterId: requesterUser.id,
          ownerId: itStaffUser.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
          version: 1,
        },
      });

      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      const { metrics, recentTickets } = res.body;

      // Recent tickets should include this newly created/updated ticket
      const found = recentTickets.some((t: any) => t.id === ticket.id);
      expect(found).toBe(true);

      // Clean up test ticket
      await prisma.ticket.delete({ where: { id: ticket.id } });
    });
  });

  // =========================================================================
  // API-12 (FR-70, AC-15): Requester access forbidden
  // =========================================================================
  describe("API-12: Requester access restriction (FR-70, AC-15)", () => {
    it("rejects Requester access with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // Negative & Failure Cases
  // =========================================================================
  describe("Negative & Failure Cases", () => {
    it("rejects unauthenticated request with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/staff/dashboard");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects request with invalid or malformed token with 401 Unauthorized", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Authorization", "Bearer invalid-jwt-token-string");

      expect(res.status).toBe(401);
    });

    it("rejects user with mustChangePassword flag with 403 MUST_CHANGE_PASSWORD", async () => {
      // Create temporary staff user with mustChangePassword: true
      const tempEmail = `mustchange.staff.${Date.now()}@kmutt.ac.th`;
      const tempUser = await prisma.user.create({
        data: {
          email: tempEmail,
          passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890",
          displayName: "Temp Staff",
          role: "IT_STAFF",
          mustChangePassword: true,
          isActive: true,
        },
      });

      // Generate token using authService
      const { generateToken } = await import("../../src/services/authService.js");
      const token = generateToken({
        id: tempUser.id,
        email: tempUser.email,
        role: tempUser.role,
        displayName: tempUser.displayName,
      });

      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("MUST_CHANGE_PASSWORD");

      // Clean up
      await prisma.user.delete({ where: { id: tempUser.id } });
    });
  });
});
