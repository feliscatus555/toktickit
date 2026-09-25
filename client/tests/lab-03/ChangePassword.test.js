import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChangePassword from "../../src/ChangePassword.js";
import * as api from "../../src/api.js";
describe("ChangePassword Component (UI-02, AC-02, FR-03)", () => {
    const mockUser = {
        id: 1,
        email: "initial.user@kmutt.ac.th",
        displayName: "Initial Password User",
        role: "REQUESTER",
        mustChangePassword: true,
    };
    const mockOnPasswordChanged = vi.fn();
    const mockOnCancel = vi.fn();
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it("renders password inputs and initial checklist rules with unchecked state", () => {
        render(_jsx(ChangePassword, { currentUser: mockUser, onPasswordChanged: mockOnPasswordChanged, onCancel: mockOnCancel }));
        expect(screen.getByPlaceholderText(/Enter current password/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter new secure password/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Confirm new secure password/i)).toBeInTheDocument();
        const ruleLength = document.getElementById("rule-min-length");
        const ruleCase = document.getElementById("rule-upper-lower");
        const ruleSpecial = document.getElementById("rule-number-special");
        expect(ruleLength?.textContent).toContain("○");
        expect(ruleLength?.textContent).toContain("Be at least 8 characters");
        expect(ruleCase?.textContent).toContain("○");
        expect(ruleCase?.textContent).toContain("Include upper and lower case letters");
        expect(ruleSpecial?.textContent).toContain("○");
        expect(ruleSpecial?.textContent).toContain("Include a number and a special character");
        const submitBtn = screen.getByRole("button", { name: /Continue/i });
        expect(submitBtn).toBeDisabled();
    });
    it("dynamically updates checklist rules as user types a compliant password", () => {
        render(_jsx(ChangePassword, { currentUser: mockUser, onPasswordChanged: mockOnPasswordChanged }));
        const newPasswordInput = screen.getByPlaceholderText(/Enter new secure password/i);
        const ruleLength = document.getElementById("rule-min-length");
        const ruleCase = document.getElementById("rule-upper-lower");
        const ruleSpecial = document.getElementById("rule-number-special");
        // 1. Enter length only
        fireEvent.change(newPasswordInput, { target: { value: "lowercase8" } });
        expect(ruleLength?.textContent).toContain("✓");
        expect(ruleCase?.textContent).toContain("○");
        expect(ruleSpecial?.textContent).toContain("○");
        // 2. Add uppercase
        fireEvent.change(newPasswordInput, { target: { value: "LowerPass8" } });
        expect(ruleLength?.textContent).toContain("✓");
        expect(ruleCase?.textContent).toContain("✓");
        expect(ruleSpecial?.textContent).toContain("○"); // missing special character
        // 3. Add special character -> all satisfied!
        fireEvent.change(newPasswordInput, { target: { value: "SecurePass123!" } });
        expect(ruleLength?.textContent).toContain("✓");
        expect(ruleCase?.textContent).toContain("✓");
        expect(ruleSpecial?.textContent).toContain("✓");
    });
    it("enables submit button only when all criteria and matching confirmation are met", () => {
        render(_jsx(ChangePassword, { currentUser: mockUser, onPasswordChanged: mockOnPasswordChanged }));
        const currentInput = screen.getByPlaceholderText(/Enter current password/i);
        const newInput = screen.getByPlaceholderText(/Enter new secure password/i);
        const confirmInput = screen.getByPlaceholderText(/Confirm new secure password/i);
        const submitBtn = screen.getByRole("button", { name: /Continue/i });
        fireEvent.change(currentInput, { target: { value: "InitialPassword123!" } });
        fireEvent.change(newInput, { target: { value: "SecurePass123!" } });
        fireEvent.change(confirmInput, { target: { value: "MismatchPass123!" } });
        expect(submitBtn).toBeDisabled();
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
        fireEvent.change(confirmInput, { target: { value: "SecurePass123!" } });
        expect(submitBtn).not.toBeDisabled();
    });
    it("calls api.changePassword and notifies parent on success", async () => {
        const updatedUser = { ...mockUser, mustChangePassword: false };
        vi.spyOn(api, "changePassword").mockResolvedValue({
            message: "Password updated successfully.",
            user: updatedUser,
        });
        render(_jsx(ChangePassword, { currentUser: mockUser, onPasswordChanged: mockOnPasswordChanged }));
        fireEvent.change(screen.getByPlaceholderText(/Enter current password/i), {
            target: { value: "InitialPassword123!" },
        });
        fireEvent.change(screen.getByPlaceholderText(/Enter new secure password/i), {
            target: { value: "SecurePass123!" },
        });
        fireEvent.change(screen.getByPlaceholderText(/Confirm new secure password/i), {
            target: { value: "SecurePass123!" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
        await waitFor(() => {
            expect(api.changePassword).toHaveBeenCalledWith({
                currentPassword: "InitialPassword123!",
                newPassword: "SecurePass123!",
                confirmPassword: "SecurePass123!",
            });
            expect(mockOnPasswordChanged).toHaveBeenCalledWith(updatedUser);
        });
    });
    it("displays error message when change password fails", async () => {
        vi.spyOn(api, "changePassword").mockRejectedValue(new Error("Current password is incorrect."));
        render(_jsx(ChangePassword, { currentUser: mockUser, onPasswordChanged: mockOnPasswordChanged }));
        fireEvent.change(screen.getByPlaceholderText(/Enter current password/i), {
            target: { value: "WrongCurrentPass!" },
        });
        fireEvent.change(screen.getByPlaceholderText(/Enter new secure password/i), {
            target: { value: "SecurePass123!" },
        });
        fireEvent.change(screen.getByPlaceholderText(/Confirm new secure password/i), {
            target: { value: "SecurePass123!" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
        expect(await screen.findByText(/Current password is incorrect\./i)).toBeInTheDocument();
        expect(mockOnPasswordChanged).not.toHaveBeenCalled();
    });
});
