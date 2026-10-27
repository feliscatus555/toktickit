import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  isValidStatusTransition,
  getPermittedNextStatuses,
  CANONICAL_STATUSES,
  DEPRECATED_STATUSES,
} from "../../src/services/statusTransition.js";

const prisma = getPrisma();

describe("Lab 4 — Feature-14: Ticket Status Workflow, Resolution Gate & Concurrency Protection", () => {
  let itStaffToken: string;
  let itStaffUser: any;
  let adminToken: string;
  let adminUser: any;
  let requesterToken: string;
  let requesterUser: any;
  let otherRequesterToken: string;
  let otherRequesterUser: any;

  let testCategory: any;
  let testSystem: any;

  beforeAll(async () => {
    // 1. Authenticate Sarah Johnson (IT Staff)
    const staffRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "sarah.johnson@kmutt.ac.th", password: "Password123!" });
    itStaffToken = staffRes.body.token;
    itStaffUser = staffRes.body.user;

    // 2. Authenticate Admin (John Smith)
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john.smith@kmutt.ac.th", password: "Password123!" });
    adminToken = adminRes.body.token;
    adminUser = adminRes.body.user;

    // 3. Authenticate Requester (Somchai)
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.p@kmutt.ac.th", password: "Password123!" });
    requesterToken = reqRes.body.token;
    requesterUser = reqRes.body.user;

    // 4. Authenticate Other Requester (Ananya)
    const otherReqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "ananya.s@kmutt.ac.th", password: "Password123!" });
    otherRequesterToken = otherReqRes.body.token;
    otherRequesterUser = otherReqRes.body.user;

    // Category and System
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // UNIT-01 (FR-52, BR-04): Status transition engine unit validation
  // =========================================================================
  describe("UNIT-01 (FR-52, BR-04): Status Transition Engine Validation", () => {
    it("defines strictly the 8 canonical statuses and recognizes deprecated statuses", () => {
      expect(CANONICAL_STATUSES).toEqual([
        "New",
        "Open",
        "InProgress",
        "WaitingForRequester",
        "Resolved",
        "Closed",
        "Reopened",
        "Cancelled",
      ]);
      expect(DEPRECATED_STATUSES).toContain("Assigned");
      expect(DEPRECATED_STATUSES).toContain("Pending");
    });

    it("permits all valid state transitions in the lifecycle", () => {
      // From New
      expect(isValidStatusTransition("New", "Open")).toBe(true);
      expect(isValidStatusTransition("New", "Cancelled")).toBe(true);

      // From Open
      expect(isValidStatusTransition("Open", "InProgress")).toBe(true);
      expect(isValidStatusTransition("Open", "WaitingForRequester")).toBe(true);
      expect(isValidStatusTransition("Open", "Resolved")).toBe(true);
      expect(isValidStatusTransition("Open", "Cancelled")).toBe(true);

      // From InProgress
      expect(isValidStatusTransition("InProgress", "WaitingForRequester")).toBe(true);
      expect(isValidStatusTransition("InProgress", "Resolved")).toBe(true);
      expect(isValidStatusTransition("InProgress", "Cancelled")).toBe(true);

      // From WaitingForRequester
      expect(isValidStatusTransition("WaitingForRequester", "InProgress")).toBe(true);
      expect(isValidStatusTransition("WaitingForRequester", "Resolved")).toBe(true);
      expect(isValidStatusTransition("WaitingForRequester", "Cancelled")).toBe(true);

      // From Resolved
      expect(isValidStatusTransition("Resolved", "Closed")).toBe(true);
      expect(isValidStatusTransition("Resolved", "Reopened")).toBe(true);

      // From Closed
      expect(isValidStatusTransition("Closed", "Reopened")).toBe(true);

      // From Reopened
      expect(isValidStatusTransition("Reopened", "InProgress")).toBe(true);
      expect(isValidStatusTransition("Reopened", "WaitingForRequester")).toBe(true);
      expect(isValidStatusTransition("Reopened", "Resolved")).toBe(true);
      expect(isValidStatusTransition("Reopened", "Cancelled")).toBe(true);
    });

    it("rejects illegal transitions, identical target status, and transitions to deprecated statuses", () => {
      // Illegal jumps from New
      expect(isValidStatusTransition("New", "Resolved")).toBe(false);
      expect(isValidStatusTransition("New", "Closed")).toBe(false);
      expect(isValidStatusTransition("New", "InProgress")).toBe(false);

      // Illegal jumps from Closed
      expect(isValidStatusTransition("Closed", "InProgress")).toBe(false);
      expect(isValidStatusTransition("Closed", "Resolved")).toBe(false);

      // Terminal Cancelled state cannot jump anywhere
      expect(isValidStatusTransition("Cancelled", "New")).toBe(false);
      expect(isValidStatusTransition("Cancelled", "Open")).toBe(false);
      expect(isValidStatusTransition("Cancelled", "InProgress")).toBe(false);
      expect(isValidStatusTransition("Cancelled", "Resolved")).toBe(false);

      // Self-transition
      expect(isValidStatusTransition("Open", "Open")).toBe(false);
      expect(isValidStatusTransition("InProgress", "InProgress")).toBe(false);

      // Target to deprecated statuses must be strictly rejected (FR-53, BR-12)
      expect(isValidStatusTransition("Open", "Assigned")).toBe(false);
      expect(isValidStatusTransition("Open", "Pending")).toBe(false);
      expect(isValidStatusTransition("InProgress", "Assigned")).toBe(false);
      expect(isValidStatusTransition("InProgress", "Pending")).toBe(false);
      expect(isValidStatusTransition("New", "Assigned")).toBe(false);
    });

    it("getPermittedNextStatuses returns only canonical permitted statuses", () => {
      expect(getPermittedNextStatuses("New")).toEqual(["Open", "Cancelled"]);
      expect(getPermittedNextStatuses("Resolved")).toEqual(["Closed", "Reopened"]);
      expect(getPermittedNextStatuses("Closed")).toEqual(["Reopened"]);
      expect(getPermittedNextStatuses("Cancelled")).toEqual([]);
    });
  });

  // =========================================================================
  // API-07 & API-08: Resolution Gate Preconditions (FR-55, FR-57, BR-08)
  // =========================================================================
  describe("API-07 & API-08: Resolution Gate Preconditions (PATCH /api/staff/tickets/:id/status)", () => {
    let unassignedTicket: any;
    let assignedTicketNoActions: any;
    let assignedTicketWithAction: any;

    beforeAll(async () => {
      // Ticket A: Open, assigned, but 0 Actions Taken
      assignedTicketNoActions = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-GATE-${Date.now().toString().slice(-5)}-1`,
          summary: "Resolution Gate Test: No Actions",
          description: "Attempting to resolve with zero actions taken.",
          status: "Open",
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          requesterId: requesterUser.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
          ownerId: itStaffUser.id,
          version: 1,
        },
      });

      // Ticket B: Open, 0 Actions Taken, unassigned (no owner)
      unassignedTicket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-GATE-${Date.now().toString().slice(-5)}-2`,
          summary: "Resolution Gate Test: No Owner",
          description: "Attempting to resolve unassigned ticket.",
          status: "Open",
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          requesterId: requesterUser.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
          ownerId: null,
          version: 1,
        },
      });

      // Ticket C: InProgress, assigned to staff, has 1 Action Taken
      assignedTicketWithAction = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-GATE-${Date.now().toString().slice(-5)}-3`,
          summary: "Resolution Gate Test: Qualified for Resolution",
          description: "Has action taken and owner.",
          status: "InProgress",
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          requesterId: requesterUser.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
          ownerId: itStaffUser.id,
          version: 1,
        },
      });

      await prisma.actionTaken.create({
        data: {
          ticketId: assignedTicketWithAction.id,
          performedById: itStaffUser.id,
          description: "Inspected hardware and replaced cable.",
          result: "Ping latency restored to < 2ms.",
          followUpRequired: false,
        },
      });
    });

    afterAll(async () => {
      await prisma.actionTaken.deleteMany({
        where: {
          ticketId: { in: [assignedTicketNoActions.id, unassignedTicket.id, assignedTicketWithAction.id] },
        },
      });
      await prisma.ticket.deleteMany({
        where: {
          id: { in: [assignedTicketNoActions.id, unassignedTicket.id, assignedTicketWithAction.id] },
        },
      });
    });

    it("API-07: rejects transition to Resolved when ticket has zero Actions Taken with 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${assignedTicketNoActions.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          status: "Resolved",
          version: assignedTicketNoActions.version,
          resolutionSummary: "Claiming to be fixed without logging any action taken.",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least one recorded Action Taken/i);

      // Verify DB status remained Open
      const dbTicket = await prisma.ticket.findUnique({ where: { id: assignedTicketNoActions.id } });
      expect(dbTicket?.status).toBe("Open");
    });

    it("rejects transition to Resolved when ticket has no assigned owner with 400 Bad Request", async () => {
      // Even if we add an Action Taken, unassigned ticket cannot be resolved (BR-08)
      await prisma.actionTaken.create({
        data: {
          ticketId: unassignedTicket.id,
          performedById: itStaffUser.id,
          description: "Checked diagnostics.",
          result: "Diagnostics passed.",
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${unassignedTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          status: "Resolved",
          version: unassignedTicket.version,
          resolutionSummary: "Fixed without an assigned owner.",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assigned ticket owner/i);
    });

    it("rejects transition to Resolved when resolutionSummary is missing or empty with 422", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${assignedTicketWithAction.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          status: "Resolved",
          version: assignedTicketWithAction.version,
          resolutionSummary: "   ",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("MISSING_RESOLUTION_SUMMARY");
    });

    it("API-08: allows transition to Resolved when >=1 Action Taken exists, owner is assigned, and summary is provided", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${assignedTicketWithAction.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          status: "Resolved",
          version: assignedTicketWithAction.version,
          resolutionSummary: "Hardware tested and cable verified working properly.",
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Resolved");
      expect(res.body.version).toBe(assignedTicketWithAction.version + 1);
      expect(res.body.resolutionSummary).toBe("Hardware tested and cable verified working properly.");

      // Verify in DB
      const dbTicket = await prisma.ticket.findUnique({ where: { id: assignedTicketWithAction.id } });
      expect(dbTicket?.status).toBe("Resolved");
      expect(dbTicket?.version).toBe(assignedTicketWithAction.version + 1);
    });

    it("rejects Requester attempt to transition ticket status with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${assignedTicketWithAction.id}/status`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({
          status: "Closed",
          version: 2,
        });

      expect(res.status).toBe(403);
    });

    it("rejects invalid status jumps (e.g. Open -> Closed directly) with 422", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${assignedTicketNoActions.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          status: "Closed",
          version: assignedTicketNoActions.version,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });
  });

  // =========================================================================
  // API-09: Requester Problem Resolved Indication (FR-56, BR-05, AC-09)
  // =========================================================================
  describe("API-09: Requester Problem Resolved Indication", () => {
    let reqTicket: any;

    beforeAll(async () => {
      reqTicket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-REQ-${Date.now().toString().slice(-5)}`,
          summary: "Requester advisory resolution test",
          description: "Requester tests problem resolved flag.",
          status: "InProgress",
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          requesterId: requesterUser.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
          isProblemAppearsResolved: false,
          ownerId: itStaffUser.id,
        },
      });
    });

    afterAll(async () => {
      await prisma.ticket.deleteMany({ where: { id: reqTicket.id } });
    });

    it("allows owning Requester to indicate problem appears resolved without altering ticket.status", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${reqTicket.id}/problem-resolved`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.isProblemAppearsResolved).toBe(true);
      expect(res.body.status).toBe("InProgress"); // Status MUST remain InProgress (advisory only)

      // Verify in DB
      const dbTicket = await prisma.ticket.findUnique({ where: { id: reqTicket.id } });
      expect(dbTicket?.isProblemAppearsResolved).toBe(true);
      expect(dbTicket?.status).toBe("InProgress");
    });

    it("rejects non-owner Requester calling problem-resolved endpoint with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${reqTicket.id}/problem-resolved`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OWNERSHIP_DENIED");
    });

    it("returns 404 for non-existent ticket ID", async () => {
      const res = await request(app)
        .patch("/api/tickets/00000000-0000-0000-0000-000000000000/problem-resolved")
        .set("Authorization", `Bearer ${requesterToken}`)
        .send();

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // API-10: Optimistic Concurrency Protection (FR-58, BR-10, AC-10)
  // =========================================================================
  describe("API-10: Optimistic Concurrency Protection (Ticket.version mismatch)", () => {
    let concTicket: any;

    beforeAll(async () => {
      concTicket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-CONC-${Date.now().toString().slice(-5)}`,
          summary: "Concurrency Collision Test",
          description: "Testing version collision detection.",
          status: "Open",
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          requesterId: requesterUser.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
          ownerId: itStaffUser.id,
          version: 5,
        },
      });
    });

    afterAll(async () => {
      await prisma.ticket.deleteMany({ where: { id: concTicket.id } });
    });

    it("rejects update when client sends stale version counter with 409 Conflict", async () => {
      // Current DB version is 5; client sends stale version 4
      const res = await request(app)
        .patch(`/api/staff/tickets/${concTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          status: "InProgress",
          version: 4, // Stale!
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/modified by another user/i);
      expect(res.body.currentVersion).toBe(5);

      // Verify DB version was not incremented and status was not changed
      const dbTicket = await prisma.ticket.findUnique({ where: { id: concTicket.id } });
      expect(dbTicket?.status).toBe("Open");
      expect(dbTicket?.version).toBe(5);
    });

    it("accepts update when client sends matching version counter and increments it", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${concTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          status: "InProgress",
          version: 5, // Matching!
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("InProgress");
      expect(res.body.version).toBe(6);

      // Subsequent update with stale version 5 now fails with 409
      const retryRes = await request(app)
        .patch(`/api/staff/tickets/${concTicket.id}/status`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          status: "WaitingForRequester",
          version: 5, // Now stale!
        });

      expect(retryRes.status).toBe(409);
      expect(retryRes.body.currentVersion).toBe(6);
    });

    it("rejects assignment update with stale version counter with 409 Conflict", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${concTicket.id}/assignment`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          ownerId: adminUser.id,
          version: 5, // Stale, current is 6!
        });

      expect(res.status).toBe(409);
      expect(res.body.currentVersion).toBe(6);
    });

    it("rejects priority update with stale version counter with 409 Conflict", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${concTicket.id}/priority`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          itPriority: "URGENT",
          version: 5, // Stale, current is 6!
        });

      expect(res.status).toBe(409);
      expect(res.body.currentVersion).toBe(6);
    });
  });
});
