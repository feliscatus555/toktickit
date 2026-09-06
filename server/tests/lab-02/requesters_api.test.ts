import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters/active", () => {
  it("returns 200 with all active development requesters", async () => {
    const res = await request(app).get("/api/requesters/active");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    // Verify all returned objects have required properties
    res.body.forEach((requester: { id: number; email: string; displayName: string }) => {
      expect(requester).toHaveProperty("id");
      expect(requester).toHaveProperty("email");
      expect(requester).toHaveProperty("displayName");
    });
  });

  it("excludes inactive development requesters from the selector list", async () => {
    const res = await request(app).get("/api/requesters/active");

    expect(res.status).toBe(200);

    // Verify inactive requester is NOT in the response
    const inactiveUser = res.body.find(
      (requester: { email: string }) => requester.email === "inactive.test@kmutt.ac.th"
    );
    expect(inactiveUser).toBeUndefined();
  });

  it("returns active requesters in a predictable sorted order", async () => {
    const res = await request(app).get("/api/requesters/active");

    expect(res.status).toBe(200);
    const emails = res.body.map((r: { email: string }) => r.email);
    const sortedEmails = [...emails].sort();
    expect(emails).toEqual(sortedEmails);
  });
});
