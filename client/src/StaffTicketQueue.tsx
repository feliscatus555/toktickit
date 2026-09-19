import React, { useState, useEffect, useId } from "react";
import {
  AuthUser,
  Category,
  StaffTicketItem,
  fetchCategories,
  fetchStaffTickets,
} from "./api.js";

export interface StaffTicketQueueProps {
  onSelectTicket?: (ticketId: string) => void;
  currentUser?: AuthUser | null;
}

export default function StaffTicketQueue({
  onSelectTicket,
  currentUser,
}: StaffTicketQueueProps) {
  const searchInputId = useId();
  const categorySelectId = useId();
  const statusSelectId = useId();
  const prioritySelectId = useId();
  const ownerSelectId = useId();

  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and Query state
  const [search, setSearch] = useState<string>("");
  const [searchValidation, setSearchValidation] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [owner, setOwner] = useState<string>("");

  // Sort state
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
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
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);

    if (val.length > 100) {
      setSearchValidation("Search query cannot exceed 100 characters.");
    } else if (/[<>{};"'%\\]/.test(val)) {
      setSearchValidation("Search query contains invalid characters. Please use letters, numbers, or ticket number format.");
    } else {
      setSearchValidation(null);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPriority(e.target.value);
    setPage(1);
  };

  const handleOwnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOwner(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSearchValidation(null);
    setCategory("");
    setStatus("");
    setPriority("");
    setOwner("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || category || status || priority || owner
  );

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Helper for priority badges with accessible glyphs
  const renderPriorityBadge = (p?: string | null) => {
    const val = p || "MEDIUM";
    switch (val) {
      case "LOW":
        return (
          <span
            style={{
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
              padding: "0.2rem 0.55rem",
              borderRadius: "12px",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              border: "1px solid #C7D2FE",
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
              padding: "0.2rem 0.55rem",
              borderRadius: "12px",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              border: "1px solid #FCD34D",
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
              padding: "0.2rem 0.55rem",
              borderRadius: "12px",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              border: "1px solid #F87171",
            }}
          >
            ⚡ Urgent
          </span>
        );
      default:
        return <span>{val}</span>;
    }
  };

  // Helper for status badges with accessible non-color indicators
  const renderStatusBadge = (s: string) => {
    const statusKey = s ? s.trim() : "New";
    if (statusKey === "New") {
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
          ● New
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
    if (statusKey === "Assigned") {
      return (
        <span
          style={{
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
          }}
        >
          👤 Assigned
        </span>
      );
    }
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
          ⏱ Pending
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
    if (statusKey === "Closed") {
      return (
        <span
          style={{
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
          }}
        >
          ✕ Closed
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
          border: "1px solid #D1D5DB",
        }}
      >
        {statusKey}
      </span>
    );
  };

  const startRecord = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalItems);

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto" }}>
      <style>{`
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
      `}</style>

      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#006B3C",
              margin: "0 0 0.25rem 0",
            }}
          >
            IT Staff Ticket Queue
          </h2>
          <p style={{ margin: 0, color: "#5B6573", fontSize: "0.95rem" }}>
            Operational shared queue with search, filtering, and priority management.
          </p>
        </div>

        <div
          id="queue-results-counter"
          style={{
            fontSize: "0.9rem",
            color: "#5B6573",
            fontWeight: 500,
            backgroundColor: "#FFFFFF",
            padding: "0.4rem 0.8rem",
            borderRadius: "6px",
            border: "1px solid #E5E7EB",
          }}
        >
          {totalItems === 0
            ? "Showing 0 tickets"
            : `Showing ${startRecord} to ${endRecord} of ${totalItems} tickets`}
        </div>
      </div>

      {/* Toolbar & Filter Card */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          padding: "1.25rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          marginBottom: "1.5rem",
          border: "1px solid #E5E7EB",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
            alignItems: "end",
          }}
        >
          {/* Search Input */}
          <div style={{ gridColumn: "span 2", minWidth: "240px" }}>
            <label
              htmlFor={searchInputId}
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#5B6573",
                marginBottom: "0.35rem",
              }}
            >
              Search
            </label>
            <div style={{ position: "relative" }}>
              <input
                id={searchInputId}
                aria-label="Search tickets"
                type="text"
                placeholder="Search by ticket number or summary..."
                value={search}
                onChange={handleSearchChange}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem 0.55rem 2rem",
                  fontSize: "0.9rem",
                  borderRadius: "6px",
                  border: searchValidation ? "1px solid #B3261E" : "1px solid #D1D5DB",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "0.65rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: searchValidation ? "#B3261E" : "#9CA3AF",
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
            </div>
            {searchValidation && (
              <div
                id="queue-search-validation-error"
                role="alert"
                style={{
                  color: "#B3261E",
                  fontSize: "0.8rem",
                  marginTop: "0.35rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span>⚠</span>
                <span>{searchValidation}</span>
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <label
              htmlFor={categorySelectId}
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#5B6573",
                marginBottom: "0.35rem",
              }}
            >
              Category
            </label>
            <select
              id={categorySelectId}
              aria-label="Filter by category"
              value={category}
              onChange={handleCategoryChange}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                fontSize: "0.9rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
                boxSizing: "border-box",
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
            <label
              htmlFor={statusSelectId}
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#5B6573",
                marginBottom: "0.35rem",
              }}
            >
              Status
            </label>
            <select
              id={statusSelectId}
              aria-label="Filter by status"
              value={status}
              onChange={handleStatusChange}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                fontSize: "0.9rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
                boxSizing: "border-box",
              }}
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="InProgress">In Progress</option>
              <option value="Assigned">Assigned</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label
              htmlFor={prioritySelectId}
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#5B6573",
                marginBottom: "0.35rem",
              }}
            >
              Priority
            </label>
            <select
              id={prioritySelectId}
              aria-label="Filter by priority"
              value={priority}
              onChange={handlePriorityChange}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                fontSize: "0.9rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
                boxSizing: "border-box",
              }}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Owner Filter */}
          <div>
            <label
              htmlFor={ownerSelectId}
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#5B6573",
                marginBottom: "0.35rem",
              }}
            >
              Ticket Owner
            </label>
            <select
              id={ownerSelectId}
              aria-label="Filter by owner"
              value={owner}
              onChange={handleOwnerChange}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                fontSize: "0.9rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
                boxSizing: "border-box",
              }}
            >
              <option value="">All Tickets</option>
              <option value="unassigned">Unassigned</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              id="queue-clear-filters-button"
              type="button"
              onClick={handleClearFilters}
              style={{
                backgroundColor: "#EAF6EF",
                color: "#006B3C",
                border: "1px solid #0B7A46",
                padding: "0.4rem 0.9rem",
                borderRadius: "6px",
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

      {/* Error State */}
      {error && (
        <div
          id="queue-error-banner"
          role="alert"
          style={{
            padding: "1rem",
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
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem 1rem",
            backgroundColor: "#FFFFFF",
            borderRadius: "8px",
            border: "1px solid #E5E7EB",
          }}
        >
          <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#006B3C" }}>
            Loading IT staff ticket queue...
          </div>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty State */
        <div
          id="queue-empty-state"
          style={{
            textAlign: "center",
            padding: "3.5rem 1.5rem",
            backgroundColor: "#FFFFFF",
            borderRadius: "8px",
            border: "1px dashed #CBD5E1",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              color: "#1F2937",
              fontSize: "1.25rem",
              fontWeight: 700,
            }}
          >
            No tickets in queue
          </h3>
          <p style={{ color: "#5B6573", fontSize: "0.95rem", margin: 0 }}>
            {hasActiveFilters
              ? "No tickets match your search filters. Try adjusting or clearing search parameters."
              : "There are currently no tickets submitted to the support queue."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                marginTop: "1rem",
                backgroundColor: "#EAF6EF",
                color: "#006B3C",
                border: "1px solid #0B7A46",
                padding: "0.5rem 1.1rem",
                borderRadius: "6px",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) with 8 justified columns */}
          <div
            className="staff-queue-desktop"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflowX: "auto",
              border: "1px solid #E5E7EB",
            }}
          >
            <table
              id="staff-queue-table"
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
                  <th
                    style={{
                      padding: "0.85rem 0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => handleSort("ticketNo")}
                    title="Sort by Ticket Number"
                  >
                    Ticket No. {sortBy === "ticketNo" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => handleSort("createdAt")}
                    title="Sort by Created Date"
                  >
                    Created Date {sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "0.85rem 0.85rem", fontWeight: 700 }}>
                    Summary
                  </th>
                  <th style={{ padding: "0.85rem 0.85rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                    Category
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 0.85rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSort("requestedPriority")}
                    title="Sort by Requested Priority"
                  >
                    Req. Priority {sortBy === "requestedPriority" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 0.85rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSort("itPriority")}
                    title="Sort by IT Priority"
                  >
                    IT Priority {sortBy === "itPriority" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 0.85rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSort("status")}
                    title="Sort by Status"
                  >
                    Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 0.85rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Owner
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 0.85rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSort("updatedAt")}
                    title="Sort by Last Updated"
                  >
                    Last Updated {sortBy === "updatedAt" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    data-ticket-id={t.id}
                    style={{
                      borderBottom: "1px solid #E5E7EB",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#EAF6EF";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {/* 1. Ticket No */}
                    <td
                      style={{
                        padding: "0.85rem 0.85rem",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        verticalAlign: "middle",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTicket?.(t.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#006B3C",
                          fontWeight: 700,
                          fontSize: "0.92rem",
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        {t.ticketNo}
                      </button>
                    </td>

                    {/* 2. Created Date */}
                    <td
                      title={new Date(t.createdAt).toLocaleString()}
                      style={{
                        padding: "0.85rem 0.85rem",
                        color: "#6B7280",
                        fontSize: "0.85rem",
                        whiteSpace: "nowrap",
                        verticalAlign: "middle",
                      }}
                    >
                      {new Date(t.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* 3. Summary (truncated with tooltip) */}
                    <td
                      title={t.summary}
                      style={{
                        padding: "0.85rem 0.85rem",
                        maxWidth: "260px",
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

                    {/* 4. Category */}
                    <td
                      style={{
                        padding: "0.85rem 0.85rem",
                        color: "#4B5563",
                        whiteSpace: "nowrap",
                        verticalAlign: "middle",
                      }}
                    >
                      {t.category?.name || "—"}
                    </td>

                    {/* 5. Req. Priority */}
                    <td
                      style={{
                        padding: "0.85rem 0.85rem",
                        whiteSpace: "nowrap",
                        verticalAlign: "middle",
                        textAlign: "center",
                      }}
                    >
                      {renderPriorityBadge(t.requestedPriority)}
                    </td>

                    {/* 6. IT Priority */}
                    <td
                      style={{
                        padding: "0.85rem 0.85rem",
                        whiteSpace: "nowrap",
                        verticalAlign: "middle",
                        textAlign: "center",
                      }}
                    >
                      {renderPriorityBadge(t.itPriority)}
                    </td>

                    {/* 7. Status */}
                    <td
                      style={{
                        padding: "0.85rem 0.85rem",
                        whiteSpace: "nowrap",
                        verticalAlign: "middle",
                      }}
                    >
                      {renderStatusBadge(t.status)}
                    </td>

                    {/* 8. Owner */}
                    <td
                      style={{
                        padding: "0.85rem 0.85rem",
                        whiteSpace: "nowrap",
                        verticalAlign: "middle",
                        fontWeight: t.owner ? 600 : 400,
                        color: t.owner ? "#1F2937" : "#9CA3AF",
                      }}
                    >
                      {t.owner?.displayName || "Unassigned"}
                    </td>

                    {/* 9. Last Updated */}
                    <td
                      title={new Date(t.updatedAt || t.createdAt).toLocaleString()}
                      style={{
                        padding: "0.85rem 0.85rem",
                        color: "#6B7280",
                        fontSize: "0.85rem",
                        whiteSpace: "nowrap",
                        verticalAlign: "middle",
                      }}
                    >
                      {new Date(t.updatedAt || t.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="staff-queue-mobile">
            {tickets.map((t) => (
              <div
                key={t.id}
                data-ticket-id={t.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "8px",
                  padding: "1rem",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                {/* Header: Ticket No + Status */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#006B3C",
                      fontSize: "1rem",
                    }}
                  >
                    {t.ticketNo}
                  </span>
                  {renderStatusBadge(t.status)}
                </div>

                {/* Summary */}
                <h4
                  style={{
                    fontSize: "0.98rem",
                    fontWeight: 600,
                    color: "#1F2937",
                    margin: "0 0 0.6rem 0",
                    lineHeight: 1.35,
                  }}
                >
                  {t.summary}
                </h4>

                {/* Details list */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    fontSize: "0.85rem",
                    color: "#5B6573",
                    marginBottom: "0.85rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Category:</span>
                    <strong style={{ color: "#1F2937" }}>{t.category?.name || "—"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Req. Priority:</span>
                    <span>{renderPriorityBadge(t.requestedPriority)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>IT Priority:</span>
                    <span>{renderPriorityBadge(t.itPriority)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Owner:</span>
                    <strong style={{ color: t.owner ? "#1F2937" : "#9CA3AF" }}>
                      {t.owner?.displayName || "Unassigned"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Requester:</span>
                    <strong style={{ color: "#1F2937" }}>{t.requester?.displayName || "—"}</strong>
                  </div>
                </div>

                {/* Footer action */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid #F3F4F6",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                    {new Date(t.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTicket?.(t.id)}
                    style={{
                      backgroundColor: "#006B3C",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "0.45rem 1rem",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              id="queue-pagination"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.4rem",
                marginTop: "1.5rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                id="queue-prev-page-button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  backgroundColor: page <= 1 ? "#F3F4F6" : "#FFFFFF",
                  color: page <= 1 ? "#9CA3AF" : "#006B3C",
                  border: "1px solid #D1D5DB",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                &lt; Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  style={{
                    backgroundColor: page === p ? "#006B3C" : "#FFFFFF",
                    color: page === p ? "#FFFFFF" : "#1F2937",
                    border: page === p ? "1px solid #006B3C" : "1px solid #D1D5DB",
                    padding: "0.45rem 0.8rem",
                    borderRadius: "6px",
                    fontSize: "0.88rem",
                    fontWeight: page === p ? 700 : 500,
                    cursor: "pointer",
                    minWidth: "36px",
                  }}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                id="queue-next-page-button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  backgroundColor: page >= totalPages ? "#F3F4F6" : "#FFFFFF",
                  color: page >= totalPages ? "#9CA3AF" : "#006B3C",
                  border: "1px solid #D1D5DB",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next &gt;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
