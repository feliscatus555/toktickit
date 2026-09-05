import React, { useState, useEffect } from "react";
import {
  Category,
  RequesterUser,
  TicketListItem,
  fetchCategories,
  fetchMyTickets,
} from "./api.js";

interface MyTicketsProps {
  activeRequester: RequesterUser;
  onCreateTicketClick?: () => void;
  onSelectTicket?: (ticketId: string) => void;
}

export default function MyTickets({
  activeRequester,
  onCreateTicketClick,
  onSelectTicket,
}: MyTicketsProps) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination States
  const [search, setSearch] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("createdAt:desc");
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  // Metadata
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Fetch reference categories on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const catData = await fetchCategories();
        if (isMounted) setCategories(catData);
      } catch (err) {
        if (isMounted) console.error("Failed to load categories", err);
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
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load tickets");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTickets();
    return () => {
      isMounted = false;
    };
  }, [activeRequester.id, search, categoryId, status, priority, sortOption, page]);

  const hasActiveFilters = Boolean(search || categoryId || status || priority);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryId("");
    setStatus("");
    setPriority("");
    setSortOption("createdAt:desc");
    setPage(1);
  };

  const [currentSortField, currentSortOrder] = sortOption.split(":");

  const handleHeaderSort = (field: string) => {
    let nextOrder: "asc" | "desc" = "asc";
    if (currentSortField === field) {
      nextOrder = currentSortOrder === "asc" ? "desc" : "asc";
    } else if (field === "createdAt" || field === "updatedAt" || field === "requestedPriority") {
      nextOrder = "desc";
    }
    setSortOption(`${field}:${nextOrder}`);
    setPage(1);
  };

  const renderSortHeader = (label: string, field: string, align: "left" | "center" | "right" = "left") => {
    const isActive = currentSortField === field;
    return (
      <th
        onClick={() => handleHeaderSort(field)}
        style={{
          padding: "0.75rem 0.8rem",
          fontWeight: 700,
          whiteSpace: "nowrap",
          textAlign: align,
          cursor: "pointer",
          userSelect: "none",
          color: "#FFFFFF",
        }}
        title={`Sort by ${label} (${isActive ? (currentSortOrder === "asc" ? "Ascending" : "Descending") : "Click to sort"})`}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
            gap: "0.35rem",
          }}
        >
          <span>{label}</span>
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: "bold",
              color: isActive ? "#FDE047" : "rgba(255, 255, 255, 0.65)",
            }}
          >
            {isActive ? (currentSortOrder === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </div>
      </th>
    );
  };

  const renderPriorityBadge = (p: string) => {
    switch (p.toUpperCase()) {
      case "LOW":
        return (
          <span
            style={{
              backgroundColor: "#E5E7EB",
              color: "#374151",
              padding: "0.25rem 0.6rem",
              borderRadius: "12px",
              fontSize: "0.8rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            ↓ Low
          </span>
        );
      case "MEDIUM":
        return (
          <span
            style={{
              backgroundColor: "#E0E7FF",
              color: "#3730A3",
              padding: "0.25rem 0.6rem",
              borderRadius: "12px",
              fontSize: "0.8rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            = Medium
          </span>
        );
      case "HIGH":
        return (
          <span
            style={{
              backgroundColor: "#FEF3C7",
              color: "#92400E",
              padding: "0.25rem 0.6rem",
              borderRadius: "12px",
              fontSize: "0.8rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            ↑ High
          </span>
        );
      case "URGENT":
        return (
          <span
            style={{
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
            }}
          >
            ⚠ Urgent
          </span>
        );
      default:
        return <span>{p}</span>;
    }
  };

  const renderStatusBadge = (s: string) => {
    const statusKey = s ? s.trim() : "";
    if (statusKey === "Pending") {
      return (
        <span
          style={{
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
          }}
        >
          ● Pending
        </span>
      );
    }
    if (statusKey === "Open" || statusKey === "New") {
      return (
        <span
          style={{
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
          }}
        >
          ● {statusKey}
        </span>
      );
    }
    if (statusKey === "InProgress" || statusKey === "In Progress") {
      return (
        <span
          style={{
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
          }}
        >
          ⚙ In Progress
        </span>
      );
    }
    if (statusKey === "Resolved") {
      return (
        <span
          style={{
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
          }}
        >
          ✓ Resolved
        </span>
      );
    }
    return (
      <span
        style={{
          backgroundColor: "#F3F4F6",
          color: "#4B5563",
          padding: "0.25rem 0.6rem",
          borderRadius: "12px",
          fontSize: "0.8rem",
          fontWeight: 600,
        }}
      >
        ● {s}
      </span>
    );
  };

  const startRange = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endRange = Math.min(page * limit, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      style={{
        maxWidth: "100%",
        margin: "1rem auto",
        padding: "1.5rem",
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        border: "1px solid #E0E0E0",
      }}
    >
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
          paddingBottom: "0.75rem",
          borderBottom: "2px solid #EAF6EF",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#006B3C", fontSize: "1.5rem" }}>
            My Submitted Tickets
          </h2>
          <div style={{ fontSize: "0.85rem", color: "#5B6573", marginTop: "0.2rem" }}>
            Tickets submitted by <strong>{activeRequester.displayName}</strong> ({activeRequester.email})
          </div>
        </div>

        {onCreateTicketClick && (
          <button
            type="button"
            onClick={onCreateTicketClick}
            style={{
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
            }}
          >
            <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>+</span> Create Ticket
          </button>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      <div
        style={{
          backgroundColor: "#F5F7F6",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          border: "1px solid #E0E0E0",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.8rem",
            alignItems: "center",
          }}
        >
          {/* Search Input */}
          <div style={{ gridColumn: "span 2", minWidth: "220px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5B6573", marginBottom: "0.25rem" }}>
              Search Summary or Ticket #
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B7280"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  pointerEvents: "none",
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by summary or ticket #..."
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                  borderRadius: "6px",
                  border: "1px solid #D1D5DB",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5B6573", marginBottom: "0.25rem" }}>
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                fontSize: "0.9rem",
                backgroundColor: "#FFFFFF",
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5B6573", marginBottom: "0.25rem" }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                fontSize: "0.9rem",
                backgroundColor: "#FFFFFF",
              }}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5B6573", marginBottom: "0.25rem" }}>
              Requested Priority
            </label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                fontSize: "0.9rem",
                backgroundColor: "#FFFFFF",
              }}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>


        </div>

        {hasActiveFilters && (
          <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                backgroundColor: "#EAF6EF",
                color: "#006B3C",
                border: "1px solid #0B7A46",
                padding: "0.35rem 0.8rem",
                borderRadius: "4px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✕ Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            backgroundColor: "#FCE8E6",
            border: "1px solid #B3261E",
            borderRadius: "6px",
            color: "#B3261E",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#555" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>Loading tickets list...</div>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty / No Results State */
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1.5rem",
            backgroundColor: "#F5F7F6",
            borderRadius: "8px",
            border: "1px border-dashed #CBD5E1",
          }}
        >
          {hasActiveFilters ? (
            <div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#1F2937", fontSize: "1.2rem" }}>
                No tickets match your search filters
              </h3>
              <p style={{ color: "#5B6573", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
                Try adjusting or clearing your search term, category, or priority filters.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  backgroundColor: "#EAF6EF",
                  color: "#006B3C",
                  border: "1px solid #0B7A46",
                  padding: "0.6rem 1.2rem",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#006B3C", fontSize: "1.25rem" }}>
                You have not submitted any tickets yet
              </h3>
              <p style={{ color: "#5B6573", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
                Need help or technical assistance? Create an IT support ticket to get started.
              </p>
              {onCreateTicketClick && (
                <button
                  type="button"
                  onClick={onCreateTicketClick}
                  style={{
                    backgroundColor: "#006B3C",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "0.65rem 1.4rem",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Create Your First Ticket
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Data Presentation */
        <>
          {/* Desktop Table View (visible >= 768px via custom style) */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#006B3C",
                    borderBottom: "2px solid #0B7A46",
                    color: "#FFFFFF",
                  }}
                >
                  {renderSortHeader("Ticket #", "ticketNo")}
                  {renderSortHeader("Created Date", "createdAt")}
                  <th style={{ padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>Summary</th>
                  <th style={{ padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>Category</th>
                  <th style={{ padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>System</th>
                  <th style={{ padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap", textAlign: "center" }}>Requested Priority</th>
                  <th style={{ padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>Status</th>
                  <th style={{ padding: "0.75rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>Ticket Owner</th>
                  {renderSortHeader("Last Updated", "updatedAt")}
                  <th style={{ padding: "0.75rem 0.8rem", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: "1px solid #E0E0E0",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#EAF6EF";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td style={{ padding: "0.75rem 0.8rem", fontWeight: 700, color: "#006B3C", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                      {t.ticketNo}
                    </td>
                    <td
                      title={new Date(t.createdAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" })}
                      style={{ padding: "0.75rem 0.8rem", color: "#6B7280", fontSize: "0.85rem", whiteSpace: "nowrap", verticalAlign: "middle" }}
                    >
                      {new Date(t.createdAt).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td
                      title={t.summary}
                      style={{
                        padding: "0.75rem 0.8rem",
                        maxWidth: "280px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "#1F2937",
                        fontWeight: 500,
                        verticalAlign: "middle",
                      }}
                    >
                      {t.summary}
                    </td>
                    <td style={{ padding: "0.75rem 0.8rem", color: "#5B6573", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                      {t.category?.name || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 0.8rem", color: "#5B6573", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                      {t.relatedSystem?.name || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 0.8rem", whiteSpace: "nowrap", verticalAlign: "middle", textAlign: "center" }}>
                      {renderPriorityBadge(t.requestedPriority)}
                    </td>
                    <td style={{ padding: "0.75rem 0.8rem", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                      {renderStatusBadge(t.status)}
                    </td>
                    <td style={{ padding: "0.75rem 0.8rem", color: "#1F2937", fontWeight: 500, whiteSpace: "nowrap", verticalAlign: "middle" }}>
                      👤 {t.requester?.displayName || activeRequester.displayName}
                    </td>
                    <td
                      title={new Date(t.updatedAt || t.createdAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" })}
                      style={{ padding: "0.75rem 0.8rem", color: "#6B7280", fontSize: "0.85rem", whiteSpace: "nowrap", verticalAlign: "middle" }}
                    >
                      {new Date(t.updatedAt || t.createdAt).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ padding: "0.75rem 0.8rem", textAlign: "left", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectTicket) onSelectTicket(t.id);
                        }}
                        style={{
                          backgroundColor: "#EAF6EF",
                          color: "#006B3C",
                          border: "1px solid #0B7A46",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "4px",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        View Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid #EAF6EF",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "#5B6573" }}>
              Showing <strong>{startRange}</strong> to <strong>{endRange}</strong> of <strong>{totalItems}</strong> tickets
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                style={{
                  backgroundColor: page <= 1 ? "#F3F4F6" : "#EAF6EF",
                  color: page <= 1 ? "#9CA3AF" : "#006B3C",
                  border: page <= 1 ? "1px solid #D1D5DB" : "1px solid #0B7A46",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Previous
              </button>

              {getPageNumbers().map((p, idx) => {
                if (typeof p === "string") {
                  return (
                    <span key={idx} style={{ padding: "0 0.25rem", color: "#6B7280", fontSize: "0.85rem", fontWeight: 600 }}>
                      {p}
                    </span>
                  );
                }
                const isActive = p === page;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPage(p)}
                    style={{
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
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                style={{
                  backgroundColor: page >= totalPages ? "#F3F4F6" : "#EAF6EF",
                  color: page >= totalPages ? "#9CA3AF" : "#006B3C",
                  border: page >= totalPages ? "1px solid #D1D5DB" : "1px solid #0B7A46",
                  padding: "0.4rem 0.9rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
