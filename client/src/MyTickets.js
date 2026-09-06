import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { fetchCategories, fetchMyTickets, } from "./api.js";
export default function MyTickets({ activeRequester, onCreateTicketClick, onSelectTicket, }) {
    const [tickets, setTickets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Filter & Pagination States
    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [status, setStatus] = useState("");
    const [priority, setPriority] = useState("");
    const [itPriority, setItPriority] = useState("");
    const [sortOption, setSortOption] = useState("createdAt:desc");
    const [page, setPage] = useState(1);
    const limit = 10;
    // Metadata
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    // Fetch reference categories on mount
    useEffect(() => {
        let isMounted = true;
        async function loadCategories() {
            try {
                const catData = await fetchCategories();
                if (isMounted)
                    setCategories(catData);
            }
            catch (err) {
                if (isMounted)
                    console.error("Failed to load categories", err);
            }
        }
        loadCategories();
        return () => {
            isMounted = false;
        };
    }, []);
    // Load tickets whenever filters, requester, or page changes
    useEffect(() => {
        let isMounted = true;
        async function loadTickets() {
            try {
                setLoading(true);
                setError(null);
                const [sortBy, sortOrder] = sortOption.split(":");
                const res = await fetchMyTickets({
                    requesterId: activeRequester.id,
                    search: search.trim() || undefined,
                    categoryId: categoryId ? Number(categoryId) : undefined,
                    status: status || undefined,
                    priority: priority || undefined,
                    itPriority: itPriority || undefined,
                    sortBy,
                    sortOrder,
                    page,
                    limit,
                });
                if (isMounted) {
                    setTickets(res.data);
                    setTotalItems(res.pagination.totalItems);
                    setTotalPages(res.pagination.totalPages);
                }
            }
            catch (err) {
                if (isMounted)
                    setError(err.message || "Failed to load tickets");
            }
            finally {
                if (isMounted)
                    setLoading(false);
            }
        }
        loadTickets();
        return () => {
            isMounted = false;
        };
    }, [activeRequester.id, search, categoryId, status, priority, itPriority, sortOption, page]);
    const hasActiveFilters = Boolean(search || categoryId || status || priority || itPriority);
    const handleClearFilters = () => {
        setSearch("");
        setCategoryId("");
        setStatus("");
        setPriority("");
        setItPriority("");
        setSortOption("createdAt:desc");
        setPage(1);
    };
    const [currentSortField, currentSortOrder] = sortOption.split(":");
    const handleHeaderSort = (field) => {
        let nextOrder = "asc";
        if (currentSortField === field) {
            nextOrder = currentSortOrder === "asc" ? "desc" : "asc";
        }
        else if (field === "createdAt" || field === "updatedAt" || field === "requestedPriority") {
            nextOrder = "desc";
        }
        setSortOption(`${field}:${nextOrder}`);
        setPage(1);
    };
    const renderSortHeader = (label, field, align = "left") => {
        const isActive = currentSortField === field;
        return (_jsx("th", { onClick: () => handleHeaderSort(field), style: {
                padding: "0.75rem 0.8rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                textAlign: align,
                cursor: "pointer",
                userSelect: "none",
                color: "#FFFFFF",
            }, title: `Sort by ${label} (${isActive ? (currentSortOrder === "asc" ? "Ascending" : "Descending") : "Click to sort"})`, children: _jsxs("div", { style: {
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
                    gap: "0.35rem",
                }, children: [_jsx("span", { children: label }), _jsx("span", { style: {
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                            color: isActive ? "#FDE047" : "rgba(255, 255, 255, 0.65)",
                        }, children: isActive ? (currentSortOrder === "asc" ? "▲" : "▼") : "↕" })] }) }));
    };
    const renderPriorityBadge = (p) => {
        switch (p.toUpperCase()) {
            case "LOW":
                return (_jsx("span", { style: {
                        backgroundColor: "#E5E7EB",
                        color: "#374151",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                    }, children: "\u2193 Low" }));
            case "MEDIUM":
                return (_jsx("span", { style: {
                        backgroundColor: "#E0E7FF",
                        color: "#3730A3",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                    }, children: "= Medium" }));
            case "HIGH":
                return (_jsx("span", { style: {
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                    }, children: "\u2191 High" }));
            case "URGENT":
                return (_jsx("span", { style: {
                        backgroundColor: "#FEE2E2",
                        color: "#991B1B",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        border: "1px solid #F87171",
                    }, children: "\u26A0 Urgent" }));
            default:
                return _jsx("span", { children: p });
        }
    };
    const renderStatusBadge = (s) => {
        const statusKey = s ? s.trim() : "";
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
                }, children: "\u25CF Pending" }));
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
        if (statusKey === "Open" || statusKey === "New") {
            return (_jsxs("span", { style: {
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
                }, children: ["\u25CF ", statusKey] }));
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
                }, children: "\u2716 Closed" }));
        }
        return (_jsxs("span", { style: {
                backgroundColor: "#F3F4F6",
                color: "#4B5563",
                padding: "0.25rem 0.6rem",
                borderRadius: "12px",
                fontSize: "0.8rem",
                fontWeight: 600,
            }, children: ["\u25CF ", s] }));
    };
    const startRange = totalItems === 0 ? 0 : (page - 1) * limit + 1;
    const endRange = Math.min(page * limit, totalItems);
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        }
        else {
            if (page <= 4) {
                pages.push(1, 2, 3, 4, 5, "...", totalPages);
            }
            else if (page >= totalPages - 3) {
                pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            }
            else {
                pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
            }
        }
        return pages;
    };
    return (_jsxs("div", { style: {
            maxWidth: "100%",
            margin: "1rem auto",
            padding: "1.5rem",
            backgroundColor: "#FFFFFF",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            border: "1px solid #E0E0E0",
        }, children: [_jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                    paddingBottom: "0.75rem",
                    borderBottom: "2px solid #EAF6EF",
                }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, color: "#006B3C", fontSize: "1.5rem" }, children: "My Submitted Tickets" }), _jsxs("div", { style: { fontSize: "0.85rem", color: "#5B6573", marginTop: "0.2rem" }, children: ["Tickets submitted by ", _jsx("strong", { children: activeRequester.displayName }), " (", activeRequester.email, ")"] })] }), onCreateTicketClick && (_jsxs("button", { type: "button", onClick: onCreateTicketClick, style: {
                            backgroundColor: "#006B3C",
                            color: "#FFFFFF",
                            border: "none",
                            padding: "0.6rem 1.25rem",
                            borderRadius: "6px",
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                        }, children: [_jsx("span", { style: { fontSize: "1.1rem", fontWeight: "bold" }, children: "+" }), " Create Ticket"] }))] }), _jsxs("div", { style: {
                    backgroundColor: "#F5F7F6",
                    padding: "1rem",
                    borderRadius: "8px",
                    marginBottom: "1.5rem",
                    border: "1px solid #E0E0E0",
                }, children: [_jsxs("div", { style: {
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.8rem",
                            alignItems: "flex-end",
                        }, children: [_jsxs("div", { style: { flex: "1 1 220px", minWidth: "180px" }, children: [_jsx("label", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5B6573", marginBottom: "0.25rem" }, children: "Search Summary or Ticket #" }), _jsxs("div", { style: { position: "relative", display: "flex", alignItems: "center" }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "#6B7280", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", style: {
                                                    position: "absolute",
                                                    left: "0.75rem",
                                                    pointerEvents: "none",
                                                }, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", value: search, onChange: (e) => {
                                                    setSearch(e.target.value);
                                                    setPage(1);
                                                }, placeholder: "Search by summary or ticket #...", style: {
                                                    width: "100%",
                                                    padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                                                    borderRadius: "6px",
                                                    border: "1px solid #D1D5DB",
                                                    fontSize: "0.9rem",
                                                    boxSizing: "border-box",
                                                } })] })] }), _jsxs("div", { style: { flex: "0 0 160px", minWidth: "130px" }, children: [_jsx("label", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5B6573", marginBottom: "0.25rem" }, children: "Category" }), _jsxs("select", { value: categoryId, onChange: (e) => {
                                            setCategoryId(e.target.value);
                                            setPage(1);
                                        }, style: {
                                            width: "100%",
                                            padding: "0.5rem 0.75rem",
                                            borderRadius: "6px",
                                            border: "1px solid #D1D5DB",
                                            fontSize: "0.9rem",
                                            backgroundColor: "#FFFFFF",
                                        }, children: [_jsx("option", { value: "", children: "All Categories" }), categories.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] })] }), _jsxs("div", { style: { flex: "0 0 140px", minWidth: "120px" }, children: [_jsx("label", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5B6573", marginBottom: "0.25rem" }, children: "Status" }), _jsxs("select", { value: status, onChange: (e) => {
                                            setStatus(e.target.value);
                                            setPage(1);
                                        }, style: {
                                            width: "100%",
                                            padding: "0.5rem 0.75rem",
                                            borderRadius: "6px",
                                            border: "1px solid #D1D5DB",
                                            fontSize: "0.9rem",
                                            backgroundColor: "#FFFFFF",
                                        }, children: [_jsx("option", { value: "", children: "All Statuses" }), _jsx("option", { value: "New", children: "New" }), _jsx("option", { value: "Assigned", children: "Assigned" }), _jsx("option", { value: "InProgress", children: "In Progress" }), _jsx("option", { value: "Pending", children: "Pending" }), _jsx("option", { value: "Resolved", children: "Resolved" }), _jsx("option", { value: "Closed", children: "Closed" }), _jsx("option", { value: "Cancelled", children: "Cancelled" })] })] }), _jsxs("div", { style: { flex: "0 0 145px", minWidth: "120px" }, children: [_jsx("label", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5B6573", marginBottom: "0.25rem" }, children: "Requested Priority" }), _jsxs("select", { value: priority, onChange: (e) => {
                                            setPriority(e.target.value);
                                            setPage(1);
                                        }, style: {
                                            width: "100%",
                                            padding: "0.5rem 0.75rem",
                                            borderRadius: "6px",
                                            border: "1px solid #D1D5DB",
                                            fontSize: "0.9rem",
                                            backgroundColor: "#FFFFFF",
                                        }, children: [_jsx("option", { value: "", children: "All Priorities" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] })] }), _jsxs("div", { style: { flex: "0 0 145px", minWidth: "120px" }, children: [_jsx("label", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5B6573", marginBottom: "0.25rem" }, children: "IT Priority" }), _jsxs("select", { value: itPriority, onChange: (e) => {
                                            setItPriority(e.target.value);
                                            setPage(1);
                                        }, style: {
                                            width: "100%",
                                            padding: "0.5rem 0.75rem",
                                            borderRadius: "6px",
                                            border: "1px solid #D1D5DB",
                                            fontSize: "0.9rem",
                                            backgroundColor: "#FFFFFF",
                                        }, children: [_jsx("option", { value: "", children: "All Priorities" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] })] })] }), hasActiveFilters && (_jsx("div", { style: { marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }, children: _jsx("button", { type: "button", onClick: handleClearFilters, style: {
                                backgroundColor: "#EAF6EF",
                                color: "#006B3C",
                                border: "1px solid #0B7A46",
                                padding: "0.35rem 0.8rem",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                            }, children: "\u2715 Clear Filters" }) }))] }), error && (_jsx("div", { style: {
                    padding: "0.75rem 1rem",
                    marginBottom: "1.5rem",
                    backgroundColor: "#FCE8E6",
                    border: "1px solid #B3261E",
                    borderRadius: "6px",
                    color: "#B3261E",
                    fontSize: "0.9rem",
                }, children: error })), loading ? (_jsx("div", { style: { textAlign: "center", padding: "3rem 1rem", color: "#555" }, children: _jsx("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: "Loading tickets list..." }) })) : tickets.length === 0 ? (
            /* Empty / No Results State */
            _jsx("div", { style: {
                    textAlign: "center",
                    padding: "3rem 1.5rem",
                    backgroundColor: "#F5F7F6",
                    borderRadius: "8px",
                    border: "1px border-dashed #CBD5E1",
                }, children: hasActiveFilters ? (_jsxs("div", { children: [_jsx("h3", { style: { margin: "0 0 0.5rem 0", color: "#1F2937", fontSize: "1.2rem" }, children: "No tickets match your search filters" }), _jsx("p", { style: { color: "#5B6573", fontSize: "0.95rem", marginBottom: "1.25rem" }, children: "Try adjusting or clearing your search term, category, or priority filters." }), _jsx("button", { type: "button", onClick: handleClearFilters, style: {
                                backgroundColor: "#EAF6EF",
                                color: "#006B3C",
                                border: "1px solid #0B7A46",
                                padding: "0.6rem 1.2rem",
                                borderRadius: "6px",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                cursor: "pointer",
                            }, children: "Clear Filters" })] })) : (_jsxs("div", { children: [_jsx("h3", { style: { margin: "0 0 0.5rem 0", color: "#006B3C", fontSize: "1.25rem" }, children: "You have not submitted any tickets yet" }), _jsx("p", { style: { color: "#5B6573", fontSize: "0.95rem", marginBottom: "1.25rem" }, children: "Need help or technical assistance? Create an IT support ticket to get started." }), onCreateTicketClick && (_jsx("button", { type: "button", onClick: onCreateTicketClick, style: {
                                backgroundColor: "#006B3C",
                                color: "#FFFFFF",
                                border: "none",
                                padding: "0.65rem 1.4rem",
                                borderRadius: "6px",
                                fontSize: "0.95rem",
                                fontWeight: 600,
                                cursor: "pointer",
                            }, children: "+ Create Your First Ticket" }))] })) })) : (
            /* Data Presentation */
            _jsxs(_Fragment, { children: [_jsx("div", { className: "d-none d-md-block", style: { overflowX: "auto" }, children: _jsxs("table", { style: {
                                width: "100%",
                                borderCollapse: "collapse",
                                textAlign: "left",
                                fontSize: "0.9rem",
                            }, children: [_jsx("thead", { children: _jsxs("tr", { style: {
                                            backgroundColor: "#006B3C",
                                            borderBottom: "2px solid #0B7A46",
                                            color: "#FFFFFF",
                                        }, children: [renderSortHeader("Ticket #", "ticketNo"), renderSortHeader("Created Date", "createdAt"), _jsx("th", { style: { padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }, children: "Summary" }), _jsx("th", { style: { padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }, children: "Category" }), _jsx("th", { style: { padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }, children: "Related System" }), _jsx("th", { style: { padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap", textAlign: "center" }, children: "Requested Priority" }), _jsx("th", { style: { padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap", textAlign: "center" }, children: "IT Priority" }), _jsx("th", { style: { padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }, children: "Status" }), _jsx("th", { style: { padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap", textAlign: "center" }, children: "Ticket Owner" }), renderSortHeader("Last Updated", "updatedAt"), _jsx("th", { style: { padding: "0.75rem 0.8rem", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" }, children: "Actions" })] }) }), _jsx("tbody", { children: tickets.map((t) => (_jsxs("tr", { style: {
                                            borderBottom: "1px solid #E0E0E0",
                                            transition: "background-color 0.15s ease",
                                        }, onMouseEnter: (e) => {
                                            e.currentTarget.style.backgroundColor = "#EAF6EF";
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                        }, children: [_jsx("td", { style: { padding: "0.75rem 0.8rem", fontWeight: 700, color: "#006B3C", whiteSpace: "nowrap", verticalAlign: "middle" }, children: t.ticketNo }), _jsx("td", { title: new Date(t.createdAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }), style: { padding: "0.75rem 0.8rem", color: "#6B7280", fontSize: "0.85rem", whiteSpace: "nowrap", verticalAlign: "middle" }, children: new Date(t.createdAt).toLocaleString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                }) }), _jsx("td", { title: t.summary, style: {
                                                    padding: "0.75rem 0.8rem",
                                                    maxWidth: "280px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    color: "#1F2937",
                                                    fontWeight: 500,
                                                    verticalAlign: "middle",
                                                }, children: t.summary }), _jsx("td", { style: { padding: "0.75rem 0.8rem", color: "#5B6573", whiteSpace: "nowrap", verticalAlign: "middle" }, children: t.category?.name || "—" }), _jsx("td", { style: { padding: "0.75rem 0.8rem", color: "#5B6573", whiteSpace: "nowrap", verticalAlign: "middle" }, children: t.relatedSystem?.name || "—" }), _jsx("td", { style: { padding: "0.75rem 0.8rem", whiteSpace: "nowrap", verticalAlign: "middle", textAlign: "center" }, children: renderPriorityBadge(t.requestedPriority) }), _jsx("td", { style: { padding: "0.75rem 0.8rem", whiteSpace: "nowrap", verticalAlign: "middle", textAlign: "center" }, children: renderPriorityBadge(t.itPriority || t.requestedPriority) }), _jsx("td", { style: { padding: "0.75rem 0.8rem", whiteSpace: "nowrap", verticalAlign: "middle" }, children: renderStatusBadge(t.status) }), _jsx("td", { style: { padding: "0.75rem 0.8rem", color: "#1F2937", fontWeight: 500, whiteSpace: "nowrap", verticalAlign: "middle", textAlign: "center" }, children: "-" }), _jsx("td", { title: new Date(t.updatedAt || t.createdAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }), style: { padding: "0.75rem 0.8rem", color: "#6B7280", fontSize: "0.85rem", whiteSpace: "nowrap", verticalAlign: "middle" }, children: new Date(t.updatedAt || t.createdAt).toLocaleString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                }) }), _jsx("td", { style: { padding: "0.75rem 0.8rem", textAlign: "left", whiteSpace: "nowrap", verticalAlign: "middle" }, children: _jsx("button", { type: "button", onClick: () => {
                                                        if (onSelectTicket)
                                                            onSelectTicket(t.id);
                                                    }, style: {
                                                        backgroundColor: "#EAF6EF",
                                                        color: "#006B3C",
                                                        border: "1px solid #0B7A46",
                                                        padding: "0.35rem 0.75rem",
                                                        borderRadius: "4px",
                                                        fontSize: "0.82rem",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                    }, children: "View Detail" }) })] }, t.id))) })] }) }), _jsx("div", { className: "d-md-none d-flex flex-column gap-3", children: tickets.map((t) => (_jsxs("div", { style: {
                                backgroundColor: "#FFFFFF",
                                borderRadius: "8px",
                                border: "1px solid #E0E0E0",
                                padding: "1rem",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                            }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }, children: [_jsx("span", { style: { fontWeight: 700, color: "#006B3C", fontSize: "0.95rem" }, children: t.ticketNo }), renderStatusBadge(t.status)] }), _jsx("h4", { style: { fontSize: "0.95rem", fontWeight: 600, color: "#1F2937", margin: "0 0 0.6rem 0", lineHeight: 1.35 }, children: t.summary }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.82rem", color: "#5B6573", marginBottom: "0.75rem" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { children: "Category:" }), _jsx("strong", { style: { color: "#1F2937" }, children: t.category?.name || "—" })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { children: "Related System:" }), _jsx("strong", { style: { color: "#1F2937" }, children: t.relatedSystem?.name || "—" })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { children: "Requested Priority:" }), _jsx("span", { children: renderPriorityBadge(t.requestedPriority) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { children: "IT Priority:" }), _jsx("span", { children: renderPriorityBadge(t.itPriority || t.requestedPriority) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { children: "Ticket Owner:" }), _jsx("strong", { style: { color: "#1F2937" }, children: "-" })] })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.6rem", borderTop: "1px solid #F3F4F6" }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", fontSize: "0.75rem", color: "#6B7280" }, children: [_jsxs("span", { children: ["Created: ", new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })] }), _jsxs("span", { children: ["Updated: ", new Date(t.updatedAt || t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })] })] }), _jsx("button", { type: "button", onClick: () => {
                                                if (onSelectTicket)
                                                    onSelectTicket(t.id);
                                            }, style: {
                                                backgroundColor: "#EAF6EF",
                                                color: "#006B3C",
                                                border: "1px solid #0B7A46",
                                                padding: "0.35rem 0.75rem",
                                                borderRadius: "4px",
                                                fontSize: "0.82rem",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }, children: "View Detail" })] })] }, t.id))) }), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "1rem",
                            marginTop: "1.5rem",
                            paddingTop: "1rem",
                            borderTop: "1px solid #EAF6EF",
                        }, children: [_jsxs("div", { style: { fontSize: "0.85rem", color: "#5B6573" }, children: ["Showing ", _jsx("strong", { children: startRange }), " to ", _jsx("strong", { children: endRange }), " of ", _jsx("strong", { children: totalItems }), " tickets"] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }, children: [_jsx("button", { type: "button", disabled: page <= 1, onClick: () => setPage((prev) => Math.max(prev - 1, 1)), style: {
                                            backgroundColor: page <= 1 ? "#F3F4F6" : "#EAF6EF",
                                            color: page <= 1 ? "#9CA3AF" : "#006B3C",
                                            border: page <= 1 ? "1px solid #D1D5DB" : "1px solid #0B7A46",
                                            padding: "0.4rem 0.8rem",
                                            borderRadius: "6px",
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            cursor: page <= 1 ? "not-allowed" : "pointer",
                                        }, children: "\u2190 Previous" }), getPageNumbers().map((p, idx) => {
                                        if (typeof p === "string") {
                                            return (_jsx("span", { style: { padding: "0 0.25rem", color: "#6B7280", fontSize: "0.85rem", fontWeight: 600 }, children: p }, idx));
                                        }
                                        const isActive = p === page;
                                        return (_jsx("button", { type: "button", onClick: () => setPage(p), style: {
                                                backgroundColor: isActive ? "#006B3C" : "#FFFFFF",
                                                color: isActive ? "#FFFFFF" : "#006B3C",
                                                border: isActive ? "1px solid #006B3C" : "1px solid #D1D5DB",
                                                padding: "0.4rem 0.75rem",
                                                borderRadius: "6px",
                                                fontSize: "0.85rem",
                                                fontWeight: isActive ? 700 : 600,
                                                cursor: isActive ? "default" : "pointer",
                                                minWidth: "36px",
                                                textAlign: "center",
                                                transition: "all 0.15s ease",
                                            }, children: p }, idx));
                                    }), _jsx("button", { type: "button", disabled: page >= totalPages, onClick: () => setPage((prev) => Math.min(prev + 1, totalPages)), style: {
                                            backgroundColor: page >= totalPages ? "#F3F4F6" : "#EAF6EF",
                                            color: page >= totalPages ? "#9CA3AF" : "#006B3C",
                                            border: page >= totalPages ? "1px solid #D1D5DB" : "1px solid #0B7A46",
                                            padding: "0.4rem 0.9rem",
                                            borderRadius: "6px",
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            cursor: page >= totalPages ? "not-allowed" : "pointer",
                                        }, children: "Next \u2192" })] })] })] }))] }));
}
