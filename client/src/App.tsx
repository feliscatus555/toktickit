import { useState, useEffect, useRef } from "react";
import {
  AuthUser,
  getStoredAuthUser,
  getAuthToken,
  fetchCurrentUser,
  logout as apiLogout,
  clearAuthSession,
} from "./api.js";
import Login from "./Login.js";
import ChangePassword from "./ChangePassword.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";
import StaffTicketQueue from "./StaffTicketQueue.js";

type ActiveTab = "my-tickets" | "queue" | "create-ticket" | "ticket-detail";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const token = getAuthToken();
    if (token) {
      return getStoredAuthUser();
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const token = getAuthToken();
    if (token) {
      const u = getStoredAuthUser();
      if (u && (u.role === "IT_STAFF" || u.role === "ADMINISTRATOR")) {
        return "queue";
      }
    }
    return "my-tickets";
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchCurrentUser()
        .then((user) => setCurrentUser(user))
        .catch(() => {
          clearAuthSession();
          setCurrentUser(null);
        });
    }
  }, []);

  function handleLoginSuccess(user: AuthUser) {
    setCurrentUser(user);
    setActiveTab(user.role === "REQUESTER" ? "my-tickets" : "queue");
  }

  function handlePasswordChanged(user: AuthUser) {
    setCurrentUser(user);
    setShowChangePasswordModal(false);
  }

  async function handleLogout() {
    await apiLogout();
    clearAuthSession();
    setCurrentUser(null);
    setSelectedTicketId(null);
    setShowChangePasswordModal(false);
  }

  function handleSelectTicket(ticketId: string) {
    setSelectedTicketId(ticketId);
    setActiveTab("ticket-detail");
  }

  // Helper for role badge display
  function renderRoleBadge(role: string) {
    switch (role) {
      case "IT_STAFF":
        return (
          <span
            className="badge fw-semibold"
            style={{
              backgroundColor: "#E0F2FE",
              color: "#0369A1",
              border: "1px solid #7DD3FC",
              fontSize: "0.78rem",
              padding: "0.25rem 0.5rem",
            }}
          >
            🛠 IT Staff
          </span>
        );
      case "ADMINISTRATOR":
        return (
          <span
            className="badge fw-semibold"
            style={{
              backgroundColor: "#FEF3C7",
              color: "#B45309",
              border: "1px solid #FCD34D",
              fontSize: "0.78rem",
              padding: "0.25rem 0.5rem",
            }}
          >
            🛡 Admin
          </span>
        );
      default:
        return (
          <span
            className="badge fw-semibold"
            style={{
              backgroundColor: "#EAF6EF",
              color: "#006B3C",
              border: "1px solid #0B7A46",
              fontSize: "0.78rem",
              padding: "0.25rem 0.5rem",
            }}
          >
            👤 Requester
          </span>
        );
    }
  }

  // If not authenticated, render Login
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // If user must change password, render mandatory ChangePassword screen
  if (currentUser.mustChangePassword) {
    return (
      <ChangePassword
        currentUser={currentUser}
        onPasswordChanged={handlePasswordChanged}
      />
    );
  }

  // If voluntary password change requested from shell
  if (showChangePasswordModal) {
    return (
      <ChangePassword
        currentUser={currentUser}
        onPasswordChanged={handlePasswordChanged}
        onCancel={() => setShowChangePasswordModal(false)}
      />
    );
  }

  return (
    <div
      className="min-vh-100"
      style={{
        backgroundColor: "#F5F7F6",
        overflowX: "hidden",
        maxWidth: "100vw",
      }}
    >
      <style>{`
        html, body, #root {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        *, *:before, *:after {
          box-sizing: border-box;
        }
      `}</style>

      {/* Zen Green Top Header */}
      <header
        className="py-2 px-3 px-md-4 text-white shadow-sm position-relative"
        style={{
          backgroundColor: "#006B3C",
          maxWidth: "100%",
          overflow: "visible",
          zIndex: 100,
        }}
      >
        <div className="container-fluid px-1 px-md-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 py-1">
            {/* Logo + Navigation Links */}
            <div className="d-flex align-items-center gap-3">
              <h1
                className="h4 mb-0 fw-bold d-flex align-items-center gap-2"
                style={{ whiteSpace: "nowrap" }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>TokTickIT</span>
              </h1>

              {/* Desktop Nav Buttons */}
              <div className="d-none d-md-flex gap-2 ms-2">
                {(currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR") && (
                  <button
                    id="nav-ticket-queue"
                    type="button"
                    onClick={() => setActiveTab("queue")}
                    className="btn btn-sm text-white fw-semibold"
                    style={{
                      backgroundColor:
                        activeTab === "queue" || (activeTab === "ticket-detail" && currentUser.role === "IT_STAFF")
                          ? "#0B7A46"
                          : "transparent",
                      border:
                        activeTab === "queue" || (activeTab === "ticket-detail" && currentUser.role === "IT_STAFF")
                          ? "1px solid #EAF6EF"
                          : "1px solid transparent",
                      borderRadius: "6px",
                      padding: "0.4rem 0.85rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.88rem",
                    }}
                  >
                    📋 Ticket Queue
                  </button>
                )}
                {currentUser.role !== "IT_STAFF" && (
                  <button
                    id="nav-my-tickets"
                    type="button"
                    onClick={() => setActiveTab("my-tickets")}
                    className="btn btn-sm text-white fw-semibold"
                    style={{
                      backgroundColor:
                        activeTab === "my-tickets" || (activeTab === "ticket-detail" && currentUser.role === "REQUESTER")
                          ? "#0B7A46"
                          : "transparent",
                      border:
                        activeTab === "my-tickets" || (activeTab === "ticket-detail" && currentUser.role === "REQUESTER")
                          ? "1px solid #EAF6EF"
                          : "1px solid transparent",
                      borderRadius: "6px",
                      padding: "0.4rem 0.85rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.88rem",
                    }}
                  >
                    📋 My Tickets
                  </button>
                )}
                <button
                  id="nav-create-ticket"
                  type="button"
                  onClick={() => setActiveTab("create-ticket")}
                  className="btn btn-sm text-white fw-semibold"
                  style={{
                    backgroundColor: activeTab === "create-ticket" ? "#0B7A46" : "transparent",
                    border:
                      activeTab === "create-ticket"
                        ? "1px solid #EAF6EF"
                        : "1px solid transparent",
                    borderRadius: "6px",
                    padding: "0.4rem 0.85rem",
                    whiteSpace: "nowrap",
                    fontSize: "0.88rem",
                  }}
                >
                  <span style={{ color: "#FFFFFF", fontWeight: "bold", marginRight: "4px" }}>
                    +
                  </span>{" "}
                  Create Ticket
                </button>
              </div>
            </div>

            {/* Authenticated User Identity Area - Profile Dropdown */}
            <div className="position-relative" ref={profileMenuRef}>
              <button
                id="profile-dropdown-trigger"
                type="button"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="btn btn-sm text-white d-flex align-items-center gap-2"
                style={{
                  backgroundColor: showProfileMenu ? "#0B7A46" : "rgba(255, 255, 255, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "8px",
                  padding: "0.35rem 0.65rem",
                  transition: "all 0.15s ease-in-out",
                }}
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{
                    width: "26px",
                    height: "26px",
                    backgroundColor: "#EAF6EF",
                    color: "#006B3C",
                    fontSize: "0.82rem",
                  }}
                >
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
                <span
                  id="user-identity-badge"
                  className="fw-semibold text-truncate d-inline-flex align-items-center gap-2"
                  style={{ maxWidth: "220px", fontSize: "0.85rem" }}
                  title={`${currentUser.displayName} (${currentUser.email})`}
                >
                  <span>{currentUser.displayName}</span>
                  {renderRoleBadge(currentUser.role)}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: showProfileMenu ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div
                  id="profile-dropdown-menu"
                  className="dropdown-menu dropdown-menu-end show shadow"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "6px",
                    minWidth: "240px",
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                    backgroundColor: "#FFFFFF",
                    padding: "0.5rem",
                    zIndex: 1050,
                  }}
                >
                  <div className="px-3 py-2 border-bottom mb-1 text-start">
                    <div className="fw-bold text-dark text-truncate" style={{ fontSize: "0.9rem" }}>
                      {currentUser.displayName}
                    </div>
                    <div className="text-muted small text-truncate" style={{ fontSize: "0.78rem" }}>
                      {currentUser.email}
                    </div>
                  </div>

                  <button
                    id="menu-change-password-button"
                    type="button"
                    className="dropdown-item d-flex align-items-center gap-2 py-2 rounded text-dark w-100 text-start border-0 bg-transparent"
                    style={{ fontSize: "0.88rem", cursor: "pointer" }}
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowChangePasswordModal(true);
                    }}
                  >
                    <span>🔑</span>
                    <span>Change Password</span>
                  </button>

                  <div className="dropdown-divider my-1 border-top" />

                  <button
                    id="logout-button"
                    type="button"
                    className="dropdown-item d-flex align-items-center gap-2 py-2 rounded w-100 text-start border-0 bg-transparent"
                    style={{ color: "#B3261E", fontSize: "0.88rem", cursor: "pointer" }}
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                  >
                    <span>🚪</span>
                    <span className="fw-semibold">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation Bar Tabs */}
          <div
            className="d-flex flex-wrap d-md-none gap-2 mt-2 pt-2 border-top w-100"
            style={{
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            {(currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR") && (
              <button
                id="mobile-nav-ticket-queue"
                type="button"
                onClick={() => setActiveTab("queue")}
                className="btn btn-sm text-white fw-semibold flex-fill text-center"
                style={{
                  backgroundColor:
                    activeTab === "queue" || (activeTab === "ticket-detail" && currentUser.role === "IT_STAFF")
                      ? "#0B7A46"
                      : "transparent",
                  border:
                    activeTab === "queue" || (activeTab === "ticket-detail" && currentUser.role === "IT_STAFF")
                      ? "1px solid #EAF6EF"
                      : "1px solid transparent",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.85rem",
                  whiteSpace: "nowrap",
                }}
              >
                📋 Ticket Queue
              </button>
            )}
            {currentUser.role !== "IT_STAFF" && (
              <button
                id="mobile-nav-my-tickets"
                type="button"
                onClick={() => setActiveTab("my-tickets")}
                className="btn btn-sm text-white fw-semibold flex-fill text-center"
                style={{
                  backgroundColor:
                    activeTab === "my-tickets" || (activeTab === "ticket-detail" && currentUser.role === "REQUESTER")
                      ? "#0B7A46"
                      : "transparent",
                  border:
                    activeTab === "my-tickets" || (activeTab === "ticket-detail" && currentUser.role === "REQUESTER")
                      ? "1px solid #EAF6EF"
                      : "1px solid transparent",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.85rem",
                  whiteSpace: "nowrap",
                }}
              >
                📋 My Tickets
              </button>
            )}
            <button
              id="mobile-nav-create-ticket"
              type="button"
              onClick={() => setActiveTab("create-ticket")}
              className="btn btn-sm text-white fw-semibold flex-fill text-center"
              style={{
                backgroundColor: activeTab === "create-ticket" ? "#0B7A46" : "transparent",
                border:
                  activeTab === "create-ticket"
                    ? "1px solid #EAF6EF"
                    : "1px solid transparent",
                borderRadius: "6px",
                padding: "0.4rem 0.6rem",
                fontSize: "0.85rem",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "#FFFFFF", fontWeight: "bold", marginRight: "4px" }}>+</span>{" "}
              Create Ticket
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="container-fluid px-3 px-md-5 py-4">
        {activeTab === "queue" ? (
          <StaffTicketQueue
            currentUser={currentUser}
            onSelectTicket={handleSelectTicket}
          />
        ) : activeTab === "my-tickets" ? (
          <MyTickets
            activeRequester={currentUser}
            onCreateTicketClick={() => setActiveTab("create-ticket")}
            onSelectTicket={handleSelectTicket}
          />
        ) : activeTab === "ticket-detail" && selectedTicketId ? (
          <TicketDetail
            ticketId={selectedTicketId}
            currentRequester={currentUser}
            onBack={() => setActiveTab(currentUser.role === "IT_STAFF" ? "queue" : "my-tickets")}
          />
        ) : (
          <CreateTicket
            activeRequester={currentUser}
            onSuccess={() => setActiveTab(currentUser.role === "IT_STAFF" ? "queue" : "my-tickets")}
            onCancel={() => setActiveTab(currentUser.role === "IT_STAFF" ? "queue" : "my-tickets")}
          />
        )}
      </main>
    </div>
  );
}
