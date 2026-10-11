import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { fetchRequesterDashboard, } from "./api.js";
export default function RequesterDashboard({ currentUser, onNavigateMyTickets, onNavigateCreateTicket, onSelectTicket, }) {
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
            const data = await fetchRequesterDashboard();
            setDashboardData(data);
        }
        catch (err) {
            console.error("Error loading requester dashboard:", err);
            setError(err?.message || "Failed to load requester dashboard data.");
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    useEffect(() => {
        loadDashboard(false);
    }, [loadDashboard]);
    // Helper for status badge rendering
    function renderStatusBadge(status) {
        switch (status) {
            case "New":
                return (_jsx("span", { className: "badge fw-semibold", style: { backgroundColor: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", fontSize: "0.78rem" }, children: "\u2022 New" }));
            case "Open":
                return (_jsx("span", { className: "badge fw-semibold", style: { backgroundColor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", fontSize: "0.78rem" }, children: "\u2022 Open" }));
            case "InProgress":
                return (_jsx("span", { className: "badge fw-semibold", style: { backgroundColor: "#ECFEFF", color: "#0E7490", border: "1px solid #A5F3FC", fontSize: "0.78rem" }, children: "\u2022 In Progress" }));
            case "WaitingForRequester":
                return (_jsx("span", { className: "badge fw-semibold", style: { backgroundColor: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", fontSize: "0.78rem" }, children: "\u2022 Waiting for You" }));
            case "Resolved":
                return (_jsx("span", { className: "badge fw-semibold", style: { backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #0B7A46", fontSize: "0.78rem" }, children: "\u2022 Resolved" }));
            case "Closed":
                return (_jsx("span", { className: "badge fw-semibold", style: { backgroundColor: "#F3F4F6", color: "#4B5563", border: "1px solid #D1D5DB", fontSize: "0.78rem" }, children: "\u2022 Closed" }));
            default:
                return (_jsx("span", { className: "badge fw-semibold", style: { backgroundColor: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB", fontSize: "0.78rem" }, children: status }));
        }
    }
    function formatDate(isoStr) {
        if (!isoStr)
            return "-";
        try {
            const d = new Date(isoStr);
            return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
            });
        }
        catch {
            return isoStr;
        }
    }
    // Skeleton loading state
    if (loading && !dashboardData) {
        return (_jsxs("div", { id: "requester-dashboard-loading", className: "container-fluid py-4 px-3 px-md-4", style: { maxWidth: 1280, margin: "0 auto" }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom", children: [_jsx("div", { children: _jsxs("div", { className: "placeholder-glow", children: [_jsx("div", { className: "placeholder col-8 mb-2", style: { height: 28, width: 260 } }), _jsx("div", { className: "placeholder col-6", style: { height: 16, width: 340 } })] }) }), _jsx("div", { children: _jsx("div", { className: "placeholder-glow", children: _jsx("div", { className: "placeholder", style: { width: 95, height: 34, borderRadius: 6 } }) }) })] }), _jsx("div", { className: "row g-3 mb-4", children: [1, 2, 3, 4].map((idx) => (_jsx("div", { className: "col-12 col-sm-6 col-lg-3", children: _jsxs("div", { className: "card border-0 shadow-sm p-3 placeholder-glow", style: { borderRadius: 8, height: 110 }, children: [_jsx("div", { className: "placeholder col-5 mb-3", style: { height: 14 } }), _jsx("div", { className: "placeholder col-3 mb-2", style: { height: 32 } }), _jsx("div", { className: "placeholder col-6", style: { height: 14 } })] }) }, idx))) })] }));
    }
    // Error state
    if (error && !dashboardData) {
        return (_jsx("div", { id: "requester-dashboard-error", className: "container-fluid py-4 px-3 px-md-4", style: { maxWidth: 1280, margin: "0 auto" }, children: _jsxs("div", { className: "alert alert-danger shadow-sm p-4 d-flex justify-content-between align-items-center flex-wrap gap-3", role: "alert", style: { backgroundColor: "#FCE8E6", borderColor: "#B3261E", color: "#B3261E", borderRadius: 8 }, children: [_jsxs("div", { children: [_jsx("h5", { className: "alert-heading fw-bold mb-1", children: "Failed to Load Dashboard" }), _jsx("p", { className: "mb-0", style: { fontSize: "0.9rem" }, children: error })] }), _jsx("button", { type: "button", id: "requester-dashboard-retry-btn", className: "btn btn-outline-danger fw-semibold btn-sm", onClick: () => loadDashboard(false), children: "Retry Loading" })] }) }));
    }
    const { metrics, recentTickets } = dashboardData;
    return (_jsxs("div", { id: "requester-dashboard-container", className: "container-fluid py-4 px-3 px-md-4", style: { maxWidth: 1280, margin: "0 auto" }, children: [_jsxs("div", { id: "requester-dashboard-header", className: "d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 pb-2 border-bottom", style: { borderColor: "#E5E7EB" }, children: [_jsxs("div", { children: [_jsxs("h2", { id: "requester-dashboard-welcome-msg", className: "h4 fw-bold mb-1", style: { color: "#1F2937", letterSpacing: "-0.01em" }, children: ["Welcome, ", currentUser.displayName, "!"] }), _jsx("p", { className: "text-muted mb-0", style: { fontSize: "0.9rem" }, children: "Here's the latest on your requests" })] }), _jsx("div", { children: _jsxs("button", { type: "button", id: "requester-dashboard-refresh-btn", className: "btn btn-sm fw-semibold d-flex align-items-center gap-2 shadow-sm", style: {
                                backgroundColor: "#FFFFFF",
                                color: "#006B3C",
                                border: "1px solid #006B3C",
                                borderRadius: "6px",
                                padding: "0.45rem 1rem",
                                transition: "all 0.15s ease-in-out",
                            }, onClick: () => loadDashboard(true), disabled: refreshing, "aria-label": "Refresh dashboard data", children: [_jsx("span", { style: {
                                        display: "inline-block",
                                        transform: refreshing ? "rotate(360deg)" : "none",
                                        transition: "transform 0.5s ease",
                                    }, children: "\uD83D\uDD04" }), _jsx("span", { children: refreshing ? "Refreshing..." : "Refresh" })] }) })] }), _jsxs("div", { id: "requester-dashboard-metrics-grid", className: "row g-3 mb-4", children: [_jsx("div", { className: "col-12 col-sm-6 col-lg-3", children: _jsxs("div", { id: "req-metric-card-open", role: "button", tabIndex: 0, className: "card border-0 shadow-sm p-3 h-100", style: {
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderTop: "4px solid #3B82F6",
                                cursor: "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, onClick: () => onNavigateMyTickets("Open"), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateMyTickets("Open");
                                }
                            }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx("span", { className: "text-muted fw-bold", style: { fontSize: "0.82rem", textTransform: "uppercase" }, children: "My Open Tickets" }), _jsx("span", { style: { fontSize: "1.1rem" }, children: "\uD83D\uDCC2" })] }), _jsx("div", { id: "req-metric-count-open", className: "fw-bold mb-2", style: { fontSize: "2rem", color: "#1F2937", lineHeight: 1 }, children: metrics.myOpenTickets }), _jsx("div", { children: _jsx("span", { id: "req-metric-view-open", className: "fw-semibold text-primary", style: { fontSize: "0.78rem" }, children: "View all \u2192" }) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg-3", children: _jsxs("div", { id: "req-metric-card-inprogress", role: "button", tabIndex: 0, className: "card border-0 shadow-sm p-3 h-100", style: {
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderTop: "4px solid #06B6D4",
                                cursor: "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, onClick: () => onNavigateMyTickets("InProgress"), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateMyTickets("InProgress");
                                }
                            }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx("span", { className: "text-muted fw-bold", style: { fontSize: "0.82rem", textTransform: "uppercase" }, children: "In Progress" }), _jsx("span", { style: { fontSize: "1.1rem" }, children: "\u2699\uFE0F" })] }), _jsx("div", { id: "req-metric-count-inprogress", className: "fw-bold mb-2", style: { fontSize: "2rem", color: "#1F2937", lineHeight: 1 }, children: metrics.inProgress }), _jsx("div", { children: _jsx("span", { id: "req-metric-view-inprogress", className: "fw-semibold", style: { fontSize: "0.78rem", color: "#0891B2" }, children: "View all \u2192" }) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg-3", children: _jsxs("div", { id: "req-metric-card-resolved", role: "button", tabIndex: 0, className: "card border-0 shadow-sm p-3 h-100", style: {
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderTop: "4px solid #10B981",
                                cursor: "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, onClick: () => onNavigateMyTickets("Resolved"), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateMyTickets("Resolved");
                                }
                            }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx("span", { className: "text-muted fw-bold", style: { fontSize: "0.82rem", textTransform: "uppercase" }, children: "Resolved" }), _jsx("span", { style: { fontSize: "1.1rem" }, children: "\u2705" })] }), _jsx("div", { id: "req-metric-count-resolved", className: "fw-bold mb-2", style: { fontSize: "2rem", color: "#1F2937", lineHeight: 1 }, children: metrics.resolved }), _jsx("div", { children: _jsx("span", { id: "req-metric-view-resolved", className: "fw-semibold text-success", style: { fontSize: "0.78rem" }, children: "View all \u2192" }) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg-3", children: _jsxs("div", { id: "req-metric-card-closed", role: "button", tabIndex: 0, className: "card border-0 shadow-sm p-3 h-100", style: {
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderTop: "4px solid #6B7280",
                                cursor: "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, onClick: () => onNavigateMyTickets("Closed"), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateMyTickets("Closed");
                                }
                            }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx("span", { className: "text-muted fw-bold", style: { fontSize: "0.82rem", textTransform: "uppercase" }, children: "Closed" }), _jsx("span", { style: { fontSize: "1.1rem" }, children: "\uD83D\uDD12" })] }), _jsx("div", { id: "req-metric-count-closed", className: "fw-bold mb-2", style: { fontSize: "2rem", color: "#1F2937", lineHeight: 1 }, children: metrics.closed }), _jsx("div", { children: _jsx("span", { id: "req-metric-view-closed", className: "fw-semibold text-muted", style: { fontSize: "0.78rem" }, children: "View all \u2192" }) })] }) })] }), _jsxs("div", { className: "row g-4", children: [_jsx("div", { className: "col-12 col-lg-8", children: _jsxs("div", { id: "req-recent-tickets-section", className: "card border-0 shadow-sm h-100", style: { borderRadius: 8, backgroundColor: "#FFFFFF" }, children: [_jsxs("div", { className: "p-3 border-bottom d-flex justify-content-between align-items-center", style: { borderColor: "#E5E7EB" }, children: [_jsxs("div", { children: [_jsx("h5", { className: "fw-bold text-dark mb-0", style: { fontSize: "1.05rem" }, children: "My Recent Tickets" }), _jsx("small", { className: "text-muted", style: { fontSize: "0.8rem" }, children: "Tickets submitted by you" })] }), _jsx("button", { type: "button", id: "req-btn-view-all-recent", className: "btn btn-sm btn-link p-0 fw-semibold", style: { color: "#006B3C", textDecoration: "none", fontSize: "0.85rem" }, onClick: () => onNavigateMyTickets(), children: "View all \u2192" })] }), _jsx("div", { className: "table-responsive", children: recentTickets.length === 0 ? (_jsxs("div", { id: "req-recent-tickets-empty", className: "text-center py-5 px-3", children: [_jsx("div", { style: { fontSize: "2rem", marginBottom: "0.5rem" }, children: "\uD83D\uDCED" }), _jsx("h6", { className: "fw-bold text-dark mb-1", children: "No recent tickets found" }), _jsx("p", { className: "text-muted mb-3", style: { fontSize: "0.85rem" }, children: "You haven't submitted any IT support tickets yet." }), _jsx("button", { type: "button", id: "req-btn-create-first-ticket", className: "btn btn-sm text-white fw-semibold px-3", style: { backgroundColor: "#006B3C" }, onClick: onNavigateCreateTicket, children: "+ Create your first ticket" })] })) : (_jsxs("table", { id: "req-recent-tickets-table", className: "table table-hover align-middle mb-0", children: [_jsx("thead", { style: { backgroundColor: "#F9FAFB", fontSize: "0.8rem", color: "#4B5563" }, children: _jsxs("tr", { children: [_jsx("th", { className: "py-2 px-3", children: "Ticket ID" }), _jsx("th", { className: "py-2 px-3", children: "Summary" }), _jsx("th", { className: "py-2 px-3", children: "Status" }), _jsx("th", { className: "py-2 px-3", children: "Last Updated" }), _jsx("th", { className: "py-2 px-3 text-end", children: "Action" })] }) }), _jsx("tbody", { style: { fontSize: "0.86rem" }, children: recentTickets.map((t) => (_jsxs("tr", { id: `req-recent-ticket-row-${t.id}`, style: { cursor: "pointer" }, onClick: () => onSelectTicket(t.id), children: [_jsx("td", { className: "py-3 px-3 fw-bold", style: { color: "#006B3C" }, children: t.ticketNo }), _jsx("td", { className: "py-3 px-3 text-truncate", style: { maxWidth: 280 }, children: _jsx("span", { className: "fw-semibold text-dark", children: t.summary }) }), _jsx("td", { className: "py-3 px-3", children: renderStatusBadge(t.status) }), _jsx("td", { className: "py-3 px-3 text-muted", style: { fontSize: "0.8rem" }, children: formatDate(t.updatedAt) }), _jsx("td", { className: "py-3 px-3 text-end", onClick: (e) => e.stopPropagation(), children: _jsx("button", { type: "button", id: `req-btn-view-ticket-${t.id}`, className: "btn btn-sm btn-outline-secondary py-1 px-2 fw-semibold", style: { fontSize: "0.78rem" }, onClick: () => onSelectTicket(t.id), children: "View" }) })] }, t.id))) })] })) })] }) }), _jsx("div", { className: "col-12 col-lg-4", children: _jsxs("div", { id: "req-quick-actions-card", className: "card border-0 shadow-sm", style: { borderRadius: 8, backgroundColor: "#FFFFFF" }, children: [_jsx("div", { className: "p-3 border-bottom", style: { borderColor: "#E5E7EB" }, children: _jsx("h5", { className: "fw-bold text-dark mb-0", style: { fontSize: "1.05rem" }, children: "Quick Actions" }) }), _jsxs("div", { className: "p-3 d-flex flex-column gap-3", children: [_jsxs("div", { id: "req-qa-create-ticket", role: "button", tabIndex: 0, className: "p-3 border rounded d-flex align-items-center gap-3", style: {
                                                backgroundColor: "#F9FAFB",
                                                borderColor: "#E5E7EB",
                                                cursor: "pointer",
                                                transition: "background-color 0.15s ease",
                                            }, onClick: onNavigateCreateTicket, onKeyDown: (e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    onNavigateCreateTicket();
                                                }
                                            }, children: [_jsx("div", { className: "d-flex align-items-center justify-content-center rounded-circle", style: { width: 40, height: 40, backgroundColor: "#EAF6EF", color: "#006B3C", fontSize: "1.2rem" }, children: "\u2795" }), _jsxs("div", { children: [_jsx("div", { className: "fw-bold text-dark", style: { fontSize: "0.9rem" }, children: "+ Create Ticket" }), _jsx("div", { className: "text-muted", style: { fontSize: "0.78rem" }, children: "Submit a new request" })] })] }), _jsxs("div", { id: "req-qa-my-tickets", role: "button", tabIndex: 0, className: "p-3 border rounded d-flex align-items-center gap-3", style: {
                                                backgroundColor: "#F9FAFB",
                                                borderColor: "#E5E7EB",
                                                cursor: "pointer",
                                                transition: "background-color 0.15s ease",
                                            }, onClick: () => onNavigateMyTickets(), onKeyDown: (e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    onNavigateMyTickets();
                                                }
                                            }, children: [_jsx("div", { className: "d-flex align-items-center justify-content-center rounded-circle", style: { width: 40, height: 40, backgroundColor: "#EFF6FF", color: "#2563EB", fontSize: "1.2rem" }, children: "\uD83D\uDCCB" }), _jsxs("div", { children: [_jsx("div", { className: "fw-bold text-dark", style: { fontSize: "0.9rem" }, children: "View My Tickets" }), _jsx("div", { className: "text-muted", style: { fontSize: "0.78rem" }, children: "Track existing requests" })] })] })] })] }) })] })] }));
}
