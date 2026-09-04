import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/related-systems", () => {
  it("returns 200 with all active related systems", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(6);

    res.body.forEach((system: { id: number; name: string; description?: string }) => {
      expect(system).toHaveProperty("id");
      expect(system).toHaveProperty("name");
    });
  });
});

describe("POST /api/tickets", () => {
  it("creates a new ticket and returns 201 Created with ticketNo TKT-YYYY-NNNNN", async () => {
    const activeRequesters = await request(app).get("/api/requesters/active");
    const categories = await request(app).get("/api/categories");
    const relatedSystems = await request(app).get("/api/related-systems");

    const requesterId = activeRequesters.body[0].id;
    const categoryId = categories.body[0].id;
    const relatedSystemId = relatedSystems.body[0].id;

    const payload = {
      requesterId,
      categoryId,
      relatedSystemId,
      requestedPriority: "HIGH",
      summary: "Laptop battery drains quickly after OS update",
      description: "The laptop battery decreases from 100% to 10% within 45 minutes of standard usage.",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketNo).toMatch(/^TKT-\d{4}-\d{5}$/);
    expect(res.body.summary).toBe(payload.summary);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.status).toBe("New");
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.requesterId).toBe(requesterId);
    expect(res.body.categoryId).toBe(categoryId);
    expect(res.body.relatedSystemId).toBe(relatedSystemId);
  });

  it("returns 422 Unprocessable Entity when summary is too short (< 5 chars)", async () => {
    const payload = {
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "MEDIUM",
      summary: "Bad",
      description: "Detailed description of the issue that is sufficiently long.",
    };

    const res = await request(app).post("/api/tickets").send(payload);

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(Array.isArray(res.body.error.fieldErrors)).toBe(true);

    const summaryError = res.body.error.fieldErrors.find(
      (fe: { field: string }) => fe.field === "summary"
    );
    expect(summaryError).toBeDefined();
  });

  it("returns 422 Unprocessable Entity when description is too short (< 10 chars)", async () => {
    const payload = {
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "MEDIUM",
      summary: "Valid ticket summary here",
      description: "Short",
    };

    const res = await request(app).post("/api/tickets").send(payload);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");

    const descError = res.body.error.fieldErrors.find(
      (fe: { field: string }) => fe.field === "description"
    );
    expect(descError).toBeDefined();
  });
});
