import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchTicketDetail,
  uploadAttachment,
  getAttachmentDownloadUrl,
  downloadAttachmentBlob,
  softRemoveAttachment,
} from "../../src/api";

describe("Client API Service Layer — Feature 8", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchTicketDetail", () => {
    it("fetches ticket details with header", async () => {
      const mockTicket = {
        id: "tkt-123",
        ticketNo: "TKT-2026-00001",
        summary: "Test Ticket",
        description: "Test description",
        status: "New",
        requestedPriority: "HIGH",
        requesterId: 1,
        version: 1,
        requester: { id: 1, displayName: "Somchai", email: "somchai@kmutt.ac.th" },
        category: { id: 1, name: "Hardware" },
        relatedSystem: { id: 1, name: "Email" },
        attachments: [],
        createdAt: "2026-09-05T00:00:00.000Z",
        updatedAt: "2026-09-05T00:00:00.000Z",
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTicket,
      });

      const res = await fetchTicketDetail("tkt-123", 1);
      expect(res).toEqual(mockTicket);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tickets/tkt-123"),
        expect.objectContaining({
          headers: {
            "X-Development-Requester-Id": "1",
          },
        })
      );
    });

    it("throws formatted error on 403 OWNERSHIP_DENIED non-200 response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { code: "OWNERSHIP_DENIED", message: "You are not authorized to view this ticket." },
        }),
      });

      try {
        await fetchTicketDetail("tkt-123", 2);
      } catch (err: any) {
        expect(err.message).toBe("You are not authorized to view this ticket.");
        expect(err.code).toBe("OWNERSHIP_DENIED");
      }
    });

    it("throws formatted error on 404 NOT_FOUND response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { code: "NOT_FOUND", message: "Ticket not found." },
        }),
      });

      try {
        await fetchTicketDetail("non-existent-id", 1);
      } catch (err: any) {
        expect(err.message).toBe("Ticket not found.");
        expect(err.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("uploadAttachment", () => {
    it("uploads FormData file payload on success", async () => {
      const mockAttachment = {
        id: "att-1",
        ticketId: "tkt-123",
        originalFilename: "screen.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        isDeleted: false,
        createdAt: "2026-09-05T00:00:00.000Z",
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAttachment,
      });

      const file = new File(["dummy"], "screen.png", { type: "image/png" });
      const res = await uploadAttachment("tkt-123", file, 1);

      expect(res).toEqual(mockAttachment);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tickets/tkt-123/attachments"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "X-Development-Requester-Id": "1",
          },
        })
      );
    });

    it("throws INVALID_ATTACHMENT error when uploading disallowed file type or oversized file", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            code: "INVALID_ATTACHMENT",
            message: 'Invalid file format "installer.exe". Allowed formats: JPG, PNG, WEBP, PDF.',
          },
        }),
      });

      const file = new File(["exe"], "installer.exe", { type: "application/x-msdownload" });
      try {
        await uploadAttachment("tkt-123", file, 1);
      } catch (err: any) {
        expect(err.message).toContain("Allowed formats: JPG, PNG, WEBP, PDF");
        expect(err.code).toBe("INVALID_ATTACHMENT");
      }
    });

    it("throws MAX_ATTACHMENTS_EXCEEDED error when ticket active attachments limit (5) is reached", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            code: "MAX_ATTACHMENTS_EXCEEDED",
            message: "Maximum 5 attachments allowed per ticket.",
          },
        }),
      });

      const file = new File(["dummy"], "overflow.png", { type: "image/png" });
      try {
        await uploadAttachment("tkt-123", file, 1);
      } catch (err: any) {
        expect(err.message).toContain("Maximum 5 attachments allowed per ticket");
        expect(err.code).toBe("MAX_ATTACHMENTS_EXCEEDED");
      }
    });

    it("throws OWNERSHIP_DENIED error when uploading attachment as unauthorized requester", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            code: "OWNERSHIP_DENIED",
            message: "You are not authorized to upload attachments for this ticket.",
          },
        }),
      });

      const file = new File(["dummy"], "screen.png", { type: "image/png" });
      try {
        await uploadAttachment("tkt-123", file, 99);
      } catch (err: any) {
        expect(err.message).toContain("You are not authorized");
        expect(err.code).toBe("OWNERSHIP_DENIED");
      }
    });
  });

  describe("getAttachmentDownloadUrl & downloadAttachmentBlob", () => {
    it("returns correct URL with query parameter", () => {
      const url = getAttachmentDownloadUrl("att-1", 1);
      expect(url).toContain("/api/attachments/att-1/download?requesterId=1");
    });

    it("fetches blob binary on download success", async () => {
      const blob = new Blob(["test binary"], { type: "image/png" });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => blob,
      });

      const result = await downloadAttachmentBlob("att-1", 1);
      expect(result).toBeDefined();
    });

    it("throws 410 error when downloading soft-removed attachment", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 410,
        json: async () => ({
          error: {
            code: "ATTACHMENT_DELETED",
            message: "This attachment has been soft-removed and cannot be downloaded.",
          },
        }),
      });

      try {
        await downloadAttachmentBlob("att-1", 1);
      } catch (err: any) {
        expect(err.status).toBe(410);
        expect(err.message).toContain("soft-removed");
      }
    });
  });

  describe("softRemoveAttachment", () => {
    it("sends DELETE request with removerId and reason in JSON body on success", async () => {
      const mockResponse = {
        message: "Attachment soft-removed successfully.",
        attachmentId: "att-1",
        deletedAt: "2026-09-05T00:00:00.000Z",
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const res = await softRemoveAttachment("att-1", 1, "Wrong file uploaded");
      expect(res).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/attachments/att-1"),
        expect.objectContaining({
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Development-Requester-Id": "1",
          },
          body: JSON.stringify({ removerId: 1, reason: "Wrong file uploaded" }),
        })
      );
    });

    it("throws VALIDATION_FAILED error with fieldErrors array when deletion reason is omitted", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            code: "VALIDATION_FAILED",
            message: "Deletion reason is required.",
            fieldErrors: [{ field: "reason", message: "Reason is required to soft-remove an attachment." }],
          },
        }),
      });

      try {
        await softRemoveAttachment("att-1", 1, "");
      } catch (err: any) {
        expect(err.message).toBe("Deletion reason is required.");
        expect(err.code).toBe("VALIDATION_FAILED");
        expect(err.fieldErrors).toEqual([
          { field: "reason", message: "Reason is required to soft-remove an attachment." },
        ]);
      }
    });

    it("throws OWNERSHIP_DENIED error when attempting to soft-remove attachment owned by another user", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            code: "OWNERSHIP_DENIED",
            message: "You are not authorized to soft-remove this attachment.",
          },
        }),
      });

      try {
        await softRemoveAttachment("att-1", 99, "Unauthorized removal");
      } catch (err: any) {
        expect(err.message).toBe("You are not authorized to soft-remove this attachment.");
        expect(err.code).toBe("OWNERSHIP_DENIED");
      }
    });
  });
});
