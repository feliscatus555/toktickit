import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

// Mock API functions
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchTicketDetail: vi.fn(),
    fetchStaffTicketDetail: vi.fn(),
    assignTicket: vi.fn(),
    updateTicketPriority: vi.fn(),
    updateTicketStatus: vi.fn(),
    createTicketComment: vi.fn(),
    createTicketNote: vi.fn(),
    indicateProblemResolved: vi.fn(),
    fetchStaffUsers: vi.fn(),
    fetchActionsTaken: vi.fn(),
    createActionTaken: vi.fn(),
  };
});

describe("Lab 4 Ticket Workflow & Resolution Gate UI Component Tests (Feature-14)", () => {
  const mockStaffUser = {
    id: 2,
    email: "sarah.johnson@kmutt.ac.th",
    displayName: "Sarah Johnson",
    role: "IT_STAFF" as const,
    mustChangePassword: false,
  };

  const mockAssignableStaff = [
    { id: 2, displayName: "Sarah Johnson", email: "sarah.johnson@kmutt.ac.th", role: "IT_STAFF" },
    { id: 3, displayName: "Michael Brown", email: "michael.brown@kmutt.ac.th", role: "IT_STAFF" },
  ];

  const baseTicketData = {
    id: "ticket-wf-100",
    ticketNo: "TKT-2026-00100",
    summary: "Wi-Fi Access Point Failure in Hall A",
    description: "Entire hall has lost 5GHz coverage.",
    status: "InProgress",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    ownerId: 2,
    ownerName: "Sarah Johnson",
    owner: { id: 2, displayName: "Sarah Johnson", email: "sarah.johnson@kmutt.ac.th", role: "IT_STAFF" },
    resolutionSummary: null,
    isProblemAppearsResolved: false,
    requesterId: 1,
    version: 1,
    requester: { id: 1, displayName: "Somchai Pattana", email: "somchai.p@kmutt.ac.th", role: "REQUESTER" },
    category: { id: 4, name: "Network" },
    relatedSystem: { id: 2, name: "Campus Wi-Fi" },
    attachments: [],
    comments: [],
    internalNotes: [],
    actionsTaken: [
      {
        id: "act-1",
        ticketId: "ticket-wf-100",
        performedById: 2,
        actionDateTime: "2026-10-10T09:00:00.000Z",
        description: "Replaced faulty PoE injector for AP-Hall-A",
        result: "AP powered on and ping successful",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        createdAt: "2026-10-10T09:15:00.000Z",
        updatedAt: "2026-10-10T09:15:00.000Z",
        performedBy: { id: 2, displayName: "Sarah Johnson", email: "sarah.johnson@kmutt.ac.th", role: "IT_STAFF" },
      },
    ],
    createdAt: "2026-10-10T08:00:00.000Z",
    updatedAt: "2026-10-10T09:15:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchStaffUsers).mockResolvedValue(mockAssignableStaff);
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue({ ...baseTicketData });
    vi.mocked(api.fetchActionsTaken).mockResolvedValue([...baseTicketData.actionsTaken]);
  });

  // ---------------------------------------------------------------------------
  // UI-04 (FR-59, AC-11): Dynamic Status Dropdown Permitted States
  // ---------------------------------------------------------------------------
  describe("UI-04: Dynamic Status Dropdown Permitted States", () => {
    it("renders strictly permitted transitions for 'New' status (Open, Cancelled) and omits deprecated states", async () => {
      vi.mocked(api.fetchStaffTicketDetail).mockResolvedValueOnce({
        ...baseTicketData,
        status: "New",
        actionsTaken: [],
      });
      vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);

      render(
        <TicketDetail
          ticketId="ticket-wf-100"
          currentRequester={mockStaffUser}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/current status:/i) as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.value);

      // Must allow Open and Cancelled
      expect(options).toContain("Open");
      expect(options).toContain("Cancelled");

      // Must NOT allow direct jump to Resolved or InProgress from New
      expect(options).not.toContain("Resolved");
      expect(options).not.toContain("InProgress");

      // Must never contain deprecated statuses Assigned or Pending (FR-53, BR-12)
      expect(options).not.toContain("Assigned");
      expect(options).not.toContain("Pending");
    });

    it("renders strictly permitted transitions for 'InProgress' status (WaitingForRequester, Resolved, Cancelled)", async () => {
      render(
        <TicketDetail
          ticketId="ticket-wf-100"
          currentRequester={mockStaffUser}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/current status:/i) as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.value);

      expect(options).toContain("WaitingForRequester");
      expect(options).toContain("Resolved");
      expect(options).toContain("Cancelled");

      // Must NOT allow backwards jump to New or Open
      expect(options).not.toContain("New");
      expect(options).not.toContain("Open");
      expect(options).not.toContain("Assigned");
      expect(options).not.toContain("Pending");
    });

    it("disables dropdown on terminal state 'Cancelled' with terminal indicator", async () => {
      vi.mocked(api.fetchStaffTicketDetail).mockResolvedValueOnce({
        ...baseTicketData,
        status: "Cancelled",
        actionsTaken: [],
      });
      vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);

      render(
        <TicketDetail
          ticketId="ticket-wf-100"
          currentRequester={mockStaffUser}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/current status:/i) as HTMLSelectElement;
      expect(select).toBeDisabled();
      expect(select.textContent).toMatch(/terminal state/i);
    });
  });

  // ---------------------------------------------------------------------------
  // UI-05 (FR-60, AC-08): Immediate Status Summary Update without Full Reload
  // ---------------------------------------------------------------------------
  describe("UI-05: Immediate Status Summary Update without Full Reload", () => {
    it("updates status badge and options immediately upon non-Resolved status selection", async () => {
      vi.mocked(api.updateTicketStatus).mockResolvedValueOnce({
        id: "ticket-wf-100",
        status: "WaitingForRequester",
        version: 2,
        updatedAt: "2026-10-10T09:30:00.000Z",
      });

      render(
        <TicketDetail
          ticketId="ticket-wf-100"
          currentRequester={mockStaffUser}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/current status:/i);
      fireEvent.change(select, { target: { value: "WaitingForRequester" } });

      await waitFor(() => {
        expect(api.updateTicketStatus).toHaveBeenCalledWith("ticket-wf-100", "WaitingForRequester");
      });

      // Status badge at top of detail should update without full reload
      await waitFor(() => {
        expect(screen.getByText(/●\s*waiting for requester/i)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Resolution Gate UI (FR-55, FR-57, BR-08, AC-07, AC-08)
  // ---------------------------------------------------------------------------
  describe("Resolution Gate UI & Validation", () => {
    it("displays resolution gate warning banner and disables Confirm Resolve button when ticket has 0 Actions Taken", async () => {
      vi.mocked(api.fetchStaffTicketDetail).mockResolvedValueOnce({
        ...baseTicketData,
        actionsTaken: [],
      });
      vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);

      render(
        <TicketDetail
          ticketId="ticket-wf-100"
          currentRequester={mockStaffUser}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/current status:/i);
      fireEvent.change(select, { target: { value: "Resolved" } });

      // Warning banner must be visible
      await waitFor(() => {
        const warning = document.getElementById("resolution-gate-warning");
        expect(warning).toBeInTheDocument();
        expect(warning?.textContent).toMatch(/resolution requires at least one recorded action taken/i);
      });

      // Confirm Resolve button must be disabled
      const confirmBtn = screen.getByRole("button", { name: /confirm resolve/i });
      expect(confirmBtn).toBeDisabled();
    });

    it("displays owner warning banner when ticket is unassigned", async () => {
      vi.mocked(api.fetchStaffTicketDetail).mockResolvedValueOnce({
        ...baseTicketData,
        ownerId: null,
        owner: null,
        ownerName: null,
      });

      render(
        <TicketDetail
          ticketId="ticket-wf-100"
          currentRequester={mockStaffUser}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/current status:/i);
      fireEvent.change(select, { target: { value: "Resolved" } });

      await waitFor(() => {
        const ownerWarning = document.getElementById("resolution-owner-warning");
        expect(ownerWarning).toBeInTheDocument();
        expect(ownerWarning?.textContent).toMatch(/requires an assigned ticket owner/i);
      });
    });

    it("enables Confirm Resolve button and resolves ticket when conditions are satisfied", async () => {
      vi.mocked(api.updateTicketStatus).mockResolvedValueOnce({
        id: "ticket-wf-100",
        status: "Resolved",
        version: 2,
        resolutionSummary: "Replaced faulty PoE injector and verified network connectivity.",
        updatedAt: "2026-10-10T09:45:00.000Z",
      });

      render(
        <TicketDetail
          ticketId="ticket-wf-100"
          currentRequester={mockStaffUser}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/current status:/i);
      fireEvent.change(select, { target: { value: "Resolved" } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/describe resolution steps taken/i)).toBeInTheDocument();
      });

      // Warning banner must NOT be present
      expect(document.getElementById("resolution-gate-warning")).not.toBeInTheDocument();

      const textarea = screen.getByPlaceholderText(/describe resolution steps taken/i);
      fireEvent.change(textarea, {
        target: { value: "Replaced faulty PoE injector and verified network connectivity." },
      });

      const confirmBtn = screen.getByRole("button", { name: /confirm resolve/i });
      expect(confirmBtn).not.toBeDisabled();
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(api.updateTicketStatus).toHaveBeenCalledWith(
          "ticket-wf-100",
          "Resolved",
          "Replaced faulty PoE injector and verified network connectivity.",
          1
        );
      });

      // Status badge updates to Resolved
      await waitFor(() => {
        expect(screen.getByText(/●\s*Resolved/i)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // UI-09 (FR-78, AC-18): Button Double-Click Debounce Safeguard
  // ---------------------------------------------------------------------------
  describe("UI-09: Double-Click Debounce Safeguard", () => {
    it("debounces rapid double-click on confirm resolve button to dispatch exactly one API request", async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(api.updateTicketStatus).mockReturnValue(pendingPromise as any);

      render(
        <TicketDetail
          ticketId="ticket-wf-100"
          currentRequester={mockStaffUser}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/current status:/i);
      fireEvent.change(select, { target: { value: "Resolved" } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/describe resolution steps taken/i)).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/describe resolution steps taken/i);
      fireEvent.change(textarea, { target: { value: "Completed resolution steps." } });

      const confirmBtn = screen.getByRole("button", { name: /confirm resolve/i });

      // Click rapidly twice
      fireEvent.click(confirmBtn);
      fireEvent.click(confirmBtn);

      // Verify only 1 API call was made
      expect(api.updateTicketStatus).toHaveBeenCalledTimes(1);

      // Resolve the pending promise to clean up
      await act(async () => {
        resolvePromise!({
          id: "ticket-wf-100",
          status: "Resolved",
          version: 2,
          resolutionSummary: "Completed resolution steps.",
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Optimistic Concurrency Collision UI (FR-58, BR-10, AC-10)
  // ---------------------------------------------------------------------------
  describe("Optimistic Concurrency Collision UI (409 Conflict)", () => {
    it("displays concurrency collision banner on 409 and reloads ticket data while preserving draft summary", async () => {
      const conflictError: any = new Error(
        "Ticket has been modified by another user. Please refresh and retry."
      );
      conflictError.status = 409;
      vi.mocked(api.updateTicketStatus).mockRejectedValueOnce(conflictError);

      render(
        <TicketDetail
          ticketId="ticket-wf-100"
          currentRequester={mockStaffUser}
          onBack={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/current status:/i);
      fireEvent.change(select, { target: { value: "Resolved" } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/describe resolution steps taken/i)).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(
        /describe resolution steps taken/i
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "My unsaved resolution draft note." } });

      const confirmBtn = screen.getByRole("button", { name: /confirm resolve/i });
      fireEvent.click(confirmBtn);

      // Expect concurrency banner to be rendered
      await waitFor(() => {
        const banner = document.getElementById("concurrency-conflict-banner");
        expect(banner).toBeInTheDocument();
        expect(banner?.textContent).toMatch(/another user modified this ticket/i);
      });

      // Draft summary must still be retained
      expect(textarea.value).toBe("My unsaved resolution draft note.");

      // Setup fresh ticket for reload
      vi.mocked(api.fetchStaffTicketDetail).mockResolvedValueOnce({
        ...baseTicketData,
        version: 2,
        updatedAt: "2026-10-10T10:00:00.000Z",
      });

      // Click reload ticket data button
      const reloadBtn = document.getElementById("btn-reload-ticket-concurrency");
      expect(reloadBtn).toBeInTheDocument();
      fireEvent.click(reloadBtn!);

      await waitFor(() => {
        expect(api.fetchStaffTicketDetail).toHaveBeenCalledWith("ticket-wf-100");
      });

      // Banner clears after reload and draft is preserved
      await waitFor(() => {
        expect(document.getElementById("concurrency-conflict-banner")).not.toBeInTheDocument();
      });
      expect(textarea.value).toBe("My unsaved resolution draft note.");
    });
  });
});
