import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { fetchStaffDashboard, } from "./api.js";
export default function StaffDashboard({ currentUser, onNavigateQueue, onNavigateCreateTicket, onCreateTicketClick, onNavigateUserManagement, onSelectTicket, }) {
    const handleCreateTicketAction = onNavigateCreateTicket || onCreateTicketClick || (() => { });
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const loadDashboard = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            }
            else {
                setLoading(true);
            }
            setError(null);
            const data = await fetchStaffDashboard();
            setDashboardData(data);
        }
        catch (err) {
            console.error("Error loading staff dashboard:", err);
            setError(err?.message || "Failed to load operational dashboard data.");
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    useEffect(() => {
        loadDashboard(false);
    }, [loadDashboard]);
    // Format status badge
    const renderStatusBadge = (status) => {
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
        return (_jsxs("span", { className: "badge fw-semibold", style: {
                backgroundColor: bg,
                color,
                fontSize: "0.78rem",
                padding: "0.25rem 0.55rem",
                borderRadius: "12px",
            }, children: ["\u25CF ", label] }));
    };
    // Format trend comparison indicator
    const renderTrend = (delta) => {
        if (delta > 0) {
            return (_jsxs("span", { style: {
                    color: "#0B7A46",
                    backgroundColor: "#EAF6EF",
                    padding: "0.15rem 0.45rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                }, children: ["\u25B2 +", delta, " from yesterday"] }));
        }
        if (delta < 0) {
            return (_jsxs("span", { style: {
                    color: "#B3261E",
                    backgroundColor: "#FCE8E6",
                    padding: "0.15rem 0.45rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                }, children: ["\u25BC ", delta, " from yesterday"] }));
        }
        return (_jsx("span", { style: {
                color: "#6B7280",
                backgroundColor: "#F3F4F6",
                padding: "0.15rem 0.45rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
            }, children: "\u2022 0 from yesterday" }));
    };
    // Format relative or clean date
    const formatDate = (isoString) => {
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
            });
        }
        catch {
            return isoString;
        }
    };
    // Loading skeleton state
    if (loading && !dashboardData) {
        return (_jsxs("div", { id: "staff-dashboard-loading", className: "container-fluid py-4 px-3 px-md-4", style: { maxWidth: 1280 }, children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-4", children: _jsx("div", { children: _jsxs("div", { className: "placeholder-glow", children: [_jsx("div", { className: "placeholder col-6 mb-2", style: { height: 28, borderRadius: 4 } }), _jsx("div", { className: "placeholder col-4", style: { height: 16, borderRadius: 4 } })] }) }) }), _jsx("div", { className: "row g-3 mb-4", children: [1, 2, 3, 4, 5].map((idx) => (_jsx("div", { className: "col-12 col-sm-6 col-lg", style: { minWidth: 200 }, children: _jsxs("div", { className: "card border-0 shadow-sm p-3 placeholder-glow", style: { borderRadius: 8, height: 110 }, children: [_jsx("div", { className: "placeholder col-4 mb-3", style: { height: 14 } }), _jsx("div", { className: "placeholder col-3 mb-2", style: { height: 32 } }), _jsx("div", { className: "placeholder col-6", style: { height: 14 } })] }) }, idx))) })] }));
    }
    // Error state
    if (error && !dashboardData) {
        return (_jsx("div", { id: "staff-dashboard-error", className: "container-fluid py-4 px-3 px-md-4", style: { maxWidth: 1280 }, children: _jsxs("div", { className: "alert alert-danger shadow-sm p-4 d-flex justify-content-between align-items-center flex-wrap gap-3", role: "alert", style: { backgroundColor: "#FCE8E6", borderColor: "#B3261E", color: "#B3261E", borderRadius: 8 }, children: [_jsxs("div", { children: [_jsx("h5", { className: "alert-heading fw-bold mb-1", children: "Failed to Load Dashboard" }), _jsx("p", { className: "mb-0", style: { fontSize: "0.9rem" }, children: error })] }), _jsx("button", { type: "button", id: "staff-dashboard-retry-btn", className: "btn btn-outline-danger fw-semibold btn-sm", onClick: () => loadDashboard(false), children: "Retry Loading" })] }) }));
    }
    const { metrics, recentTickets, adminCounts } = dashboardData;
    return (_jsxs("div", { id: "staff-dashboard-container", className: "container-fluid py-4 px-3 px-md-4", style: { maxWidth: 1280, margin: "0 auto" }, children: [_jsxs("div", { id: "staff-dashboard-header", className: "d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 pb-2 border-bottom", style: { borderColor: "#E5E7EB" }, children: [_jsxs("div", { children: [_jsxs("h2", { id: "staff-dashboard-welcome-msg", className: "h4 fw-bold mb-1", style: { color: "#1F2937", letterSpacing: "-0.01em" }, children: ["Welcome back, ", currentUser.displayName, "!"] }), _jsx("p", { className: "text-muted mb-0", style: { fontSize: "0.9rem" }, children: "Here's what's happening with your queue today" })] }), _jsx("div", { children: _jsxs("button", { type: "button", id: "staff-dashboard-refresh-btn", className: "btn btn-sm fw-semibold d-flex align-items-center gap-2 shadow-sm", style: {
                                backgroundColor: "#FFFFFF",
                                color: "#006B3C",
                                border: "1px solid #006B3C",
                                borderRadius: "6px",
                                padding: "0.45rem 1rem",
                                transition: "all 0.15s ease-in-out",
                            }, onClick: () => loadDashboard(true), disabled: refreshing, "aria-label": "Refresh dashboard metrics", children: [_jsx("span", { style: { display: "inline-block", transform: refreshing ? "rotate(360deg)" : "none", transition: "transform 0.5s ease" }, children: "\uD83D\uDD04" }), _jsx("span", { children: refreshing ? "Refreshing..." : "Refresh" })] }) })] }), _jsxs("div", { id: "staff-dashboard-metrics-grid", className: "row g-3 mb-4", children: [_jsx("div", { className: "col-12 col-sm-6 col-lg", style: { minWidth: 210 }, children: _jsxs("div", { id: "metric-card-new", role: "button", tabIndex: 0, className: "card border-0 shadow-sm p-3 h-100", style: {
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderTop: "4px solid #3B82F6",
                                cursor: "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, onClick: () => onNavigateQueue({ status: "New" }), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateQueue({ status: "New" });
                                }
                            }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx("span", { className: "text-muted fw-bold", style: { fontSize: "0.82rem", textTransform: "uppercase" }, children: "New" }), _jsx("span", { style: { fontSize: "1.1rem" }, children: "\uD83C\uDD95" })] }), _jsx("div", { id: "metric-count-new", className: "fw-bold mb-2", style: { fontSize: "2rem", color: "#1F2937", lineHeight: 1 }, children: metrics.new.count }), _jsx("div", { id: "metric-trend-new", children: renderTrend(metrics.new.deltaFromYesterday) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg", style: { minWidth: 210 }, children: _jsxs("div", { id: "metric-card-open", role: "button", tabIndex: 0, className: "card border-0 shadow-sm p-3 h-100", style: {
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderTop: "4px solid #10B981",
                                cursor: "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, onClick: () => onNavigateQueue({ status: "Open" }), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateQueue({ status: "Open" });
                                }
                            }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx("span", { className: "text-muted fw-bold", style: { fontSize: "0.82rem", textTransform: "uppercase" }, children: "Open" }), _jsx("span", { style: { fontSize: "1.1rem" }, children: "\uD83D\uDCC2" })] }), _jsx("div", { id: "metric-count-open", className: "fw-bold mb-2", style: { fontSize: "2rem", color: "#1F2937", lineHeight: 1 }, children: metrics.open.count }), _jsx("div", { id: "metric-trend-open", children: renderTrend(metrics.open.deltaFromYesterday) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg", style: { minWidth: 210 }, children: _jsxs("div", { id: "metric-card-inprogress", role: "button", tabIndex: 0, className: "card border-0 shadow-sm p-3 h-100", style: {
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderTop: "4px solid #006B3C",
                                cursor: "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, onClick: () => onNavigateQueue({ status: "InProgress" }), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateQueue({ status: "InProgress" });
                                }
                            }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx("span", { className: "text-muted fw-bold", style: { fontSize: "0.82rem", textTransform: "uppercase" }, children: "In Progress" }), _jsx("span", { style: { fontSize: "1.1rem" }, children: "\u2699\uFE0F" })] }), _jsx("div", { id: "metric-count-inprogress", className: "fw-bold mb-2", style: { fontSize: "2rem", color: "#1F2937", lineHeight: 1 }, children: metrics.inProgress.count }), _jsx("div", { id: "metric-trend-inprogress", children: renderTrend(metrics.inProgress.deltaFromYesterday) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg", style: { minWidth: 210 }, children: _jsxs("div", { id: "metric-card-waiting", role: "button", tabIndex: 0, className: "card border-0 shadow-sm p-3 h-100", style: {
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderTop: "4px solid #F59E0B",
                                cursor: "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, onClick: () => onNavigateQueue({ status: "WaitingForRequester" }), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateQueue({ status: "WaitingForRequester" });
                                }
                            }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx("span", { className: "text-muted fw-bold", style: { fontSize: "0.82rem", textTransform: "uppercase" }, children: "Waiting for Requester" }), _jsx("span", { style: { fontSize: "1.1rem" }, children: "\u23F3" })] }), _jsx("div", { id: "metric-count-waiting", className: "fw-bold mb-2", style: { fontSize: "2rem", color: "#1F2937", lineHeight: 1 }, children: metrics.waitingForRequester.count }), _jsx("div", { id: "metric-trend-waiting", children: renderTrend(metrics.waitingForRequester.deltaFromYesterday) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg", style: { minWidth: 210 }, children: _jsxs("div", { id: "metric-card-my-assigned", role: "button", tabIndex: 0, className: "card border-0 shadow-sm p-3 h-100", style: {
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderTop: "4px solid #8B5CF6",
                                cursor: "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, onClick: () => onNavigateQueue({ assignedToMe: true }), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateQueue({ assignedToMe: true });
                                }
                            }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx("span", { className: "text-muted fw-bold", style: { fontSize: "0.82rem", textTransform: "uppercase" }, children: "My Assigned" }), _jsx("span", { style: { fontSize: "1.1rem" }, children: "\uD83D\uDC64" })] }), _jsx("div", { id: "metric-count-my-assigned", className: "fw-bold mb-2", style: { fontSize: "2rem", color: "#1F2937", lineHeight: 1 }, children: metrics.myAssigned.count }), _jsx("div", { id: "metric-trend-my-assigned", children: renderTrend(metrics.myAssigned.deltaFromYesterday) })] }) })] }), _jsxs("div", { className: "row g-4", children: [_jsx("div", { className: "col-12 col-lg-8", children: _jsxs("div", { id: "recent-tickets-section", className: "card border-0 shadow-sm", style: { borderRadius: 8, overflow: "hidden", backgroundColor: "#FFFFFF" }, children: [_jsxs("div", { className: "p-3 d-flex justify-content-between align-items-center border-bottom flex-wrap gap-2", style: { borderColor: "#E5E7EB" }, children: [_jsxs("div", { children: [_jsx("h3", { className: "h6 fw-bold mb-0", style: { color: "#1F2937" }, children: "My Recent Tickets" }), _jsx("span", { className: "text-muted", style: { fontSize: "0.78rem" }, children: "Tickets assigned to or updated by you" })] }), _jsx("button", { type: "button", id: "btn-view-all-recent", className: "btn btn-sm fw-semibold", style: { color: "#006B3C", padding: 0 }, onClick: () => onNavigateQueue(), children: "View all \u2192" })] }), _jsx("div", { className: "table-responsive", children: recentTickets.length === 0 ? (_jsxs("div", { id: "recent-tickets-empty", className: "text-center py-5 px-3", children: [_jsx("div", { style: { fontSize: "2rem", marginBottom: "0.5rem" }, children: "\uD83D\uDCED" }), _jsx("h6", { className: "fw-bold text-dark mb-1", children: "No recent tickets found" }), _jsx("p", { className: "text-muted mb-3", style: { fontSize: "0.85rem" }, children: "Browse the ticket queue to claim active requests and start working." }), _jsx("button", { type: "button", className: "btn btn-sm text-white fw-semibold px-3", style: { backgroundColor: "#006B3C" }, onClick: () => onNavigateQueue(), children: "Browse Ticket Queue" })] })) : (_jsxs("table", { id: "recent-tickets-table", className: "table table-hover align-middle mb-0", children: [_jsx("thead", { style: { backgroundColor: "#F9FAFB", fontSize: "0.8rem", color: "#4B5563" }, children: _jsxs("tr", { children: [_jsx("th", { className: "py-2 px-3", children: "Ticket ID" }), _jsx("th", { className: "py-2 px-3", children: "Summary" }), _jsx("th", { className: "py-2 px-3", children: "Status" }), _jsx("th", { className: "py-2 px-3", children: "Last Updated" }), _jsx("th", { className: "py-2 px-3 text-end", children: "Action" })] }) }), _jsx("tbody", { style: { fontSize: "0.86rem" }, children: recentTickets.map((t) => (_jsxs("tr", { id: `recent-ticket-row-${t.id}`, style: { cursor: "pointer" }, onClick: () => onSelectTicket(t.id), children: [_jsx("td", { className: "py-3 px-3 fw-bold", style: { color: "#006B3C" }, children: t.ticketNo }), _jsx("td", { className: "py-3 px-3 text-truncate", style: { maxWidth: 260 }, children: _jsx("span", { className: "fw-semibold text-dark", children: t.summary }) }), _jsx("td", { className: "py-3 px-3", children: renderStatusBadge(t.status) }), _jsx("td", { className: "py-3 px-3 text-muted", style: { fontSize: "0.8rem" }, children: formatDate(t.updatedAt) }), _jsx("td", { className: "py-3 px-3 text-end", onClick: (e) => e.stopPropagation(), children: _jsx("button", { type: "button", id: `btn-view-ticket-${t.id}`, className: "btn btn-sm btn-outline-secondary py-1 px-2 fw-semibold", style: { fontSize: "0.78rem" }, onClick: () => onSelectTicket(t.id), children: "View" }) })] }, t.id))) })] })) })] }) }), _jsxs("div", { className: "col-12 col-lg-4", children: [_jsxs("div", { id: "quick-actions-panel", className: "card border-0 shadow-sm mb-4", style: { borderRadius: 8, backgroundColor: "#FFFFFF" }, children: [_jsx("div", { className: "p-3 border-bottom", style: { borderColor: "#E5E7EB" }, children: _jsx("h3", { className: "h6 fw-bold mb-0", style: { color: "#1F2937" }, children: "Quick Actions" }) }), _jsxs("div", { className: "p-3 d-flex flex-column gap-2", children: [_jsxs("div", { id: "qa-create-ticket", role: "button", tabIndex: 0, className: "p-3 border rounded d-flex align-items-center gap-3", style: {
                                                    backgroundColor: "#F9FAFB",
                                                    borderColor: "#E5E7EB",
                                                    cursor: "pointer",
                                                    transition: "background-color 0.15s ease",
                                                }, onClick: handleCreateTicketAction, onKeyDown: (e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        handleCreateTicketAction();
                                                    }
                                                }, children: [_jsx("div", { className: "d-flex align-items-center justify-content-center rounded-circle", style: { width: 40, height: 40, backgroundColor: "#EAF6EF", color: "#006B3C", fontSize: "1.2rem" }, children: "\u2795" }), _jsxs("div", { children: [_jsx("div", { className: "fw-bold text-dark", style: { fontSize: "0.9rem" }, children: "+ Create Ticket" }), _jsx("div", { className: "text-muted", style: { fontSize: "0.78rem" }, children: "Submit a new request" })] })] }), _jsxs("div", { id: "qa-search-tickets", role: "button", tabIndex: 0, className: "p-3 border rounded d-flex align-items-center gap-3", style: {
                                                    backgroundColor: "#F9FAFB",
                                                    borderColor: "#E5E7EB",
                                                    cursor: "pointer",
                                                    transition: "background-color 0.15s ease",
                                                }, onClick: () => onNavigateQueue({ focusSearch: true }), onKeyDown: (e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        onNavigateQueue({ focusSearch: true });
                                                    }
                                                }, children: [_jsx("div", { className: "d-flex align-items-center justify-content-center rounded-circle", style: { width: 40, height: 40, backgroundColor: "#EFF6FF", color: "#1D4ED8", fontSize: "1.2rem" }, children: "\uD83D\uDD0D" }), _jsxs("div", { children: [_jsx("div", { className: "fw-bold text-dark", style: { fontSize: "0.9rem" }, children: "Search Tickets" }), _jsx("div", { className: "text-muted", style: { fontSize: "0.78rem" }, children: "Search by number or keyword" })] })] }), _jsxs("div", { id: "qa-my-queue", role: "button", tabIndex: 0, className: "p-3 border rounded d-flex align-items-center gap-3", style: {
                                                    backgroundColor: "#F9FAFB",
                                                    borderColor: "#E5E7EB",
                                                    cursor: "pointer",
                                                    transition: "background-color 0.15s ease",
                                                }, onClick: () => onNavigateQueue({ assignedToMe: true }), onKeyDown: (e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        onNavigateQueue({ assignedToMe: true });
                                                    }
                                                }, children: [_jsx("div", { className: "d-flex align-items-center justify-content-center rounded-circle", style: { width: 40, height: 40, backgroundColor: "#F3E8FF", color: "#7E22CE", fontSize: "1.2rem" }, children: "\uD83D\uDCCB" }), _jsxs("div", { children: [_jsx("div", { className: "fw-bold text-dark", style: { fontSize: "0.9rem" }, children: "My Queue" }), _jsx("div", { className: "text-muted", style: { fontSize: "0.78rem" }, children: "View tickets assigned to you" })] })] })] })] }), currentUser.role === "ADMINISTRATOR" && adminCounts && (_jsxs("div", { id: "admin-user-summary-card", className: "card border-0 shadow-sm", style: { borderRadius: 8, backgroundColor: "#FFFBEB", borderLeft: "4px solid #F59E0B" }, children: [_jsxs("div", { className: "p-3 border-bottom d-flex justify-content-between align-items-center", style: { borderColor: "#FDE68A" }, children: [_jsx("span", { className: "fw-bold", style: { color: "#92400E", fontSize: "0.88rem" }, children: "\uD83D\uDC65 User Administration" }), onNavigateUserManagement && (_jsx("button", { type: "button", className: "btn btn-sm btn-link p-0 fw-semibold", style: { color: "#92400E", fontSize: "0.8rem", textDecoration: "none" }, onClick: onNavigateUserManagement, children: "Manage Users \u2192" }))] }), _jsx("div", { className: "p-3", children: _jsxs("div", { className: "d-flex justify-content-around text-center", children: [_jsxs("div", { children: [_jsx("div", { className: "fw-bold text-dark", style: { fontSize: "1.4rem" }, children: adminCounts.totalUsers }), _jsx("div", { className: "text-muted", style: { fontSize: "0.75rem" }, children: "Total Users" })] }), _jsx("div", { style: { borderRight: "1px solid #FCD34D" } }), _jsxs("div", { children: [_jsx("div", { className: "fw-bold text-success", style: { fontSize: "1.4rem" }, children: adminCounts.activeUsers }), _jsx("div", { className: "text-muted", style: { fontSize: "0.75rem" }, children: "Active Users" })] })] }) })] }))] })] })] }));
}
