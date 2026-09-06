import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("API-06..10 — Attachment Upload, Download & Soft-Removal API (attachments.api.test.ts)", () => {
  let requesterA: number;
  let requesterB: number;
  let categoryId: number;
  let relatedSystemId: number;
  let ticketId: string;
  let attachmentId: string;

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
        summary: "Attachment Testing Ticket",
        description: "Testing attachment endpoints.",
      });

    expect(ticketRes.status).toBe(201);
    ticketId = ticketRes.body.id;
  });

  describe("POST /api/tickets/:id/attachments (Upload Attachment)", () => {
    it("API-10: returns 403 Forbidden when uploading attachment to another user's ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("X-Development-Requester-Id", String(requesterB))
        .attach("file", Buffer.from("dummy image content"), {
          filename: "test.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OWNERSHIP_DENIED");
    });

    it("API-06: returns 422 Unprocessable Entity when uploading disallowed file type (.exe)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("X-Development-Requester-Id", String(requesterA))
        .attach("file", Buffer.from("malicious executable content"), {
          filename: "payload.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_ATTACHMENT");
      expect(res.body.error.message).toContain("Allowed formats");
    });

    it("API-06: returns 422 Unprocessable Entity when file size exceeds 5 MB limit", async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("X-Development-Requester-Id", String(requesterA))
        .attach("file", largeBuffer, {
          filename: "huge_screenshot.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_ATTACHMENT");
      expect(res.body.error.message).toContain("exceeds the 5 MB limit");
    });

    it("returns 201 Created when uploading valid PNG file under 5 MB", async () => {
      const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("X-Development-Requester-Id", String(requesterA))
        .attach("file", pngBuffer, {
          filename: "screen_issue.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.ticketId).toBe(ticketId);
      expect(res.body.originalFilename).toBe("screen_issue.png");
      expect(res.body.mimeType).toBe("image/png");
      expect(res.body.isDeleted).toBe(false);

      attachmentId = res.body.id;
    });

    it("API-07: returns 422 Unprocessable Entity when uploading 6th attachment (exceeding limit of 5)", async () => {
      const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
      for (let i = 1; i <= 4; i++) {
        const attachRes = await request(app)
          .post(`/api/tickets/${ticketId}/attachments`)
          .set("X-Development-Requester-Id", String(requesterA))
          .attach("file", pngBuffer, {
            filename: `extra_${i}.png`,
            contentType: "image/png",
          });
        expect(attachRes.status).toBe(201);
      }

      const res = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("X-Development-Requester-Id", String(requesterA))
        .attach("file", pngBuffer, {
          filename: "overflow_6th.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("MAX_ATTACHMENTS_EXCEEDED");
      expect(res.body.error.message).toContain("Maximum 5 attachments allowed per ticket");
    });
  });

  describe("GET /api/attachments/:id/download (Download Binary)", () => {
    it("API-10: returns 403 Forbidden when downloading attachment owned by another user", async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set("X-Development-Requester-Id", String(requesterB));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OWNERSHIP_DENIED");
    });

    it("returns 200 OK with binary content for active attachment owner", async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set("X-Development-Requester-Id", String(requesterA));

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("image/png");
      expect(res.headers["content-disposition"]).toContain("screen_issue.png");
    });
  });

  describe("DELETE /api/attachments/:id (Soft-Remove)", () => {
    it("returns 422 Unprocessable Entity when deletion reason is omitted", async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("X-Development-Requester-Id", String(requesterA))
        .send({ removerId: requesterA, reason: "" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.fieldErrors[0].field).toBe("reason");
    });

    it("returns 403 Forbidden when soft-removing attachment of another user", async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("X-Development-Requester-Id", String(requesterB))
        .send({ removerId: requesterB, reason: "Unauthorized attempt" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OWNERSHIP_DENIED");
    });

    it("API-08: returns 200 OK and marks attachment soft-removed with valid reason", async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("X-Development-Requester-Id", String(requesterA))
        .send({ removerId: requesterA, reason: "Uploaded wrong screenshot by accident" });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("soft-removed successfully");
      expect(res.body.attachmentId).toBe(attachmentId);
      expect(res.body).toHaveProperty("deletedAt");
    });

    it("API-09: returns 410 Gone when attempting to download soft-removed attachment", async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set("X-Development-Requester-Id", String(requesterA));

      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe("ATTACHMENT_DELETED");
    });

    it("includes soft-removed attachment tombstone in ticket detail view", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set("X-Development-Requester-Id", String(requesterA));

      expect(res.status).toBe(200);
      const attachment = res.body.attachments.find((a: any) => a.id === attachmentId);
      expect(attachment).toBeDefined();
      expect(attachment.isDeleted).toBe(true);
      expect(attachment.deletionReason).toBe("Uploaded wrong screenshot by accident");
    });
  });
});
