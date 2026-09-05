import { useState } from "react";
import { checkSystem, Category, RequesterUser } from "./api.js";
import RequesterSelector from "./RequesterSelector.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";

type UiState = "idle" | "loading" | "success" | "error";
type ActiveTab = "my-tickets" | "create-ticket" | "system-status";

const STORAGE_KEY = "toktickit_selected_requester";
const DEFAULT_REQUESTER: RequesterUser = {
  id: 1,
  email: "somchai.p@kmutt.ac.th",
  displayName: "Somchai Pattana",
};

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("system-status");

  const [currentRequester, setCurrentRequester] = useState<RequesterUser>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return DEFAULT_REQUESTER;
  });
  const [showSelectorModal, setShowSelectorModal] = useState<boolean>(false);

  function handleSelectRequester(requester: RequesterUser) {
    setCurrentRequester(requester);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requester));
    setShowSelectorModal(false);
  }

  async function handleCheck() {
    setState("loading");
    setError(null);
    try {
      const res = await checkSystem();
      setCategories(res.categories);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backend service unavailable");
      setState("error");
    }
  }

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#F5F7F6", overflowX: "hidden", maxWidth: "100vw" }}>
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
      <header className="py-2 px-3 px-md-4 text-white shadow-sm" style={{ backgroundColor: "#006B3C", maxWidth: "100%", overflowX: "hidden" }}>
        <div className="container-fluid px-1 px-md-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 py-1">
            {/* Logo + Desktop Navigation */}
            <div className="d-flex align-items-center gap-3">
              <h1 className="h4 mb-0 fw-bold d-flex align-items-center gap-2" style={{ whiteSpace: "nowrap" }}>
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
              {currentRequester && !showSelectorModal && (
                <div className="d-none d-md-flex gap-2 ms-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("my-tickets")}
                    className="btn btn-sm text-white fw-semibold"
                    style={{
                      backgroundColor: activeTab === "my-tickets" ? "#0B7A46" : "transparent",
                      border: activeTab === "my-tickets" ? "1px solid #EAF6EF" : "1px solid transparent",
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
                      border: activeTab === "create-ticket" ? "1px solid #EAF6EF" : "1px solid transparent",
                      borderRadius: "6px",
                      padding: "0.4rem 0.85rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.88rem",
                    }}
                  >
                    <span style={{ color: "#FFFFFF", fontWeight: "bold", marginRight: "4px" }}>+</span> Create Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("system-status")}
                    className="btn btn-sm text-white fw-semibold"
                    style={{
                      backgroundColor: activeTab === "system-status" ? "#0B7A46" : "transparent",
                      border: activeTab === "system-status" ? "1px solid #EAF6EF" : "1px solid transparent",
                      borderRadius: "6px",
                      padding: "0.4rem 0.85rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.88rem",
                    }}
                  >
                    ⚙️ System Status
                  </button>
                </div>
              )}
            </div>

            {/* Requester Info */}
            <div className="d-flex align-items-center gap-2">
              {currentRequester ? (
                <>
                  <span
                    className="badge bg-light text-dark py-2 px-2 px-sm-3"
                    style={{
                      fontSize: "0.85rem",
                      maxWidth: "220px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={`👤 ${currentRequester.displayName} (${currentRequester.email})`}
                  >
                    👤 {currentRequester.displayName}
                    <span className="d-none d-sm-inline"> ({currentRequester.email})</span>
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
                    onClick={() => setShowSelectorModal(true)}
                  >
                    Change Requester
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-light fw-bold"
                  onClick={() => setShowSelectorModal(true)}
                >
                  Select Requester
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation Bar Tabs */}
          {currentRequester && !showSelectorModal && (
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
                  backgroundColor: activeTab === "my-tickets" ? "#0B7A46" : "transparent",
                  border: activeTab === "my-tickets" ? "1px solid #EAF6EF" : "1px solid transparent",
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
                  border: activeTab === "create-ticket" ? "1px solid #EAF6EF" : "1px solid transparent",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.85rem",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "#FFFFFF", fontWeight: "bold", marginRight: "4px" }}>+</span> Create Ticket
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("system-status")}
                className="btn btn-sm text-white fw-semibold flex-fill text-center"
                style={{
                  backgroundColor: activeTab === "system-status" ? "#0B7A46" : "transparent",
                  border: activeTab === "system-status" ? "1px solid #EAF6EF" : "1px solid transparent",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.85rem",
                  whiteSpace: "nowrap",
                }}
              >
                ⚙️ System Status
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="container-fluid px-3 px-md-5 py-4">
        {!currentRequester || showSelectorModal ? (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <RequesterSelector
              onSelectRequester={handleSelectRequester}
              onClose={currentRequester ? () => setShowSelectorModal(false) : undefined}
              currentRequesterId={currentRequester?.id}
            />
          </div>
        ) : activeTab === "my-tickets" ? (
          <MyTickets
            activeRequester={currentRequester}
            onCreateTicketClick={() => setActiveTab("create-ticket")}
          />
        ) : activeTab === "create-ticket" ? (
          <CreateTicket
            activeRequester={currentRequester}
            onSuccess={() => setActiveTab("my-tickets")}
            onCancel={() => setActiveTab("my-tickets")}
          />
        ) : (
          <div className="card shadow-sm border-0 p-4" style={{ maxWidth: 720, margin: "0 auto" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4 mb-0 text-dark">System Status Baseline</h2>
              <button
                className="btn text-white px-4 fw-semibold"
                style={{ backgroundColor: "#006B3C" }}
                onClick={handleCheck}
                disabled={state === "loading"}
              >
                {state === "loading" ? "Loading…" : "Check System"}
              </button>
            </div>

            {state === "error" && (
              <div className="alert alert-danger" role="alert">
                <h5 className="alert-heading mb-1">Status: Offline</h5>
                <p className="mb-0">{error ?? "Unable to connect to TokTickIT API server"}</p>
              </div>
            )}

            {state === "success" && (
              <div className="mt-2">
                <div className="alert alert-success" role="alert">
                  <h5 className="alert-heading mb-0">Status: Online</h5>
                </div>

                <h6 className="fw-bold mt-4">Categories ({categories.length}):</h6>
                <ul className="list-group mt-2">
                  {categories.map((category) => (
                    <li
                      key={category.id}
                      className="list-group-item d-flex justify-content-between align-items-center py-3"
                    >
                      <span className="fw-medium">{category.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

