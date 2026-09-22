import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import UserManagement from "../../src/UserManagement.js";
import * as api from "../../src/api.js";

// Mock the API layer
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchAdminUsers: vi.fn(),
    createAdminUser: vi.fn(),
    updateAdminUser: vi.fn(),
    resetUserPassword: vi.fn(),
  };
});

describe("UserManagement Component Tests (UI-07, UI-08, UI-09, Feature-12)", () => {
  const mockAdminUser: api.AuthUser = {
    id: 1,
    email: "john.smith@kmutt.ac.th",
    displayName: "John Smith",
    role: "ADMINISTRATOR",
    mustChangePassword: false,
  };

  const sampleUsers: api.AdminUser[] = [
    {
      id: 1,
      displayName: "John Smith",
      email: "john.smith@kmutt.ac.th",
      role: "ADMINISTRATOR",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-09-01T08:00:00.000Z",
    },
    {
      id: 2,
      displayName: "Sarah Johnson",
      email: "sarah.johnson@kmutt.ac.th",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-09-01T08:00:00.000Z",
    },
    {
      id: 3,
      displayName: "Somchai Pattana",
      email: "somchai.p@kmutt.ac.th",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-09-01T08:00:00.000Z",
    },
    {
      id: 4,
      displayName: "Inactive Staff",
      email: "inactive.staff@kmutt.ac.th",
      role: "IT_STAFF",
      isActive: false,
      mustChangePassword: false,
      createdAt: "2026-09-02T08:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchAdminUsers).mockResolvedValue(sampleUsers);
  });

  // =========================================================================
  // UI-07: Admin User Management table rendering (AC-15, FR-33)
  // =========================================================================
  describe("UI-07: Admin User Management table rendering (AC-15, FR-33)", () => {
    it("renders user table with Name, Email, Role pill, and Status badge", async () => {
      render(<UserManagement currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(api.fetchAdminUsers).toHaveBeenCalled();
      });

      // Verify header and table
      expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
      const table = document.getElementById("user-table")!;
      expect(table).toBeInTheDocument();

      // Verify all users rendered with Name and Email
      expect(within(table).getByText("John Smith")).toBeInTheDocument();
      expect(within(table).getByText("john.smith@kmutt.ac.th")).toBeInTheDocument();
      expect(within(table).getByText("Sarah Johnson")).toBeInTheDocument();
      expect(within(table).getByText("sarah.johnson@kmutt.ac.th")).toBeInTheDocument();
      expect(within(table).getByText("Somchai Pattana")).toBeInTheDocument();
      expect(within(table).getByText("somchai.p@kmutt.ac.th")).toBeInTheDocument();

      // Verify role pills
      expect(within(table).getByText(/🛡 Administrator/i)).toBeInTheDocument();
      expect(within(table).getAllByText(/💻 IT Staff/i).length).toBe(2);
      expect(within(table).getByText(/👤 Requester/i)).toBeInTheDocument();

      // Verify status badges
      expect(within(table).getAllByText(/● Active/i).length).toBe(3);
      expect(within(table).getByText(/● Inactive/i)).toBeInTheDocument();

      // Verify Edit buttons exist
      expect(document.getElementById("edit-user-btn-1")).toBeInTheDocument();
      expect(document.getElementById("edit-user-btn-2")).toBeInTheDocument();
    });

    it("allows searching users by name or email", async () => {
      render(<UserManagement currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(document.getElementById("user-search-input")).toBeInTheDocument();
      });

      const searchInput = document.getElementById("user-search-input") as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "sarah" } });

      const form = searchInput.closest("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(api.fetchAdminUsers).toHaveBeenCalledWith({
          search: "sarah",
          role: undefined,
        });
      });
    });

    it("allows filtering users by role", async () => {
      render(<UserManagement currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(document.getElementById("user-role-filter")).toBeInTheDocument();
      });

      const roleSelect = document.getElementById("user-role-filter") as HTMLSelectElement;
      fireEvent.change(roleSelect, { target: { value: "IT_STAFF" } });

      await waitFor(() => {
        expect(api.fetchAdminUsers).toHaveBeenCalledWith({
          search: undefined,
          role: "IT_STAFF",
        });
      });
    });
  });

  // =========================================================================
  // UI-08: Admin Create User form and initial password (AC-16, FR-34)
  // =========================================================================
  describe("UI-08: Admin Create User form and initial password (AC-16, FR-34)", () => {
    it("opens Create User modal and validates required fields", async () => {
      render(<UserManagement currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
      });

      const createBtn = screen.getByRole("button", { name: /create user/i });
      fireEvent.click(createBtn);

      expect(document.getElementById("create-user-modal")).toBeInTheDocument();

      // Clear the pre-generated password to test validation
      const passInput = document.getElementById("create-user-password") as HTMLInputElement;
      fireEvent.change(passInput, { target: { value: "" } });

      // Click save with empty fields
      const saveBtn = screen.getByRole("button", { name: /save user/i });
      fireEvent.click(saveBtn);

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText("Full Name is required.")).toBeInTheDocument();
        expect(screen.getByText("Email Address is required.")).toBeInTheDocument();
        expect(screen.getByText("Initial Password is required.")).toBeInTheDocument();
      });
      expect(api.createAdminUser).not.toHaveBeenCalled();
    });

    it("generates compliant password when clicking Generate button", async () => {
      render(<UserManagement currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /create user/i }));

      const passInput = document.getElementById("create-user-password") as HTMLInputElement;
      const generateBtn = document.getElementById("generate-password-btn")!;

      fireEvent.change(passInput, { target: { value: "" } });
      expect(passInput.value).toBe("");

      fireEvent.click(generateBtn);
      expect(passInput.value.length).toBeGreaterThanOrEqual(8);
      expect(/[A-Z]/.test(passInput.value)).toBe(true);
      expect(/[a-z]/.test(passInput.value)).toBe(true);
      expect(/[0-9]/.test(passInput.value)).toBe(true);
    });

    it("submits valid create user form and handles duplicate email conflict gracefully (AC-16)", async () => {
      const conflictError: any = new Error("A user with this email address already exists.");
      conflictError.status = 409;
      vi.mocked(api.createAdminUser).mockRejectedValueOnce(conflictError);

      render(<UserManagement currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /create user/i }));

      fireEvent.change(document.getElementById("create-user-name")!, {
        target: { value: "Alex Thompson" },
      });
      fireEvent.change(document.getElementById("create-user-email")!, {
        target: { value: "sarah.johnson@kmutt.ac.th" },
      });
      fireEvent.change(document.getElementById("create-user-password")!, {
        target: { value: "SecurePass123!" },
      });

      const saveBtn = screen.getByRole("button", { name: /save user/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(api.createAdminUser).toHaveBeenCalledWith({
          displayName: "Alex Thompson",
          email: "sarah.johnson@kmutt.ac.th",
          role: "REQUESTER",
          isActive: true,
          initialPassword: "SecurePass123!",
        });
      });

      // Verify conflict message is displayed
      await waitFor(() => {
        expect(
          screen.getByText(/A user with this email address already exists/i)
        ).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // UI-09: Self-deactivation warning and disablement (AC-17, FR-38, FR-39)
  // =========================================================================
  describe("UI-09: Self-deactivation warning and disablement (AC-17, FR-38, FR-39)", () => {
    it("disables Active toggle and displays safety warning when editing own account (AC-17, FR-38)", async () => {
      render(<UserManagement currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(document.getElementById("edit-user-btn-1")).toBeInTheDocument();
      });

      // Click Edit on John Smith (id: 1, current user)
      fireEvent.click(document.getElementById("edit-user-btn-1")!);

      expect(document.getElementById("edit-user-modal")).toBeInTheDocument();
      expect(screen.getByText(/Edit User: John Smith/i)).toBeInTheDocument();

      // Verify active switch is disabled for self
      const activeToggle = document.getElementById("edit-user-active") as HTMLInputElement;
      expect(activeToggle.disabled).toBe(true);

      // Verify safety warning is displayed
      expect(document.getElementById("self-deactivation-warning")).toBeInTheDocument();
      expect(
        screen.getByText(/Administrators cannot deactivate their own account/i)
      ).toBeInTheDocument();
    });

    it("allows editing another user and changing their status", async () => {
      vi.mocked(api.updateAdminUser).mockResolvedValue({
        id: 2,
        displayName: "Sarah Johnson Updated",
        email: "sarah.j@kmutt.ac.th",
        role: "IT_STAFF",
        isActive: false,
        mustChangePassword: false,
        createdAt: "2026-09-01T08:00:00.000Z",
      });

      render(<UserManagement currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(document.getElementById("edit-user-btn-2")).toBeInTheDocument();
      });

      // Click Edit on Sarah Johnson (id: 2)
      fireEvent.click(document.getElementById("edit-user-btn-2")!);

      const nameInput = document.getElementById("edit-user-name")!;
      fireEvent.change(nameInput, { target: { value: "Sarah Johnson Updated" } });

      const activeToggle = document.getElementById("edit-user-active") as HTMLInputElement;
      expect(activeToggle.disabled).toBe(false);
      fireEvent.click(activeToggle); // toggle to false

      const saveBtn = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(api.updateAdminUser).toHaveBeenCalledWith(2, {
          displayName: "Sarah Johnson Updated",
          email: "sarah.johnson@kmutt.ac.th",
          role: "IT_STAFF",
          isActive: false,
        });
      });
    });

    it("allows resetting initial password from Edit modal (FR-37)", async () => {
      vi.mocked(api.resetUserPassword).mockResolvedValue({
        message: "Initial password reset successfully. User must change password at next login.",
        mustChangePassword: true,
      });

      render(<UserManagement currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(document.getElementById("edit-user-btn-2")).toBeInTheDocument();
      });

      fireEvent.click(document.getElementById("edit-user-btn-2")!);

      // Click Reset Initial Password button
      const resetBtn = document.getElementById("reset-password-btn")!;
      fireEvent.click(resetBtn);

      expect(document.getElementById("reset-password-input")).toBeInTheDocument();
      const newPassInput = document.getElementById("reset-password-input") as HTMLInputElement;

      fireEvent.change(newPassInput, { target: { value: "NewTempPassword2026!" } });

      const confirmBtn = document.getElementById("confirm-reset-password-btn")!;
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(api.resetUserPassword).toHaveBeenCalledWith(2, "NewTempPassword2026!");
      });
    });
  });
});
