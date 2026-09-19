import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useId } from "react";
import { fetchCategories, fetchStaffTickets, } from "./api.js";
export default function StaffTicketQueue({ onSelectTicket, currentUser, }) {
    const searchInputId = useId();
    const categorySelectId = useId();
    const statusSelectId = useId();
    const prioritySelectId = useId();
    const ownerSelectId = useId();
    const [tickets, setTickets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Filter and Query state
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState("");
    const [priority, setPriority] = useState("");
    const [owner, setOwner] = useState("");
    // Sort state
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;
    // Load categories once
    useEffect(() => {
        fetchCategories()
            .then((cats) => setCategories(cats))
            .catch((err) => console.error("Failed to load categories", err));
    }, []);
    // Fetch staff tickets when query params change
    useEffect(() => {
        let isCancelled = false;
        setLoading(true);
        setError(null);
        fetchStaffTickets({
            search: search.trim() || undefined,
            category: category || undefined,
            status: status || undefined,
            priority: priority || undefined,
            owner: owner || undefined,
            sortBy,
            sortOrder,
            page,
            limit,
        })
            .then((res) => {
            if (!isCancelled) {
                setTickets(res.items || []);
                setTotalItems(res.pagination.totalItems);
                setTotalPages(res.pagination.totalPages || 1);
                setLoading(false);
            }
        })
            .catch((err) => {
            if (!isCancelled) {
                setError(err?.message || "Failed to load IT staff tickets.");
                setLoading(false);
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [search, category, status, priority, owner, sortBy, sortOrder, page]);
    // Reset to page 1 whenever filters change
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };
    const handleCategoryChange = (e) => {
        setCategory(e.target.value);
        setPage(1);
    };
    const handleStatusChange = (e) => {
        setStatus(e.target.value);
        setPage(1);
    };
    const handlePriorityChange = (e) => {
        setPriority(e.target.value);
        setPage(1);
    };
    const handleOwnerChange = (e) => {
        setOwner(e.target.value);
        setPage(1);
    };
    const handleClearFilters = () => {
        setSearch("");
        setCategory("");
        setStatus("");
        setPriority("");
        setOwner("");
        setSortBy("createdAt");
        setSortOrder("desc");
        setPage(1);
    };
    const hasActiveFilters = Boolean(search || category || status || priority || owner);
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        }
        else {
            setSortBy(field);
            setSortOrder("asc");
        }
        setPage(1);
    };
    // Helper for priority badges with accessible glyphs
    const renderPriorityBadge = (p) => {
        const val = p || "MEDIUM";
        switch (val) {
            case "LOW":
                return (_jsx("span", { style: {
                        backgroundColor: "#F3F4F6",
                        color: "#374151",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "12px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        border: "1px solid #D1D5DB",
                    }, children: "\u2193 Low" }));
            case "MEDIUM":
                return (_jsx("span", { style: {
                        backgroundColor: "#E0E7FF",
                        color: "#3730A3",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "12px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        border: "1px solid #C7D2FE",
                    }, children: "= Medium" }));
            case "HIGH":
                return (_jsx("span", { style: {
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "12px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        border: "1px solid #FCD34D",
                    }, children: "\u2191 High" }));
            case "URGENT":
                return (_jsx("span", { style: {
                        backgroundColor: "#FEE2E2",
                        color: "#991B1B",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "12px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        border: "1px solid #F87171",
                    }, children: "\u26A1 Urgent" }));
            default:
                return _jsx("span", { children: val });
        }
    };
    // Helper for status badges with accessible non-color indicators
    const renderStatusBadge = (s) => {
        const statusKey = s ? s.trim() : "New";
        if (statusKey === "New") {
            return (_jsx("span", { style: {
                    backgroundColor: "#EAF6EF",
                    color: "#006B3C",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid #B5D5C5",
                }, children: "\u25CF New" }));
        }
        if (statusKey === "InProgress" || statusKey === "In Progress") {
            return (_jsx("span", { style: {
                    backgroundColor: "#E0E7FF",
                    color: "#3730A3",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid #A5B4FC",
                }, children: "\u2699 In Progress" }));
        }
        if (statusKey === "Assigned") {
            return (_jsx("span", { style: {
                    backgroundColor: "#E0F2FE",
                    color: "#0369A1",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid #7DD3FC",
                }, children: "\uD83D\uDC64 Assigned" }));
        }
        if (statusKey === "Pending") {
            return (_jsx("span", { style: {
                    backgroundColor: "#FEF3C7",
                    color: "#92400E",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid #F59E0B",
                }, children: "\u23F1 Pending" }));
        }
        if (statusKey === "Resolved") {
            return (_jsx("span", { style: {
                    backgroundColor: "#D1FAE5",
                    color: "#065F46",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid #34D399",
                }, children: "\u2713 Resolved" }));
        }
        if (statusKey === "Closed") {
            return (_jsx("span", { style: {
                    backgroundColor: "#F1F5F9",
                    color: "#475569",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid #CBD5E1",
                }, children: "\u2715 Closed" }));
        }
        return (_jsx("span", { style: {
                backgroundColor: "#F3F4F6",
                color: "#4B5563",
                padding: "0.25rem 0.6rem",
                borderRadius: "12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "1px solid #D1D5DB",
            }, children: statusKey }));
    };
    const startRecord = totalItems === 0 ? 0 : (page - 1) * limit + 1;
    const endRecord = Math.min(page * limit, totalItems);
    return (_jsxs("div", { style: { maxWidth: "1440px", margin: "0 auto" }, children: [_jsx("style", { children: `
        .staff-queue-desktop {
          display: block;
        }
        .staff-queue-mobile {
          display: none;
        }
        @media (max-width: 767px) {
          .staff-queue-desktop {
            display: none !important;
          }
          .staff-queue-mobile {
            display: flex !important;
            flex-direction: column;
            gap: 1rem;
          }
        }
      ` }), _jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                }, children: [_jsxs("div", { children: [_jsx("h2", { style: {
                                    fontSize: "1.75rem",
                                    fontWeight: 700,
                                    color: "#006B3C",
                                    margin: "0 0 0.25rem 0",
                                }, children: "IT Staff Ticket Queue" }), _jsx("p", { style: { margin: 0, color: "#5B6573", fontSize: "0.95rem" }, children: "Operational shared queue with search, filtering, and priority management." })] }), _jsx("div", { id: "queue-results-counter", style: {
                            fontSize: "0.9rem",
                            color: "#5B6573",
                            fontWeight: 500,
                            backgroundColor: "#FFFFFF",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "6px",
                            border: "1px solid #E5E7EB",
                        }, children: totalItems === 0
                            ? "Showing 0 tickets"
                            : `Showing ${startRecord} to ${endRecord} of ${totalItems} tickets` })] }), _jsxs("div", { style: {
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    padding: "1.25rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    marginBottom: "1.5rem",
                    border: "1px solid #E5E7EB",
                }, children: [_jsxs("div", { style: {
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "1rem",
                            alignItems: "end",
                        }, children: [_jsxs("div", { style: { gridColumn: "span 2", minWidth: "240px" }, children: [_jsx("label", { htmlFor: searchInputId, style: {
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 700,
                                            color: "#5B6573",
                                            marginBottom: "0.35rem",
                                        }, children: "Search" }), _jsxs("div", { style: { position: "relative" }, children: [_jsx("input", { id: searchInputId, "aria-label": "Search tickets", type: "text", placeholder: "Search by ticket number or summary...", value: search, onChange: handleSearchChange, style: {
                                                    width: "100%",
                                                    padding: "0.55rem 0.75rem 0.55rem 2rem",
                                                    fontSize: "0.9rem",
                                                    borderRadius: "6px",
                                                    border: "1px solid #D1D5DB",
                                                    outline: "none",
                                                    boxSizing: "border-box",
                                                } }), _jsx("span", { style: {
                                                    position: "absolute",
                                                    left: "0.65rem",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    color: "#9CA3AF",
                                                    pointerEvents: "none",
                                                }, children: "\uD83D\uDD0D" })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: categorySelectId, style: {
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 700,
                                            color: "#5B6573",
                                            marginBottom: "0.35rem",
                                        }, children: "Category" }), _jsxs("select", { id: categorySelectId, "aria-label": "Filter by category", value: category, onChange: handleCategoryChange, style: {
                                            width: "100%",
                                            padding: "0.55rem 0.75rem",
                                            fontSize: "0.9rem",
                                            borderRadius: "6px",
                                            border: "1px solid #D1D5DB",
                                            backgroundColor: "#FFFFFF",
                                            boxSizing: "border-box",
                                        }, children: [_jsx("option", { value: "", children: "All Categories" }), categories.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: statusSelectId, style: {
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 700,
                                            color: "#5B6573",
                                            marginBottom: "0.35rem",
                                        }, children: "Status" }), _jsxs("select", { id: statusSelectId, "aria-label": "Filter by status", value: status, onChange: handleStatusChange, style: {
                                            width: "100%",
                                            padding: "0.55rem 0.75rem",
                                            fontSize: "0.9rem",
                                            borderRadius: "6px",
                                            border: "1px solid #D1D5DB",
                                            backgroundColor: "#FFFFFF",
                                            boxSizing: "border-box",
                                        }, children: [_jsx("option", { value: "", children: "All Statuses" }), _jsx("option", { value: "New", children: "New" }), _jsx("option", { value: "InProgress", children: "In Progress" }), _jsx("option", { value: "Assigned", children: "Assigned" }), _jsx("option", { value: "Pending", children: "Pending" }), _jsx("option", { value: "Resolved", children: "Resolved" }), _jsx("option", { value: "Closed", children: "Closed" })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: prioritySelectId, style: {
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 700,
                                            color: "#5B6573",
                                            marginBottom: "0.35rem",
                                        }, children: "Priority" }), _jsxs("select", { id: prioritySelectId, "aria-label": "Filter by priority", value: priority, onChange: handlePriorityChange, style: {
                                            width: "100%",
                                            padding: "0.55rem 0.75rem",
                                            fontSize: "0.9rem",
                                            borderRadius: "6px",
                                            border: "1px solid #D1D5DB",
                                            backgroundColor: "#FFFFFF",
                                            boxSizing: "border-box",
                                        }, children: [_jsx("option", { value: "", children: "All Priorities" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: ownerSelectId, style: {
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 700,
                                            color: "#5B6573",
                                            marginBottom: "0.35rem",
                                        }, children: "Ticket Owner" }), _jsxs("select", { id: ownerSelectId, "aria-label": "Filter by owner", value: owner, onChange: handleOwnerChange, style: {
                                            width: "100%",
                                            padding: "0.55rem 0.75rem",
                                            fontSize: "0.9rem",
                                            borderRadius: "6px",
                                            border: "1px solid #D1D5DB",
                                            backgroundColor: "#FFFFFF",
                                            boxSizing: "border-box",
                                        }, children: [_jsx("option", { value: "", children: "All Tickets" }), _jsx("option", { value: "unassigned", children: "Unassigned" }), _jsx("option", { value: "me", children: "Assigned to Me" })] })] })] }), hasActiveFilters && (_jsx("div", { style: {
                            marginTop: "1rem",
                            display: "flex",
                            justifyContent: "flex-end",
                        }, children: _jsx("button", { id: "queue-clear-filters-button", type: "button", onClick: handleClearFilters, style: {
                                backgroundColor: "#EAF6EF",
                                color: "#006B3C",
                                border: "1px solid #0B7A46",
                                padding: "0.4rem 0.9rem",
                                borderRadius: "6px",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                            }, children: "\u2715 Clear Filters" }) }))] }), error && (_jsx("div", { style: {
                    padding: "1rem",
                    marginBottom: "1.5rem",
                    backgroundColor: "#FCE8E6",
                    border: "1px solid #B3261E",
                    borderRadius: "6px",
                    color: "#B3261E",
                    fontSize: "0.9rem",
                }, children: error })), loading ? (_jsx("div", { style: {
                    textAlign: "center",
                    padding: "3.5rem 1rem",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                }, children: _jsx("div", { style: { fontSize: "1.15rem", fontWeight: 600, color: "#006B3C" }, children: "Loading IT staff ticket queue..." }) })) : tickets.length === 0 ? (
            /* Empty State */
            _jsxs("div", { id: "queue-empty-state", style: {
                    textAlign: "center",
                    padding: "3.5rem 1.5rem",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px dashed #CBD5E1",
                }, children: [_jsx("div", { style: { fontSize: "2.5rem", marginBottom: "0.75rem" }, children: "\uD83D\uDCED" }), _jsx("h3", { style: {
                            margin: "0 0 0.5rem 0",
                            color: "#1F2937",
                            fontSize: "1.25rem",
                            fontWeight: 700,
                        }, children: "No tickets in queue" }), _jsx("p", { style: { color: "#5B6573", fontSize: "0.95rem", margin: 0 }, children: hasActiveFilters
                            ? "No tickets match your search filters. Try adjusting or clearing search parameters."
                            : "There are currently no tickets submitted to the support queue." }), hasActiveFilters && (_jsx("button", { type: "button", onClick: handleClearFilters, style: {
                            marginTop: "1rem",
                            backgroundColor: "#EAF6EF",
                            color: "#006B3C",
                            border: "1px solid #0B7A46",
                            padding: "0.5rem 1.1rem",
                            borderRadius: "6px",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }, children: "Clear Filters" }))] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "staff-queue-desktop", style: {
                            backgroundColor: "#FFFFFF",
                            borderRadius: "8px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            overflowX: "auto",
                            border: "1px solid #E5E7EB",
                        }, children: _jsxs("table", { id: "staff-queue-table", style: {
                                width: "100%",
                                borderCollapse: "collapse",
                                textAlign: "left",
                                fontSize: "0.9rem",
                            }, children: [_jsx("thead", { children: _jsxs("tr", { style: {
                                            backgroundColor: "#006B3C",
                                            borderBottom: "2px solid #0B7A46",
                                            color: "#FFFFFF",
                                        }, children: [_jsxs("th", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    fontWeight: 700,
                                                    cursor: "pointer",
                                                    whiteSpace: "nowrap",
                                                }, onClick: () => handleSort("ticketNo"), title: "Sort by Ticket Number", children: ["Ticket No. ", sortBy === "ticketNo" && (sortOrder === "asc" ? "↑" : "↓")] }), _jsxs("th", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    fontWeight: 700,
                                                    cursor: "pointer",
                                                    whiteSpace: "nowrap",
                                                }, onClick: () => handleSort("createdAt"), title: "Sort by Created Date", children: ["Created Date ", sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")] }), _jsx("th", { style: { padding: "0.85rem 0.85rem", fontWeight: 700 }, children: "Summary" }), _jsx("th", { style: { padding: "0.85rem 0.85rem", fontWeight: 700, whiteSpace: "nowrap" }, children: "Category" }), _jsxs("th", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    fontWeight: 700,
                                                    whiteSpace: "nowrap",
                                                    textAlign: "center",
                                                    cursor: "pointer",
                                                }, onClick: () => handleSort("requestedPriority"), title: "Sort by Requested Priority", children: ["Req. Priority ", sortBy === "requestedPriority" && (sortOrder === "asc" ? "↑" : "↓")] }), _jsxs("th", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    fontWeight: 700,
                                                    whiteSpace: "nowrap",
                                                    textAlign: "center",
                                                    cursor: "pointer",
                                                }, onClick: () => handleSort("itPriority"), title: "Sort by IT Priority", children: ["IT Priority ", sortBy === "itPriority" && (sortOrder === "asc" ? "↑" : "↓")] }), _jsxs("th", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    fontWeight: 700,
                                                    whiteSpace: "nowrap",
                                                    cursor: "pointer",
                                                }, onClick: () => handleSort("status"), title: "Sort by Status", children: ["Status ", sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")] }), _jsx("th", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    fontWeight: 700,
                                                    whiteSpace: "nowrap",
                                                }, children: "Owner" }), _jsxs("th", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    fontWeight: 700,
                                                    whiteSpace: "nowrap",
                                                    cursor: "pointer",
                                                }, onClick: () => handleSort("updatedAt"), title: "Sort by Last Updated", children: ["Last Updated ", sortBy === "updatedAt" && (sortOrder === "asc" ? "↑" : "↓")] })] }) }), _jsx("tbody", { children: tickets.map((t) => (_jsxs("tr", { "data-ticket-id": t.id, style: {
                                            borderBottom: "1px solid #E5E7EB",
                                            transition: "background-color 0.15s ease",
                                        }, onMouseEnter: (e) => {
                                            e.currentTarget.style.backgroundColor = "#EAF6EF";
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                        }, children: [_jsx("td", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    fontWeight: 700,
                                                    whiteSpace: "nowrap",
                                                    verticalAlign: "middle",
                                                }, children: _jsx("button", { type: "button", onClick: () => onSelectTicket?.(t.id), style: {
                                                        background: "none",
                                                        border: "none",
                                                        color: "#006B3C",
                                                        fontWeight: 700,
                                                        fontSize: "0.92rem",
                                                        cursor: "pointer",
                                                        padding: 0,
                                                        textDecoration: "underline",
                                                    }, children: t.ticketNo }) }), _jsx("td", { title: new Date(t.createdAt).toLocaleString(), style: {
                                                    padding: "0.85rem 0.85rem",
                                                    color: "#6B7280",
                                                    fontSize: "0.85rem",
                                                    whiteSpace: "nowrap",
                                                    verticalAlign: "middle",
                                                }, children: new Date(t.createdAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                }) }), _jsx("td", { title: t.summary, style: {
                                                    padding: "0.85rem 0.85rem",
                                                    maxWidth: "260px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    color: "#1F2937",
                                                    fontWeight: 500,
                                                    verticalAlign: "middle",
                                                }, children: t.summary }), _jsx("td", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    color: "#4B5563",
                                                    whiteSpace: "nowrap",
                                                    verticalAlign: "middle",
                                                }, children: t.category?.name || "—" }), _jsx("td", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    whiteSpace: "nowrap",
                                                    verticalAlign: "middle",
                                                    textAlign: "center",
                                                }, children: renderPriorityBadge(t.requestedPriority) }), _jsx("td", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    whiteSpace: "nowrap",
                                                    verticalAlign: "middle",
                                                    textAlign: "center",
                                                }, children: renderPriorityBadge(t.itPriority) }), _jsx("td", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    whiteSpace: "nowrap",
                                                    verticalAlign: "middle",
                                                }, children: renderStatusBadge(t.status) }), _jsx("td", { style: {
                                                    padding: "0.85rem 0.85rem",
                                                    whiteSpace: "nowrap",
                                                    verticalAlign: "middle",
                                                    fontWeight: t.owner ? 600 : 400,
                                                    color: t.owner ? "#1F2937" : "#9CA3AF",
                                                }, children: t.owner?.displayName || "Unassigned" }), _jsx("td", { title: new Date(t.updatedAt || t.createdAt).toLocaleString(), style: {
                                                    padding: "0.85rem 0.85rem",
                                                    color: "#6B7280",
                                                    fontSize: "0.85rem",
                                                    whiteSpace: "nowrap",
                                                    verticalAlign: "middle",
                                                }, children: new Date(t.updatedAt || t.createdAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                }) })] }, t.id))) })] }) }), _jsx("div", { className: "staff-queue-mobile", children: tickets.map((t) => (_jsxs("div", { "data-ticket-id": t.id, style: {
                                backgroundColor: "#FFFFFF",
                                borderRadius: "8px",
                                padding: "1rem",
                                border: "1px solid #E5E7EB",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            }, children: [_jsxs("div", { style: {
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "0.5rem",
                                    }, children: [_jsx("span", { style: {
                                                fontWeight: 700,
                                                color: "#006B3C",
                                                fontSize: "1rem",
                                            }, children: t.ticketNo }), renderStatusBadge(t.status)] }), _jsx("h4", { style: {
                                        fontSize: "0.98rem",
                                        fontWeight: 600,
                                        color: "#1F2937",
                                        margin: "0 0 0.6rem 0",
                                        lineHeight: 1.35,
                                    }, children: t.summary }), _jsxs("div", { style: {
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.35rem",
                                        fontSize: "0.85rem",
                                        color: "#5B6573",
                                        marginBottom: "0.85rem",
                                    }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { children: "Category:" }), _jsx("strong", { style: { color: "#1F2937" }, children: t.category?.name || "—" })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { children: "Req. Priority:" }), _jsx("span", { children: renderPriorityBadge(t.requestedPriority) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { children: "IT Priority:" }), _jsx("span", { children: renderPriorityBadge(t.itPriority) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { children: "Owner:" }), _jsx("strong", { style: { color: t.owner ? "#1F2937" : "#9CA3AF" }, children: t.owner?.displayName || "Unassigned" })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { children: "Requester:" }), _jsx("strong", { style: { color: "#1F2937" }, children: t.requester?.displayName || "—" })] })] }), _jsxs("div", { style: {
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingTop: "0.75rem",
                                        borderTop: "1px solid #F3F4F6",
                                    }, children: [_jsx("span", { style: { fontSize: "0.78rem", color: "#6B7280" }, children: new Date(t.createdAt).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            }) }), _jsx("button", { type: "button", onClick: () => onSelectTicket?.(t.id), style: {
                                                backgroundColor: "#006B3C",
                                                color: "#FFFFFF",
                                                border: "none",
                                                padding: "0.45rem 1rem",
                                                borderRadius: "6px",
                                                fontSize: "0.85rem",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }, children: "View Details" })] })] }, t.id))) }), totalPages > 1 && (_jsxs("div", { id: "queue-pagination", style: {
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "0.4rem",
                            marginTop: "1.5rem",
                            flexWrap: "wrap",
                        }, children: [_jsx("button", { type: "button", id: "queue-prev-page-button", onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page <= 1, style: {
                                    backgroundColor: page <= 1 ? "#F3F4F6" : "#FFFFFF",
                                    color: page <= 1 ? "#9CA3AF" : "#006B3C",
                                    border: "1px solid #D1D5DB",
                                    padding: "0.45rem 0.85rem",
                                    borderRadius: "6px",
                                    fontSize: "0.88rem",
                                    fontWeight: 600,
                                    cursor: page <= 1 ? "not-allowed" : "pointer",
                                }, children: "< Previous" }), Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (_jsx("button", { type: "button", onClick: () => setPage(p), style: {
                                    backgroundColor: page === p ? "#006B3C" : "#FFFFFF",
                                    color: page === p ? "#FFFFFF" : "#1F2937",
                                    border: page === p ? "1px solid #006B3C" : "1px solid #D1D5DB",
                                    padding: "0.45rem 0.8rem",
                                    borderRadius: "6px",
                                    fontSize: "0.88rem",
                                    fontWeight: page === p ? 700 : 500,
                                    cursor: "pointer",
                                    minWidth: "36px",
                                }, children: p }, p))), _jsx("button", { type: "button", id: "queue-next-page-button", onClick: () => setPage((p) => Math.min(totalPages, p + 1)), disabled: page >= totalPages, style: {
                                    backgroundColor: page >= totalPages ? "#F3F4F6" : "#FFFFFF",
                                    color: page >= totalPages ? "#9CA3AF" : "#006B3C",
                                    border: "1px solid #D1D5DB",
                                    padding: "0.45rem 0.85rem",
                                    borderRadius: "6px",
                                    fontSize: "0.88rem",
                                    fontWeight: 600,
                                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                                }, children: "Next >" })] }))] }))] }));
}
