import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "../../src/Login.js";
import * as api from "../../src/api.js";
describe("Login Component (UI-01, AC-01, FR-01)", () => {
    const mockOnLoginSuccess = vi.fn();
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it("renders email, password inputs, labels, and submit button", () => {
        render(_jsx(Login, { onLoginSuccess: mockOnLoginSuccess }));
        expect(screen.getByLabelText(/^Email address/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter password/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/name@toktickit.com/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    });
    it("toggles password visibility when the eye button is clicked", () => {
        render(_jsx(Login, { onLoginSuccess: mockOnLoginSuccess }));
        const passwordInput = screen.getByPlaceholderText(/Enter password/i);
        expect(passwordInput).toHaveAttribute("type", "password");
        const toggleBtn = screen.getByRole("button", { name: /Show password/i });
        fireEvent.click(toggleBtn);
        expect(passwordInput).toHaveAttribute("type", "text");
        fireEvent.click(screen.getByRole("button", { name: /Hide password/i }));
        expect(passwordInput).toHaveAttribute("type", "password");
    });
    it("displays client-side error when fields are empty", async () => {
        render(_jsx(Login, { onLoginSuccess: mockOnLoginSuccess }));
        const submitBtn = screen.getByRole("button", { name: /Sign In/i });
        fireEvent.click(submitBtn);
        expect(await screen.findByText(/Please enter both email and password/i)).toBeInTheDocument();
        expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
    it("calls api.login and fires onLoginSuccess with user and token on success", async () => {
        const mockUser = {
            id: 1,
            email: "somchai.p@kmutt.ac.th",
            displayName: "Somchai Pattana",
            role: "REQUESTER",
            mustChangePassword: false,
        };
        const mockToken = "fake-jwt-token-xyz";
        vi.spyOn(api, "login").mockResolvedValue({
            token: mockToken,
            user: mockUser,
        });
        render(_jsx(Login, { onLoginSuccess: mockOnLoginSuccess }));
        fireEvent.change(screen.getByLabelText(/^Email address/i), {
            target: { value: "somchai.p@kmutt.ac.th" },
        });
        fireEvent.change(screen.getByPlaceholderText(/Enter password/i), {
            target: { value: "Password123!" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
        await waitFor(() => {
            expect(api.login).toHaveBeenCalledWith("somchai.p@kmutt.ac.th", "Password123!");
            expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser, mockToken);
        });
    });
    it("renders safe error message when login fails", async () => {
        vi.spyOn(api, "login").mockRejectedValue(new Error("Invalid email address or password."));
        render(_jsx(Login, { onLoginSuccess: mockOnLoginSuccess }));
        fireEvent.change(screen.getByLabelText(/^Email address/i), {
            target: { value: "inactive.test@kmutt.ac.th" },
        });
        fireEvent.change(screen.getByPlaceholderText(/Enter password/i), {
            target: { value: "WrongPassword!" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
        expect(await screen.findByText(/Invalid email address or password\./i)).toBeInTheDocument();
        expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
    it("renders busy spinner and disables interactive inputs while login request is in-flight (UI-01, UI Spec 2)", async () => {
        let resolveLoginPromise;
        vi.spyOn(api, "login").mockImplementation(() => new Promise((resolve) => {
            resolveLoginPromise = resolve;
        }));
        render(_jsx(Login, { onLoginSuccess: mockOnLoginSuccess }));
        const emailInput = screen.getByLabelText(/^Email address/i);
        const passwordInput = screen.getByPlaceholderText(/Enter password/i);
        const submitBtn = screen.getByRole("button", { name: /Sign In/i });
        fireEvent.change(emailInput, { target: { value: "somchai.p@kmutt.ac.th" } });
        fireEvent.change(passwordInput, { target: { value: "Password123!" } });
        fireEvent.click(submitBtn);
        // Verify busy state
        expect(await screen.findByText(/Signing in\.\.\./i)).toBeInTheDocument();
        expect(submitBtn).toBeDisabled();
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        // Resolve login to cleanup
        resolveLoginPromise({
            token: "fake-token",
            user: {
                id: 1,
                email: "somchai.p@kmutt.ac.th",
                displayName: "Somchai",
                role: "REQUESTER",
                mustChangePassword: false,
            },
        });
        await waitFor(() => {
            expect(mockOnLoginSuccess).toHaveBeenCalled();
        });
    });
});
