import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import TicketDetail from "../../src/TicketDetail";
import * as api from "../../src/api";

const mockRequester = {
  id: 1,
  email: "somchai.p@kmutt.ac.th",
  displayName: "Somchai Pattana",
};

const mockTicketData = {
  id: "tkt-101",
  ticketNo: "TKT-2026-00001",
  summary: "Laptop battery drains rapidly after update",
  description: "Detailed description of the hardware issue.",
  status: "New",
  requestedPriority: "HIGH",
  requesterId: 1,
  version: 1,
  requester: { id: 1, displayName: "Somchai Pattana", email: "somchai.p@kmutt.ac.th" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 1, name: "Email" },
  attachments: [
    {
      id: "att-001",
      originalFilename: "battery_log.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1048576,
      isDeleted: false,
      createdAt: "2026-09-05T10:00:00.000Z",
    },
  ],
  createdAt: "2026-09-05T09:00:00.000Z",
  updatedAt: "2026-09-05T09:00:00.000Z",
};

describe("UI-08 & UI-09 Component — AttachmentSection.test.tsx", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-08: opens removal modal confirmation prompting for mandatory reason when clicking remove", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketData);

    render(<TicketDetail ticketId="tkt-101" currentRequester={mockRequester} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("battery_log.pdf")).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole("button", { name: "Remove" });
    fireEvent.click(removeBtn);

    expect(screen.getByText("Confirm Attachment Soft-Removal")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter mandatory reason for removing this attachment/i)).toBeInTheDocument();
  });

  it("UI-09: displays soft-removed tombstone with mandatory reason after soft-removal", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketData);
    vi.spyOn(api, "softRemoveAttachment").mockResolvedValue({
      message: "Attachment soft-removed successfully.",
      attachmentId: "att-001",
      deletedAt: "2026-09-05T12:00:00.000Z",
    });

    render(<TicketDetail ticketId="tkt-101" currentRequester={mockRequester} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("battery_log.pdf")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    const textarea = screen.getByPlaceholderText(/Enter mandatory reason for removing this attachment/i);
    fireEvent.change(textarea, { target: { value: "Uploaded confidential file by mistake" } });

    const confirmBtn = screen.getByRole("button", { name: "Confirm Removal" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.softRemoveAttachment).toHaveBeenCalledWith("att-001", 1, "Uploaded confidential file by mistake");
    });

    await waitFor(() => {
      expect(screen.getByText(/Soft-Removed Attachment Tombstones/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Reason: "Uploaded confidential file by mistake"/i)).toBeInTheDocument();
  });

  it("rejects invalid attachment file format (.exe) or oversized file (> 5 MB)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketData);

    const { container } = render(<TicketDetail ticketId="tkt-101" currentRequester={mockRequester} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("battery_log.pdf")).toBeInTheDocument();
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    // 1. Invalid file format .exe
    const invalidFile = new File(["exe binary"], "installer.exe", { type: "application/x-msdownload" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(await screen.findByText(/Invalid file format "installer.exe"/i)).toBeInTheDocument();

    // 2. Oversized file > 5 MB
    const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "large.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(await screen.findByText(/exceeds the maximum 5 MB size limit/i)).toBeInTheDocument();
  });

  it("disables file input and upload button when 5 active attachments limit is reached", async () => {
    const fiveAttachmentsTicket = {
      ...mockTicketData,
      attachments: Array.from({ length: 5 }, (_, i) => ({
        id: `att-${i}`,
        originalFilename: `file_${i + 1}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 1024,
        isDeleted: false,
        createdAt: "2026-09-05T10:00:00.000Z",
      })),
    };

    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(fiveAttachmentsTicket);

    const { container } = render(<TicketDetail ticketId="tkt-101" currentRequester={mockRequester} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("5 / 5 Active")).toBeInTheDocument();
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDisabled();

    const uploadBtn = screen.getByRole("button", { name: "Upload File" });
    expect(uploadBtn).toBeDisabled();
  });
});

