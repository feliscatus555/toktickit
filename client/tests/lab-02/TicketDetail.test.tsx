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
  description: "Detailed description of the hardware issue with OS battery status indicator.",
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

describe("UI Component — TicketDetail.tsx", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state initially then displays ticket information", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketData);

    render(<TicketDetail ticketId="tkt-101" currentRequester={mockRequester} onBack={vi.fn()} />);

    expect(screen.getByText(/Loading ticket details/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    expect(screen.getByText("Laptop battery drains rapidly after update")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("IT Priority")).toBeInTheDocument();
    expect(screen.getByText("Ticket Owner")).toBeInTheDocument();
    expect(screen.getByText("Resolution Summary")).toBeInTheDocument();
    expect(screen.getByText("battery_log.pdf")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });


  it("triggers onBack callback when clicking Back button", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketData);
    const handleBack = vi.fn();

    render(<TicketDetail ticketId="tkt-101" currentRequester={mockRequester} onBack={handleBack} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    const backBtn = screen.getByRole("button", { name: /Back to My Tickets/i });
    fireEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("opens removal modal when clicking Remove button", async () => {
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

  it("performs soft-removal when valid reason is entered in modal", async () => {
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

    // Open removal modal
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    // Type reason into textarea
    const textarea = screen.getByPlaceholderText(/Enter mandatory reason for removing this attachment/i);
    fireEvent.change(textarea, { target: { value: "Uploaded wrong document version by mistake" } });

    // Click confirm removal
    const confirmBtn = screen.getByRole("button", { name: "Confirm Removal" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.softRemoveAttachment).toHaveBeenCalledWith("att-001", 1, "Uploaded wrong document version by mistake");
    });

    // Should display soft-removed tombstone
    await waitFor(() => {
      expect(screen.getByText(/Soft-Removed Attachment Tombstones/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Reason: "Uploaded wrong document version by mistake"/i)).toBeInTheDocument();
  });
});
