import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import StaffTicketQueue from "../../src/StaffTicketQueue.js";
import * as api from "../../src/api.js";

describe("StaffTicketQueue Component (UI-03, UI-04, AC-07, AC-08, FR-15, FR-11)", () => {
  const mockOnSelectTicket = vi.fn();
  const mockCurrentUser: api.AuthUser = {
    id: 2,
    email: "sarah.johnson@kmutt.ac.th",
    displayName: "Sarah Johnson",
    role: "IT_STAFF",
    mustChangePassword: false,
  };

  const sampleTickets: api.StaffTicketItem[] = [
    {
      id: "tkt-1-uuid",
      ticketNo: "TKT-2026-00010",
      summary: "Cannot access campus VPN remotely",
      createdAt: "2026-09-15T08:30:00.000Z",
      updatedAt: "2026-09-15T09:00:00.000Z",
      category: { id: 4, name: "Network" },
      requestedPriority: "URGENT",
      itPriority: "URGENT",
      status: "New",
      owner: null,
      requester: { id: 1, displayName: "Somchai Pattana" },
      isProblemAppearsResolved: false,
    },
    {
      id: "tkt-2-uuid",
      ticketNo: "TKT-2026-00011",
      summary: "Lab printer out of toner cartridge",
      createdAt: "2026-09-15T09:00:00.000Z",
      updatedAt: "2026-09-15T10:00:00.000Z",
      category: { id: 2, name: "Hardware" },
      requestedPriority: "LOW",
      itPriority: "LOW",
      status: "InProgress",
      owner: { id: 2, displayName: "Sarah Johnson" },
      requester: { id: 5, displayName: "Jennifer Anderson" },
      isProblemAppearsResolved: false,
    },
  ];

  const sampleResponse: api.StaffTicketsResponse = {
    items: sampleTickets,
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 2,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue(sampleResponse);
  });

  describe("UI-03: IT Staff Ticket Queue table rendering (AC-07, FR-15)", () => {
    it("renders 8 justified table headers and data rows", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      const table = await screen.findByRole("table");

      // Verify table column headers
      expect(within(table).getByRole("columnheader", { name: /Ticket No/i })).toBeInTheDocument();
      expect(within(table).getByRole("columnheader", { name: /Created Date/i })).toBeInTheDocument();
      expect(within(table).getByRole("columnheader", { name: /Summary/i })).toBeInTheDocument();
      expect(within(table).getByRole("columnheader", { name: /Category/i })).toBeInTheDocument();
      expect(within(table).getByRole("columnheader", { name: /Req. Priority/i })).toBeInTheDocument();
      expect(within(table).getByRole("columnheader", { name: /IT Priority/i })).toBeInTheDocument();
      expect(within(table).getByRole("columnheader", { name: /Status/i })).toBeInTheDocument();
      expect(within(table).getByRole("columnheader", { name: /Owner/i })).toBeInTheDocument();

      // Verify ticket items rendered in table
      expect(within(table).getByRole("button", { name: "TKT-2026-00010" })).toBeInTheDocument();
      expect(within(table).getByText("Cannot access campus VPN remotely")).toBeInTheDocument();
      expect(within(table).getByText("Network")).toBeInTheDocument();

      // Verify unassigned vs assigned owner display in table
      expect(within(table).getByText("Unassigned")).toBeInTheDocument();
      expect(within(table).getByText("Sarah Johnson")).toBeInTheDocument();

      // Verify results count
      expect(screen.getByText(/Showing 1 to 2 of 2 tickets/i)).toBeInTheDocument();
    });

    it("renders non-color status and priority badges with accessible glyphs", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      const table = await screen.findByRole("table");

      // Status badges in table
      expect(within(table).getByText(/● New/i)).toBeInTheDocument();
      expect(within(table).getByText(/⚙ In Progress/i)).toBeInTheDocument();

      // Priority badges in table
      expect(within(table).getAllByText(/⚡ Urgent/i).length).toBeGreaterThanOrEqual(1);
      expect(within(table).getAllByText(/↓ Low/i).length).toBeGreaterThanOrEqual(1);
    });

    it("triggers onSelectTicket when ticket number button is clicked", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      const table = await screen.findByRole("table");
      const ticketBtn = within(table).getByRole("button", { name: "TKT-2026-00010" });
      fireEvent.click(ticketBtn);

      expect(mockOnSelectTicket).toHaveBeenCalledTimes(1);
      expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-1-uuid");
    });
  });

  describe("UI-04: Queue search, filter, and pagination reactivity (AC-08, FR-11)", () => {
    it("updates query when user enters search term", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      await screen.findByRole("table");

      const searchInput = screen.getByPlaceholderText(/Search by ticket number or summary.../i);
      fireEvent.change(searchInput, { target: { value: "VPN" } });

      await waitFor(() => {
        expect(api.fetchStaffTickets).toHaveBeenCalledWith(
          expect.objectContaining({ search: "VPN", page: 1 })
        );
      });
    });

    it("updates query when user selects category filter", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      await screen.findByRole("table");

      const categorySelect = screen.getByLabelText(/Filter by category/i);
      fireEvent.change(categorySelect, { target: { value: "4" } });

      await waitFor(() => {
        expect(api.fetchStaffTickets).toHaveBeenCalledWith(
          expect.objectContaining({ category: "4", page: 1 })
        );
      });
    });

    it("updates query when user selects status filter", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      await screen.findByRole("table");

      const statusSelect = screen.getByLabelText(/Filter by status/i);
      fireEvent.change(statusSelect, { target: { value: "InProgress" } });

      await waitFor(() => {
        expect(api.fetchStaffTickets).toHaveBeenCalledWith(
          expect.objectContaining({ status: "InProgress", page: 1 })
        );
      });
    });

    it("updates query when user selects priority filter", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      await screen.findByRole("table");

      const prioritySelect = screen.getByLabelText(/Filter by priority/i);
      fireEvent.change(prioritySelect, { target: { value: "URGENT" } });

      await waitFor(() => {
        expect(api.fetchStaffTickets).toHaveBeenCalledWith(
          expect.objectContaining({ priority: "URGENT", page: 1 })
        );
      });
    });

    it("updates query when user selects owner filter", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      await screen.findByRole("table");

      const ownerSelect = screen.getByLabelText(/Filter by owner/i);
      fireEvent.change(ownerSelect, { target: { value: "unassigned" } });

      await waitFor(() => {
        expect(api.fetchStaffTickets).toHaveBeenCalledWith(
          expect.objectContaining({ owner: "unassigned", page: 1 })
        );
      });
    });

    it("shows Clear Filters button and resets all filters when clicked", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      await screen.findByRole("table");

      const searchInput = screen.getByPlaceholderText(/Search by ticket number or summary.../i);
      fireEvent.change(searchInput, { target: { value: "printer" } });

      const clearBtn = await screen.findByRole("button", { name: /Clear Filters/i });
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(searchInput).toHaveValue("");
        expect(api.fetchStaffTickets).toHaveBeenCalledWith(
          expect.objectContaining({ search: undefined, page: 1 })
        );
      });
    });

    it("handles pagination navigation and disables boundary buttons", async () => {
      vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
        items: sampleTickets,
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 25,
          totalPages: 3,
        },
      });

      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      await screen.findByRole("table");

      const prevBtn = screen.getByRole("button", { name: /< Previous/i });
      const nextBtn = screen.getByRole("button", { name: /Next >/i });

      // On page 1, previous should be disabled
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).not.toBeDisabled();

      // Click Next
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(api.fetchStaffTickets).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it("renders friendly empty state when no tickets exist without filters (UI Spec 5)", async () => {
      vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
        },
      });

      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      expect(await screen.findByText(/No tickets in queue/i)).toBeInTheDocument();
      expect(
        screen.getByText(/There are currently no tickets submitted to the support queue\./i)
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear Filters" })).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 0 tickets/i)).toBeInTheDocument();
    });

    it("renders no-results feedback and clear filters action when search matches zero tickets (UI Spec 6)", async () => {
      vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
        },
      });

      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      const searchInput = await screen.findByPlaceholderText(/Search by ticket number or summary.../i);
      fireEvent.change(searchInput, { target: { value: "NonExistentTicketQuery" } });

      expect(await screen.findByText(/No tickets in queue/i)).toBeInTheDocument();
      expect(
        screen.getByText(/No tickets match your search filters\. Try adjusting or clearing search parameters\./i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Clear Filters" })).toBeInTheDocument();
    });

    it("renders safe failure error banner when fetchStaffTickets fails (UI Spec 10)", async () => {
      vi.spyOn(api, "fetchStaffTickets").mockRejectedValue(
        new Error("Failed to load staff ticket queue. Please try again later.")
      );

      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      const errorBanner = await screen.findByRole("alert");
      expect(errorBanner).toBeInTheDocument();
      expect(errorBanner).toHaveTextContent(/Failed to load staff ticket queue/i);
    });

    it("renders validation feedback directly below search input upon invalid characters (UI Spec 2.1 & 4.4)", async () => {
      render(
        <StaffTicketQueue
          currentUser={mockCurrentUser}
          onSelectTicket={mockOnSelectTicket}
        />
      );

      await screen.findByRole("table");

      const searchInput = screen.getByPlaceholderText(/Search by ticket number or summary.../i);
      fireEvent.change(searchInput, { target: { value: "<script>alert(1)</script>" } });

      const validationError = await screen.findByText(/Search query contains invalid characters/i);
      expect(validationError).toBeInTheDocument();
      expect(document.getElementById("queue-search-validation-error")).toBeInTheDocument();
    });
  });
});

