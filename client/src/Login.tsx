import { useState, FormEvent } from "react";
import { login, AuthUser } from "./api.js";

interface LoginProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
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
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid email or password. Please try again.");
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
          maxWidth: "420px",
          backgroundColor: "#FFFFFF",
          borderRadius: "10px",
          padding: "2rem",
        }}
      >
        {/* Brand / Title Header */}
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#006B3C" }}>
            TokTickIT
          </h1>
          <p className="text-muted small mb-0">Sign in to your account</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            id="login-error"
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
          {/* Email Address */}
          <div className="mb-3 text-start">
            <label
              htmlFor="login-email"
              className="form-label fw-semibold mb-1"
              style={{ color: "#1F2937", fontSize: "0.9rem" }}
            >
              Email address <span style={{ color: "#B3261E" }}>*</span>
            </label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              placeholder="name@toktickit.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              style={{
                borderColor: "#D1D5DB",
                borderRadius: "6px",
                padding: "0.6rem 0.8rem",
                fontSize: "0.95rem",
              }}
            />
          </div>

          {/* Password */}
          <div className="mb-4 text-start">
            <label
              htmlFor="login-password"
              className="form-label fw-semibold mb-1"
              style={{ color: "#1F2937", fontSize: "0.9rem" }}
            >
              Password <span style={{ color: "#B3261E" }}>*</span>
            </label>
            <div className="input-group">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                style={{
                  borderColor: "#D1D5DB",
                  borderTopLeftRadius: "6px",
                  borderBottomLeftRadius: "6px",
                  padding: "0.6rem 0.8rem",
                  fontSize: "0.95rem",
                }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                style={{
                  borderColor: "#D1D5DB",
                  borderTopRightRadius: "6px",
                  borderBottomRightRadius: "6px",
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit-button"
            type="submit"
            disabled={isLoading}
            className="btn w-100 fw-semibold text-white d-flex align-items-center justify-content-center gap-2"
            style={{
              backgroundColor: "#006B3C",
              borderColor: "#006B3C",
              borderRadius: "6px",
              padding: "0.65rem 1rem",
              fontSize: "1rem",
            }}
          >
            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
