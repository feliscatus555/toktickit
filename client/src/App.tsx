import { useState, useEffect } from "react";
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

type ActiveTab = "my-tickets" | "create-ticket" | "ticket-detail";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const token = getAuthToken();
    if (token) {
      return getStoredAuthUser();
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);

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
    setActiveTab("my-tickets");
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
        className="py-2 px-3 px-md-4 text-white shadow-sm"
        style={{ backgroundColor: "#006B3C", maxWidth: "100%", overflowX: "hidden" }}
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
                <button
                  type="button"
                  onClick={() => setActiveTab("my-tickets")}
                  className="btn btn-sm text-white fw-semibold"
                  style={{
                    backgroundColor:
                      activeTab === "my-tickets" || activeTab === "ticket-detail"
                        ? "#0B7A46"
                        : "transparent",
                    border:
                      activeTab === "my-tickets" || activeTab === "ticket-detail"
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
                <button
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

            {/* Authenticated User Identity Area */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span
                id="user-identity-badge"
                className="badge bg-light text-dark py-2 px-2 px-sm-3 d-inline-flex align-items-center gap-2"
                style={{
                  fontSize: "0.85rem",
                  maxWidth: "260px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={`${currentUser.displayName} (${currentUser.email})`}
              >
                <span className="fw-semibold text-truncate">
                  {currentUser.displayName}
                </span>
                {renderRoleBadge(currentUser.role)}
              </span>

              <button
                type="button"
                className="btn btn-sm text-white fw-semibold"
                style={{
                  backgroundColor: "#0B7A46",
                  border: "1px solid #EAF6EF",
                  whiteSpace: "nowrap",
                  fontSize: "0.82rem",
                  padding: "0.35rem 0.65rem",
                }}
                onClick={() => setShowChangePasswordModal(true)}
              >
                Change Password
              </button>

              <button
                id="logout-button"
                type="button"
                className="btn btn-sm btn-light fw-bold"
                style={{
                  color: "#B3261E",
                  border: "1px solid #F8B4B4",
                  fontSize: "0.82rem",
                  padding: "0.35rem 0.65rem",
                }}
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile Navigation Bar Tabs */}
          <div
            className="d-flex flex-wrap d-md-none gap-2 mt-2 pt-2 border-top w-100"
            style={{
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("my-tickets")}
              className="btn btn-sm text-white fw-semibold flex-fill text-center"
              style={{
                backgroundColor:
                  activeTab === "my-tickets" || activeTab === "ticket-detail"
                    ? "#0B7A46"
                    : "transparent",
                border:
                  activeTab === "my-tickets" || activeTab === "ticket-detail"
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
            <button
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
        {activeTab === "my-tickets" ? (
          <MyTickets
            activeRequester={currentUser}
            onCreateTicketClick={() => setActiveTab("create-ticket")}
            onSelectTicket={handleSelectTicket}
          />
        ) : activeTab === "ticket-detail" && selectedTicketId ? (
          <TicketDetail
            ticketId={selectedTicketId}
            currentRequester={currentUser}
            onBack={() => setActiveTab("my-tickets")}
          />
        ) : (
          <CreateTicket
            activeRequester={currentUser}
            onSuccess={() => setActiveTab("my-tickets")}
            onCancel={() => setActiveTab("my-tickets")}
          />
        )}
      </main>
    </div>
  );
}
