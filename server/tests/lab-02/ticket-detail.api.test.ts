import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("API-04 — GET /api/tickets/:id (Ticket Detail API)", () => {
  let requesterA: number;
  let requesterB: number;
  let categoryId: number;
  let relatedSystemId: number;
  let ticketId: string;

  it("setup test dependencies (requesters, categories, related systems, ticket)", async () => {
    const requestersRes = await request(app).get("/api/requesters/active");
    expect(requestersRes.status).toBe(200);
    expect(requestersRes.body.length).toBeGreaterThanOrEqual(2);
    requesterA = requestersRes.body[0].id;
    requesterB = requestersRes.body[1].id;

    const categoriesRes = await request(app).get("/api/categories");
    categoryId = categoriesRes.body[0].id;

    const systemsRes = await request(app).get("/api/related-systems");
    relatedSystemId = systemsRes.body[0].id;

    // Create a ticket for Requester A
    const ticketRes = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterA))
      .send({
        requesterId: requesterA,
        categoryId,
        relatedSystemId,
        requestedPriority: "HIGH",
        summary: "Laptop screen flickering after system update",
        description: "Screen blinks violently every few seconds when starting demanding applications.",
      });

    expect(ticketRes.status).toBe(201);
    expect(ticketRes.body).toHaveProperty("id");
    ticketId = ticketRes.body.id;
  });

  it("returns 400 Bad Request when requester identity header is missing", async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_REQUESTER_ID");
  });

  it("returns 404 Not Found for non-existent ticket ID", async () => {
    const res = await request(app)
      .get("/api/tickets/00000000-0000-0000-0000-000000000000")
      .set("X-Development-Requester-Id", String(requesterA));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("API-04: returns 403 Forbidden when requesting ticket owned by another requester", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Development-Requester-Id", String(requesterB));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("OWNERSHIP_DENIED");
  });

  it("returns 200 OK with full ticket details and attachments array for ticket owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Development-Requester-Id", String(requesterA));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticketId);
    expect(res.body.summary).toBe("Laptop screen flickering after system update");
    expect(res.body).toHaveProperty("description");
    expect(res.body).toHaveProperty("requester");
    expect(res.body).toHaveProperty("category");
    expect(res.body).toHaveProperty("relatedSystem");
    expect(res.body).toHaveProperty("attachments");
    expect(Array.isArray(res.body.attachments)).toBe(true);
  });
});
