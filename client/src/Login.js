import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { login } from "./api.js";
export default function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    async function handleSubmit(e) {
        e.preventDefault();
        setErrorMessage(null);
        if (!email.trim() || !password) {
            setErrorMessage("Please enter both email and password.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await login(email.trim(), password);
            onLoginSuccess(res.user, res.token);
        }
        catch (err) {
            setErrorMessage(err.message || "Invalid email or password. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    }
    return (_jsx("div", { className: "d-flex align-items-center justify-content-center min-vh-100 p-3", style: { backgroundColor: "#F5F7F6" }, children: _jsxs("div", { className: "card shadow-sm border-0 w-100", style: {
                maxWidth: "420px",
                backgroundColor: "#FFFFFF",
                borderRadius: "10px",
                padding: "2rem",
            }, children: [_jsxs("div", { className: "text-center mb-4", children: [_jsx("div", { className: "d-inline-flex align-items-center justify-content-center mb-2", children: _jsxs("svg", { width: "36", height: "36", viewBox: "0 0 24 24", fill: "none", stroke: "#006B3C", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }) }), _jsx("h1", { className: "h3 fw-bold mb-1", style: { color: "#006B3C" }, children: "TokTickIT" }), _jsx("p", { className: "text-muted small mb-0", children: "Sign in to your account" })] }), errorMessage && (_jsxs("div", { id: "login-error", role: "alert", className: "alert alert-danger py-2 px-3 mb-3 d-flex align-items-center gap-2", style: {
                        backgroundColor: "#FDF2F2",
                        borderColor: "#F8B4B4",
                        color: "#B3261E",
                        fontSize: "0.875rem",
                        borderRadius: "6px",
                    }, children: [_jsx("span", { children: "\u26A0\uFE0F" }), _jsx("span", { children: errorMessage })] })), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("div", { className: "mb-3 text-start", children: [_jsxs("label", { htmlFor: "login-email", className: "form-label fw-semibold mb-1", style: { color: "#1F2937", fontSize: "0.9rem" }, children: ["Email address ", _jsx("span", { style: { color: "#B3261E" }, children: "*" })] }), _jsx("input", { id: "login-email", type: "email", className: "form-control", placeholder: "name@toktickit.com", value: email, onChange: (e) => setEmail(e.target.value), disabled: isLoading, required: true, style: {
                                        borderColor: "#D1D5DB",
                                        borderRadius: "6px",
                                        padding: "0.6rem 0.8rem",
                                        fontSize: "0.95rem",
                                    } })] }), _jsxs("div", { className: "mb-4 text-start", children: [_jsxs("label", { htmlFor: "login-password", className: "form-label fw-semibold mb-1", style: { color: "#1F2937", fontSize: "0.9rem" }, children: ["Password ", _jsx("span", { style: { color: "#B3261E" }, children: "*" })] }), _jsxs("div", { className: "input-group", children: [_jsx("input", { id: "login-password", type: showPassword ? "text" : "password", className: "form-control", placeholder: "Enter password", value: password, onChange: (e) => setPassword(e.target.value), disabled: isLoading, required: true, style: {
                                                borderColor: "#D1D5DB",
                                                borderTopLeftRadius: "6px",
                                                borderBottomLeftRadius: "6px",
                                                padding: "0.6rem 0.8rem",
                                                fontSize: "0.95rem",
                                            } }), _jsx("button", { type: "button", className: "btn btn-outline-secondary", "aria-label": showPassword ? "Hide password" : "Show password", onClick: () => setShowPassword(!showPassword), disabled: isLoading, style: {
                                                borderColor: "#D1D5DB",
                                                borderTopRightRadius: "6px",
                                                borderBottomRightRadius: "6px",
                                            }, children: showPassword ? "🙈" : "👁️" })] })] }), _jsx("button", { id: "login-submit-button", type: "submit", disabled: isLoading, className: "btn w-100 fw-semibold text-white d-flex align-items-center justify-content-center gap-2", style: {
                                backgroundColor: "#006B3C",
                                borderColor: "#006B3C",
                                borderRadius: "6px",
                                padding: "0.65rem 1rem",
                                fontSize: "1rem",
                            }, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" }), _jsx("span", { children: "Signing in..." })] })) : (_jsx("span", { children: "Sign In" })) })] })] }) }));
}
