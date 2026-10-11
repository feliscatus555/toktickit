import React, { useState, useEffect, useCallback } from "react";
import {
  AuthUser,
  RequesterDashboardResponse,
  fetchRequesterDashboard,
  RequesterDashboardRecentTicket,
} from "./api.js";

export interface RequesterDashboardProps {
  currentUser: AuthUser;
  onNavigateMyTickets: (statusFilter?: string) => void;
  onNavigateCreateTicket: () => void;
  onSelectTicket: (ticketId: string) => void;
}

export default function RequesterDashboard({
  currentUser,
  onNavigateMyTickets,
  onNavigateCreateTicket,
  onSelectTicket,
}: RequesterDashboardProps) {
  const [dashboardData, setDashboardData] = useState<RequesterDashboardResponse | null>(null);
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
      const data = await fetchRequesterDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error("Error loading requester dashboard:", err);
      setError(err?.message || "Failed to load requester dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  // Helper for status badge rendering
  function renderStatusBadge(status: string) {
    switch (status) {
      case "New":
        return (
          <span
            className="badge fw-semibold"
            style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", fontSize: "0.78rem" }}
          >
            • New
          </span>
        );
      case "Open":
        return (
          <span
            className="badge fw-semibold"
            style={{ backgroundColor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", fontSize: "0.78rem" }}
          >
            • Open
          </span>
        );
      case "InProgress":
        return (
          <span
            className="badge fw-semibold"
            style={{ backgroundColor: "#ECFEFF", color: "#0E7490", border: "1px solid #A5F3FC", fontSize: "0.78rem" }}
          >
            • In Progress
          </span>
        );
      case "WaitingForRequester":
        return (
          <span
            className="badge fw-semibold"
            style={{ backgroundColor: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", fontSize: "0.78rem" }}
          >
            • Waiting for You
          </span>
        );
      case "Resolved":
        return (
          <span
            className="badge fw-semibold"
            style={{ backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #0B7A46", fontSize: "0.78rem" }}
          >
            • Resolved
          </span>
        );
      case "Closed":
        return (
          <span
            className="badge fw-semibold"
            style={{ backgroundColor: "#F3F4F6", color: "#4B5563", border: "1px solid #D1D5DB", fontSize: "0.78rem" }}
          >
            • Closed
          </span>
        );
      default:
        return (
          <span
            className="badge fw-semibold"
            style={{ backgroundColor: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB", fontSize: "0.78rem" }}
          >
            {status}
          </span>
        );
    }
  }

  function formatDate(isoStr: string) {
    if (!isoStr) return "-";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  }

  // Skeleton loading state
  if (loading && !dashboardData) {
    return (
      <div id="requester-dashboard-loading" className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
          <div>
            <div className="placeholder-glow">
              <div className="placeholder col-8 mb-2" style={{ height: 28, width: 260 }} />
              <div className="placeholder col-6" style={{ height: 16, width: 340 }} />
            </div>
          </div>
          <div>
            <div className="placeholder-glow">
              <div className="placeholder" style={{ width: 95, height: 34, borderRadius: 6 }} />
            </div>
          </div>
        </div>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm p-3 placeholder-glow" style={{ borderRadius: 8, height: 110 }}>
                <div className="placeholder col-5 mb-3" style={{ height: 14 }} />
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
      <div id="requester-dashboard-error" className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: 1280, margin: "0 auto" }}>
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
            id="requester-dashboard-retry-btn"
            className="btn btn-outline-danger fw-semibold btn-sm"
            onClick={() => loadDashboard(false)}
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const { metrics, recentTickets } = dashboardData!;

  return (
    <div
      id="requester-dashboard-container"
      className="container-fluid py-4 px-3 px-md-4"
      style={{ maxWidth: 1280, margin: "0 auto" }}
    >
      {/* Header Bar */}
      <div
        id="requester-dashboard-header"
        className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 pb-2 border-bottom"
        style={{ borderColor: "#E5E7EB" }}
      >
        <div>
          <h2
            id="requester-dashboard-welcome-msg"
            className="h4 fw-bold mb-1"
            style={{ color: "#1F2937", letterSpacing: "-0.01em" }}
          >
            Welcome, {currentUser.displayName}!
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
            Here's the latest on your requests
          </p>
        </div>
        <div>
          <button
            type="button"
            id="requester-dashboard-refresh-btn"
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
            aria-label="Refresh dashboard data"
          >
            <span
              style={{
                display: "inline-block",
                transform: refreshing ? "rotate(360deg)" : "none",
                transition: "transform 0.5s ease",
              }}
            >
              🔄
            </span>
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards Grid (FR-72, AC-16) */}
      <div id="requester-dashboard-metrics-grid" className="row g-3 mb-4">
        {/* Card 1: My Open Tickets */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            id="req-metric-card-open"
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
            onClick={() => onNavigateMyTickets("Open")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateMyTickets("Open");
              }
            }}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted fw-bold" style={{ fontSize: "0.82rem", textTransform: "uppercase" }}>
                My Open Tickets
              </span>
              <span style={{ fontSize: "1.1rem" }}>📂</span>
            </div>
            <div
              id="req-metric-count-open"
              className="fw-bold mb-2"
              style={{ fontSize: "2rem", color: "#1F2937", lineHeight: 1 }}
            >
              {metrics.myOpenTickets}
            </div>
            <div>
              <span
                id="req-metric-view-open"
                className="fw-semibold text-primary"
                style={{ fontSize: "0.78rem" }}
              >
                View all →
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            id="req-metric-card-inprogress"
            role="button"
            tabIndex={0}
            className="card border-0 shadow-sm p-3 h-100"
            style={{
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              borderTop: "4px solid #06B6D4",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => onNavigateMyTickets("InProgress")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateMyTickets("InProgress");
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
              id="req-metric-count-inprogress"
              className="fw-bold mb-2"
              style={{ fontSize: "2rem", color: "#1F2937", lineHeight: 1 }}
            >
              {metrics.inProgress}
            </div>
            <div>
              <span
                id="req-metric-view-inprogress"
                className="fw-semibold"
                style={{ fontSize: "0.78rem", color: "#0891B2" }}
              >
                View all →
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Resolved */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            id="req-metric-card-resolved"
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
            onClick={() => onNavigateMyTickets("Resolved")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateMyTickets("Resolved");
              }
            }}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted fw-bold" style={{ fontSize: "0.82rem", textTransform: "uppercase" }}>
                Resolved
              </span>
              <span style={{ fontSize: "1.1rem" }}>✅</span>
            </div>
            <div
              id="req-metric-count-resolved"
              className="fw-bold mb-2"
              style={{ fontSize: "2rem", color: "#1F2937", lineHeight: 1 }}
            >
              {metrics.resolved}
            </div>
            <div>
              <span
                id="req-metric-view-resolved"
                className="fw-semibold text-success"
                style={{ fontSize: "0.78rem" }}
              >
                View all →
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Closed */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            id="req-metric-card-closed"
            role="button"
            tabIndex={0}
            className="card border-0 shadow-sm p-3 h-100"
            style={{
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              borderTop: "4px solid #6B7280",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => onNavigateMyTickets("Closed")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateMyTickets("Closed");
              }
            }}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted fw-bold" style={{ fontSize: "0.82rem", textTransform: "uppercase" }}>
                Closed
              </span>
              <span style={{ fontSize: "1.1rem" }}>🔒</span>
            </div>
            <div
              id="req-metric-count-closed"
              className="fw-bold mb-2"
              style={{ fontSize: "2rem", color: "#1F2937", lineHeight: 1 }}
            >
              {metrics.closed}
            </div>
            <div>
              <span
                id="req-metric-view-closed"
                className="fw-semibold text-muted"
                style={{ fontSize: "0.78rem" }}
              >
                View all →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: 2-Column Layout */}
      <div className="row g-4">
        {/* Left Column: My Recent Tickets (8 cols desktop) */}
        <div className="col-12 col-lg-8">
          <div
            id="req-recent-tickets-section"
            className="card border-0 shadow-sm h-100"
            style={{ borderRadius: 8, backgroundColor: "#FFFFFF" }}
          >
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: "#E5E7EB" }}>
              <div>
                <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "1.05rem" }}>
                  My Recent Tickets
                </h5>
                <small className="text-muted" style={{ fontSize: "0.8rem" }}>
                  Tickets submitted by you
                </small>
              </div>
              <button
                type="button"
                id="req-btn-view-all-recent"
                className="btn btn-sm btn-link p-0 fw-semibold"
                style={{ color: "#006B3C", textDecoration: "none", fontSize: "0.85rem" }}
                onClick={() => onNavigateMyTickets()}
              >
                View all →
              </button>
            </div>

            <div className="table-responsive">
              {recentTickets.length === 0 ? (
                <div id="req-recent-tickets-empty" className="text-center py-5 px-3">
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
                  <h6 className="fw-bold text-dark mb-1">No recent tickets found</h6>
                  <p className="text-muted mb-3" style={{ fontSize: "0.85rem" }}>
                    You haven't submitted any IT support tickets yet.
                  </p>
                  <button
                    type="button"
                    id="req-btn-create-first-ticket"
                    className="btn btn-sm text-white fw-semibold px-3"
                    style={{ backgroundColor: "#006B3C" }}
                    onClick={onNavigateCreateTicket}
                  >
                    + Create your first ticket
                  </button>
                </div>
              ) : (
                <table id="req-recent-tickets-table" className="table table-hover align-middle mb-0">
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
                    {recentTickets.map((t: RequesterDashboardRecentTicket) => (
                      <tr
                        key={t.id}
                        id={`req-recent-ticket-row-${t.id}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => onSelectTicket(t.id)}
                      >
                        <td className="py-3 px-3 fw-bold" style={{ color: "#006B3C" }}>
                          {t.ticketNo}
                        </td>
                        <td className="py-3 px-3 text-truncate" style={{ maxWidth: 280 }}>
                          <span className="fw-semibold text-dark">{t.summary}</span>
                        </td>
                        <td className="py-3 px-3">{renderStatusBadge(t.status)}</td>
                        <td className="py-3 px-3 text-muted" style={{ fontSize: "0.8rem" }}>
                          {formatDate(t.updatedAt)}
                        </td>
                        <td className="py-3 px-3 text-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            id={`req-btn-view-ticket-${t.id}`}
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

        {/* Right Column: Quick Actions (4 cols desktop) */}
        <div className="col-12 col-lg-4">
          <div
            id="req-quick-actions-card"
            className="card border-0 shadow-sm"
            style={{ borderRadius: 8, backgroundColor: "#FFFFFF" }}
          >
            <div className="p-3 border-bottom" style={{ borderColor: "#E5E7EB" }}>
              <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "1.05rem" }}>
                Quick Actions
              </h5>
            </div>
            <div className="p-3 d-flex flex-column gap-3">
              {/* Quick Action 1: Create Ticket */}
              <div
                id="req-qa-create-ticket"
                role="button"
                tabIndex={0}
                className="p-3 border rounded d-flex align-items-center gap-3"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderColor: "#E5E7EB",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onClick={onNavigateCreateTicket}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateCreateTicket();
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

              {/* Quick Action 2: View My Tickets */}
              <div
                id="req-qa-my-tickets"
                role="button"
                tabIndex={0}
                className="p-3 border rounded d-flex align-items-center gap-3"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderColor: "#E5E7EB",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onClick={() => onNavigateMyTickets()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateMyTickets();
                  }
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: 40, height: 40, backgroundColor: "#EFF6FF", color: "#2563EB", fontSize: "1.2rem" }}
                >
                  📋
                </div>
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                    View My Tickets
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                    Track existing requests
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
