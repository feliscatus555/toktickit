import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/tickets (My Tickets List API)", () => {
  it("returns 400 Bad Request when requesterId is missing", async () => {
    const res = await request(app).get("/api/tickets");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("MISSING_REQUESTER_ID");
  });

  it("returns 400 Bad Request when requesterId is invalid or non-numeric", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId: "invalid_id" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("MISSING_REQUESTER_ID");
  });

  it("returns 200 OK with paginated tickets list for active requester", async () => {
    const activeRequesters = await request(app).get("/api/requesters/active");
    const categories = await request(app).get("/api/categories");
    const relatedSystems = await request(app).get("/api/related-systems");

    const requesterId = activeRequesters.body[0].id;
    const categoryId = categories.body[0].id;
    const relatedSystemId = relatedSystems.body[0].id;

    // Create a sample ticket first
    await request(app)
      .post("/api/tickets")
      .send({
        requesterId,
        categoryId,
        relatedSystemId,
        requestedPriority: "HIGH",
        summary: "Test search laptop battery issue",
        description: "Detailed description of the issue that satisfies length constraints.",
      });

    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
    });
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(1);

    const ticket = res.body.data[0];
    expect(ticket).toHaveProperty("id");
    expect(ticket).toHaveProperty("ticketNo");
    expect(ticket).toHaveProperty("summary");
    expect(ticket).toHaveProperty("status");
    expect(ticket).toHaveProperty("requestedPriority");
    expect(ticket).toHaveProperty("category");
    expect(ticket).toHaveProperty("relatedSystem");
    expect(ticket).toHaveProperty("attachmentCount");
  });

  it("supports keyword search by summary or ticketNo", async () => {
    const activeRequesters = await request(app).get("/api/requesters/active");
    const requesterId = activeRequesters.body[0].id;

    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId, search: "laptop" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    res.body.data.forEach((ticket: any) => {
      const match =
        ticket.summary.toLowerCase().includes("laptop") ||
        ticket.ticketNo.toLowerCase().includes("laptop");
      expect(match).toBe(true);
    });
  });

  it("returns 200 OK with empty data array when search query matches no records", async () => {
    const activeRequesters = await request(app).get("/api/requesters/active");
    const requesterId = activeRequesters.body[0].id;

    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId, search: "non_existent_search_query_999999" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.pagination.totalItems).toBe(0);
    expect(res.body.pagination.totalPages).toBe(1);
  });

  it("supports filtering by categoryId, status, and requestedPriority", async () => {
    const activeRequesters = await request(app).get("/api/requesters/active");
    const categories = await request(app).get("/api/categories");

    const requesterId = activeRequesters.body[0].id;
    const categoryId = categories.body[0].id;

    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId, categoryId, priority: "HIGH", status: "Pending" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    res.body.data.forEach((ticket: any) => {
      expect(ticket.category.id).toBe(categoryId);
      expect(ticket.requestedPriority).toBe("HIGH");
      expect(ticket.status).toBe("Pending");
    });
  });

  it("gracefully handles invalid or negative page and limit parameters", async () => {
    const activeRequesters = await request(app).get("/api/requesters/active");
    const requesterId = activeRequesters.body[0].id;

    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId, page: -5, limit: 999 });

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(50); // Capped at max 50
  });

  it("falls back to default sort when invalid sortBy value is provided", async () => {
    const activeRequesters = await request(app).get("/api/requesters/active");
    const requesterId = activeRequesters.body[0].id;

    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId, sortBy: "malicious_sql_field; --" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("enforces requester ownership isolation", async () => {
    const activeRequesters = await request(app).get("/api/requesters/active");
    if (activeRequesters.body.length < 2) return;

    const requesterA = activeRequesters.body[0].id;
    const requesterB = activeRequesters.body[1].id;

    const resA = await request(app).get("/api/tickets").query({ requesterId: requesterA });
    const resB = await request(app).get("/api/tickets").query({ requesterId: requesterB });

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // Verify tickets returned for B do not include requester A's tickets
    resB.body.data.forEach((ticket: any) => {
      const existsInA = resA.body.data.some((tA: any) => tA.id === ticket.id);
      expect(existsInA).toBe(false);
    });
  });
});
