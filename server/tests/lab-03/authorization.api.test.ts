import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Authorization & Anti-Tampering Integration Tests (Feature-9)", () => {
  const prisma = getPrisma();
  let requesterToken: string;
  let requesterId: number;
  let otherRequesterToken: string;
  let otherRequesterId: number;
  let itStaffToken: string;
  let categoryId: number;

  beforeAll(async () => {
    // 1. Login Somchai (Requester 1)
    const somchaiLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.p@kmutt.ac.th", password: "Password123!" });
    requesterToken = somchaiLogin.body.token;
    requesterId = somchaiLogin.body.user.id;

    // 2. Login Ananya (Requester 2)
    const ananyaLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "ananya.s@kmutt.ac.th", password: "Password123!" });
    otherRequesterToken = ananyaLogin.body.token;
    otherRequesterId = ananyaLogin.body.user.id;

    // 3. Login Sarah (IT Staff)
    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "sarah.johnson@kmutt.ac.th", password: "Password123!" });
    itStaffToken = staffLogin.body.token;

    // 4. Ensure we have a valid category and related system
    const cat = await prisma.category.findFirst();
    categoryId = cat ? cat.id : 1;
    const sys = await prisma.relatedSystem.findFirst();
    relatedSystemId = sys ? sys.id : 1;
  });

  let relatedSystemId: number;

  describe("API-06: Requester ownership anti-tampering (AC-03, FR-09, BR-03)", () => {
    it("strictly applies authenticated identity on ticket creation, ignoring client-supplied requesterId", async () => {
      // Somchai sends request with body.requesterId pointing to Ananya
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${requesterToken}`)
        .set("X-Development-Requester-Id", String(otherRequesterId))
        .send({
          requesterId: otherRequesterId, // Attempt tampering
          categoryId,
          relatedSystemId,
          requestedPriority: "MEDIUM",
          summary: "Anti-tampering test ticket",
          description: "Testing that requesterId cannot be forged via body or header",
        });

      expect(res.status).toBe(201);
      expect(res.body.requesterId).toBe(requesterId); // Must be Somchai, not Ananya
      expect(res.body.requesterId).not.toBe(otherRequesterId);

      // Verify directly in DB
      const dbTicket = await prisma.ticket.findUnique({ where: { id: res.body.id } });
      expect(dbTicket?.requesterId).toBe(requesterId);
    });

    it("restricts GET /api/tickets to authenticated user tickets, ignoring query tampering", async () => {
      // Somchai requests tickets with query requesterId pointing to Ananya
      const res = await request(app)
        .get(`/api/tickets?requesterId=${otherRequesterId}`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .set("X-Development-Requester-Id", String(otherRequesterId));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // All returned tickets must belong to Somchai
      res.body.data.forEach((item: { requesterId?: number; requester?: { id: number } }) => {
        if (item.requesterId) {
          expect(item.requesterId).toBe(requesterId);
        }
        if (item.requester) {
          expect(item.requester.id).toBe(requesterId);
        }
      });
    });

    it("denies access when a requester attempts to view another requester's ticket", async () => {
      // Create ticket owned by Ananya
      const ananyaTicketRes = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({
          categoryId,
          relatedSystemId,
          requestedPriority: "LOW",
          summary: "Ananya's private ticket",
          description: "Somchai should not be able to view this",
        });

      expect(ananyaTicketRes.status).toBe(201);
      const ticketId = ananyaTicketRes.body.id;

      // Somchai attempts to view Ananya's ticket
      const somchaiViewRes = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(somchaiViewRes.status).toBe(403);
      expect(somchaiViewRes.body.error.code).toBe("OWNERSHIP_DENIED");
    });
  });

  describe("API-07: Requester accessing IT Staff queue (AC-03, FR-17)", () => {
    it("returns 403 Forbidden when a Requester accesses GET /api/staff/tickets", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("returns 401 Unauthorized when an unauthenticated client accesses GET /api/staff/tickets", async () => {
      const res = await request(app).get("/api/staff/tickets");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("allows IT Staff to access GET /api/staff/tickets (HTTP 200)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("items");
      expect(res.body).toHaveProperty("pagination");
    });
  });
});
