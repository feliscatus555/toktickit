import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 IT Staff Ticket Operations API Tests (Feature-11)", () => {
  const prisma = getPrisma();

  let itStaffToken: string;
  let itStaffUser: any;
  let itStaff2User: any;
  let adminToken: string;
  let requesterToken: string;
  let requesterUser: any;
  let otherRequesterToken: string;
  let otherRequesterUser: any;

  let testCategory: any;
  let testSystem: any;
  let testTicket: any;

  beforeAll(async () => {
    // 1. Authenticate Sarah Johnson (IT Staff)
    const staffRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "sarah.johnson@kmutt.ac.th", password: "Password123!" });
    itStaffToken = staffRes.body.token;
    itStaffUser = staffRes.body.user;

    // Get Michael Brown (IT Staff 2)
    itStaff2User = await prisma.user.findUnique({
      where: { email: "michael.brown@kmutt.ac.th" },
    });

    // 2. Authenticate John Smith (Admin)
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john.smith@kmutt.ac.th", password: "Password123!" });
    adminToken = adminRes.body.token;

    // 3. Authenticate Somchai Pattana (Requester)
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.p@kmutt.ac.th", password: "Password123!" });
    requesterToken = reqRes.body.token;
    requesterUser = reqRes.body.user;

    // 4. Authenticate Ananya Srisuk (Other Requester)
    const otherReqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "ananya.s@kmutt.ac.th", password: "Password123!" });
    otherRequesterToken = otherReqRes.body.token;
    otherRequesterUser = otherReqRes.body.user;

    // Ensure category and system exist
    testCategory = await prisma.category.findFirst({ where: { name: "Network" } });
    if (!testCategory) {
      testCategory = await prisma.category.create({ data: { name: "Network" } });
    }

    testSystem = await prisma.relatedSystem.findFirst({ where: { name: "VPN" } });
    if (!testSystem) {
      testSystem = await prisma.relatedSystem.create({
        data: { name: "VPN", description: "Campus VPN Service", isActive: true },
      });
    }

    // Create a base unassigned test ticket
    testTicket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-TEST-${Date.now().toString().slice(-5)}`,
        summary: "Staff ticket operations test subject",
        description: "Testing claim, priority, status and comments.",
        status: "New",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        requesterId: requesterUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        ownerId: null,
      },
    });
  });

  afterAll(async () => {
    if (testTicket?.id) {
      await prisma.comment.deleteMany({ where: { ticketId: testTicket.id } });
      await prisma.internalNote.deleteMany({ where: { ticketId: testTicket.id } });
      await prisma.ticket.deleteMany({ where: { id: testTicket.id } });
    }
  });

  // -------------------------------------------------------------------------
  // FR-19: GET /api/staff/tickets/:id
  // -------------------------------------------------------------------------
  describe("FR-19: GET /api/staff/tickets/:id", () => {
    it("returns full ticket detail for authenticated IT Staff", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testTicket.id);
      expect(res.body.ticketNo).toBe(testTicket.ticketNo);
      expect(res.body.summary).toBe(testTicket.summary);
      expect(res.body.requester.id).toBe(requesterUser.id);
      expect(Array.isArray(res.body.attachments)).toBe(true);
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(Array.isArray(res.body.internalNotes)).toBe(true);
    });

    it("returns 200 for Administrator", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testTicket.id);
    });

    it("returns 403 Forbidden for Requester", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });

    it("returns 404 for non-existent ticket ID", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // API-11 (AC-09, FR-20): Ticket ownership claim and reassignment
  // -------------------------------------------------------------------------
  describe("API-11: Ticket ownership claim and reassignment (PATCH /api/staff/tickets/:id/assignment)", () => {
    it("allows IT Staff to claim an unassigned ticket", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assignment`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ ownerId: itStaffUser.id });

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBe(itStaffUser.id);
      expect(res.body.owner.displayName).toBe(itStaffUser.displayName);

      // Verify in DB
      const dbTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
      expect(dbTicket?.ownerId).toBe(itStaffUser.id);
    });

    it("allows IT Staff to reassign ticket to another active IT Staff", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assignment`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ ownerId: itStaff2User.id });

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBe(itStaff2User.id);
      expect(res.body.owner.displayName).toBe(itStaff2User.displayName);
    });

    it("allows unassigning ticket by passing ownerId: null", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assignment`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ ownerId: null });

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBeNull();
    });

    it("rejects assignment to an inactive user with 422", async () => {
      const inactiveUser = await prisma.user.findUnique({
        where: { email: "kevin.patel@kmutt.ac.th" },
      });
      expect(inactiveUser?.isActive).toBe(false);

      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assignment`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ ownerId: inactiveUser?.id });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_ASSIGNEE");
    });

    it("rejects assignment to a user with REQUESTER role with 422", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assignment`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ ownerId: requesterUser.id });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_ASSIGNEE");
    });

    it("rejects assignment to non-existent user with 422", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assignment`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ ownerId: 999999 });

      expect(res.status).toBe(422);
    });

    it("rejects Requester calling assignment endpoint with 403", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/assignment`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ ownerId: itStaffUser.id });

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // API-12 (AC-10, FR-21): IT Priority update
  // -------------------------------------------------------------------------
  describe("API-12: IT Priority update (PATCH /api/staff/tickets/:id/priority)", () => {
    it("updates IT Priority to URGENT without altering requestedPriority", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/priority`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ itPriority: "URGENT" });

      expect(res.status).toBe(200);
      expect(res.body.itPriority).toBe("URGENT");
      expect(res.body.requestedPriority).toBe("MEDIUM");

      // Verify in DB
      const dbTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
      expect(dbTicket?.itPriority).toBe("URGENT");
      expect(dbTicket?.requestedPriority).toBe("MEDIUM");
    });

    it("rejects invalid priority value with 422", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/priority`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ itPriority: "SUPER_URGENT" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_PRIORITY");
    });

    it("rejects Requester caller with 403", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/priority`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ itPriority: "LOW" });

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // API-13 (AC-11, FR-23): Ticket status transition enforcement
  // -------------------------------------------------------------------------
  describe("API-13: Ticket status transition enforcement (PATCH /api/staff/tickets/:id/status)", () => {
    it("allows valid status transition from New -> Open", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ status: "Open" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Open");
    });

    it("rejects invalid status jump (e.g. Open -> Closed directly) with 422", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ status: "Closed" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("rejects transition to Resolved without non-empty resolutionSummary with 422", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ status: "Resolved", resolutionSummary: "   " });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("MISSING_RESOLUTION_SUMMARY");
    });

    it("allows transition from Open -> InProgress", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ status: "InProgress" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("InProgress");
    });

    it("allows transition from InProgress -> Resolved with resolutionSummary", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          status: "Resolved",
          resolutionSummary: "Replaced faulty router and verified ping response.",
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Resolved");
      expect(res.body.resolutionSummary).toBe(
        "Replaced faulty router and verified ping response."
      );
    });

    it("allows transition from Resolved -> Closed", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ status: "Closed" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Closed");
    });

    it("allows transition from Closed -> Reopened", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ status: "Reopened" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Reopened");
    });

    it("rejects Requester caller with 403", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ status: "Closed" });

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // API-16 (AC-14, FR-29): Requester resolution indication
  // -------------------------------------------------------------------------
  describe("API-16: Requester resolution indication (PATCH /api/tickets/:id/resolve-indication)", () => {
    it("sets isProblemAppearsResolved = true for owning Requester without changing status", async () => {
      // Current status is Reopened
      const res = await request(app)
        .patch(`/api/tickets/${testTicket.id}/resolve-indication`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ isProblemAppearsResolved: true });

      expect(res.status).toBe(200);
      expect(res.body.isProblemAppearsResolved).toBe(true);
      expect(res.body.status).toBe("Reopened"); // Status not automatically set to Resolved/Closed

      // Verify in DB
      const dbTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
      expect(dbTicket?.isProblemAppearsResolved).toBe(true);
      expect(dbTicket?.status).toBe("Reopened");
    });

    it("supports resolution-indicator alias URL", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicket.id}/resolution-indicator`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ isProblemAppearsResolved: true });

      expect(res.status).toBe(200);
      expect(res.body.isProblemAppearsResolved).toBe(true);
    });

    it("rejects non-owner Requester with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicket.id}/resolve-indication`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({ isProblemAppearsResolved: true });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OWNERSHIP_DENIED");
    });

    it("rejects IT Staff calling requester resolve-indication endpoint with 403", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicket.id}/resolve-indication`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ isProblemAppearsResolved: true });

      expect(res.status).toBe(403);
    });
  });
});
