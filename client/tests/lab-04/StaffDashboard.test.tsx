import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StaffDashboard from "../../src/StaffDashboard.js";
import * as api from "../../src/api.js";

// Mock API functions
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchStaffDashboard: vi.fn(),
  };
});

describe("Lab 4 Staff Dashboard UI Component Tests (Feature-15)", () => {
  const mockStaffUser = {
    id: 2,
    email: "sarah.johnson@kmutt.ac.th",
    displayName: "Sarah Johnson",
    role: "IT_STAFF" as const,
    mustChangePassword: false,
  };

  const mockAdminUser = {
    id: 1,
    email: "admin@kmutt.ac.th",
    displayName: "Super Admin",
    role: "ADMINISTRATOR" as const,
    mustChangePassword: false,
  };

  const sampleDashboardData: api.StaffDashboardResponse = {
    metrics: {
      new: { count: 12, deltaFromYesterday: 2 },
      open: { count: 5, deltaFromYesterday: -1 },
      inProgress: { count: 8, deltaFromYesterday: 0 },
      waitingForRequester: { count: 3, deltaFromYesterday: 1 },
      myAssigned: { count: 4, deltaFromYesterday: 2 },
    },
    recentTickets: [
      {
        id: "tkt-001",
        ticketNo: "TKT-2026-00001",
        summary: "Projector flickering in Room 302",
        status: "InProgress",
        itPriority: "HIGH",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tkt-002",
        ticketNo: "TKT-2026-00002",
        summary: "Wi-Fi connectivity issue on 2nd floor",
        status: "Open",
        itPriority: "MEDIUM",
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    adminCounts: undefined,
  };

  const sampleAdminDashboardData: api.StaffDashboardResponse = {
    ...sampleDashboardData,
    adminCounts: {
      totalUsers: 45,
      activeUsers: 42,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UI-06: Dashboard Rendering, Metric Cards & Trends (FR-62, FR-63, FR-64, AC-12)", () => {
    it("renders personalized greeting and 5 metric cards with counts and delta trend indicators", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateQueue = vi.fn();
      const handleSelectTicket = vi.fn();

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={handleNavigateQueue}
          onSelectTicket={handleSelectTicket}
        />
      );

      // Verify loading state is shown initially
      expect(document.querySelector("#staff-dashboard-loading") || screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Sarah Johnson!/i)).toBeInTheDocument();
      });

      // Verify the 5 metric cards exist in the DOM
      const cardNew = document.querySelector("#metric-card-new");
      const cardOpen = document.querySelector("#metric-card-open");
      const cardInProgress = document.querySelector("#metric-card-inprogress");
      const cardWaiting = document.querySelector("#metric-card-waiting");
      const cardMyAssigned = document.querySelector("#metric-card-my-assigned");

      expect(cardNew).toBeInTheDocument();
      expect(cardOpen).toBeInTheDocument();
      expect(cardInProgress).toBeInTheDocument();
      expect(cardWaiting).toBeInTheDocument();
      expect(cardMyAssigned).toBeInTheDocument();

      // Verify card counts
      expect(cardNew?.textContent).toContain("12");
      expect(cardOpen?.textContent).toContain("5");
      expect(cardInProgress?.textContent).toContain("8");
      expect(cardWaiting?.textContent).toContain("3");
      expect(cardMyAssigned?.textContent).toContain("4");

      // Verify delta trend indicators (+2, -1, 0, +1)
      expect(cardNew?.textContent).toMatch(/\+2/);
      expect(cardOpen?.textContent).toMatch(/-1/);
      expect(cardWaiting?.textContent).toMatch(/\+1/);
    });

    it("renders recent tickets table with ticket details (FR-64, AC-14)", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#recent-tickets-table")).toBeInTheDocument();
      });

      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
      expect(screen.getByText("Projector flickering in Room 302")).toBeInTheDocument();
      expect(screen.getByText("TKT-2026-00002")).toBeInTheDocument();
      expect(screen.getByText("Wi-Fi connectivity issue on 2nd floor")).toBeInTheDocument();
    });

    it("renders empty state message when no recent tickets exist", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue({
        ...sampleDashboardData,
        recentTickets: [],
      });

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no recent tickets found/i)).toBeInTheDocument();
      });
    });

    it("manual refresh button triggers dashboard re-fetch (FR-68)", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Sarah Johnson!/i)).toBeInTheDocument();
      });

      expect(api.fetchStaffDashboard).toHaveBeenCalledTimes(1);

      const refreshBtn = document.querySelector("#staff-dashboard-refresh-btn") as HTMLElement;
      expect(refreshBtn).toBeInTheDocument();

      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(api.fetchStaffDashboard).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("UI-07: Metric Card Drill-Down Queue Navigation (FR-65, AC-13)", () => {
    it("navigates to IT Staff Queue filtered by status when clicking metric cards", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateQueue = vi.fn();

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={handleNavigateQueue}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#metric-card-new")).toBeInTheDocument();
      });

      // 1. Click New card
      fireEvent.click(document.querySelector("#metric-card-new")!);
      expect(handleNavigateQueue).toHaveBeenCalledWith({ status: "New" });

      // 2. Click Open card
      fireEvent.click(document.querySelector("#metric-card-open")!);
      expect(handleNavigateQueue).toHaveBeenCalledWith({ status: "Open" });

      // 3. Click InProgress card
      fireEvent.click(document.querySelector("#metric-card-inprogress")!);
      expect(handleNavigateQueue).toHaveBeenCalledWith({ status: "InProgress" });

      // 4. Click WaitingForRequester card
      fireEvent.click(document.querySelector("#metric-card-waiting")!);
      expect(handleNavigateQueue).toHaveBeenCalledWith({ status: "WaitingForRequester" });

      // 5. Click My Assigned card
      fireEvent.click(document.querySelector("#metric-card-my-assigned")!);
      expect(handleNavigateQueue).toHaveBeenCalledWith({ assignedToMe: true });
    });

    it("supports keyboard navigation (Enter key) on metric cards", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateQueue = vi.fn();

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={handleNavigateQueue}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#metric-card-new")).toBeInTheDocument();
      });

      const newCard = document.querySelector("#metric-card-new")!;
      fireEvent.keyDown(newCard, { key: "Enter" });
      expect(handleNavigateQueue).toHaveBeenCalledWith({ status: "New" });
    });
  });

  describe("AC-14: Recent Ticket Row Click & Ticket Detail Navigation (FR-66)", () => {
    it("navigates directly to ticket detail when clicking on a recent ticket row", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      const handleSelectTicket = vi.fn();

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={vi.fn()}
          onSelectTicket={handleSelectTicket}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
      });

      // Click the first ticket row
      const ticketRow = document.querySelector("#recent-ticket-row-tkt-001");
      expect(ticketRow).toBeInTheDocument();
      fireEvent.click(ticketRow!);

      expect(handleSelectTicket).toHaveBeenCalledWith("tkt-001");
    });
  });

  describe("FR-67: Quick Actions Panel Navigation", () => {
    it("clicking '+ Create Ticket' invokes onNavigateCreateTicket / onCreateTicketClick", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      const handleCreateTicket = vi.fn();

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={vi.fn()}
          onNavigateCreateTicket={handleCreateTicket}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#qa-create-ticket")).toBeInTheDocument();
      });

      fireEvent.click(document.querySelector("#qa-create-ticket")!);
      expect(handleCreateTicket).toHaveBeenCalledTimes(1);
    });

    it("clicking 'Search Tickets' navigates to queue with focusSearch", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateQueue = vi.fn();

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={handleNavigateQueue}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#qa-search-tickets")).toBeInTheDocument();
      });

      fireEvent.click(document.querySelector("#qa-search-tickets")!);
      expect(handleNavigateQueue).toHaveBeenCalledWith({ focusSearch: true });
    });

    it("clicking 'My Queue' navigates to queue with assignedToMe", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      const handleNavigateQueue = vi.fn();

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={handleNavigateQueue}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#qa-my-queue")).toBeInTheDocument();
      });

      fireEvent.click(document.querySelector("#qa-my-queue")!);
      expect(handleNavigateQueue).toHaveBeenCalledWith({ assignedToMe: true });
    });
  });

  describe("FR-69: Administrator User Overview Card", () => {
    it("renders admin user summary card when adminCounts is provided for ADMINISTRATOR", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleAdminDashboardData);

      render(
        <StaffDashboard
          currentUser={mockAdminUser}
          onNavigateQueue={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.querySelector("#admin-user-summary-card")).toBeInTheDocument();
      });

      expect(screen.getByText("45")).toBeInTheDocument(); // totalUsers
      expect(screen.getByText("42")).toBeInTheDocument(); // activeUsers
    });

    it("does not render admin user summary card when currentUser is IT_STAFF", async () => {
      vi.mocked(api.fetchStaffDashboard).mockResolvedValue(sampleDashboardData);

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Sarah Johnson!/i)).toBeInTheDocument();
      });

      expect(document.querySelector("#admin-user-summary-card")).not.toBeInTheDocument();
    });
  });

  describe("Failure and Error Handling", () => {
    it("renders error alert and retry button when dashboard fetch fails, and recovers on retry", async () => {
      vi.mocked(api.fetchStaffDashboard).mockRejectedValueOnce(
        new Error("Connection refused to database")
      );

      render(
        <StaffDashboard
          currentUser={mockStaffUser}
          onNavigateQueue={vi.fn()}
          onSelectTicket={vi.fn()}
        />
      );

      // Verify error alert
      await waitFor(() => {
        expect(document.querySelector("#staff-dashboard-error")).toBeInTheDocument();
      });

      expect(screen.getByText(/Connection refused to database/i)).toBeInTheDocument();

      const retryBtn = document.querySelector("#staff-dashboard-retry-btn") as HTMLElement;
      expect(retryBtn).toBeInTheDocument();

      // Mock recovery on retry
      vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(sampleDashboardData);

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Sarah Johnson!/i)).toBeInTheDocument();
      });

      expect(document.querySelector("#staff-dashboard-error")).not.toBeInTheDocument();
      expect(document.querySelector("#metric-card-new")).toBeInTheDocument();
    });
  });
});
