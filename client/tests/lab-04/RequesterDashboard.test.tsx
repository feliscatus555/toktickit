import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RequesterDashboard from "../../src/RequesterDashboard.js";
import * as api from "../../src/api.js";

// Mock API functions
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchRequesterDashboard: vi.fn(),
  };
});

describe("Lab 4 Requester Dashboard UI Component Tests (Feature-16)", () => {
  const mockRequesterUser = {
    id: 3,
    email: "somchai.p@kmutt.ac.th",
    displayName: "Somchai Prasert",
    role: "REQUESTER" as const,
    mustChangePassword: false,
  };

  const sampleDashboardData: api.RequesterDashboardResponse = {
    metrics: {
      myOpenTickets: 3,
      inProgress: 1,
      resolved: 2,
      closed: 5,
    },
    recentTickets: [
      {
        id: "tkt-001",
        ticketNo: "TKT-2026-00001",
        summary: "Projector flickering in Room 302",
        status: "InProgress",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tkt-002",
        ticketNo: "TKT-2026-00002",
        summary: "Wi-Fi connectivity issue on 2nd floor",
        status: "Open",
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UI-08: Requester Dashboard Rendering, 4 Metric Cards & Greeting (FR-72, FR-76, AC-16)", () => {
    it("renders personalized greeting and 4 metric cards with accurate counts", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateMyTickets = vi.fn();
      const handleNavigateCreateTicket = vi.fn();
      const handleSelectTicket = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={handleNavigateMyTickets}
          onNavigateCreateTicket={handleNavigateCreateTicket}
          onSelectTicket={handleSelectTicket}
        />
      );

      // Verify loading state is shown initially
      expect(
        document.querySelector("#requester-dashboard-loading") || screen.getByText(/loading/i)
      ).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText(/Welcome, Somchai Prasert!/i)).toBeInTheDocument();
      });

      // Verify greeting element ID
      const welcomeMsg = document.querySelector("#requester-dashboard-welcome-msg");
      expect(welcomeMsg).toBeInTheDocument();
      expect(welcomeMsg?.textContent).toContain("Welcome, Somchai Prasert!");

      // Verify the 4 metric cards exist in the DOM
      const cardOpen = document.querySelector("#req-metric-card-open");
      const cardInProgress = document.querySelector("#req-metric-card-inprogress");
      const cardResolved = document.querySelector("#req-metric-card-resolved");
      const cardClosed = document.querySelector("#req-metric-card-closed");

      expect(cardOpen).toBeInTheDocument();
      expect(cardInProgress).toBeInTheDocument();
      expect(cardResolved).toBeInTheDocument();
      expect(cardClosed).toBeInTheDocument();

      // Verify card counts match sample data
      expect(document.querySelector("#req-metric-count-open")?.textContent).toBe("3");
      expect(document.querySelector("#req-metric-count-inprogress")?.textContent).toBe("1");
      expect(document.querySelector("#req-metric-count-resolved")?.textContent).toBe("2");
      expect(document.querySelector("#req-metric-count-closed")?.textContent).toBe("5");
    });

    it("renders recent tickets table with ticket details (FR-73)", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={vi.fn()}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#req-recent-tickets-table")).toBeInTheDocument();
      });

      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
      expect(screen.getByText("Projector flickering in Room 302")).toBeInTheDocument();
      expect(screen.getByText("TKT-2026-00002")).toBeInTheDocument();
      expect(screen.getByText("Wi-Fi connectivity issue on 2nd floor")).toBeInTheDocument();
    });

    it("renders empty state message when no recent tickets exist (FR-73)", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue({
        metrics: {
          myOpenTickets: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
        },
        recentTickets: [],
      });

      const handleNavigateCreateTicket = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={vi.fn()}
          onNavigateCreateTicket={handleNavigateCreateTicket}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#req-recent-tickets-empty")).toBeInTheDocument();
      });

      expect(screen.getByText(/no recent tickets found/i)).toBeInTheDocument();
      expect(screen.getByText(/haven't submitted any IT support tickets yet/i)).toBeInTheDocument();

      // Verify create first ticket button
      const createFirstBtn = document.querySelector("#req-btn-create-first-ticket") as HTMLElement;
      expect(createFirstBtn).toBeInTheDocument();
      fireEvent.click(createFirstBtn);
      expect(handleNavigateCreateTicket).toHaveBeenCalledTimes(1);
    });

    it("manual refresh button triggers dashboard re-fetch (FR-76)", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={vi.fn()}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Welcome, Somchai Prasert!/i)).toBeInTheDocument();
      });

      expect(api.fetchRequesterDashboard).toHaveBeenCalledTimes(1);

      const refreshBtn = document.querySelector("#requester-dashboard-refresh-btn") as HTMLElement;
      expect(refreshBtn).toBeInTheDocument();

      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(api.fetchRequesterDashboard).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("AC-17: Metric Card Drill-Down & View All Navigation (FR-74)", () => {
    it("navigates to My Tickets filtered by status when clicking metric cards", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateMyTickets = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={handleNavigateMyTickets}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#req-metric-card-open")).toBeInTheDocument();
      });

      // 1. Click My Open Tickets card
      fireEvent.click(document.querySelector("#req-metric-card-open")!);
      expect(handleNavigateMyTickets).toHaveBeenCalledWith("Open");

      // 2. Click In Progress card
      fireEvent.click(document.querySelector("#req-metric-card-inprogress")!);
      expect(handleNavigateMyTickets).toHaveBeenCalledWith("InProgress");

      // 3. Click Resolved card
      fireEvent.click(document.querySelector("#req-metric-card-resolved")!);
      expect(handleNavigateMyTickets).toHaveBeenCalledWith("Resolved");

      // 4. Click Closed card
      fireEvent.click(document.querySelector("#req-metric-card-closed")!);
      expect(handleNavigateMyTickets).toHaveBeenCalledWith("Closed");
    });

    it("navigates to filtered My Tickets when clicking 'View all' link on cards", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateMyTickets = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={handleNavigateMyTickets}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#req-metric-view-open")).toBeInTheDocument();
      });

      fireEvent.click(document.querySelector("#req-metric-view-open")!);
      expect(handleNavigateMyTickets).toHaveBeenCalledWith("Open");

      fireEvent.click(document.querySelector("#req-metric-view-inprogress")!);
      expect(handleNavigateMyTickets).toHaveBeenCalledWith("InProgress");
    });

    it("navigates to all My Tickets when clicking header 'View all' button in recent tickets section", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateMyTickets = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={handleNavigateMyTickets}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#req-btn-view-all-recent")).toBeInTheDocument();
      });

      fireEvent.click(document.querySelector("#req-btn-view-all-recent")!);
      expect(handleNavigateMyTickets).toHaveBeenCalled();
    });

    it("supports keyboard navigation (Enter key) on metric cards", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateMyTickets = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={handleNavigateMyTickets}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#req-metric-card-open")).toBeInTheDocument();
      });

      const openCard = document.querySelector("#req-metric-card-open")!;
      fireEvent.keyDown(openCard, { key: "Enter" });
      expect(handleNavigateMyTickets).toHaveBeenCalledWith("Open");
    });
  });

  describe("Recent Ticket Row & Detail Navigation (FR-73)", () => {
    it("navigates directly to ticket detail when clicking on a recent ticket row", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      const handleSelectTicket = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={vi.fn()}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={handleSelectTicket}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
      });

      // Click the first ticket row
      const ticketRow = document.querySelector("#req-recent-ticket-row-tkt-001");
      expect(ticketRow).toBeInTheDocument();
      fireEvent.click(ticketRow!);

      expect(handleSelectTicket).toHaveBeenCalledWith("tkt-001");
    });

    it("navigates to ticket detail when clicking 'View' action button on a row", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      const handleSelectTicket = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={vi.fn()}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={handleSelectTicket}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#req-btn-view-ticket-tkt-001")).toBeInTheDocument();
      });

      fireEvent.click(document.querySelector("#req-btn-view-ticket-tkt-001")!);
      expect(handleSelectTicket).toHaveBeenCalledWith("tkt-001");
    });
  });

  describe("FR-75: Quick Actions Panel Navigation", () => {
    it("clicking '+ Create Ticket' invokes onNavigateCreateTicket", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      const handleCreateTicket = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={vi.fn()}
          onNavigateCreateTicket={handleCreateTicket}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#req-qa-create-ticket")).toBeInTheDocument();
      });

      fireEvent.click(document.querySelector("#req-qa-create-ticket")!);
      expect(handleCreateTicket).toHaveBeenCalledTimes(1);
    });

    it("clicking 'View My Tickets' navigates to My Tickets queue", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateMyTickets = vi.fn();

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={handleNavigateMyTickets}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#req-qa-my-tickets")).toBeInTheDocument();
      });

      fireEvent.click(document.querySelector("#req-qa-my-tickets")!);
      expect(handleNavigateMyTickets).toHaveBeenCalled();
    });
  });

  describe("Failure and Error Handling (FR-79, FR-80)", () => {
    it("renders error alert and retry button when dashboard fetch fails, and recovers on retry", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockRejectedValueOnce(
        new Error("Network connection lost")
      );

      render(
        <RequesterDashboard
          currentUser={mockRequesterUser}
          onNavigateMyTickets={vi.fn()}
          onNavigateCreateTicket={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      // Verify error alert
      await waitFor(() => {
        expect(document.querySelector("#requester-dashboard-error")).toBeInTheDocument();
      });

      expect(screen.getByText(/Network connection lost/i)).toBeInTheDocument();

      const retryBtn = document.querySelector("#requester-dashboard-retry-btn") as HTMLElement;
      expect(retryBtn).toBeInTheDocument();

      // Mock recovery on retry
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValueOnce(sampleDashboardData);

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText(/Welcome, Somchai Prasert!/i)).toBeInTheDocument();
      });

      expect(document.querySelector("#requester-dashboard-error")).not.toBeInTheDocument();
      expect(document.querySelector("#req-metric-card-open")).toBeInTheDocument();
    });
  });
});
