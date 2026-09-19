import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { fetchAdminUsers, createAdminUser, updateAdminUser, resetUserPassword, } from "./api.js";
export default function UserManagement({ currentUser }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState("ALL");
    // Create User Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        displayName: "",
        email: "",
        role: "REQUESTER",
        isActive: true,
        initialPassword: "",
    });
    const [createErrors, setCreateErrors] = useState({});
    const [creating, setCreating] = useState(false);
    const [copiedCreatePass, setCopiedCreatePass] = useState(false);
    // Edit User Modal
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({
        displayName: "",
        email: "",
        role: "REQUESTER",
        isActive: true,
    });
    const [editErrors, setEditErrors] = useState({});
    const [updating, setUpdating] = useState(false);
    // Reset Password Sub-modal / section
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [newInitialPassword, setNewInitialPassword] = useState("");
    const [resetError, setResetError] = useState(null);
    const [resetting, setResetting] = useState(false);
    const [copiedResetPass, setCopiedResetPass] = useState(false);
    // Load users
    const loadUsers = async (overrideSearch, overrideRole) => {
        try {
            setLoading(true);
            setError(null);
            const queryToUse = overrideSearch !== undefined ? overrideSearch : searchQuery;
            const roleToUse = overrideRole !== undefined ? overrideRole : selectedRole;
            const data = await fetchAdminUsers({
                search: queryToUse.trim() || undefined,
                role: roleToUse !== "ALL" ? roleToUse : undefined,
            });
            setUsers(data);
        }
        catch (err) {
            setError(err.message || "Failed to load users.");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadUsers();
    }, [selectedRole]);
    // Handle Search submit or debounce
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadUsers();
    };
    const handleClearFilters = () => {
        setSearchQuery("");
        setSelectedRole("ALL");
        loadUsers("", "ALL");
    };
    // Count active administrators in current dataset
    const activeAdminCount = useMemo(() => {
        return users.filter((u) => u.role === "ADMINISTRATOR" && u.isActive).length;
    }, [users]);
    // Generate compliant password
    const generateCompliantPassword = () => {
        const specials = "!@#$%^&*";
        const special = specials[Math.floor(Math.random() * specials.length)];
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `TokTick${randomNum}${special}Pass`;
    };
    const handleGenerateCreatePassword = () => {
        const p = generateCompliantPassword();
        setCreateForm((prev) => ({ ...prev, initialPassword: p }));
        setCreateErrors((prev) => {
            const copy = { ...prev };
            delete copy.initialPassword;
            return copy;
        });
    };
    const handleCopyCreatePassword = () => {
        if (createForm.initialPassword) {
            navigator.clipboard.writeText(createForm.initialPassword);
            setCopiedCreatePass(true);
            setTimeout(() => setCopiedCreatePass(false), 2000);
        }
    };
    const handleOpenCreateModal = () => {
        setCreateForm({
            displayName: "",
            email: "",
            role: "REQUESTER",
            isActive: true,
            initialPassword: generateCompliantPassword(),
        });
        setCreateErrors({});
        setShowCreateModal(true);
    };
    const handleCloseCreateModal = () => {
        setShowCreateModal(false);
        setCreateErrors({});
    };
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        const errors = {};
        if (!createForm.displayName.trim()) {
            errors.displayName = "Full Name is required.";
        }
        if (!createForm.email.trim()) {
            errors.email = "Email Address is required.";
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) {
            errors.email = "A valid email address is required.";
        }
        if (!createForm.initialPassword) {
            errors.initialPassword = "Initial Password is required.";
        }
        else if (createForm.initialPassword.length < 8) {
            errors.initialPassword = "Password must be at least 8 characters long.";
        }
        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors);
            return;
        }
        try {
            setCreating(true);
            setCreateErrors({});
            await createAdminUser({
                displayName: createForm.displayName.trim(),
                email: createForm.email.trim().toLowerCase(),
                role: createForm.role,
                isActive: createForm.isActive,
                initialPassword: createForm.initialPassword,
            });
            setShowCreateModal(false);
            setSuccessMessage(`User "${createForm.displayName}" created successfully.`);
            setTimeout(() => setSuccessMessage(null), 4000);
            await loadUsers();
        }
        catch (err) {
            if (err.status === 409) {
                setCreateErrors({ email: "A user with this email address already exists." });
            }
            else if (err.data?.error?.fieldErrors) {
                const fe = {};
                for (const item of err.data.error.fieldErrors) {
                    fe[item.field] = item.message;
                }
                setCreateErrors(fe);
            }
            else {
                setCreateErrors({ general: err.message || "Failed to create user." });
            }
        }
        finally {
            setCreating(false);
        }
    };
    // Open Edit Modal
    const handleOpenEditModal = (user) => {
        setEditingUser(user);
        setEditForm({
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        });
        setEditErrors({});
        setShowResetPassword(false);
        setNewInitialPassword("");
        setResetError(null);
    };
    const handleCloseEditModal = () => {
        setEditingUser(null);
        setEditErrors({});
        setShowResetPassword(false);
    };
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingUser)
            return;
        const errors = {};
        if (!editForm.displayName?.trim()) {
            errors.displayName = "Full Name is required.";
        }
        if (!editForm.email?.trim()) {
            errors.email = "Email Address is required.";
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
            errors.email = "A valid email address is required.";
        }
        // Client-side safety checks
        const isSelf = currentUser.id === editingUser.id;
        if (isSelf && editForm.isActive === false) {
            errors.isActive = "You cannot deactivate your own account.";
        }
        const isLastAdmin = editingUser.role === "ADMINISTRATOR" && editingUser.isActive && activeAdminCount <= 1;
        if (isLastAdmin && (editForm.isActive === false || editForm.role !== "ADMINISTRATOR")) {
            errors.general = "Cannot remove or deactivate the last active Administrator.";
        }
        if (Object.keys(errors).length > 0) {
            setEditErrors(errors);
            return;
        }
        try {
            setUpdating(true);
            setEditErrors({});
            await updateAdminUser(editingUser.id, {
                displayName: editForm.displayName?.trim(),
                email: editForm.email?.trim().toLowerCase(),
                role: editForm.role,
                isActive: editForm.isActive,
            });
            setEditingUser(null);
            setSuccessMessage(`User "${editForm.displayName}" updated successfully.`);
            setTimeout(() => setSuccessMessage(null), 4000);
            await loadUsers();
        }
        catch (err) {
            if (err.status === 409) {
                setEditErrors({ email: "A user with this email address already exists." });
            }
            else if (err.status === 422 && err.data?.error?.code === "SELF_DEACTIVATION_PREVENTED") {
                setEditErrors({ isActive: "Administrators cannot deactivate their own account." });
            }
            else if (err.status === 422 && err.data?.error?.code === "LAST_ADMIN_PREVENTED") {
                setEditErrors({ general: "Cannot remove or deactivate the last active Administrator." });
            }
            else {
                setEditErrors({ general: err.message || "Failed to update user." });
            }
        }
        finally {
            setUpdating(false);
        }
    };
    // Reset password
    const handleResetPasswordSubmit = async () => {
        if (!editingUser)
            return;
        if (!newInitialPassword) {
            setResetError("New initial password is required.");
            return;
        }
        if (newInitialPassword.length < 8) {
            setResetError("Password must be at least 8 characters long.");
            return;
        }
        try {
            setResetting(true);
            setResetError(null);
            await resetUserPassword(editingUser.id, newInitialPassword);
            setShowResetPassword(false);
            setNewInitialPassword("");
            setSuccessMessage(`Initial password reset for "${editingUser.displayName}". They must change it at next login.`);
            setTimeout(() => setSuccessMessage(null), 4000);
            await loadUsers();
        }
        catch (err) {
            setResetError(err.message || "Failed to reset password.");
        }
        finally {
            setResetting(false);
        }
    };
    const renderRolePill = (role) => {
        switch (role) {
            case "ADMINISTRATOR":
                return (_jsx("span", { className: "badge fw-semibold", style: {
                        backgroundColor: "#FEF3C7",
                        color: "#B45309",
                        border: "1px solid #FCD34D",
                        fontSize: "0.78rem",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "12px",
                    }, children: "\uD83D\uDEE1 Administrator" }));
            case "IT_STAFF":
                return (_jsx("span", { className: "badge fw-semibold", style: {
                        backgroundColor: "#EFF6FF",
                        color: "#1D4ED8",
                        border: "1px solid #93C5FD",
                        fontSize: "0.78rem",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "12px",
                    }, children: "\uD83D\uDCBB IT Staff" }));
            default:
                return (_jsx("span", { className: "badge fw-semibold", style: {
                        backgroundColor: "#EAF6EF",
                        color: "#006B3C",
                        border: "1px solid #0B7A46",
                        fontSize: "0.78rem",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "12px",
                    }, children: "\uD83D\uDC64 Requester" }));
        }
    };
    const renderStatusBadge = (isActive) => {
        if (isActive) {
            return (_jsx("span", { className: "badge fw-semibold", style: {
                    backgroundColor: "#DEF7EC",
                    color: "#03543F",
                    border: "1px solid #31C48D",
                    fontSize: "0.78rem",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "12px",
                }, children: "\u25CF Active" }));
        }
        return (_jsx("span", { className: "badge fw-semibold", style: {
                backgroundColor: "#F3F4F6",
                color: "#4B5563",
                border: "1px solid #D1D5DB",
                fontSize: "0.78rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "12px",
            }, children: "\u25CF Inactive" }));
    };
    return (_jsxs("div", { style: { maxWidth: "1440px", margin: "0 auto" }, children: [successMessage && (_jsxs("div", { className: "alert alert-success d-flex align-items-center justify-content-between shadow-sm py-2 px-3 mb-3", style: {
                    backgroundColor: "#EAF6EF",
                    borderColor: "#0B7A46",
                    color: "#006B3C",
                    borderRadius: "6px",
                }, children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("span", { children: "\u2713" }), _jsx("span", { className: "fw-semibold", style: { fontSize: "0.9rem" }, children: successMessage })] }), _jsx("button", { type: "button", className: "btn-close", style: { fontSize: "0.75rem" }, onClick: () => setSuccessMessage(null) })] })), error && (_jsx("div", { id: "user-management-error-banner", className: "alert alert-danger shadow-sm py-2 px-3 mb-3", style: { fontSize: "0.9rem" }, children: error })), _jsx("div", { className: "card shadow-sm mb-4", style: {
                    borderRadius: "8px",
                    border: "1px solid #E0E0E0",
                    backgroundColor: "#FFFFFF",
                }, children: _jsxs("div", { className: "card-body p-3 p-md-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "h4 mb-0 fw-bold", style: { color: "#1F2937" }, children: "Users" }), _jsx("span", { className: "text-muted small", children: "Manage user accounts, roles, activation status, and initial credentials." })] }), _jsxs("button", { id: "create-user-btn", type: "button", className: "btn text-white fw-bold d-flex align-items-center gap-2 shadow-sm", style: {
                                        backgroundColor: "#006B3C",
                                        borderRadius: "6px",
                                        padding: "0.5rem 1.1rem",
                                        fontSize: "0.9rem",
                                    }, onClick: handleOpenCreateModal, children: [_jsx("span", { children: "+" }), _jsx("span", { children: "Create User" })] })] }), _jsxs("form", { onSubmit: handleSearchSubmit, className: "row g-2 align-items-center", children: [_jsx("div", { className: "col-12 col-md-6 col-lg-5", children: _jsxs("div", { className: "input-group input-group-sm", children: [_jsx("span", { className: "input-group-text bg-white text-muted border-end-0", children: "\uD83D\uDD0D" }), _jsx("input", { id: "user-search-input", type: "text", className: "form-control border-start-0", placeholder: "Search users by name or email...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: { fontSize: "0.88rem" } }), _jsx("button", { id: "search-submit-btn", type: "submit", className: "btn text-white fw-semibold", style: { backgroundColor: "#006B3C" }, children: "Search" })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-4 col-lg-3", children: _jsxs("select", { id: "user-role-filter", className: "form-select form-select-sm", value: selectedRole, onChange: (e) => setSelectedRole(e.target.value), style: { fontSize: "0.88rem" }, children: [_jsx("option", { value: "ALL", children: "All Roles" }), _jsx("option", { value: "REQUESTER", children: "Requester" }), _jsx("option", { value: "IT_STAFF", children: "IT Staff" }), _jsx("option", { value: "ADMINISTRATOR", children: "Administrator" })] }) }), (searchQuery || selectedRole !== "ALL") && (_jsx("div", { className: "col-12 col-sm-6 col-md-2", children: _jsx("button", { type: "button", id: "clear-filters-btn", className: "btn btn-sm btn-outline-secondary w-100", style: { fontSize: "0.85rem" }, onClick: handleClearFilters, children: "Clear Filters" }) }))] })] }) }), _jsx("div", { className: "card shadow-sm mb-4", style: {
                    borderRadius: "8px",
                    border: "1px solid #E0E0E0",
                    backgroundColor: "#FFFFFF",
                    overflow: "hidden",
                }, children: loading ? (_jsxs("div", { className: "p-5 text-center text-muted", children: [_jsx("div", { className: "spinner-border spinner-border-sm text-success me-2", role: "status" }), _jsx("span", { children: "Loading user accounts..." })] })) : users.length === 0 ? (_jsxs("div", { className: "p-5 text-center text-muted", children: [_jsx("div", { style: { fontSize: "2rem", marginBottom: "0.5rem" }, children: "\uD83D\uDC65" }), _jsx("h5", { className: "fw-bold mb-1", children: "No users found" }), _jsx("p", { className: "small mb-3", children: searchQuery || selectedRole !== "ALL"
                                ? "No user accounts match the current filter criteria."
                                : "There are currently no users in the system." }), (searchQuery || selectedRole !== "ALL") && (_jsx("button", { type: "button", className: "btn btn-sm text-white fw-semibold", style: { backgroundColor: "#006B3C" }, onClick: handleClearFilters, children: "Reset Filters" }))] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "table-responsive d-none d-md-block", children: _jsxs("table", { id: "user-table", className: "table table-hover align-middle mb-0", children: [_jsx("thead", { style: { backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }, children: _jsxs("tr", { children: [_jsx("th", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem" }, children: "Name" }), _jsx("th", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem" }, children: "Email" }), _jsx("th", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem" }, children: "Role" }), _jsx("th", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem" }, children: "Status" }), _jsx("th", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem", textAlign: "right" }, children: "Actions" })] }) }), _jsx("tbody", { children: users.map((u) => {
                                            const isCurrentUser = u.id === currentUser.id;
                                            return (_jsxs("tr", { style: { borderBottom: "1px solid #F3F4F6" }, children: [_jsxs("td", { style: { padding: "0.85rem 1.25rem" }, children: [_jsxs("div", { className: "fw-bold", style: { color: "#1F2937", fontSize: "0.92rem" }, children: [u.displayName, isCurrentUser && (_jsx("span", { className: "badge bg-secondary ms-2 small", style: { fontSize: "0.68rem" }, children: "You" }))] }), u.mustChangePassword && (_jsx("span", { className: "text-warning small", style: { fontSize: "0.72rem" }, children: "\u26A0\uFE0F Password change pending" }))] }), _jsx("td", { style: { padding: "0.85rem 1.25rem", color: "#4B5563", fontSize: "0.88rem" }, children: u.email }), _jsx("td", { style: { padding: "0.85rem 1.25rem" }, children: renderRolePill(u.role) }), _jsx("td", { style: { padding: "0.85rem 1.25rem" }, children: renderStatusBadge(u.isActive) }), _jsx("td", { style: { padding: "0.85rem 1.25rem", textAlign: "right" }, children: _jsx("button", { id: `edit-user-btn-${u.id}`, type: "button", className: "btn btn-sm btn-outline-secondary fw-semibold px-3", style: { fontSize: "0.82rem" }, onClick: () => handleOpenEditModal(u), children: "Edit" }) })] }, u.id));
                                        }) })] }) }), _jsx("div", { id: "mobile-user-cards", className: "d-md-none p-3 d-flex flex-column gap-3", children: users.map((u) => {
                                const isCurrentUser = u.id === currentUser.id;
                                return (_jsxs("div", { className: "p-3 border rounded shadow-sm", style: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsxs("div", { children: [_jsxs("div", { className: "fw-bold", style: { fontSize: "0.95rem", color: "#1F2937" }, children: [u.displayName, isCurrentUser && (_jsx("span", { className: "badge bg-secondary ms-2 small", style: { fontSize: "0.68rem" }, children: "You" }))] }), _jsx("div", { className: "text-muted small", children: u.email })] }), _jsx("div", { children: renderStatusBadge(u.isActive) })] }), _jsxs("div", { className: "d-flex justify-content-between align-items-center mt-3 pt-2 border-top", children: [_jsx("div", { children: renderRolePill(u.role) }), _jsx("button", { id: `mobile-edit-user-btn-${u.id}`, type: "button", className: "btn btn-sm btn-outline-secondary fw-semibold px-3", style: { fontSize: "0.82rem" }, onClick: () => handleOpenEditModal(u), children: "Edit" })] })] }, u.id));
                            }) })] })) }), showCreateModal && (_jsx("div", { id: "create-user-modal", className: "modal show d-block", tabIndex: -1, style: { backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content border-0 shadow", children: [_jsxs("div", { className: "modal-header text-white", style: { backgroundColor: "#006B3C" }, children: [_jsx("h5", { className: "modal-title h6 fw-bold mb-0", children: "Create User" }), _jsx("button", { type: "button", id: "cancel-create-user-btn-x", className: "btn-close btn-close-white", onClick: handleCloseCreateModal, disabled: creating })] }), _jsxs("form", { onSubmit: handleCreateSubmit, children: [_jsxs("div", { className: "modal-body p-4", children: [createErrors.general && (_jsx("div", { className: "alert alert-danger py-2 px-3 small mb-3", children: createErrors.general })), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "create-user-name", className: "form-label fw-bold mb-1", style: { fontSize: "0.82rem", color: "#374151" }, children: ["Full Name ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { id: "create-user-name", type: "text", className: `form-control form-control-sm ${createErrors.displayName ? "is-invalid" : ""}`, placeholder: "e.g. Somchai Pattana", value: createForm.displayName, onChange: (e) => setCreateForm((prev) => ({ ...prev, displayName: e.target.value })), disabled: creating }), createErrors.displayName && (_jsx("div", { className: "invalid-feedback", children: createErrors.displayName }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "create-user-email", className: "form-label fw-bold mb-1", style: { fontSize: "0.82rem", color: "#374151" }, children: ["Email Address ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { id: "create-user-email", type: "email", className: `form-control form-control-sm ${createErrors.email ? "is-invalid" : ""}`, placeholder: "e.g. user@kmutt.ac.th", value: createForm.email, onChange: (e) => setCreateForm((prev) => ({ ...prev, email: e.target.value })), disabled: creating }), createErrors.email && (_jsx("div", { className: "invalid-feedback", children: createErrors.email }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "create-user-role", className: "form-label fw-bold mb-1", style: { fontSize: "0.82rem", color: "#374151" }, children: ["Role ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "create-user-role", className: "form-select form-select-sm", value: createForm.role, onChange: (e) => setCreateForm((prev) => ({
                                                            ...prev,
                                                            role: e.target.value,
                                                        })), disabled: creating, children: [_jsx("option", { value: "REQUESTER", children: "Requester" }), _jsx("option", { value: "IT_STAFF", children: "IT Staff" }), _jsx("option", { value: "ADMINISTRATOR", children: "Administrator" })] })] }), _jsx("div", { className: "mb-3", children: _jsxs("div", { className: "form-check form-switch", children: [_jsx("input", { id: "create-user-active", className: "form-check-input", type: "checkbox", checked: createForm.isActive, onChange: (e) => setCreateForm((prev) => ({ ...prev, isActive: e.target.checked })), disabled: creating }), _jsx("label", { htmlFor: "create-user-active", className: "form-check-label fw-semibold", style: { fontSize: "0.85rem" }, children: "Active Account" })] }) }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "create-user-password", className: "form-label fw-bold mb-1", style: { fontSize: "0.82rem", color: "#374151" }, children: ["Initial Password ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("div", { className: "input-group input-group-sm", children: [_jsx("input", { id: "create-user-password", type: "text", className: `form-control ${createErrors.initialPassword ? "is-invalid" : ""}`, placeholder: "Enter initial password", value: createForm.initialPassword, onChange: (e) => setCreateForm((prev) => ({ ...prev, initialPassword: e.target.value })), disabled: creating }), _jsx("button", { id: "generate-password-btn", type: "button", className: "btn btn-outline-secondary", onClick: handleGenerateCreatePassword, disabled: creating, title: "Generate compliant password", children: "Generate" }), _jsx("button", { id: "copy-password-btn", type: "button", className: "btn btn-outline-secondary", onClick: handleCopyCreatePassword, disabled: !createForm.initialPassword || creating, title: "Copy password to clipboard", children: copiedCreatePass ? "Copied!" : "Copy" })] }), createErrors.initialPassword && (_jsx("div", { className: "text-danger mt-1 small", children: createErrors.initialPassword })), _jsx("div", { className: "form-text text-muted mt-2", style: { fontSize: "0.78rem" }, children: "\u2139\uFE0F User will be required to change password on first login." })] })] }), _jsxs("div", { className: "modal-footer bg-light p-3", children: [_jsx("button", { id: "cancel-create-user-btn", type: "button", className: "btn btn-sm btn-secondary", onClick: handleCloseCreateModal, disabled: creating, children: "Cancel" }), _jsx("button", { id: "save-user-btn", type: "submit", className: "btn btn-sm text-white fw-bold px-3", style: { backgroundColor: "#006B3C" }, disabled: creating, children: creating ? "Saving..." : "Save User" })] })] })] }) }) })), editingUser && (_jsx("div", { id: "edit-user-modal", className: "modal show d-block", tabIndex: -1, style: { backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content border-0 shadow", children: [_jsxs("div", { className: "modal-header text-white", style: { backgroundColor: "#006B3C" }, children: [_jsxs("h5", { className: "modal-title h6 fw-bold mb-0", children: ["Edit User: ", editingUser.displayName] }), _jsx("button", { type: "button", id: "cancel-edit-user-btn-x", className: "btn-close btn-close-white", onClick: handleCloseEditModal, disabled: updating })] }), _jsxs("form", { onSubmit: handleEditSubmit, children: [_jsxs("div", { className: "modal-body p-4", children: [editErrors.general && (_jsx("div", { className: "alert alert-danger py-2 px-3 small mb-3", children: editErrors.general })), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "edit-user-name", className: "form-label fw-bold mb-1", style: { fontSize: "0.82rem", color: "#374151" }, children: ["Full Name ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { id: "edit-user-name", type: "text", className: `form-control form-control-sm ${editErrors.displayName ? "is-invalid" : ""}`, value: editForm.displayName, onChange: (e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value })), disabled: updating }), editErrors.displayName && (_jsx("div", { className: "invalid-feedback", children: editErrors.displayName }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "edit-user-email", className: "form-label fw-bold mb-1", style: { fontSize: "0.82rem", color: "#374151" }, children: ["Email Address ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { id: "edit-user-email", type: "email", className: `form-control form-control-sm ${editErrors.email ? "is-invalid" : ""}`, value: editForm.email, onChange: (e) => setEditForm((prev) => ({ ...prev, email: e.target.value })), disabled: updating }), editErrors.email && (_jsx("div", { className: "invalid-feedback", children: editErrors.email }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "edit-user-role", className: "form-label fw-bold mb-1", style: { fontSize: "0.82rem", color: "#374151" }, children: ["Role ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "edit-user-role", className: "form-select form-select-sm", value: editForm.role, onChange: (e) => setEditForm((prev) => ({ ...prev, role: e.target.value })), disabled: updating ||
                                                            (editingUser.role === "ADMINISTRATOR" &&
                                                                editingUser.isActive &&
                                                                activeAdminCount <= 1), children: [_jsx("option", { value: "REQUESTER", children: "Requester" }), _jsx("option", { value: "IT_STAFF", children: "IT Staff" }), _jsx("option", { value: "ADMINISTRATOR", children: "Administrator" })] }), editingUser.role === "ADMINISTRATOR" &&
                                                        editingUser.isActive &&
                                                        activeAdminCount <= 1 && (_jsx("div", { className: "form-text text-warning mt-1", style: { fontSize: "0.75rem" }, children: "\u26A0\uFE0F Role locked: Cannot remove the role of the last active Administrator." }))] }), _jsx("div", { className: "mb-3", children: currentUser.id === editingUser.id ? (_jsxs("div", { children: [_jsxs("div", { className: "form-check form-switch", children: [_jsx("input", { id: "edit-user-active", className: "form-check-input", type: "checkbox", checked: true, disabled: true }), _jsx("label", { htmlFor: "edit-user-active", className: "form-check-label fw-semibold text-muted", style: { fontSize: "0.85rem" }, children: "Active Account (Self)" })] }), _jsx("div", { id: "self-deactivation-warning", className: "text-muted mt-1 small", style: { fontSize: "0.75rem" }, children: "\uD83D\uDD12 Administrators cannot deactivate their own account." })] })) : editingUser.role === "ADMINISTRATOR" &&
                                                    editingUser.isActive &&
                                                    activeAdminCount <= 1 ? (_jsxs("div", { children: [_jsxs("div", { className: "form-check form-switch", children: [_jsx("input", { id: "edit-user-active", className: "form-check-input", type: "checkbox", checked: true, disabled: true }), _jsx("label", { htmlFor: "edit-user-active", className: "form-check-label fw-semibold text-muted", style: { fontSize: "0.85rem" }, children: "Active Account" })] }), _jsx("div", { id: "last-admin-warning", className: "text-muted mt-1 small", style: { fontSize: "0.75rem" }, children: "\uD83D\uDD12 Cannot deactivate the last active Administrator." })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "form-check form-switch", children: [_jsx("input", { id: "edit-user-active", className: "form-check-input", type: "checkbox", checked: editForm.isActive, onChange: (e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked })), disabled: updating }), _jsx("label", { htmlFor: "edit-user-active", className: "form-check-label fw-semibold", style: { fontSize: "0.85rem" }, children: "Active Account" })] }), editErrors.isActive && (_jsx("div", { className: "text-danger mt-1 small", children: editErrors.isActive }))] })) }), _jsx("hr", { className: "my-3", style: { borderColor: "#E5E7EB" } }), _jsxs("div", { className: "p-3 bg-light rounded border", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsxs("div", { children: [_jsx("div", { className: "fw-bold", style: { fontSize: "0.85rem", color: "#1F2937" }, children: "Credential Management" }), _jsx("div", { className: "text-muted small", style: { fontSize: "0.75rem" }, children: "Issue a new initial password forcing password change on next login." })] }), !showResetPassword && (_jsx("button", { id: "reset-password-btn", type: "button", className: "btn btn-sm btn-outline-warning text-dark fw-semibold", style: { fontSize: "0.8rem" }, onClick: () => {
                                                                    setShowResetPassword(true);
                                                                    setNewInitialPassword(generateCompliantPassword());
                                                                    setResetError(null);
                                                                }, disabled: updating, children: "\uD83D\uDD11 Reset Initial Password" }))] }), showResetPassword && (_jsxs("div", { className: "mt-3 pt-3 border-top", children: [resetError && (_jsx("div", { className: "alert alert-danger py-1 px-2 small mb-2", children: resetError })), _jsx("label", { htmlFor: "reset-password-input", className: "form-label fw-bold mb-1", style: { fontSize: "0.8rem" }, children: "New Initial Password" }), _jsxs("div", { className: "input-group input-group-sm mb-2", children: [_jsx("input", { id: "reset-password-input", type: "text", className: "form-control", placeholder: "Enter new temporary password", value: newInitialPassword, onChange: (e) => setNewInitialPassword(e.target.value), disabled: resetting }), _jsx("button", { id: "generate-reset-password-btn", type: "button", className: "btn btn-outline-secondary", onClick: () => setNewInitialPassword(generateCompliantPassword()), disabled: resetting, children: "Generate" }), _jsx("button", { id: "copy-reset-password-btn", type: "button", className: "btn btn-outline-secondary", onClick: () => {
                                                                            navigator.clipboard.writeText(newInitialPassword);
                                                                            setCopiedResetPass(true);
                                                                            setTimeout(() => setCopiedResetPass(false), 2000);
                                                                        }, disabled: !newInitialPassword || resetting, children: copiedResetPass ? "Copied!" : "Copy" })] }), _jsxs("div", { className: "d-flex gap-2 justify-content-end", children: [_jsx("button", { id: "cancel-reset-password-btn", type: "button", className: "btn btn-sm btn-secondary", style: { fontSize: "0.8rem" }, onClick: () => {
                                                                            setShowResetPassword(false);
                                                                            setResetError(null);
                                                                        }, disabled: resetting, children: "Cancel" }), _jsx("button", { id: "confirm-reset-password-btn", type: "button", className: "btn btn-sm btn-warning text-dark fw-bold", style: { fontSize: "0.8rem" }, onClick: handleResetPasswordSubmit, disabled: resetting || !newInitialPassword.trim(), children: resetting ? "Resetting..." : "Confirm Password Reset" })] })] }))] })] }), _jsxs("div", { className: "modal-footer bg-light p-3", children: [_jsx("button", { id: "cancel-edit-user-btn", type: "button", className: "btn btn-sm btn-secondary", onClick: handleCloseEditModal, disabled: updating, children: "Cancel" }), _jsx("button", { id: "save-edit-user-btn", type: "submit", className: "btn btn-sm text-white fw-bold px-3", style: { backgroundColor: "#006B3C" }, disabled: updating, children: updating ? "Saving Changes..." : "Save Changes" })] })] })] }) }) }))] }));
}
