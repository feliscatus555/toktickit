import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 Actions Taken API Tests (Feature-13)", () => {
  const prisma = getPrisma();

  let itStaff1Token: string;
  let itStaff1User: any;
  let itStaff2Token: string;
  let itStaff2User: any;
  let adminToken: string;
  let adminUser: any;
  let requesterToken: string;
  let requesterUser: any;
  let otherRequesterToken: string;
  let otherRequesterUser: any;
  let mustChangePasswordToken: string;

  let testCategory: any;
  let testSystem: any;
  let ownedTicket: any;
  let otherTicket: any;

  beforeAll(async () => {
    // 1. Authenticate Sarah Johnson (IT Staff 1)
    const staff1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "sarah.johnson@kmutt.ac.th", password: "Password123!" });
    itStaff1Token = staff1Res.body.token;
    itStaff1User = staff1Res.body.user;

    // 2. Authenticate Michael Brown (IT Staff 2)
    const staff2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "michael.brown@kmutt.ac.th", password: "Password123!" });
    itStaff2Token = staff2Res.body.token;
    itStaff2User = staff2Res.body.user;

    // 3. Authenticate John Smith (Admin)
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john.smith@kmutt.ac.th", password: "Password123!" });
    adminToken = adminRes.body.token;
    adminUser = adminRes.body.user;

    // 4. Authenticate Somchai Pattana (Requester 1)
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.p@kmutt.ac.th", password: "Password123!" });
    requesterToken = reqRes.body.token;
    requesterUser = reqRes.body.user;

    // 5. Authenticate Ananya Srisuk (Requester 2 - Other Requester)
    const otherReqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "ananya.s@kmutt.ac.th", password: "Password123!" });
    otherRequesterToken = otherReqRes.body.token;
    otherRequesterUser = otherReqRes.body.user;

    // 6. User requiring password change
    const mustChangeRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "initial.user@kmutt.ac.th", password: "InitialPassword123!" });
    mustChangePasswordToken = mustChangeRes.body.token;

    // Setup Category & System
    testCategory = await prisma.category.findFirst({ where: { name: "Network" } });
    if (!testCategory) {
      testCategory = await prisma.category.create({ data: { name: "Network" } });
    }

    testSystem = await prisma.relatedSystem.findFirst({ where: { name: "Campus Wi-Fi" } });
    if (!testSystem) {
      testSystem = await prisma.relatedSystem.create({
        data: { name: "Campus Wi-Fi", description: "Wi-Fi", isActive: true },
      });
    }

    // Create a ticket owned by Somchai, assigned to Sarah
    ownedTicket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Date.now().toString().slice(-5)}1`,
        summary: "Wi-Fi disconnecting intermittently in Library",
        description: "Connection drops every 15 minutes.",
        status: "InProgress",
        requestedPriority: "MEDIUM",
        itPriority: "HIGH",
        requesterId: requesterUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        ownerId: itStaff1User.id,
        ownerName: itStaff1User.displayName,
      },
    });

    // Create a ticket owned by Ananya, unassigned
    otherTicket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Date.now().toString().slice(-5)}2`,
        summary: "VPN access error code 800",
        description: "Cannot connect from home network.",
        status: "Open",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        requesterId: otherRequesterUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
      },
    });
  });

  afterAll(async () => {
    if (ownedTicket?.id) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: ownedTicket.id } });
      await prisma.ticket.deleteMany({ where: { id: ownedTicket.id } });
    }
    if (otherTicket?.id) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: otherTicket.id } });
      await prisma.ticket.deleteMany({ where: { id: otherTicket.id } });
    }
  });

  // ---------------------------------------------------------------------------
  // API-03 & API-01 (AC-01, FR-43, FR-44): Creation & Performer Auto-Binding
  // ---------------------------------------------------------------------------
  describe("API-01 & API-03: Create Action Taken and Performer Auto-Binding", () => {
    it("creates a valid Action Taken with complete fields (API-03, AC-01)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          actionDateTime: "2026-10-10T08:00:00.000Z",
          description: "Inspected Cisco AP in Library 3rd floor reading zone.",
          result: "Replaced damaged patch cable; signal restored to -52 dBm.",
          followUpRequired: true,
          followUpNote: "Verify interference levels during peak student hours.",
          attachmentNotes: "ap-spectrum-scan.png",
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.ticketId).toBe(ownedTicket.id);
      expect(res.body.performedById).toBe(itStaff1User.id);
      expect(res.body.performedBy).toBeDefined();
      expect(res.body.performedBy.displayName).toBe(itStaff1User.displayName);
      expect(res.body.performedBy.role).toBe("IT_STAFF");
      expect(res.body.description).toBe("Inspected Cisco AP in Library 3rd floor reading zone.");
      expect(res.body.result).toBe("Replaced damaged patch cable; signal restored to -52 dBm.");
      expect(res.body.followUpRequired).toBe(true);
      expect(res.body.followUpNote).toBe("Verify interference levels during peak student hours.");
      expect(res.body.attachmentNotes).toBe("ap-spectrum-scan.png");
      expect(new Date(res.body.actionDateTime).toISOString()).toBe("2026-10-10T08:00:00.000Z");
    });

    it("automatically associates authenticated actor as performer without trusting client spoofing (API-01, FR-44)", async () => {
      // Client attempts to pass a spoofed performedById: 9999
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          performedById: 9999,
          description: "Checked DHCP pool utilization.",
          result: "18% addresses allocated; no exhaustion.",
          followUpRequired: false,
        });

      expect(res.status).toBe(201);
      // System MUST use authenticated itStaff1User.id, NOT 9999
      expect(res.body.performedById).toBe(itStaff1User.id);
      expect(res.body.performedBy.id).toBe(itStaff1User.id);
    });

    it("defaults actionDateTime to now when omitted", async () => {
      const beforeTime = new Date().getTime();
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          description: "Checked switch port uptime.",
          result: "Uptime 142 days, 0 link drops.",
          followUpRequired: false,
        });

      expect(res.status).toBe(201);
      const afterTime = new Date().getTime();
      const actionTime = new Date(res.body.actionDateTime).getTime();
      expect(actionTime).toBeGreaterThanOrEqual(beforeTime - 2000);
      expect(actionTime).toBeLessThanOrEqual(afterTime + 2000);
    });
  });

  // ---------------------------------------------------------------------------
  // API-02 (BR-02): Different IT Staff can record action
  // ---------------------------------------------------------------------------
  describe("API-02: Non-Owner IT Staff Contribution (BR-02)", () => {
    it("allows a different IT Staff member (Michael) to record action on Sarah's ticket", async () => {
      // ownedTicket is assigned to Sarah (itStaff1User)
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff2Token}`)
        .send({
          description: "Assisted with secondary radio frequency calibration.",
          result: "Channel width set to 40MHz on 5GHz band.",
          followUpRequired: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.ticketId).toBe(ownedTicket.id);
      expect(res.body.performedById).toBe(itStaff2User.id);
      expect(res.body.performedBy.displayName).toBe(itStaff2User.displayName);
    });

    it("allows Administrator (John Smith) to record action on any ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          description: "Administrative verification of infrastructure stability.",
          result: "Confirmed compliant with campus QoS profile.",
          followUpRequired: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.performedById).toBe(adminUser.id);
      expect(res.body.performedBy.role).toBe("ADMINISTRATOR");
    });
  });

  // ---------------------------------------------------------------------------
  // Validation Failure Cases (UNIT-02, FR-46, FR-47)
  // ---------------------------------------------------------------------------
  describe("Validation Failure Cases (UNIT-02, FR-46, FR-47)", () => {
    it("rejects creation when description is missing (400 Bad Request)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          result: "Some result",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("rejects creation when description is whitespace-only (400 Bad Request)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          description: "   \n\t  ",
          result: "Valid result",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("rejects creation when result is missing (400 Bad Request)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          description: "Valid description",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("rejects creation when result is whitespace-only (400 Bad Request)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          description: "Valid description",
          result: "    ",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("rejects creation when followUpRequired is true but followUpNote is omitted (400 Bad Request)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          description: "Replaced hardware",
          result: "System operational",
          followUpRequired: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/follow-up note/i);
    });

    it("rejects creation when followUpRequired is true but followUpNote is whitespace (400 Bad Request)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          description: "Replaced hardware",
          result: "System operational",
          followUpRequired: true,
          followUpNote: "    ",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/follow-up note/i);
    });

    it("rejects creation when actionDateTime is an invalid timestamp string (400 Bad Request)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          actionDateTime: "not-a-valid-date",
          description: "Valid description",
          result: "Valid result",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 404 when parent ticket does not exist", async () => {
      const res = await request(app)
        .post("/api/tickets/00000000-0000-0000-0000-000000000000/actions-taken")
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          description: "Valid description",
          result: "Valid result",
          followUpRequired: false,
        });

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Role & Authorization Failures (API-04, FR-50, AC-06)
  // ---------------------------------------------------------------------------
  describe("Role & Authorization Failures (API-04, FR-50, AC-06)", () => {
    it("rejects Requester attempt to create Action Taken with 403 Forbidden (API-04, AC-06)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({
          description: "I rebooted the router myself.",
          result: "Nothing changed.",
          followUpRequired: false,
        });

      expect(res.status).toBe(403);
    });

    it("rejects unauthenticated request with 401 Unauthorized", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .send({
          description: "Valid description",
          result: "Valid result",
          followUpRequired: false,
        });

      expect(res.status).toBe(401);
    });

    it("rejects request from user requiring password change with 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${mustChangePasswordToken}`)
        .send({
          description: "Valid description",
          result: "Valid result",
          followUpRequired: false,
        });

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // API-05 & API-06 (FR-49, AC-05): Actions Taken Retrieval & Ownership Isolation
  // ---------------------------------------------------------------------------
  describe("API-05 & API-06: Retrieval and Ownership Isolation", () => {
    it("allows ticket owner Requester to retrieve Actions Taken in chronological order (API-05, AC-05)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ownedTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].performedBy).toBeDefined();
      expect(res.body[0].performedBy.displayName).toBeDefined();

      // Verify stable chronological ordering
      const timestamps = res.body.map((a: any) => new Date(a.actionDateTime).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i + 1]);
      }
    });

    it("rejects Requester retrieving Actions Taken for an unowned ticket with 403 (API-06)", async () => {
      // Somchai attempts to view Ananya's ticket
      const res = await request(app)
        .get(`/api/tickets/${otherTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });

    it("allows IT Staff to retrieve Actions Taken for any ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${otherTicket.id}/actions-taken`)
        .set("Authorization", `Bearer ${itStaff1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("returns 404 when retrieving actions for a non-existent ticket", async () => {
      const res = await request(app)
        .get("/api/tickets/00000000-0000-0000-0000-000000000000/actions-taken")
        .set("Authorization", `Bearer ${itStaff1Token}`);

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Action Taken Edit / PATCH Operations (FR-48, BR-09)
  // ---------------------------------------------------------------------------
  describe("Action Taken Update / Edit Operations (PATCH)", () => {
    let testAction: any;

    beforeAll(async () => {
      testAction = await prisma.actionTaken.create({
        data: {
          ticketId: ownedTicket.id,
          performedById: itStaff1User.id,
          description: "Original description by Sarah",
          result: "Original result",
          followUpRequired: false,
        },
      });
    });

    it("allows the original author (Sarah) to update their Action Taken", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ownedTicket.id}/actions-taken/${testAction.id}`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          description: "Corrected description by Sarah",
          result: "Updated result with more details",
          followUpRequired: true,
          followUpNote: "New follow up requirement",
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testAction.id);
      expect(res.body.description).toBe("Corrected description by Sarah");
      expect(res.body.result).toBe("Updated result with more details");
      expect(res.body.followUpRequired).toBe(true);
      expect(res.body.followUpNote).toBe("New follow up requirement");
    });

    it("allows Administrator to update an Action Taken authored by another user", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ownedTicket.id}/actions-taken/${testAction.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          result: "Administrator reviewed and amended result.",
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe("Administrator reviewed and amended result.");
    });

    it("rejects another IT Staff member (Michael) attempting to edit Sarah's action with 403", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ownedTicket.id}/actions-taken/${testAction.id}`)
        .set("Authorization", `Bearer ${itStaff2Token}`)
        .send({
          result: "Michael trying to change Sarah's action",
        });

      expect(res.status).toBe(403);
    });

    it("rejects Requester attempting to edit an Action Taken with 403", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ownedTicket.id}/actions-taken/${testAction.id}`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({
          result: "Requester trying to edit",
        });

      expect(res.status).toBe(403);
    });

    it("rejects edit when followUpRequired becomes true but followUpNote is empty (400 Bad Request)", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ownedTicket.id}/actions-taken/${testAction.id}`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          followUpRequired: true,
          followUpNote: "   ",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/follow-up note/i);
    });

    it("returns 404 when updating non-existent action ID", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ownedTicket.id}/actions-taken/00000000-0000-0000-0000-000000000000`)
        .set("Authorization", `Bearer ${itStaff1Token}`)
        .send({
          description: "New description",
        });

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Ticket Detail Integration: actionsTaken Included in Ticket Detail Responses
  // ---------------------------------------------------------------------------
  describe("Ticket Detail Integration", () => {
    it("includes actionsTaken array in GET /api/staff/tickets/:id", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${ownedTicket.id}`)
        .set("Authorization", `Bearer ${itStaff1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.actionsTaken).toBeDefined();
      expect(Array.isArray(res.body.actionsTaken)).toBe(true);
      expect(res.body.actionsTaken.length).toBeGreaterThan(0);
      expect(res.body.actionsTaken[0].performedBy).toBeDefined();
    });

    it("includes actionsTaken array in GET /api/tickets/:id for ticket owner Requester", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ownedTicket.id}`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.actionsTaken).toBeDefined();
      expect(Array.isArray(res.body.actionsTaken)).toBe(true);
    });
  });
});
