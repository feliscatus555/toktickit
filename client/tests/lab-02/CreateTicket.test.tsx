import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateTicket from "../../src/CreateTicket.js";
import * as api from "../../src/api.js";

describe("CreateTicket Component", () => {
  const activeRequester = {
    id: 1,
    email: "somchai.p@kmutt.ac.th",
    displayName: "Somchai Pattana",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders form fields with required asterisks and populates select options", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
    ]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([
      { id: 1, name: "Email", description: "Campus Email" },
      { id: 2, name: "Campus Wi-Fi" },
    ]);

    render(<CreateTicket activeRequester={activeRequester} />);

    await waitFor(() => {
      expect(screen.getByText(/Create IT Support Ticket/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Account and Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Campus Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Brief summary of the issue/i)).toBeInTheDocument();
  });

  it("displays field-level validation errors when submitting empty form", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 1, name: "Email" }]);

    render(<CreateTicket activeRequester={activeRequester} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submit Ticket/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(await screen.findByText(/Summary must be between 5 and 120 characters long/i)).toBeInTheDocument();
    expect(screen.getByText(/Description must be between 10 and 2000 characters long/i)).toBeInTheDocument();
  });

  it("submits form data successfully and renders ticket creation feedback with ticketNo", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 1, name: "Email" }]);
    vi.spyOn(api, "createTicket").mockResolvedValue({
      id: "uuid-123",
      ticketNo: "TKT-2026-00001",
      summary: "Valid summary for ticket testing",
      description: "Valid description for ticket testing with enough characters",
      status: "New",
      requestedPriority: "HIGH",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      createdAt: "2026-09-04T12:00:00Z",
      updatedAt: "2026-09-04T12:00:00Z",
    });

    render(<CreateTicket activeRequester={activeRequester} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Brief summary of the issue/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Brief summary of the issue/i), {
      target: { value: "Valid summary for ticket testing" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Detailed description of the issue/i), {
      target: { value: "Valid description for ticket testing with enough characters" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/Ticket Created Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/TKT-2026-00001/i)).toBeInTheDocument();
    });
  });
});
