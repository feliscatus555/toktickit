import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { checkSystem } from "./api.js";
import RequesterSelector from "./RequesterSelector.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";
const STORAGE_KEY = "toktickit_selected_requester";
const DEFAULT_REQUESTER = {
    id: 1,
    email: "somchai.p@kmutt.ac.th",
    displayName: "Somchai Pattana",
};
export default function App() {
    const [state, setState] = useState("idle");
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("system-status");
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [currentRequester, setCurrentRequester] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            }
            catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        return DEFAULT_REQUESTER;
    });
    const [showSelectorModal, setShowSelectorModal] = useState(false);
    function handleSelectRequester(requester) {
        setCurrentRequester(requester);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(requester));
        setShowSelectorModal(false);
    }
    function handleSelectTicket(ticketId) {
        setSelectedTicketId(ticketId);
        setActiveTab("ticket-detail");
    }
    async function handleCheck() {
        setState("loading");
        setError(null);
        try {
            const res = await checkSystem();
            setCategories(res.categories);
            setState("success");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Backend service unavailable");
            setState("error");
        }
    }
    return (_jsxs("div", { className: "min-vh-100", style: { backgroundColor: "#F5F7F6", overflowX: "hidden", maxWidth: "100vw" }, children: [_jsx("style", { children: `
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
      ` }), _jsx("header", { className: "py-2 px-3 px-md-4 text-white shadow-sm", style: { backgroundColor: "#006B3C", maxWidth: "100%", overflowX: "hidden" }, children: _jsxs("div", { className: "container-fluid px-1 px-md-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center flex-wrap gap-2 py-1", children: [_jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("h1", { className: "h4 mb-0 fw-bold d-flex align-items-center gap-2", style: { whiteSpace: "nowrap" }, children: [_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#FFFFFF", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }), _jsx("span", { children: "TokTickIT" })] }), currentRequester && !showSelectorModal && (_jsxs("div", { className: "d-none d-md-flex gap-2 ms-2", children: [_jsx("button", { type: "button", onClick: () => setActiveTab("my-tickets"), className: "btn btn-sm text-white fw-semibold", style: {
                                                        backgroundColor: activeTab === "my-tickets" || activeTab === "ticket-detail" ? "#0B7A46" : "transparent",
                                                        border: activeTab === "my-tickets" || activeTab === "ticket-detail" ? "1px solid #EAF6EF" : "1px solid transparent",
                                                        borderRadius: "6px",
                                                        padding: "0.4rem 0.85rem",
                                                        whiteSpace: "nowrap",
                                                        fontSize: "0.88rem",
                                                    }, children: "\uD83D\uDCCB My Tickets" }), _jsxs("button", { type: "button", onClick: () => setActiveTab("create-ticket"), className: "btn btn-sm text-white fw-semibold", style: {
                                                        backgroundColor: activeTab === "create-ticket" ? "#0B7A46" : "transparent",
                                                        border: activeTab === "create-ticket" ? "1px solid #EAF6EF" : "1px solid transparent",
                                                        borderRadius: "6px",
                                                        padding: "0.4rem 0.85rem",
                                                        whiteSpace: "nowrap",
                                                        fontSize: "0.88rem",
                                                    }, children: [_jsx("span", { style: { color: "#FFFFFF", fontWeight: "bold", marginRight: "4px" }, children: "+" }), " Create Ticket"] }), _jsx("button", { type: "button", onClick: () => setActiveTab("system-status"), className: "btn btn-sm text-white fw-semibold", style: {
                                                        backgroundColor: activeTab === "system-status" ? "#0B7A46" : "transparent",
                                                        border: activeTab === "system-status" ? "1px solid #EAF6EF" : "1px solid transparent",
                                                        borderRadius: "6px",
                                                        padding: "0.4rem 0.85rem",
                                                        whiteSpace: "nowrap",
                                                        fontSize: "0.88rem",
                                                    }, children: "\u2699\uFE0F System Status" })] }))] }), _jsx("div", { className: "d-flex align-items-center gap-2", children: currentRequester ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "badge bg-light text-dark py-2 px-2 px-sm-3", style: {
                                                    fontSize: "0.85rem",
                                                    maxWidth: "220px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }, title: `👤 ${currentRequester.displayName} (${currentRequester.email})`, children: ["\uD83D\uDC64 ", currentRequester.displayName, _jsxs("span", { className: "d-none d-sm-inline", children: [" (", currentRequester.email, ")"] })] }), _jsx("button", { type: "button", className: "btn btn-sm text-white fw-semibold", style: {
                                                    backgroundColor: "#0B7A46",
                                                    border: "1px solid #EAF6EF",
                                                    whiteSpace: "nowrap",
                                                    fontSize: "0.82rem",
                                                    padding: "0.35rem 0.65rem",
                                                }, onClick: () => setShowSelectorModal(true), children: "Change Requester" })] })) : (_jsx("button", { type: "button", className: "btn btn-sm btn-light fw-bold", onClick: () => setShowSelectorModal(true), children: "Select Requester" })) })] }), currentRequester && !showSelectorModal && (_jsxs("div", { className: "d-flex flex-wrap d-md-none gap-2 mt-2 pt-2 border-top w-100", style: {
                                borderColor: "rgba(255, 255, 255, 0.2)",
                            }, children: [_jsx("button", { type: "button", onClick: () => setActiveTab("my-tickets"), className: "btn btn-sm text-white fw-semibold flex-fill text-center", style: {
                                        backgroundColor: activeTab === "my-tickets" || activeTab === "ticket-detail" ? "#0B7A46" : "transparent",
                                        border: activeTab === "my-tickets" || activeTab === "ticket-detail" ? "1px solid #EAF6EF" : "1px solid transparent",
                                        borderRadius: "6px",
                                        padding: "0.4rem 0.6rem",
                                        fontSize: "0.85rem",
                                        whiteSpace: "nowrap",
                                    }, children: "\uD83D\uDCCB My Tickets" }), _jsxs("button", { type: "button", onClick: () => setActiveTab("create-ticket"), className: "btn btn-sm text-white fw-semibold flex-fill text-center", style: {
                                        backgroundColor: activeTab === "create-ticket" ? "#0B7A46" : "transparent",
                                        border: activeTab === "create-ticket" ? "1px solid #EAF6EF" : "1px solid transparent",
                                        borderRadius: "6px",
                                        padding: "0.4rem 0.6rem",
                                        fontSize: "0.85rem",
                                        whiteSpace: "nowrap",
                                    }, children: [_jsx("span", { style: { color: "#FFFFFF", fontWeight: "bold", marginRight: "4px" }, children: "+" }), " Create Ticket"] }), _jsx("button", { type: "button", onClick: () => setActiveTab("system-status"), className: "btn btn-sm text-white fw-semibold flex-fill text-center", style: {
                                        backgroundColor: activeTab === "system-status" ? "#0B7A46" : "transparent",
                                        border: activeTab === "system-status" ? "1px solid #EAF6EF" : "1px solid transparent",
                                        borderRadius: "6px",
                                        padding: "0.4rem 0.6rem",
                                        fontSize: "0.85rem",
                                        whiteSpace: "nowrap",
                                    }, children: "\u2699\uFE0F System Status" })] }))] }) }), _jsx("main", { className: "container-fluid px-3 px-md-5 py-4", children: !currentRequester || showSelectorModal ? (_jsx("div", { style: { maxWidth: 720, margin: "0 auto" }, children: _jsx(RequesterSelector, { onSelectRequester: handleSelectRequester, onClose: currentRequester ? () => setShowSelectorModal(false) : undefined, currentRequesterId: currentRequester?.id }) })) : activeTab === "my-tickets" ? (_jsx(MyTickets, { activeRequester: currentRequester, onCreateTicketClick: () => setActiveTab("create-ticket"), onSelectTicket: handleSelectTicket })) : activeTab === "ticket-detail" && selectedTicketId ? (_jsx(TicketDetail, { ticketId: selectedTicketId, currentRequester: currentRequester, onBack: () => setActiveTab("my-tickets") })) : activeTab === "create-ticket" ? (_jsx(CreateTicket, { activeRequester: currentRequester, onSuccess: () => setActiveTab("my-tickets"), onCancel: () => setActiveTab("my-tickets") })) : (_jsxs("div", { className: "card shadow-sm border-0 p-4", style: { maxWidth: 720, margin: "0 auto" }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsx("h2", { className: "h4 mb-0 text-dark", children: "System Status Baseline" }), _jsx("button", { className: "btn text-white px-4 fw-semibold", style: { backgroundColor: "#006B3C" }, onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Loading…" : "Check System" })] }), state === "error" && (_jsxs("div", { className: "alert alert-danger", role: "alert", children: [_jsx("h5", { className: "alert-heading mb-1", children: "Status: Offline" }), _jsx("p", { className: "mb-0", children: error ?? "Unable to connect to TokTickIT API server" })] })), state === "success" && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "alert alert-success", role: "alert", children: _jsx("h5", { className: "alert-heading mb-0", children: "Status: Online" }) }), _jsxs("h6", { className: "fw-bold mt-4", children: ["Categories (", categories.length, "):"] }), _jsx("ul", { className: "list-group mt-2", children: categories.map((category) => (_jsx("li", { className: "list-group-item d-flex justify-content-between align-items-center py-3", children: _jsx("span", { className: "fw-medium", children: category.name }) }, category.id))) })] }))] })) })] }));
}
