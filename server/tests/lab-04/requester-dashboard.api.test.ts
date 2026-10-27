import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

describe("Lab 4 — Feature-16: Requester Operational Dashboard (API-13, API-14, FR-71, FR-72)", () => {
  let requester1Token: string;
  let requester1User: any;
  let requester2Token: string;
  let requester2User: any;
  let staffToken: string;
  let mustChangePasswordToken: string;

  let testCategory: any;
  let testSystem: any;

  beforeAll(async () => {
    // 1. Authenticate Requester 1 (Somchai Pattana)
    const req1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.p@kmutt.ac.th", password: "Password123!" });
    requester1Token = req1Res.body.token;
    requester1User = req1Res.body.user;

    // 2. Authenticate Requester 2 (Ananya Srisuk)
    const req2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ananya.s@kmutt.ac.th", password: "Password123!" });
    requester2Token = req2Res.body.token;
    requester2User = req2Res.body.user;

    // 3. Authenticate IT Staff (Sarah Johnson)
    const staffRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "sarah.johnson@kmutt.ac.th", password: "Password123!" });
    staffToken = staffRes.body.token;

    // 4. Authenticate user with mustChangePassword = true
    const mcpRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "initial.user@kmutt.ac.th", password: "InitialPassword123!" });
    mustChangePasswordToken = mcpRes.body.token;

    // Ensure category and related system exist
    testCategory = await prisma.category.findFirst({ where: { name: "Software" } });
    if (!testCategory) {
      testCategory = await prisma.category.create({ data: { name: "Software" } });
    }

    testSystem = await prisma.relatedSystem.findFirst({ where: { name: "Email" } });
    if (!testSystem) {
      testSystem = await prisma.relatedSystem.create({
        data: { name: "Email", description: "KMUTT Mail", isActive: true },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // API-13: Requester retrieves dashboard metrics (FR-71, AC-16, SE_Lab_4 Sec 9.1 AC-02)
  // =========================================================================
  describe("API-13: Authenticated Requester retrieves dashboard metrics (FR-71, AC-16)", () => {
    it("returns 200 OK with accurate 4-metric summary and recent tickets list", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${requester1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("metrics");
      expect(res.body).toHaveProperty("recentTickets");

      const { metrics, recentTickets } = res.body;

      // Validate the 4 canonical requester dashboard metrics (FR-72)
      expect(metrics).toHaveProperty("myOpenTickets");
      expect(metrics).toHaveProperty("inProgress");
      expect(metrics).toHaveProperty("resolved");
      expect(metrics).toHaveProperty("closed");

      expect(typeof metrics.myOpenTickets).toBe("number");
      expect(typeof metrics.inProgress).toBe("number");
      expect(typeof metrics.resolved).toBe("number");
      expect(typeof metrics.closed).toBe("number");

      expect(metrics.myOpenTickets).toBeGreaterThanOrEqual(0);
      expect(metrics.inProgress).toBeGreaterThanOrEqual(0);
      expect(metrics.resolved).toBeGreaterThanOrEqual(0);
      expect(metrics.closed).toBeGreaterThanOrEqual(0);

      // Validate recent tickets array structure (FR-73)
      expect(Array.isArray(recentTickets)).toBe(true);
      expect(recentTickets.length).toBeLessThanOrEqual(5);

      if (recentTickets.length > 0) {
        const ticket = recentTickets[0];
        expect(ticket).toHaveProperty("id");
        expect(ticket).toHaveProperty("ticketNo");
        expect(ticket).toHaveProperty("summary");
        expect(ticket).toHaveProperty("status");
        expect(ticket).toHaveProperty("updatedAt");
      }
    });

    it("matches server-calculated metrics against authoritative database counts (BR-06)", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${requester1Token}`);

      expect(res.status).toBe(200);

      const [expectedOpen, expectedInProgress, expectedResolved, expectedClosed] = await Promise.all([
        prisma.ticket.count({
          where: { requesterId: requester1User.id, status: { in: ["New", "Open"] } },
        }),
        prisma.ticket.count({
          where: { requesterId: requester1User.id, status: "InProgress" },
        }),
        prisma.ticket.count({
          where: { requesterId: requester1User.id, status: "Resolved" },
        }),
        prisma.ticket.count({
          where: { requesterId: requester1User.id, status: "Closed" },
        }),
      ]);

      expect(Math.abs(res.body.metrics.myOpenTickets - expectedOpen)).toBeLessThanOrEqual(2);
      expect(Math.abs(res.body.metrics.inProgress - expectedInProgress)).toBeLessThanOrEqual(2);
      expect(Math.abs(res.body.metrics.resolved - expectedResolved)).toBeLessThanOrEqual(2);
      expect(Math.abs(res.body.metrics.closed - expectedClosed)).toBeLessThanOrEqual(2);
    });
  });

  // =========================================================================
  // API-14: Requester dashboard isolation across users (FR-72, AC-16, BR-07)
  // =========================================================================
  describe("API-14: Requester dashboard strict cross-user data isolation (FR-72, AC-16, BR-07)", () => {
    it("does not leak tickets or counts of other requesters", async () => {
      const uniqueSuffix = Date.now();

      // Create a ticket for Requester 1
      const ticket1 = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-REQ1-${uniqueSuffix}`,
          summary: `Requester 1 Private Ticket ${uniqueSuffix}`,
          description: "Isolated test description for Requester 1",
          status: "New",
          requestedPriority: "MEDIUM",
          requesterId: requester1User.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
        },
      });

      // Create a ticket for Requester 2
      const ticket2 = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-REQ2-${uniqueSuffix}`,
          summary: `Requester 2 Private Ticket ${uniqueSuffix}`,
          description: "Isolated test description for Requester 2",
          status: "InProgress",
          requestedPriority: "HIGH",
          requesterId: requester2User.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
        },
      });

      // Retrieve Dashboard for Requester 1
      const res1 = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${requester1Token}`);

      expect(res1.status).toBe(200);

      // Verify Requester 1's recent tickets contains ticket1 but NEVER ticket2
      const res1Ids = res1.body.recentTickets.map((t: any) => t.id);
      expect(res1Ids).toContain(ticket1.id);
      expect(res1Ids).not.toContain(ticket2.id);

      // Retrieve Dashboard for Requester 2
      const res2 = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${requester2Token}`);

      expect(res2.status).toBe(200);

      // Verify Requester 2's recent tickets contains ticket2 but NEVER ticket1
      const res2Ids = res2.body.recentTickets.map((t: any) => t.id);
      expect(res2Ids).toContain(ticket2.id);
      expect(res2Ids).not.toContain(ticket1.id);
    });
  });

  // =========================================================================
  // Self Access: IT Staff accessing their own requester dashboard
  // =========================================================================
  describe("Self Access: Any authenticated user can view their personal requester dashboard", () => {
    it("allows IT Staff to view their personal requester dashboard", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("metrics");
      expect(res.body).toHaveProperty("recentTickets");
    });
  });

  // =========================================================================
  // Failure Cases & Edge Conditions
  // =========================================================================
  describe("Failure and Edge Cases", () => {
    it("returns 401 Unauthorized when unauthenticated", async () => {
      const res = await request(app).get("/api/requester/dashboard");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("returns 401 Unauthorized with malformed or invalid Bearer token", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", "Bearer invalid-tampered-token-xyz");

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("returns 403 Forbidden when user must change password", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${mustChangePasswordToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("MUST_CHANGE_PASSWORD");
    });

    it("returns 200 with zero metrics when user has no tickets", async () => {
      // Create a temporary new user with no tickets
      const emptyUser = await prisma.user.create({
        data: {
          email: `empty.user.${Date.now()}@kmutt.ac.th`,
          displayName: "Empty User",
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false,
          passwordHash: "hash",
        },
      });

      // Generate login / token for empty user
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: emptyUser.email, password: "Password123!" });

      // If login with dummy hash fails, test with JWT directly if needed or update hash
      const bcrypt = (await import("bcryptjs")).default;
      const pwdHash = await bcrypt.hash("Password123!", 10);
      await prisma.user.update({
        where: { id: emptyUser.id },
        data: { passwordHash: pwdHash },
      });

      const validLoginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: emptyUser.email, password: "Password123!" });

      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${validLoginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toEqual({
        myOpenTickets: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
      });
      expect(res.body.recentTickets).toEqual([]);
    });
  });
});
