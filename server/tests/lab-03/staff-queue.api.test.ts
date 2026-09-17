import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 IT Staff Ticket Queue API Tests (Feature-10)", () => {
  const prisma = getPrisma();

  let itStaffToken: string;
  let itStaffUser: any;
  let adminToken: string;
  let requesterToken: string;
  let mustChangePasswordToken: string;

  let testCategoryNetwork: any;
  let testCategoryHardware: any;
  let testSystem: any;

  let testTicketIds: string[] = [];

  beforeAll(async () => {
    // 1. Authenticate Sarah (IT Staff)
    const staffRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "sarah.johnson@kmutt.ac.th", password: "Password123!" });
    itStaffToken = staffRes.body.token;
    itStaffUser = staffRes.body.user;

    // 2. Authenticate John (Admin)
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john.smith@kmutt.ac.th", password: "Password123!" });
    adminToken = adminRes.body.token;

    // 3. Authenticate Somchai (Requester)
    const requesterRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.p@kmutt.ac.th", password: "Password123!" });
    requesterToken = requesterRes.body.token;

    // 4. Authenticate Initial Password User (mustChangePassword = true)
    // Ensure user has mustChangePassword = true
    const initialHash = await bcrypt.hash("InitialPassword123!", 10);
    await prisma.user.upsert({
      where: { email: "initial.staff@kmutt.ac.th" },
      update: {
        passwordHash: initialHash,
        mustChangePassword: true,
        isActive: true,
        role: "IT_STAFF",
      },
      create: {
        email: "initial.staff@kmutt.ac.th",
        displayName: "Initial Staff User",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
        passwordHash: initialHash,
      },
    });

    const mcpRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "initial.staff@kmutt.ac.th", password: "InitialPassword123!" });
    mustChangePasswordToken = mcpRes.body.token;

    // 5. Fetch or create Categories and Related Systems
    testCategoryNetwork = await prisma.category.upsert({
      where: { name: "Network" },
      update: {},
      create: { name: "Network" },
    });
    testCategoryHardware = await prisma.category.upsert({
      where: { name: "Hardware" },
      update: {},
      create: { name: "Hardware" },
    });
    testSystem = await prisma.relatedSystem.findFirst();
    if (!testSystem) {
      testSystem = await prisma.relatedSystem.create({
        data: { name: "Test System", description: "System for test queue", isActive: true },
      });
    }

    // 6. Get other users for assignments
    const somchai = await prisma.user.findUnique({ where: { email: "somchai.p@kmutt.ac.th" } });
    const ananya = await prisma.user.findUnique({ where: { email: "ananya.s@kmutt.ac.th" } });
    const michael = await prisma.user.findUnique({ where: { email: "michael.brown@kmutt.ac.th" } });

    // 7. Create distinct test tickets to test cross-requester, search, filters, owners
    // Ticket 1: Requester Somchai, Category Network, Status New, Priority URGENT, unassigned
    const t1 = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        summary: "SpecialAlpha VPN connection drops constantly",
        description: "Detailed description for SpecialAlpha VPN issue",
        requestedPriority: "URGENT",
        itPriority: "URGENT",
        status: "New",
        requesterId: somchai!.id,
        categoryId: testCategoryNetwork.id,
        relatedSystemId: testSystem.id,
      },
    });
    testTicketIds.push(t1.id);

    // Ticket 2: Requester Ananya, Category Hardware, Status InProgress, Priority LOW, assigned to Sarah (me)
    const t2 = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        summary: "SpecialBeta Monitor screen flickering in lab 401",
        description: "Detailed description for SpecialBeta Monitor issue",
        requestedPriority: "LOW",
        itPriority: "LOW",
        status: "InProgress",
        requesterId: ananya!.id,
        ownerId: itStaffUser.id,
        categoryId: testCategoryHardware.id,
        relatedSystemId: testSystem.id,
      },
    });
    testTicketIds.push(t2.id);

    // Ticket 3: Requester Somchai, Category Network, Status Resolved, Priority HIGH, assigned to Michael
    const t3 = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        summary: "SpecialGamma Wi-Fi authentication certificate expired",
        description: "Detailed description for SpecialGamma Wi-Fi certificate",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        status: "Resolved",
        requesterId: somchai!.id,
        ownerId: michael!.id,
        categoryId: testCategoryNetwork.id,
        relatedSystemId: testSystem.id,
      },
    });
    testTicketIds.push(t3.id);
  });

  afterAll(async () => {
    // Clean up created tickets
    if (testTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: testTicketIds } },
      });
    }
  });

  describe("API-09: IT Staff Ticket Queue retrieval (AC-07, FR-10, FR-15, FR-17, BR-02)", () => {
    it("allows IT Staff to retrieve tickets across all requesters with pagination metadata", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("items");
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
      expect(typeof res.body.pagination.totalItems).toBe("number");
      expect(typeof res.body.pagination.totalPages).toBe("number");
      expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(3);

      // Verify cross-requester presence in queue
      const requesterNames = res.body.items.map((i: any) => i.requester?.displayName);
      expect(requesterNames).toContain("Somchai Pattana");
      expect(requesterNames).toContain("Ananya Srisuk");

      // Verify 8 justified fields per ticket
      const item = res.body.items.find((i: any) => i.id === testTicketIds[0]);
      expect(item).toBeDefined();
      expect(item).toMatchObject({
        id: testTicketIds[0],
        summary: "SpecialAlpha VPN connection drops constantly",
        status: "New",
        requestedPriority: "URGENT",
        itPriority: "URGENT",
        category: {
          id: testCategoryNetwork.id,
          name: "Network",
        },
        requester: {
          displayName: "Somchai Pattana",
        },
        owner: null,
      });
      expect(item).toHaveProperty("ticketNo");
      expect(item).toHaveProperty("createdAt");
      expect(item).toHaveProperty("updatedAt");
    });

    it("allows Administrator to access the IT Staff queue (HTTP 200)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it("returns 403 Forbidden when a Requester accesses GET /api/staff/tickets (FR-17)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("returns 401 Unauthorized when unauthenticated client accesses GET /api/staff/tickets", async () => {
      const res = await request(app).get("/api/staff/tickets");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 MUST_CHANGE_PASSWORD when user has mustChangePassword = true (AC-02, BR-02)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${mustChangePasswordToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("MUST_CHANGE_PASSWORD");
    });
  });

  describe("API-10: IT Staff Queue search, filtering, and pagination (AC-08, FR-11, FR-12, FR-13, FR-14)", () => {
    it("searches tickets by summary keyword (case-insensitive)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?search=specialalpha")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].id).toBe(testTicketIds[0]);
    });

    it("searches tickets by ticket number", async () => {
      const firstTicket = await prisma.ticket.findUnique({ where: { id: testTicketIds[1] } });
      const res = await request(app)
        .get(`/api/staff/tickets?search=${firstTicket!.ticketNo}`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].id).toBe(testTicketIds[1]);
    });

    it("filters tickets by category", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?category=${testCategoryHardware.id}`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((item: any) => {
        expect(item.category.id).toBe(testCategoryHardware.id);
      });
    });

    it("filters tickets by status", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=InProgress")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((item: any) => {
        expect(item.status).toBe("InProgress");
      });
    });

    it("filters tickets by priority", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?priority=URGENT")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((item: any) => {
        expect(item.requestedPriority).toBe("URGENT");
      });
    });

    it("filters tickets by unassigned owner", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?owner=unassigned&search=SpecialAlpha")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].owner).toBeNull();
    });

    it("filters tickets by owner=me", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?owner=me&search=SpecialBeta")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].owner.id).toBe(itStaffUser.id);
    });

    it("filters tickets by specific owner ID", async () => {
      const michael = await prisma.user.findUnique({ where: { email: "michael.brown@kmutt.ac.th" } });
      const res = await request(app)
        .get(`/api/staff/tickets?owner=${michael!.id}&search=SpecialGamma`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].owner.id).toBe(michael!.id);
    });

    it("handles sorting with documented default and safe fallbacks (FR-13)", async () => {
      // Ascending sort by ticketNo
      const resAsc = await request(app)
        .get("/api/staff/tickets?sortBy=ticketNo&sortOrder=asc&limit=10")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(resAsc.status).toBe(200);
      const ticketNos = resAsc.body.items.map((i: any) => i.ticketNo);
      const sortedNos = [...ticketNos].sort();
      expect(ticketNos).toEqual(sortedNos);

      // Safe fallback on invalid sortBy parameter
      const resFallback = await request(app)
        .get("/api/staff/tickets?sortBy=invalid_injection_target;DROP TABLE;")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(resFallback.status).toBe(200);
      expect(Array.isArray(resFallback.body.items)).toBe(true);
    });

    it("enforces pagination controls and metadata (FR-14)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?page=1&limit=2")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
      });
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);

      // Cap max limit at 50
      const resCap = await request(app)
        .get("/api/staff/tickets?limit=100")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(resCap.status).toBe(200);
      expect(resCap.body.pagination.limit).toBe(50);
    });
  });
});
