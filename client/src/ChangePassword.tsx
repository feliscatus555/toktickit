import { useState, FormEvent, useMemo } from "react";
import { changePassword, AuthUser } from "./api.js";

interface ChangePasswordProps {
  currentUser: AuthUser;
  onPasswordChanged: (user: AuthUser) => void;
  onCancel?: () => void;
}

export default function ChangePassword({
  currentUser,
  onPasswordChanged,
  onCancel,
}: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic Rule Checklist
  const ruleMinLength = newPassword.length >= 8;
  const ruleUpperLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const ruleNumberSpecial = /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
  const isFormValid =
    ruleMinLength &&
    ruleUpperLower &&
    ruleNumberSpecial &&
    currentPassword.length > 0 &&
    newPassword === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation password do not match.");
      return;
    }

    if (!ruleMinLength || !ruleUpperLower || !ruleNumberSpecial) {
      setErrorMessage("New password does not meet all complexity requirements.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      onPasswordChanged(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to change password. Please verify current password.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 p-3"
      style={{ backgroundColor: "#F5F7F6" }}
    >
      <div
        className="card shadow-sm border-0 w-100"
        style={{
          maxWidth: "460px",
          backgroundColor: "#FFFFFF",
          borderRadius: "10px",
          padding: "2rem",
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center mb-2">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#006B3C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "#006B3C" }}>
            Change Your Password
          </h1>
          <p className="text-muted small mb-0">
            {currentUser.mustChangePassword
              ? "You must change your password to continue"
              : "Update your account password"}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            id="change-password-error"
            role="alert"
            className="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center gap-2"
            style={{
              backgroundColor: "#FDF2F2",
              borderColor: "#F8B4B4",
              color: "#B3261E",
              fontSize: "0.875rem",
              borderRadius: "6px",
            }}
          >
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Current Password */}
          <div className="mb-3 text-start">
            <label
              htmlFor="current-password"
              className="form-label fw-semibold mb-1"
              style={{ color: "#1F2937", fontSize: "0.9rem" }}
            >
              Current (temporary) password <span style={{ color: "#B3261E" }}>*</span>
            </label>
            <div className="input-group">
              <input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                className="form-control"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
                required
                style={{
                  borderColor: "#D1D5DB",
                  borderTopLeftRadius: "6px",
                  borderBottomLeftRadius: "6px",
                  padding: "0.55rem 0.8rem",
                  fontSize: "0.95rem",
                }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
                onClick={() => setShowCurrent(!showCurrent)}
                disabled={isLoading}
                style={{
                  borderColor: "#D1D5DB",
                  borderTopRightRadius: "6px",
                  borderBottomRightRadius: "6px",
                }}
              >
                {showCurrent ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="mb-3 text-start">
            <label
              htmlFor="new-password"
              className="form-label fw-semibold mb-1"
              style={{ color: "#1F2937", fontSize: "0.9rem" }}
            >
              New password <span style={{ color: "#B3261E" }}>*</span>
            </label>
            <div className="input-group">
              <input
                id="new-password"
                type={showNew ? "text" : "password"}
                className="form-control"
                placeholder="Enter new secure password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                style={{
                  borderColor: "#D1D5DB",
                  borderTopLeftRadius: "6px",
                  borderBottomLeftRadius: "6px",
                  padding: "0.55rem 0.8rem",
                  fontSize: "0.95rem",
                }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label={showNew ? "Hide new password" : "Show new password"}
                onClick={() => setShowNew(!showNew)}
                disabled={isLoading}
                style={{
                  borderColor: "#D1D5DB",
                  borderTopRightRadius: "6px",
                  borderBottomRightRadius: "6px",
                }}
              >
                {showNew ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="mb-3 text-start">
            <label
              htmlFor="confirm-password"
              className="form-label fw-semibold mb-1"
              style={{ color: "#1F2937", fontSize: "0.9rem" }}
            >
              Confirm new password <span style={{ color: "#B3261E" }}>*</span>
            </label>
            <div className="input-group">
              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                className="form-control"
                placeholder="Confirm new secure password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                style={{
                  borderColor: "#D1D5DB",
                  borderTopLeftRadius: "6px",
                  borderBottomLeftRadius: "6px",
                  padding: "0.55rem 0.8rem",
                  fontSize: "0.95rem",
                }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label={showConfirm ? "Hide confirmed password" : "Show confirmed password"}
                onClick={() => setShowConfirm(!showConfirm)}
                disabled={isLoading}
                style={{
                  borderColor: "#D1D5DB",
                  borderTopRightRadius: "6px",
                  borderBottomRightRadius: "6px",
                }}
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <div
                className="mt-1 small"
                style={{ color: "#B3261E", fontSize: "0.82rem" }}
              >
                Passwords do not match.
              </div>
            )}
          </div>

          {/* Dynamic Rule Checklist */}
          <div
            className="p-3 mb-4 rounded text-start"
            style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}
          >
            <div
              className="fw-semibold mb-2 text-muted"
              style={{ fontSize: "0.8rem", textTransform: "uppercase" }}
            >
              Password Requirements:
            </div>
            <ul className="list-unstyled mb-0" style={{ fontSize: "0.85rem" }}>
              <li
                id="rule-min-length"
                className="d-flex align-items-center gap-2 mb-1"
                style={{ color: ruleMinLength ? "#2E7D32" : "#5B6573" }}
              >
                <span>{ruleMinLength ? "✓" : "○"}</span>
                <span>Be at least 8 characters</span>
              </li>
              <li
                id="rule-upper-lower"
                className="d-flex align-items-center gap-2 mb-1"
                style={{ color: ruleUpperLower ? "#2E7D32" : "#5B6573" }}
              >
                <span>{ruleUpperLower ? "✓" : "○"}</span>
                <span>Include upper and lower case letters</span>
              </li>
              <li
                id="rule-number-special"
                className="d-flex align-items-center gap-2"
                style={{ color: ruleNumberSpecial ? "#2E7D32" : "#5B6573" }}
              >
                <span>{ruleNumberSpecial ? "✓" : "○"}</span>
                <span>Include a number and a special character</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="d-flex gap-2">
            {!currentUser.mustChangePassword && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="btn flex-fill fw-semibold"
                style={{
                  backgroundColor: "#EAF6EF",
                  color: "#006B3C",
                  border: "1px solid #0B7A46",
                  borderRadius: "6px",
                  padding: "0.6rem 1rem",
                }}
              >
                Cancel
              </button>
            )}
            <button
              id="change-password-submit-button"
              type="submit"
              disabled={isLoading || !isFormValid}
              className="btn flex-fill fw-semibold text-white d-flex align-items-center justify-content-center gap-2"
              style={{
                backgroundColor: isFormValid ? "#006B3C" : "#9CA3AF",
                borderColor: isFormValid ? "#006B3C" : "#9CA3AF",
                borderRadius: "6px",
                padding: "0.6rem 1rem",
                cursor: isFormValid ? "pointer" : "not-allowed",
              }}
            >
              {isLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Updating...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
