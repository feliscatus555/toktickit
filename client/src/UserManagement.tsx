import React, { useState, useEffect, useMemo } from "react";
import {
  AdminUser,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetUserPassword,
  CreateAdminUserData,
  UpdateAdminUserData,
} from "./api.js";
import { AuthUser } from "./api.js";

interface UserManagementProps {
  currentUser: AuthUser;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<CreateAdminUserData>({
    displayName: "",
    email: "",
    role: "REQUESTER",
    isActive: true,
    initialPassword: "",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState<boolean>(false);
  const [copiedCreatePass, setCopiedCreatePass] = useState<boolean>(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<UpdateAdminUserData>({
    displayName: "",
    email: "",
    role: "REQUESTER",
    isActive: true,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<boolean>(false);

  // Reset Password Sub-modal / section
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [newInitialPassword, setNewInitialPassword] = useState<string>("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);
  const [copiedResetPass, setCopiedResetPass] = useState<boolean>(false);

  // Load users
  const loadUsers = async (overrideSearch?: string, overrideRole?: string) => {
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
    } catch (err: any) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  // Handle Search submit or debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!createForm.displayName.trim()) {
      errors.displayName = "Full Name is required.";
    }
    if (!createForm.email.trim()) {
      errors.email = "Email Address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) {
      errors.email = "A valid email address is required.";
    }
    if (!createForm.initialPassword) {
      errors.initialPassword = "Initial Password is required.";
    } else if (createForm.initialPassword.length < 8) {
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
    } catch (err: any) {
      if (err.status === 409) {
        setCreateErrors({ email: "A user with this email address already exists." });
      } else if (err.data?.error?.fieldErrors) {
        const fe: Record<string, string> = {};
        for (const item of err.data.error.fieldErrors) {
          fe[item.field] = item.message;
        }
        setCreateErrors(fe);
      } else {
        setCreateErrors({ general: err.message || "Failed to create user." });
      }
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: AdminUser) => {
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const errors: Record<string, string> = {};
    if (!editForm.displayName?.trim()) {
      errors.displayName = "Full Name is required.";
    }
    if (!editForm.email?.trim()) {
      errors.email = "Email Address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
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
    } catch (err: any) {
      if (err.status === 409) {
        setEditErrors({ email: "A user with this email address already exists." });
      } else if (err.status === 422 && err.data?.error?.code === "SELF_DEACTIVATION_PREVENTED") {
        setEditErrors({ isActive: "Administrators cannot deactivate their own account." });
      } else if (err.status === 422 && err.data?.error?.code === "LAST_ADMIN_PREVENTED") {
        setEditErrors({ general: "Cannot remove or deactivate the last active Administrator." });
      } else {
        setEditErrors({ general: err.message || "Failed to update user." });
      }
    } finally {
      setUpdating(false);
    }
  };

  // Reset password
  const handleResetPasswordSubmit = async () => {
    if (!editingUser) return;
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
      setSuccessMessage(
        `Initial password reset for "${editingUser.displayName}". They must change it at next login.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadUsers();
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  const renderRolePill = (role: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return (
          <span
            className="badge fw-semibold"
            style={{
              backgroundColor: "#FEF3C7",
              color: "#B45309",
              border: "1px solid #FCD34D",
              fontSize: "0.78rem",
              padding: "0.25rem 0.6rem",
              borderRadius: "12px",
            }}
          >
            🛡 Administrator
          </span>
        );
      case "IT_STAFF":
        return (
          <span
            className="badge fw-semibold"
            style={{
              backgroundColor: "#EFF6FF",
              color: "#1D4ED8",
              border: "1px solid #93C5FD",
              fontSize: "0.78rem",
              padding: "0.25rem 0.6rem",
              borderRadius: "12px",
            }}
          >
            💻 IT Staff
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
              padding: "0.25rem 0.6rem",
              borderRadius: "12px",
            }}
          >
            👤 Requester
          </span>
        );
    }
  };

  const renderStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span
          className="badge fw-semibold"
          style={{
            backgroundColor: "#DEF7EC",
            color: "#03543F",
            border: "1px solid #31C48D",
            fontSize: "0.78rem",
            padding: "0.25rem 0.6rem",
            borderRadius: "12px",
          }}
        >
          ● Active
        </span>
      );
    }
    return (
      <span
        className="badge fw-semibold"
        style={{
          backgroundColor: "#F3F4F6",
          color: "#4B5563",
          border: "1px solid #D1D5DB",
          fontSize: "0.78rem",
          padding: "0.25rem 0.6rem",
          borderRadius: "12px",
        }}
      >
        ● Inactive
      </span>
    );
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Toast / Success Notification */}
      {successMessage && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between shadow-sm py-2 px-3 mb-3"
          style={{
            backgroundColor: "#EAF6EF",
            borderColor: "#0B7A46",
            color: "#006B3C",
            borderRadius: "6px",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <span>✓</span>
            <span className="fw-semibold" style={{ fontSize: "0.9rem" }}>
              {successMessage}
            </span>
          </div>
          <button
            type="button"
            className="btn-close"
            style={{ fontSize: "0.75rem" }}
            onClick={() => setSuccessMessage(null)}
          />
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert-danger shadow-sm py-2 px-3 mb-3" style={{ fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {/* Top Header Card */}
      <div
        className="card shadow-sm mb-4"
        style={{
          borderRadius: "8px",
          border: "1px solid #E0E0E0",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="card-body p-3 p-md-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
            <div>
              <h2 className="h4 mb-0 fw-bold" style={{ color: "#1F2937" }}>
                Users
              </h2>
              <span className="text-muted small">
                Manage user accounts, roles, activation status, and initial credentials.
              </span>
            </div>
            <button
              id="create-user-btn"
              type="button"
              className="btn text-white fw-bold d-flex align-items-center gap-2 shadow-sm"
              style={{
                backgroundColor: "#006B3C",
                borderRadius: "6px",
                padding: "0.5rem 1.1rem",
                fontSize: "0.9rem",
              }}
              onClick={handleOpenCreateModal}
            >
              <span>+</span>
              <span>Create User</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
            <div className="col-12 col-md-6 col-lg-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white text-muted border-end-0">🔍</span>
                <input
                  id="user-search-input"
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontSize: "0.88rem" }}
                />
                <button
                  id="search-submit-btn"
                  type="submit"
                  className="btn text-white fw-semibold"
                  style={{ backgroundColor: "#006B3C" }}
                >
                  Search
                </button>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-4 col-lg-3">
              <select
                id="user-role-filter"
                className="form-select form-select-sm"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ fontSize: "0.88rem" }}
              >
                <option value="ALL">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>

            {(searchQuery || selectedRole !== "ALL") && (
              <div className="col-12 col-sm-6 col-md-2">
                <button
                  type="button"
                  id="clear-filters-btn"
                  className="btn btn-sm btn-outline-secondary w-100"
                  style={{ fontSize: "0.85rem" }}
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Users List Container */}
      <div
        className="card shadow-sm mb-4"
        style={{
          borderRadius: "8px",
          border: "1px solid #E0E0E0",
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div className="p-5 text-center text-muted">
            <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
            <span>Loading user accounts...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-5 text-center text-muted">
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👥</div>
            <h5 className="fw-bold mb-1">No users found</h5>
            <p className="small mb-3">
              {searchQuery || selectedRole !== "ALL"
                ? "No user accounts match the current filter criteria."
                : "There are currently no users in the system."}
            </p>
            {(searchQuery || selectedRole !== "ALL") && (
              <button
                type="button"
                className="btn btn-sm text-white fw-semibold"
                style={{ backgroundColor: "#006B3C" }}
                onClick={handleClearFilters}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="table-responsive d-none d-md-block">
              <table id="user-table" className="table table-hover align-middle mb-0">
                <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <tr>
                    <th style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem" }}>
                      Name
                    </th>
                    <th style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem" }}>
                      Email
                    </th>
                    <th style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem" }}>
                      Role
                    </th>
                    <th style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem" }}>
                      Status
                    </th>
                    <th style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", padding: "0.85rem 1.25rem", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isCurrentUser = u.id === currentUser.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <div className="fw-bold" style={{ color: "#1F2937", fontSize: "0.92rem" }}>
                            {u.displayName}
                            {isCurrentUser && (
                              <span className="badge bg-secondary ms-2 small" style={{ fontSize: "0.68rem" }}>
                                You
                              </span>
                            )}
                          </div>
                          {u.mustChangePassword && (
                            <span className="text-warning small" style={{ fontSize: "0.72rem" }}>
                              ⚠️ Password change pending
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem", color: "#4B5563", fontSize: "0.88rem" }}>
                          {u.email}
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>{renderRolePill(u.role)}</td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>{renderStatusBadge(u.isActive)}</td>
                        <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                          <button
                            id={`edit-user-btn-${u.id}`}
                            type="button"
                            className="btn btn-sm btn-outline-secondary fw-semibold px-3"
                            style={{ fontSize: "0.82rem" }}
                            onClick={() => handleOpenEditModal(u)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div id="mobile-user-cards" className="d-md-none p-3 d-flex flex-column gap-3">
              {users.map((u) => {
                const isCurrentUser = u.id === currentUser.id;
                return (
                  <div
                    key={u.id}
                    className="p-3 border rounded shadow-sm"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-bold" style={{ fontSize: "0.95rem", color: "#1F2937" }}>
                          {u.displayName}
                          {isCurrentUser && (
                            <span className="badge bg-secondary ms-2 small" style={{ fontSize: "0.68rem" }}>
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-muted small">{u.email}</div>
                      </div>
                      <div>{renderStatusBadge(u.isActive)}</div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                      <div>{renderRolePill(u.role)}</div>
                      <button
                        id={`mobile-edit-user-btn-${u.id}`}
                        type="button"
                        className="btn btn-sm btn-outline-secondary fw-semibold px-3"
                        style={{ fontSize: "0.82rem" }}
                        onClick={() => handleOpenEditModal(u)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* Create User Modal */}
      {/* ===================================================================== */}
      {showCreateModal && (
        <div
          id="create-user-modal"
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div
                className="modal-header text-white"
                style={{ backgroundColor: "#006B3C" }}
              >
                <h5 className="modal-title h6 fw-bold mb-0">Create User</h5>
                <button
                  type="button"
                  id="cancel-create-user-btn-x"
                  className="btn-close btn-close-white"
                  onClick={handleCloseCreateModal}
                  disabled={creating}
                />
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body p-4">
                  {createErrors.general && (
                    <div className="alert alert-danger py-2 px-3 small mb-3">
                      {createErrors.general}
                    </div>
                  )}

                  <div className="mb-3">
                    <label
                      htmlFor="create-user-name"
                      className="form-label fw-bold mb-1"
                      style={{ fontSize: "0.82rem", color: "#374151" }}
                    >
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="create-user-name"
                      type="text"
                      className={`form-control form-control-sm ${
                        createErrors.displayName ? "is-invalid" : ""
                      }`}
                      placeholder="e.g. Somchai Pattana"
                      value={createForm.displayName}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, displayName: e.target.value }))
                      }
                      disabled={creating}
                    />
                    {createErrors.displayName && (
                      <div className="invalid-feedback">{createErrors.displayName}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="create-user-email"
                      className="form-label fw-bold mb-1"
                      style={{ fontSize: "0.82rem", color: "#374151" }}
                    >
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      id="create-user-email"
                      type="email"
                      className={`form-control form-control-sm ${
                        createErrors.email ? "is-invalid" : ""
                      }`}
                      placeholder="e.g. user@kmutt.ac.th"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      disabled={creating}
                    />
                    {createErrors.email && (
                      <div className="invalid-feedback">{createErrors.email}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="create-user-role"
                      className="form-label fw-bold mb-1"
                      style={{ fontSize: "0.82rem", color: "#374151" }}
                    >
                      Role <span className="text-danger">*</span>
                    </label>
                    <select
                      id="create-user-role"
                      className="form-select form-select-sm"
                      value={createForm.role}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          role: e.target.value as any,
                        }))
                      }
                      disabled={creating}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        id="create-user-active"
                        className="form-check-input"
                        type="checkbox"
                        checked={createForm.isActive}
                        onChange={(e) =>
                          setCreateForm((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
                        disabled={creating}
                      />
                      <label
                        htmlFor="create-user-active"
                        className="form-check-label fw-semibold"
                        style={{ fontSize: "0.85rem" }}
                      >
                        Active Account
                      </label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="create-user-password"
                      className="form-label fw-bold mb-1"
                      style={{ fontSize: "0.82rem", color: "#374151" }}
                    >
                      Initial Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        id="create-user-password"
                        type="text"
                        className={`form-control ${
                          createErrors.initialPassword ? "is-invalid" : ""
                        }`}
                        placeholder="Enter initial password"
                        value={createForm.initialPassword}
                        onChange={(e) =>
                          setCreateForm((prev) => ({ ...prev, initialPassword: e.target.value }))
                        }
                        disabled={creating}
                      />
                      <button
                        id="generate-password-btn"
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleGenerateCreatePassword}
                        disabled={creating}
                        title="Generate compliant password"
                      >
                        Generate
                      </button>
                      <button
                        id="copy-password-btn"
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleCopyCreatePassword}
                        disabled={!createForm.initialPassword || creating}
                        title="Copy password to clipboard"
                      >
                        {copiedCreatePass ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    {createErrors.initialPassword && (
                      <div className="text-danger mt-1 small">{createErrors.initialPassword}</div>
                    )}
                    <div className="form-text text-muted mt-2" style={{ fontSize: "0.78rem" }}>
                      ℹ️ User will be required to change password on first login.
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light p-3">
                  <button
                    id="cancel-create-user-btn"
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleCloseCreateModal}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    id="save-user-btn"
                    type="submit"
                    className="btn btn-sm text-white fw-bold px-3"
                    style={{ backgroundColor: "#006B3C" }}
                    disabled={creating}
                  >
                    {creating ? "Saving..." : "Save User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Edit User Modal */}
      {/* ===================================================================== */}
      {editingUser && (
        <div
          id="edit-user-modal"
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div
                className="modal-header text-white"
                style={{ backgroundColor: "#006B3C" }}
              >
                <h5 className="modal-title h6 fw-bold mb-0">
                  Edit User: {editingUser.displayName}
                </h5>
                <button
                  type="button"
                  id="cancel-edit-user-btn-x"
                  className="btn-close btn-close-white"
                  onClick={handleCloseEditModal}
                  disabled={updating}
                />
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body p-4">
                  {editErrors.general && (
                    <div className="alert alert-danger py-2 px-3 small mb-3">
                      {editErrors.general}
                    </div>
                  )}

                  <div className="mb-3">
                    <label
                      htmlFor="edit-user-name"
                      className="form-label fw-bold mb-1"
                      style={{ fontSize: "0.82rem", color: "#374151" }}
                    >
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-user-name"
                      type="text"
                      className={`form-control form-control-sm ${
                        editErrors.displayName ? "is-invalid" : ""
                      }`}
                      value={editForm.displayName}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, displayName: e.target.value }))
                      }
                      disabled={updating}
                    />
                    {editErrors.displayName && (
                      <div className="invalid-feedback">{editErrors.displayName}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="edit-user-email"
                      className="form-label fw-bold mb-1"
                      style={{ fontSize: "0.82rem", color: "#374151" }}
                    >
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-user-email"
                      type="email"
                      className={`form-control form-control-sm ${
                        editErrors.email ? "is-invalid" : ""
                      }`}
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      disabled={updating}
                    />
                    {editErrors.email && (
                      <div className="invalid-feedback">{editErrors.email}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="edit-user-role"
                      className="form-label fw-bold mb-1"
                      style={{ fontSize: "0.82rem", color: "#374151" }}
                    >
                      Role <span className="text-danger">*</span>
                    </label>
                    <select
                      id="edit-user-role"
                      className="form-select form-select-sm"
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, role: e.target.value as any }))
                      }
                      disabled={
                        updating ||
                        (editingUser.role === "ADMINISTRATOR" &&
                          editingUser.isActive &&
                          activeAdminCount <= 1)
                      }
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                    {editingUser.role === "ADMINISTRATOR" &&
                      editingUser.isActive &&
                      activeAdminCount <= 1 && (
                        <div className="form-text text-warning mt-1" style={{ fontSize: "0.75rem" }}>
                          ⚠️ Role locked: Cannot remove the role of the last active Administrator.
                        </div>
                      )}
                  </div>

                  <div className="mb-3">
                    {/* Self-Deactivation Guard */}
                    {currentUser.id === editingUser.id ? (
                      <div>
                        <div className="form-check form-switch">
                          <input
                            id="edit-user-active"
                            className="form-check-input"
                            type="checkbox"
                            checked={true}
                            disabled={true}
                          />
                          <label
                            htmlFor="edit-user-active"
                            className="form-check-label fw-semibold text-muted"
                            style={{ fontSize: "0.85rem" }}
                          >
                            Active Account (Self)
                          </label>
                        </div>
                        <div
                          id="self-deactivation-warning"
                          className="text-muted mt-1 small"
                          style={{ fontSize: "0.75rem" }}
                        >
                          🔒 Administrators cannot deactivate their own account.
                        </div>
                      </div>
                    ) : editingUser.role === "ADMINISTRATOR" &&
                      editingUser.isActive &&
                      activeAdminCount <= 1 ? (
                      <div>
                        <div className="form-check form-switch">
                          <input
                            id="edit-user-active"
                            className="form-check-input"
                            type="checkbox"
                            checked={true}
                            disabled={true}
                          />
                          <label
                            htmlFor="edit-user-active"
                            className="form-check-label fw-semibold text-muted"
                            style={{ fontSize: "0.85rem" }}
                          >
                            Active Account
                          </label>
                        </div>
                        <div
                          id="last-admin-warning"
                          className="text-muted mt-1 small"
                          style={{ fontSize: "0.75rem" }}
                        >
                          🔒 Cannot deactivate the last active Administrator.
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="form-check form-switch">
                          <input
                            id="edit-user-active"
                            className="form-check-input"
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))
                            }
                            disabled={updating}
                          />
                          <label
                            htmlFor="edit-user-active"
                            className="form-check-label fw-semibold"
                            style={{ fontSize: "0.85rem" }}
                          >
                            Active Account
                          </label>
                        </div>
                        {editErrors.isActive && (
                          <div className="text-danger mt-1 small">{editErrors.isActive}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <hr className="my-3" style={{ borderColor: "#E5E7EB" }} />

                  {/* Password Reset Action */}
                  <div className="p-3 bg-light rounded border">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <div className="fw-bold" style={{ fontSize: "0.85rem", color: "#1F2937" }}>
                          Credential Management
                        </div>
                        <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                          Issue a new initial password forcing password change on next login.
                        </div>
                      </div>
                      {!showResetPassword && (
                        <button
                          id="reset-password-btn"
                          type="button"
                          className="btn btn-sm btn-outline-warning text-dark fw-semibold"
                          style={{ fontSize: "0.8rem" }}
                          onClick={() => {
                            setShowResetPassword(true);
                            setNewInitialPassword(generateCompliantPassword());
                            setResetError(null);
                          }}
                          disabled={updating}
                        >
                          🔑 Reset Initial Password
                        </button>
                      )}
                    </div>

                    {showResetPassword && (
                      <div className="mt-3 pt-3 border-top">
                        {resetError && (
                          <div className="alert alert-danger py-1 px-2 small mb-2">{resetError}</div>
                        )}
                        <label
                          htmlFor="reset-password-input"
                          className="form-label fw-bold mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          New Initial Password
                        </label>
                        <div className="input-group input-group-sm mb-2">
                          <input
                            id="reset-password-input"
                            type="text"
                            className="form-control"
                            placeholder="Enter new temporary password"
                            value={newInitialPassword}
                            onChange={(e) => setNewInitialPassword(e.target.value)}
                            disabled={resetting}
                          />
                          <button
                            id="generate-reset-password-btn"
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setNewInitialPassword(generateCompliantPassword())}
                            disabled={resetting}
                          >
                            Generate
                          </button>
                          <button
                            id="copy-reset-password-btn"
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              navigator.clipboard.writeText(newInitialPassword);
                              setCopiedResetPass(true);
                              setTimeout(() => setCopiedResetPass(false), 2000);
                            }}
                            disabled={!newInitialPassword || resetting}
                          >
                            {copiedResetPass ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div className="d-flex gap-2 justify-content-end">
                          <button
                            id="cancel-reset-password-btn"
                            type="button"
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: "0.8rem" }}
                            onClick={() => {
                              setShowResetPassword(false);
                              setResetError(null);
                            }}
                            disabled={resetting}
                          >
                            Cancel
                          </button>
                          <button
                            id="confirm-reset-password-btn"
                            type="button"
                            className="btn btn-sm btn-warning text-dark fw-bold"
                            style={{ fontSize: "0.8rem" }}
                            onClick={handleResetPasswordSubmit}
                            disabled={resetting || !newInitialPassword.trim()}
                          >
                            {resetting ? "Resetting..." : "Confirm Password Reset"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer bg-light p-3">
                  <button
                    id="cancel-edit-user-btn"
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleCloseEditModal}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    id="save-edit-user-btn"
                    type="submit"
                    className="btn btn-sm text-white fw-bold px-3"
                    style={{ backgroundColor: "#006B3C" }}
                    disabled={updating}
                  >
                    {updating ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
