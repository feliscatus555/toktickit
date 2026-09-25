import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { getStoredAuthUser, getAuthToken, fetchCurrentUser, logout as apiLogout, clearAuthSession, } from "./api.js";
import Login from "./Login.js";
import ChangePassword from "./ChangePassword.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";
import StaffTicketQueue from "./StaffTicketQueue.js";
import UserManagement from "./UserManagement.js";
export default function App() {
    const [currentUser, setCurrentUser] = useState(() => {
        const token = getAuthToken();
        if (token) {
            return getStoredAuthUser();
        }
        return null;
    });
    const [activeTab, setActiveTab] = useState(() => {
        const token = getAuthToken();
        if (token) {
            const u = getStoredAuthUser();
            if (u) {
                if (u.role === "ADMINISTRATOR") {
                    return "user-management";
                }
                if (u.role === "IT_STAFF") {
                    return "queue";
                }
            }
        }
        return "my-tickets";
    });
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
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
    function handleLoginSuccess(user) {
        setCurrentUser(user);
        if (user.role === "ADMINISTRATOR") {
            setActiveTab("user-management");
        }
        else if (user.role === "IT_STAFF") {
            setActiveTab("queue");
        }
        else {
            setActiveTab("my-tickets");
        }
    }
    function handlePasswordChanged(user) {
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
    function handleSelectTicket(ticketId) {
        setSelectedTicketId(ticketId);
        setActiveTab("ticket-detail");
    }
    // Helper for role badge display
    function renderRoleBadge(role) {
        switch (role) {
            case "IT_STAFF":
                return (_jsx("span", { className: "badge fw-semibold", style: {
                        backgroundColor: "#E0F2FE",
                        color: "#0369A1",
                        border: "1px solid #7DD3FC",
                        fontSize: "0.78rem",
                        padding: "0.25rem 0.5rem",
                    }, children: "\uD83D\uDEE0 IT Staff" }));
            case "ADMINISTRATOR":
                return (_jsx("span", { className: "badge fw-semibold", style: {
                        backgroundColor: "#FEF3C7",
                        color: "#B45309",
                        border: "1px solid #FCD34D",
                        fontSize: "0.78rem",
                        padding: "0.25rem 0.5rem",
                    }, children: "\uD83D\uDEE1 Admin" }));
            default:
                return (_jsx("span", { className: "badge fw-semibold", style: {
                        backgroundColor: "#EAF6EF",
                        color: "#006B3C",
                        border: "1px solid #0B7A46",
                        fontSize: "0.78rem",
                        padding: "0.25rem 0.5rem",
                    }, children: "\uD83D\uDC64 Requester" }));
        }
    }
    // If not authenticated, render Login
    if (!currentUser) {
        return _jsx(Login, { onLoginSuccess: handleLoginSuccess });
    }
    // If user must change password, render mandatory ChangePassword screen
    if (currentUser.mustChangePassword) {
        return (_jsx(ChangePassword, { currentUser: currentUser, onPasswordChanged: handlePasswordChanged }));
    }
    // If voluntary password change requested from shell
    if (showChangePasswordModal) {
        return (_jsx(ChangePassword, { currentUser: currentUser, onPasswordChanged: handlePasswordChanged, onCancel: () => setShowChangePasswordModal(false) }));
    }
    return (_jsxs("div", { className: "min-vh-100", style: {
            backgroundColor: "#F5F7F6",
            overflowX: "hidden",
            maxWidth: "100vw",
        }, children: [_jsx("style", { children: `
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
      ` }), _jsx("header", { className: "py-2 px-3 px-md-4 text-white shadow-sm position-relative", style: {
                    backgroundColor: "#006B3C",
                    maxWidth: "100%",
                    overflow: "visible",
                    zIndex: 100,
                }, children: _jsxs("div", { className: "container-fluid px-1 px-md-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center flex-wrap gap-2 py-1", children: [_jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("h1", { className: "h4 mb-0 fw-bold d-flex align-items-center gap-2", style: { whiteSpace: "nowrap" }, children: [_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#FFFFFF", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }), _jsx("span", { children: "TokTickIT" })] }), _jsxs("div", { className: "d-none d-md-flex gap-2 ms-2", children: [(currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR") && (_jsx("button", { id: "nav-ticket-queue", type: "button", onClick: () => setActiveTab("queue"), className: "btn btn-sm text-white fw-semibold", style: {
                                                        backgroundColor: activeTab === "queue" ||
                                                            (activeTab === "ticket-detail" &&
                                                                (currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR"))
                                                            ? "#0B7A46"
                                                            : "transparent",
                                                        border: activeTab === "queue" ||
                                                            (activeTab === "ticket-detail" &&
                                                                (currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR"))
                                                            ? "1px solid #EAF6EF"
                                                            : "1px solid transparent",
                                                        borderRadius: "6px",
                                                        padding: "0.4rem 0.85rem",
                                                        whiteSpace: "nowrap",
                                                        fontSize: "0.88rem",
                                                    }, children: "\uD83D\uDCCB Ticket Queue" })), currentUser.role !== "IT_STAFF" && (_jsx("button", { id: "nav-my-tickets", type: "button", onClick: () => setActiveTab("my-tickets"), className: "btn btn-sm text-white fw-semibold", style: {
                                                        backgroundColor: activeTab === "my-tickets" || (activeTab === "ticket-detail" && currentUser.role === "REQUESTER")
                                                            ? "#0B7A46"
                                                            : "transparent",
                                                        border: activeTab === "my-tickets" || (activeTab === "ticket-detail" && currentUser.role === "REQUESTER")
                                                            ? "1px solid #EAF6EF"
                                                            : "1px solid transparent",
                                                        borderRadius: "6px",
                                                        padding: "0.4rem 0.85rem",
                                                        whiteSpace: "nowrap",
                                                        fontSize: "0.88rem",
                                                    }, children: "\uD83D\uDCCB My Tickets" })), currentUser.role === "ADMINISTRATOR" && (_jsx("button", { id: "nav-user-management", type: "button", onClick: () => setActiveTab("user-management"), className: "btn btn-sm text-white fw-semibold", style: {
                                                        backgroundColor: activeTab === "user-management" ? "#0B7A46" : "transparent",
                                                        border: activeTab === "user-management"
                                                            ? "1px solid #EAF6EF"
                                                            : "1px solid transparent",
                                                        borderRadius: "6px",
                                                        padding: "0.4rem 0.85rem",
                                                        whiteSpace: "nowrap",
                                                        fontSize: "0.88rem",
                                                    }, children: "\uD83D\uDC65 User Management" })), _jsxs("button", { id: "nav-create-ticket", type: "button", onClick: () => setActiveTab("create-ticket"), className: "btn btn-sm text-white fw-semibold", style: {
                                                        backgroundColor: activeTab === "create-ticket" ? "#0B7A46" : "transparent",
                                                        border: activeTab === "create-ticket"
                                                            ? "1px solid #EAF6EF"
                                                            : "1px solid transparent",
                                                        borderRadius: "6px",
                                                        padding: "0.4rem 0.85rem",
                                                        whiteSpace: "nowrap",
                                                        fontSize: "0.88rem",
                                                    }, children: [_jsx("span", { style: { color: "#FFFFFF", fontWeight: "bold", marginRight: "4px" }, children: "+" }), " ", "Create Ticket"] })] })] }), _jsxs("div", { className: "position-relative", ref: profileMenuRef, children: [_jsxs("button", { id: "profile-dropdown-trigger", type: "button", onClick: () => setShowProfileMenu((prev) => !prev), className: "btn btn-sm text-white d-flex align-items-center gap-2", style: {
                                                backgroundColor: showProfileMenu ? "#0B7A46" : "rgba(255, 255, 255, 0.15)",
                                                border: "1px solid rgba(255, 255, 255, 0.3)",
                                                borderRadius: "8px",
                                                padding: "0.35rem 0.65rem",
                                                transition: "all 0.15s ease-in-out",
                                            }, "aria-expanded": showProfileMenu, "aria-haspopup": "true", children: [_jsx("div", { className: "rounded-circle d-flex align-items-center justify-content-center fw-bold", style: {
                                                        width: "26px",
                                                        height: "26px",
                                                        backgroundColor: "#EAF6EF",
                                                        color: "#006B3C",
                                                        fontSize: "0.82rem",
                                                    }, children: currentUser.displayName.charAt(0).toUpperCase() }), _jsxs("span", { id: "user-identity-badge", className: "fw-semibold text-truncate d-inline-flex align-items-center gap-2", style: { maxWidth: "220px", fontSize: "0.85rem" }, title: `${currentUser.displayName} (${currentUser.email})`, children: [_jsx("span", { children: currentUser.displayName }), renderRoleBadge(currentUser.role)] }), _jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", style: {
                                                        transform: showProfileMenu ? "rotate(180deg)" : "rotate(0deg)",
                                                        transition: "transform 0.15s ease",
                                                    }, children: _jsx("polyline", { points: "6 9 12 15 18 9" }) })] }), showProfileMenu && (_jsxs("div", { id: "profile-dropdown-menu", className: "dropdown-menu dropdown-menu-end show shadow", style: {
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
                                            }, children: [_jsxs("div", { className: "px-3 py-2 border-bottom mb-1 text-start", children: [_jsx("div", { className: "fw-bold text-dark text-truncate", style: { fontSize: "0.9rem" }, children: currentUser.displayName }), _jsx("div", { className: "text-muted small text-truncate", style: { fontSize: "0.78rem" }, children: currentUser.email })] }), _jsxs("button", { id: "menu-change-password-button", type: "button", className: "dropdown-item d-flex align-items-center gap-2 py-2 rounded text-dark w-100 text-start border-0 bg-transparent", style: { fontSize: "0.88rem", cursor: "pointer" }, onClick: () => {
                                                        setShowProfileMenu(false);
                                                        setShowChangePasswordModal(true);
                                                    }, children: [_jsx("span", { children: "\uD83D\uDD11" }), _jsx("span", { children: "Change Password" })] }), _jsx("div", { className: "dropdown-divider my-1 border-top" }), _jsxs("button", { id: "logout-button", type: "button", className: "dropdown-item d-flex align-items-center gap-2 py-2 rounded w-100 text-start border-0 bg-transparent", style: { color: "#B3261E", fontSize: "0.88rem", cursor: "pointer" }, onClick: () => {
                                                        setShowProfileMenu(false);
                                                        handleLogout();
                                                    }, children: [_jsx("span", { children: "\uD83D\uDEAA" }), _jsx("span", { className: "fw-semibold", children: "Sign Out" })] })] }))] })] }), _jsxs("div", { className: "d-flex flex-wrap d-md-none gap-2 mt-2 pt-2 border-top w-100", style: {
                                borderColor: "rgba(255, 255, 255, 0.2)",
                            }, children: [(currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR") && (_jsx("button", { id: "mobile-nav-ticket-queue", type: "button", onClick: () => setActiveTab("queue"), className: "btn btn-sm text-white fw-semibold flex-fill text-center", style: {
                                        backgroundColor: activeTab === "queue" ||
                                            (activeTab === "ticket-detail" &&
                                                (currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR"))
                                            ? "#0B7A46"
                                            : "transparent",
                                        border: activeTab === "queue" ||
                                            (activeTab === "ticket-detail" &&
                                                (currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR"))
                                            ? "1px solid #EAF6EF"
                                            : "1px solid transparent",
                                        borderRadius: "6px",
                                        padding: "0.4rem 0.6rem",
                                        fontSize: "0.85rem",
                                        whiteSpace: "nowrap",
                                    }, children: "\uD83D\uDCCB Ticket Queue" })), currentUser.role !== "IT_STAFF" && (_jsx("button", { id: "mobile-nav-my-tickets", type: "button", onClick: () => setActiveTab("my-tickets"), className: "btn btn-sm text-white fw-semibold flex-fill text-center", style: {
                                        backgroundColor: activeTab === "my-tickets" || (activeTab === "ticket-detail" && currentUser.role === "REQUESTER")
                                            ? "#0B7A46"
                                            : "transparent",
                                        border: activeTab === "my-tickets" || (activeTab === "ticket-detail" && currentUser.role === "REQUESTER")
                                            ? "1px solid #EAF6EF"
                                            : "1px solid transparent",
                                        borderRadius: "6px",
                                        padding: "0.4rem 0.6rem",
                                        fontSize: "0.85rem",
                                        whiteSpace: "nowrap",
                                    }, children: "\uD83D\uDCCB My Tickets" })), currentUser.role === "ADMINISTRATOR" && (_jsx("button", { id: "mobile-nav-user-management", type: "button", onClick: () => setActiveTab("user-management"), className: "btn btn-sm text-white fw-semibold flex-fill text-center", style: {
                                        backgroundColor: activeTab === "user-management" ? "#0B7A46" : "transparent",
                                        border: activeTab === "user-management"
                                            ? "1px solid #EAF6EF"
                                            : "1px solid transparent",
                                        borderRadius: "6px",
                                        padding: "0.4rem 0.6rem",
                                        fontSize: "0.85rem",
                                        whiteSpace: "nowrap",
                                    }, children: "\uD83D\uDC65 Users" })), _jsxs("button", { id: "mobile-nav-create-ticket", type: "button", onClick: () => setActiveTab("create-ticket"), className: "btn btn-sm text-white fw-semibold flex-fill text-center", style: {
                                        backgroundColor: activeTab === "create-ticket" ? "#0B7A46" : "transparent",
                                        border: activeTab === "create-ticket"
                                            ? "1px solid #EAF6EF"
                                            : "1px solid transparent",
                                        borderRadius: "6px",
                                        padding: "0.4rem 0.6rem",
                                        fontSize: "0.85rem",
                                        whiteSpace: "nowrap",
                                    }, children: [_jsx("span", { style: { color: "#FFFFFF", fontWeight: "bold", marginRight: "4px" }, children: "+" }), " ", "Create Ticket"] })] })] }) }), _jsx("main", { className: "container-fluid px-3 px-md-5 py-4", children: activeTab === "user-management" && currentUser.role === "ADMINISTRATOR" ? (_jsx(UserManagement, { currentUser: currentUser })) : activeTab === "queue" ? (_jsx(StaffTicketQueue, { currentUser: currentUser, onSelectTicket: handleSelectTicket })) : activeTab === "my-tickets" ? (_jsx(MyTickets, { activeRequester: currentUser, onCreateTicketClick: () => setActiveTab("create-ticket"), onSelectTicket: handleSelectTicket })) : activeTab === "ticket-detail" && selectedTicketId ? (_jsx(TicketDetail, { ticketId: selectedTicketId, currentRequester: currentUser, onBack: () => setActiveTab(currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR"
                        ? "queue"
                        : "my-tickets") })) : (_jsx(CreateTicket, { activeRequester: currentUser, onSuccess: () => setActiveTab(currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR"
                        ? "queue"
                        : "my-tickets"), onCancel: () => setActiveTab(currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR"
                        ? "queue"
                        : "my-tickets") })) })] }));
}
