import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { fetchActiveRequesters } from "./api.js";
export default function RequesterSelector({ onSelectRequester, onClose, currentRequesterId, }) {
    const [requesters, setRequesters] = useState([]);
    const [selectedId, setSelectedId] = useState(currentRequesterId ?? "");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadRequesters();
    }, []);
    async function loadRequesters() {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchActiveRequesters();
            setRequesters(data);
            if (data.length > 0 && !selectedId) {
                setSelectedId(data[0].id);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load active requesters");
        }
        finally {
            setLoading(false);
        }
    }
    function handleFormSubmit(e) {
        e.preventDefault();
        if (!selectedId)
            return;
        const found = requesters.find((r) => r.id === Number(selectedId));
        if (found) {
            onSelectRequester(found);
            if (onClose)
                onClose();
        }
    }
    return (_jsxs("div", { className: "card shadow-sm border-0", style: { maxWidth: 560, margin: "0 auto" }, children: [_jsx("div", { className: "card-header text-white", style: { backgroundColor: "#006B3C" }, children: _jsx("h4", { className: "card-title h5 mb-0 py-1", children: "Development Requester Selection" }) }), _jsxs("div", { className: "card-body p-4", style: { backgroundColor: "#F5F7F6" }, children: [_jsxs("div", { className: "alert alert-warning border-warning", role: "alert", children: [_jsx("h6", { className: "alert-heading fw-bold mb-1", children: "Testing Context Disclaimer" }), _jsx("p", { className: "mb-0 small", children: "Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3." })] }), loading && (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "spinner-border text-success", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading active requesters\u2026" }) }), _jsx("p", { className: "mt-2 text-muted mb-0", children: "Loading active Development Requesters\u2026" })] })), error && (_jsxs("div", { className: "alert alert-danger mt-3", role: "alert", children: [_jsx("p", { className: "mb-2", children: error }), _jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: loadRequesters, children: "Retry Loading" })] })), !loading && !error && requesters.length === 0 && (_jsx("div", { className: "alert alert-secondary mt-3", role: "alert", children: "No active Development Requesters exist in the database." })), !loading && !error && requesters.length > 0 && (_jsxs("form", { onSubmit: handleFormSubmit, className: "mt-3", children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "requester-select", className: "form-label fw-semibold", children: ["Select Active Development Requester ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("select", { id: "requester-select", className: "form-select", value: selectedId, onChange: (e) => setSelectedId(Number(e.target.value)), required: true, children: requesters.map((r) => (_jsxs("option", { value: r.id, children: [r.displayName, " (", r.email, ")"] }, r.id))) })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-4", children: [onClose && (_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, children: "Cancel" })), _jsx("button", { type: "submit", className: "btn text-white px-4 fw-semibold", style: { backgroundColor: "#006B3C" }, disabled: !selectedId, children: "Continue" })] })] }))] })] }));
}
