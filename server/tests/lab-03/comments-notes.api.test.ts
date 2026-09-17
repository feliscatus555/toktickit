import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Comments and Internal Notes API Tests (Feature-11)", () => {
  const prisma = getPrisma();

  let itStaffToken: string;
  let itStaffUser: any;
  let adminToken: string;
  let requesterToken: string;
  let requesterUser: any;
  let otherRequesterToken: string;

  let testCategory: any;
  let testSystem: any;
  let testTicket: any;

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
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.p@kmutt.ac.th", password: "Password123!" });
    requesterToken = reqRes.body.token;
    requesterUser = reqRes.body.user;

    // 4. Authenticate Ananya (Other Requester)
    const otherRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "ananya.s@kmutt.ac.th", password: "Password123!" });
    otherRequesterToken = otherRes.body.token;

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

    testTicket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-COMM-${Date.now().toString().slice(-5)}`,
        summary: "Comments and notes test ticket",
        description: "Testing public comments and internal notes workflows.",
        status: "Open",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        requesterId: requesterUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
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
  // API-14 (AC-12, FR-24): Public Comment creation and retrieval
  // -------------------------------------------------------------------------
  describe("API-14: Public Comment creation and retrieval", () => {
    let createdCommentId: string;

    it("allows ticket owner Requester to post a public comment", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ content: "The connection dropped again when transitioning to the 5GHz SSID." });

      expect(res.status).toBe(201);
      expect(res.body.ticketId).toBe(testTicket.id);
      expect(res.body.authorId).toBe(requesterUser.id);
      expect(res.body.author.displayName).toBe(requesterUser.displayName);
      expect(res.body.author.role).toBe("REQUESTER");
      expect(res.body.content).toBe("The connection dropped again when transitioning to the 5GHz SSID.");
      expect(res.body.createdAt).toBeDefined();

      createdCommentId = res.body.id;
    });

    it("allows IT Staff to post a public comment on any ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ content: "We have adjusted the AP beamforming settings. Please retry now." });

      expect(res.status).toBe(201);
      expect(res.body.authorId).toBe(itStaffUser.id);
      expect(res.body.author.role).toBe("IT_STAFF");
      expect(res.body.content).toBe("We have adjusted the AP beamforming settings. Please retry now.");
    });

    it("rejects non-owner Requester trying to post a public comment with 403", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({ content: "Trying to comment on someone else's ticket." });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OWNERSHIP_DENIED");
    });

    it("rejects empty or whitespace-only comments with 422", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ content: "   \n\t  " });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_COMMENT_CONTENT");
    });

    it("rejects comments exceeding 2000 characters with 422", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ content: "X".repeat(2001) });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_COMMENT_CONTENT");
    });

    it("retrieves public comments for owning Requester sorted by createdAt ASC", async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].id).toBe(createdCommentId);
    });

    it("retrieves public comments for IT Staff", async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/comments`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("rejects non-owner Requester trying to read comments with 403", async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/comments`)
        .set("Authorization", `Bearer ${otherRequesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OWNERSHIP_DENIED");
    });
  });

  // -------------------------------------------------------------------------
  // API-15 (AC-13, FR-25): Internal Note creation and retrieval by IT Staff / Admin
  // -------------------------------------------------------------------------
  describe("API-15: Internal Note creation and retrieval by IT Staff / Admin", () => {
    let createdNoteId: string;

    it("allows IT Staff to post an internal note", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicket.id}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ content: "Investigated RADIUS server logs. Discovered certificate hash mismatch." });

      expect(res.status).toBe(201);
      expect(res.body.ticketId).toBe(testTicket.id);
      expect(res.body.authorId).toBe(itStaffUser.id);
      expect(res.body.author.displayName).toBe(itStaffUser.displayName);
      expect(res.body.author.role).toBe("IT_STAFF");
      expect(res.body.content).toBe("Investigated RADIUS server logs. Discovered certificate hash mismatch.");

      createdNoteId = res.body.id;
    });

    it("allows Administrator to post an internal note", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicket.id}/notes`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Escalated priority to vendor support team." });

      expect(res.status).toBe(201);
      expect(res.body.author.role).toBe("ADMINISTRATOR");
    });

    it("rejects empty or whitespace-only internal notes with 422", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicket.id}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ content: "   " });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_NOTE_CONTENT");
    });

    it("rejects internal note exceeding 2000 characters with 422", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicket.id}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ content: "Z".repeat(2001) });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_NOTE_CONTENT");
    });

    it("retrieves internal notes for IT Staff sorted by createdAt ASC", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].id).toBe(createdNoteId);
    });

    it("retrieves internal notes for Administrator", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}/notes`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // API-08 (AC-04, FR-26): Requester requesting Internal Notes returns 403
  // -------------------------------------------------------------------------
  describe("API-08: Requester requesting Internal Notes returns 403 (AC-04, FR-26)", () => {
    it("returns 403 Forbidden when Requester attempts to GET internal notes", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}/notes`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      // Ensure no note content was returned in body
      expect(res.body.notes).toBeUndefined();
      expect(Array.isArray(res.body)).toBe(false);
    });

    it("returns 403 Forbidden when Requester attempts to POST an internal note", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicket.id}/notes`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ content: "Sneaky internal note from requester" });

      expect(res.status).toBe(403);
    });

    it("returns 401 Unauthorized for unauthenticated request to internal notes", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}/notes`);

      expect(res.status).toBe(401);
    });
  });
});
