import React, { useState, useEffect, useCallback } from "react";
import {
  AuthUser,
  StaffDashboardResponse,
  fetchStaffDashboard,
  DashboardRecentTicket,
} from "./api.js";

export interface QueueFilterOptions {
  status?: string;
  assignedToMe?: boolean;
  owner?: string;
  search?: string;
  focusSearch?: boolean;
}

export interface StaffDashboardProps {
  currentUser: AuthUser;
  onNavigateQueue: (options?: QueueFilterOptions) => void;
  onNavigateCreateTicket?: () => void;
  onCreateTicketClick?: () => void;
  onNavigateUserManagement?: () => void;
  onSelectTicket: (ticketId: string) => void;
}

export default function StaffDashboard({
  currentUser,
  onNavigateQueue,
  onNavigateCreateTicket,
  onCreateTicketClick,
  onNavigateUserManagement,
  onSelectTicket,
}: StaffDashboardProps) {
  const handleCreateTicketAction = onNavigateCreateTicket || onCreateTicketClick || (() => {});
  const [dashboardData, setDashboardData] = useState<StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await fetchStaffDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error("Error loading staff dashboard:", err);
      setError(err?.message || "Failed to load operational dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  // Format status badge
  const renderStatusBadge = (status: string) => {
    let bg = "#F3F4F6";
    let color = "#374151";
    let label = status;

    switch (status) {
      case "New":
        bg = "#EFF6FF";
        color = "#1D4ED8";
        label = "New";
        break;
      case "Open":
        bg = "#ECFDF5";
        color = "#047857";
        label = "Open";
        break;
      case "InProgress":
      case "in progress":
        bg = "#EAF6EF";
        color = "#006B3C";
        label = "In Progress";
        break;
      case "WaitingForRequester":
      case "waiting for requester":
        bg = "#FEF3C7";
        color = "#B45309";
        label = "Waiting for Requester";
        break;
      case "Resolved":
        bg = "#F0FDF4";
        color = "#15803D";
        label = "Resolved";
        break;
      case "Closed":
        bg = "#F3F4F6";
        color = "#4B5563";
        label = "Closed";
        break;
      case "Cancelled":
        bg = "#FEE2E2";
        color = "#B91C1C";
        label = "Cancelled";
        break;
    }

    return (
      <span
        className="badge fw-semibold"
        style={{
          backgroundColor: bg,
          color,
          fontSize: "0.78rem",
          padding: "0.25rem 0.55rem",
          borderRadius: "12px",
        }}
      >
        ● {label}
      </span>
    );
  };

  // Format trend comparison indicator
  const renderTrend = (delta: number) => {
    if (delta > 0) {
      return (
        <span
          style={{
            color: "#0B7A46",
            backgroundColor: "#EAF6EF",
            padding: "0.15rem 0.45rem",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          ▲ +{delta} from yesterday
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span
          style={{
            color: "#B3261E",
            backgroundColor: "#FCE8E6",
            padding: "0.15rem 0.45rem",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          ▼ {delta} from yesterday
        </span>
      );
    }
    return (
      <span
        style={{
          color: "#6B7280",
          backgroundColor: "#F3F4F6",
          padding: "0.15rem 0.45rem",
          borderRadius: "6px",
          fontSize: "0.75rem",
          fontWeight: 600,
        }}
      >
        • 0 from yesterday
      </span>
    );
  };

  // Format relative or clean date
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // Loading skeleton state
  if (loading && !dashboardData) {
    return (
      <div id="staff-dashboard-loading" className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: 1280 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <div className="placeholder-glow">
              <div className="placeholder col-6 mb-2" style={{ height: 28, borderRadius: 4 }} />
              <div className="placeholder col-4" style={{ height: 16, borderRadius: 4 }} />
            </div>
          </div>
        </div>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="col-12 col-sm-6 col-lg" style={{ minWidth: 200 }}>
              <div className="card border-0 shadow-sm p-3 placeholder-glow" style={{ borderRadius: 8, height: 110 }}>
                <div className="placeholder col-4 mb-3" style={{ height: 14 }} />
                <div className="placeholder col-3 mb-2" style={{ height: 32 }} />
                <div className="placeholder col-6" style={{ height: 14 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div id="staff-dashboard-error" className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: 1280 }}>
        <div
          className="alert alert-danger shadow-sm p-4 d-flex justify-content-between align-items-center flex-wrap gap-3"
          role="alert"
          style={{ backgroundColor: "#FCE8E6", borderColor: "#B3261E", color: "#B3261E", borderRadius: 8 }}
        >
          <div>
            <h5 className="alert-heading fw-bold mb-1">Failed to Load Dashboard</h5>
            <p className="mb-0" style={{ fontSize: "0.9rem" }}>{error}</p>
          </div>
          <button
            type="button"
            id="staff-dashboard-retry-btn"
            className="btn btn-outline-danger fw-semibold btn-sm"
            onClick={() => loadDashboard(false)}
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const { metrics, recentTickets, adminCounts } = dashboardData!;

  return (
    <div id="staff-dashboard-container" className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header Bar */}
      <div
        id="staff-dashboard-header"
        className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 pb-2 border-bottom"
        style={{ borderColor: "#E5E7EB" }}
      >
        <div>
          <h2
            id="staff-dashboard-welcome-msg"
            className="h4 fw-bold mb-1"
            style={{ color: "#1F2937", letterSpacing: "-0.01em" }}
          >
            Welcome back, {currentUser.displayName}!
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
            Here's what's happening with your queue today
          </p>
        </div>
        <div>
          <button
            type="button"
            id="staff-dashboard-refresh-btn"
            className="btn btn-sm fw-semibold d-flex align-items-center gap-2 shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
              color: "#006B3C",
              border: "1px solid #006B3C",
              borderRadius: "6px",
              padding: "0.45rem 1rem",
              transition: "all 0.15s ease-in-out",
            }}
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard metrics"
          >
            <span style={{ display: "inline-block", transform: refreshing ? "rotate(360deg)" : "none", transition: "transform 0.5s ease" }}>
              🔄
            </span>
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* 5 Metric Cards Grid */}
      <div id="staff-dashboard-metrics-grid" className="row g-3 mb-4">
        {/* Card 1: New */}
        <div className="col-12 col-sm-6 col-lg" style={{ minWidth: 210 }}>
          <div
            id="metric-card-new"
            role="button"
            tabIndex={0}
            className="card border-0 shadow-sm p-3 h-100"
            style={{
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              borderTop: "4px solid #3B82F6",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => onNavigateQueue({ status: "New" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateQueue({ status: "New" });
              }
            }}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted fw-bold" style={{ fontSize: "0.82rem", textTransform: "uppercase" }}>
                New
              </span>
              <span style={{ fontSize: "1.1rem" }}>🆕</span>
            </div>
            <div
              id="metric-count-new"
              className="fw-bold mb-2"
              style={{ fontSize: "2rem", color: "#1F2937", lineHeight: 1 }}
            >
              {metrics.new.count}
            </div>
            <div id="metric-trend-new">{renderTrend(metrics.new.deltaFromYesterday)}</div>
          </div>
        </div>

        {/* Card 2: Open */}
        <div className="col-12 col-sm-6 col-lg" style={{ minWidth: 210 }}>
          <div
            id="metric-card-open"
            role="button"
            tabIndex={0}
            className="card border-0 shadow-sm p-3 h-100"
            style={{
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              borderTop: "4px solid #10B981",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => onNavigateQueue({ status: "Open" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateQueue({ status: "Open" });
              }
            }}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted fw-bold" style={{ fontSize: "0.82rem", textTransform: "uppercase" }}>
                Open
              </span>
              <span style={{ fontSize: "1.1rem" }}>📂</span>
            </div>
            <div
              id="metric-count-open"
              className="fw-bold mb-2"
              style={{ fontSize: "2rem", color: "#1F2937", lineHeight: 1 }}
            >
              {metrics.open.count}
            </div>
            <div id="metric-trend-open">{renderTrend(metrics.open.deltaFromYesterday)}</div>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="col-12 col-sm-6 col-lg" style={{ minWidth: 210 }}>
          <div
            id="metric-card-inprogress"
            role="button"
            tabIndex={0}
            className="card border-0 shadow-sm p-3 h-100"
            style={{
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              borderTop: "4px solid #006B3C",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => onNavigateQueue({ status: "InProgress" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateQueue({ status: "InProgress" });
              }
            }}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted fw-bold" style={{ fontSize: "0.82rem", textTransform: "uppercase" }}>
                In Progress
              </span>
              <span style={{ fontSize: "1.1rem" }}>⚙️</span>
            </div>
            <div
              id="metric-count-inprogress"
              className="fw-bold mb-2"
              style={{ fontSize: "2rem", color: "#1F2937", lineHeight: 1 }}
            >
              {metrics.inProgress.count}
            </div>
            <div id="metric-trend-inprogress">{renderTrend(metrics.inProgress.deltaFromYesterday)}</div>
          </div>
        </div>

        {/* Card 4: Waiting for Requester */}
        <div className="col-12 col-sm-6 col-lg" style={{ minWidth: 210 }}>
          <div
            id="metric-card-waiting"
            role="button"
            tabIndex={0}
            className="card border-0 shadow-sm p-3 h-100"
            style={{
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              borderTop: "4px solid #F59E0B",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => onNavigateQueue({ status: "WaitingForRequester" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateQueue({ status: "WaitingForRequester" });
              }
            }}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted fw-bold" style={{ fontSize: "0.82rem", textTransform: "uppercase" }}>
                Waiting for Requester
              </span>
              <span style={{ fontSize: "1.1rem" }}>⏳</span>
            </div>
            <div
              id="metric-count-waiting"
              className="fw-bold mb-2"
              style={{ fontSize: "2rem", color: "#1F2937", lineHeight: 1 }}
            >
              {metrics.waitingForRequester.count}
            </div>
            <div id="metric-trend-waiting">{renderTrend(metrics.waitingForRequester.deltaFromYesterday)}</div>
          </div>
        </div>

        {/* Card 5: My Assigned */}
        <div className="col-12 col-sm-6 col-lg" style={{ minWidth: 210 }}>
          <div
            id="metric-card-my-assigned"
            role="button"
            tabIndex={0}
            className="card border-0 shadow-sm p-3 h-100"
            style={{
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              borderTop: "4px solid #8B5CF6",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => onNavigateQueue({ assignedToMe: true })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateQueue({ assignedToMe: true });
              }
            }}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted fw-bold" style={{ fontSize: "0.82rem", textTransform: "uppercase" }}>
                My Assigned
              </span>
              <span style={{ fontSize: "1.1rem" }}>👤</span>
            </div>
            <div
              id="metric-count-my-assigned"
              className="fw-bold mb-2"
              style={{ fontSize: "2rem", color: "#1F2937", lineHeight: 1 }}
            >
              {metrics.myAssigned.count}
            </div>
            <div id="metric-trend-my-assigned">{renderTrend(metrics.myAssigned.deltaFromYesterday)}</div>
          </div>
        </div>
      </div>

      {/* Main Content Area: 2-Column Layout */}
      <div className="row g-4">
        {/* Left Column: My Recent Tickets */}
        <div className="col-12 col-lg-8">
          <div
            id="recent-tickets-section"
            className="card border-0 shadow-sm"
            style={{ borderRadius: 8, overflow: "hidden", backgroundColor: "#FFFFFF" }}
          >
            <div
              className="p-3 d-flex justify-content-between align-items-center border-bottom flex-wrap gap-2"
              style={{ borderColor: "#E5E7EB" }}
            >
              <div>
                <h3 className="h6 fw-bold mb-0" style={{ color: "#1F2937" }}>
                  My Recent Tickets
                </h3>
                <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                  Tickets assigned to or updated by you
                </span>
              </div>
              <button
                type="button"
                id="btn-view-all-recent"
                className="btn btn-sm fw-semibold"
                style={{ color: "#006B3C", padding: 0 }}
                onClick={() => onNavigateQueue()}
              >
                View all →
              </button>
            </div>

            <div className="table-responsive">
              {recentTickets.length === 0 ? (
                <div id="recent-tickets-empty" className="text-center py-5 px-3">
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
                  <h6 className="fw-bold text-dark mb-1">No recent tickets found</h6>
                  <p className="text-muted mb-3" style={{ fontSize: "0.85rem" }}>
                    Browse the ticket queue to claim active requests and start working.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm text-white fw-semibold px-3"
                    style={{ backgroundColor: "#006B3C" }}
                    onClick={() => onNavigateQueue()}
                  >
                    Browse Ticket Queue
                  </button>
                </div>
              ) : (
                <table id="recent-tickets-table" className="table table-hover align-middle mb-0">
                  <thead style={{ backgroundColor: "#F9FAFB", fontSize: "0.8rem", color: "#4B5563" }}>
                    <tr>
                      <th className="py-2 px-3">Ticket ID</th>
                      <th className="py-2 px-3">Summary</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Last Updated</th>
                      <th className="py-2 px-3 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: "0.86rem" }}>
                    {recentTickets.map((t: DashboardRecentTicket) => (
                      <tr
                        key={t.id}
                        id={`recent-ticket-row-${t.id}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => onSelectTicket(t.id)}
                      >
                        <td className="py-3 px-3 fw-bold" style={{ color: "#006B3C" }}>
                          {t.ticketNo}
                        </td>
                        <td className="py-3 px-3 text-truncate" style={{ maxWidth: 260 }}>
                          <span className="fw-semibold text-dark">{t.summary}</span>
                        </td>
                        <td className="py-3 px-3">{renderStatusBadge(t.status)}</td>
                        <td className="py-3 px-3 text-muted" style={{ fontSize: "0.8rem" }}>
                          {formatDate(t.updatedAt)}
                        </td>
                        <td className="py-3 px-3 text-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            id={`btn-view-ticket-${t.id}`}
                            className="btn btn-sm btn-outline-secondary py-1 px-2 fw-semibold"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => onSelectTicket(t.id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Admin Panel */}
        <div className="col-12 col-lg-4">
          <div
            id="quick-actions-panel"
            className="card border-0 shadow-sm mb-4"
            style={{ borderRadius: 8, backgroundColor: "#FFFFFF" }}
          >
            <div className="p-3 border-bottom" style={{ borderColor: "#E5E7EB" }}>
              <h3 className="h6 fw-bold mb-0" style={{ color: "#1F2937" }}>
                Quick Actions
              </h3>
            </div>
            <div className="p-3 d-flex flex-column gap-2">
              {/* Quick Action 1: Create Ticket */}
              <div
                id="qa-create-ticket"
                role="button"
                tabIndex={0}
                className="p-3 border rounded d-flex align-items-center gap-3"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderColor: "#E5E7EB",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onClick={handleCreateTicketAction}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCreateTicketAction();
                  }
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: 40, height: 40, backgroundColor: "#EAF6EF", color: "#006B3C", fontSize: "1.2rem" }}
                >
                  ➕
                </div>
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                    + Create Ticket
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                    Submit a new request
                  </div>
                </div>
              </div>

              {/* Quick Action 2: Search Tickets */}
              <div
                id="qa-search-tickets"
                role="button"
                tabIndex={0}
                className="p-3 border rounded d-flex align-items-center gap-3"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderColor: "#E5E7EB",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onClick={() => onNavigateQueue({ focusSearch: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateQueue({ focusSearch: true });
                  }
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: 40, height: 40, backgroundColor: "#EFF6FF", color: "#1D4ED8", fontSize: "1.2rem" }}
                >
                  🔍
                </div>
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                    Search Tickets
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                    Search by number or keyword
                  </div>
                </div>
              </div>

              {/* Quick Action 3: My Queue */}
              <div
                id="qa-my-queue"
                role="button"
                tabIndex={0}
                className="p-3 border rounded d-flex align-items-center gap-3"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderColor: "#E5E7EB",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onClick={() => onNavigateQueue({ assignedToMe: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateQueue({ assignedToMe: true });
                  }
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: 40, height: 40, backgroundColor: "#F3E8FF", color: "#7E22CE", fontSize: "1.2rem" }}
                >
                  📋
                </div>
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                    My Queue
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                    View tickets assigned to you
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Administrator User Counts Summary (FR-69) */}
          {currentUser.role === "ADMINISTRATOR" && adminCounts && (
            <div
              id="admin-user-summary-card"
              className="card border-0 shadow-sm"
              style={{ borderRadius: 8, backgroundColor: "#FFFBEB", borderLeft: "4px solid #F59E0B" }}
            >
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: "#FDE68A" }}>
                <span className="fw-bold" style={{ color: "#92400E", fontSize: "0.88rem" }}>
                  👥 User Administration
                </span>
                {onNavigateUserManagement && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link p-0 fw-semibold"
                    style={{ color: "#92400E", fontSize: "0.8rem", textDecoration: "none" }}
                    onClick={onNavigateUserManagement}
                  >
                    Manage Users →
                  </button>
                )}
              </div>
              <div className="p-3">
                <div className="d-flex justify-content-around text-center">
                  <div>
                    <div className="fw-bold text-dark" style={{ fontSize: "1.4rem" }}>
                      {adminCounts.totalUsers}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>Total Users</div>
                  </div>
                  <div style={{ borderRight: "1px solid #FCD34D" }} />
                  <div>
                    <div className="fw-bold text-success" style={{ fontSize: "1.4rem" }}>
                      {adminCounts.activeUsers}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>Active Users</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
