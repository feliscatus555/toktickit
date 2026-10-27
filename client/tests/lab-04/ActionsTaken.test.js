import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ActionsTaken from "../../src/ActionsTaken.js";
import * as api from "../../src/api.js";
vi.mock("../../src/api.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        fetchActionsTaken: vi.fn(),
        createActionTaken: vi.fn(),
        updateActionTaken: vi.fn(),
    };
});
describe("Lab 4 Actions Taken Component Tests (UI-01, UI-02, UI-03, Feature-13)", () => {
    const mockStaffUser = {
        id: 2,
        displayName: "Sarah Johnson",
        email: "sarah.johnson@kmutt.ac.th",
        role: "IT_STAFF",
    };
    const mockOtherStaffUser = {
        id: 3,
        displayName: "Michael Brown",
        email: "michael.brown@kmutt.ac.th",
        role: "IT_STAFF",
    };
    const mockAdminUser = {
        id: 4,
        displayName: "John Smith",
        email: "john.smith@kmutt.ac.th",
        role: "ADMINISTRATOR",
    };
    const mockRequesterUser = {
        id: 1,
        displayName: "Somchai Pattana",
        email: "somchai.p@kmutt.ac.th",
        role: "REQUESTER",
    };
    const sampleActions = [
        {
            id: "action-uuid-1",
            ticketId: "ticket-uuid-101",
            performedById: 2,
            performedBy: {
                id: 2,
                displayName: "Sarah Johnson",
                email: "sarah.johnson@kmutt.ac.th",
                role: "IT_STAFF",
            },
            actionDateTime: "2026-10-10T09:00:00.000Z",
            description: "Tested AP signal strength with spectrum analyzer.",
            result: "Detected 2.4GHz interference from nearby microwave.",
            followUpRequired: false,
            followUpNote: null,
            attachmentNotes: "scan-channel-6.png",
            createdAt: "2026-10-10T09:05:00.000Z",
            updatedAt: "2026-10-10T09:05:00.000Z",
        },
        {
            id: "action-uuid-2",
            ticketId: "ticket-uuid-101",
            performedById: 4,
            performedBy: {
                id: 4,
                displayName: "John Smith",
                email: "john.smith@kmutt.ac.th",
                role: "ADMINISTRATOR",
            },
            actionDateTime: "2026-10-10T10:30:00.000Z",
            description: "Re-provisioned SSID to prioritize 5GHz DFS channels.",
            result: "Clients migrated successfully to clean spectrum.",
            followUpRequired: true,
            followUpNote: "Monitor packet loss rates during afternoon rush.",
            attachmentNotes: null,
            createdAt: "2026-10-10T10:35:00.000Z",
            updatedAt: "2026-10-10T10:35:00.000Z",
        },
    ];
    beforeEach(() => {
        vi.clearAllMocks();
    });
    // ---------------------------------------------------------------------------
    // UI-01 (FR-51, AC-03): Rendering Actions Taken list & fields
    // ---------------------------------------------------------------------------
    describe("UI-01: Table Rendering and Field Layout", () => {
        it("renders Actions Taken section with badge count, table headers, and rows", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce(sampleActions);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            // Loading check then wait for table
            expect(screen.getByText(/loading actions taken/i)).toBeInTheDocument();
            await waitFor(() => {
                expect(screen.getByText("Actions Taken")).toBeInTheDocument();
            });
            // Check badge count
            expect(screen.getByText("2")).toBeInTheDocument();
            // Check table headers
            expect(screen.getByText("Date / Time")).toBeInTheDocument();
            expect(screen.getByText("Performed By")).toBeInTheDocument();
            expect(screen.getByText("Action Description")).toBeInTheDocument();
            expect(screen.getByText("Result")).toBeInTheDocument();
            expect(screen.getByText("Follow-up")).toBeInTheDocument();
            expect(screen.getByText("Attachment Notes")).toBeInTheDocument();
            expect(screen.getByText("Actions")).toBeInTheDocument();
            // Check row contents
            expect(screen.getByText("Tested AP signal strength with spectrum analyzer.")).toBeInTheDocument();
            expect(screen.getByText("Detected 2.4GHz interference from nearby microwave.")).toBeInTheDocument();
            expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
            expect(screen.getByText("📎 scan-channel-6.png")).toBeInTheDocument();
            // Check second action with follow-up note
            expect(screen.getByText("Re-provisioned SSID to prioritize 5GHz DFS channels.")).toBeInTheDocument();
            expect(screen.getByText("Monitor packet loss rates during afternoon rush.")).toBeInTheDocument();
            expect(screen.getByText("John Smith")).toBeInTheDocument();
        });
        it("renders empty state message when no actions taken exist", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            await waitFor(() => {
                expect(screen.getByText("No actions taken recorded yet.")).toBeInTheDocument();
            });
            expect(screen.queryByRole("table")).not.toBeInTheDocument();
        });
    });
    // ---------------------------------------------------------------------------
    // UI-03 (FR-50, AC-05): Requester read-only view
    // ---------------------------------------------------------------------------
    describe("UI-03: Requester Read-Only View", () => {
        it("renders table for Requester but omits Add and Edit controls completely", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce(sampleActions);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: false, currentUser: mockRequesterUser }));
            await waitFor(() => {
                expect(screen.getByText("Tested AP signal strength with spectrum analyzer.")).toBeInTheDocument();
            });
            // Requester MUST NOT see "+ Add Action Taken"
            expect(screen.queryByRole("button", { name: /\+ Add Action Taken/i })).not.toBeInTheDocument();
            expect(screen.queryByTestId("btn-add-action-taken")).not.toBeInTheDocument();
            // Requester MUST NOT see any Edit buttons
            expect(screen.queryByRole("button", { name: /Edit/i })).not.toBeInTheDocument();
            // Requester does not have "Actions" column header
            expect(screen.queryByText("Actions")).not.toBeInTheDocument();
        });
    });
    // ---------------------------------------------------------------------------
    // UI-02 (FR-46, AC-04): Follow-Up Checkbox & Dynamic Note Toggling
    // ---------------------------------------------------------------------------
    describe("UI-02: Follow-Up Checkbox and Note Validation", () => {
        it("toggles Follow-up Note input when checkbox is toggled", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));
            // By default, follow-up checkbox is unchecked
            const checkbox = screen.getByRole("checkbox", { name: /follow-up required\?/i });
            expect(checkbox).not.toBeChecked();
            // Follow-up note field should not be in document initially
            expect(screen.queryByLabelText(/follow-up note/i)).not.toBeInTheDocument();
            // Check the checkbox
            fireEvent.click(checkbox);
            expect(checkbox).toBeChecked();
            // Now follow-up note field appears and is required
            const followUpTextarea = screen.getByLabelText(/follow-up note/i);
            expect(followUpTextarea).toBeInTheDocument();
            expect(followUpTextarea).toBeRequired();
            // Uncheck the checkbox
            fireEvent.click(checkbox);
            expect(checkbox).not.toBeChecked();
            expect(screen.queryByLabelText(/follow-up note/i)).not.toBeInTheDocument();
        });
        it("prevents submission and displays validation error if follow-up is checked with empty note", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));
            // Fill description and result
            fireEvent.change(screen.getByLabelText(/action description/i), {
                target: { value: "Replaced faulty switch fan." },
            });
            fireEvent.change(screen.getByLabelText(/result/i), {
                target: { value: "Temperature decreased to 38C." },
            });
            // Check follow-up required
            fireEvent.click(screen.getByRole("checkbox", { name: /follow-up required\?/i }));
            // Leave follow-up note empty and submit
            fireEvent.click(screen.getByRole("button", { name: /save action taken/i }));
            expect(screen.getByText(/follow-up note is required when follow-up is needed/i)).toBeInTheDocument();
            expect(api.createActionTaken).not.toHaveBeenCalled();
        });
    });
    // ---------------------------------------------------------------------------
    // Create Action Taken Flow & Failure Cases
    // ---------------------------------------------------------------------------
    describe("Create Action Taken Flow & Error Handling", () => {
        it("successfully creates an Action Taken and updates the table", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);
            const newAction = {
                id: "action-new-1",
                ticketId: "ticket-uuid-101",
                performedById: 2,
                performedBy: { id: 2, displayName: "Sarah Johnson", email: "sarah@kmutt.ac.th", role: "IT_STAFF" },
                actionDateTime: "2026-10-10T11:00:00.000Z",
                description: "Rebooted edge router.",
                result: "Routing tables reconverged in 45s.",
                followUpRequired: false,
                followUpNote: null,
                attachmentNotes: null,
                createdAt: "2026-10-10T11:01:00.000Z",
                updatedAt: "2026-10-10T11:01:00.000Z",
            };
            vi.mocked(api.createActionTaken).mockResolvedValueOnce(newAction);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));
            fireEvent.change(screen.getByLabelText(/action description/i), {
                target: { value: "Rebooted edge router." },
            });
            fireEvent.change(screen.getByLabelText(/result/i), {
                target: { value: "Routing tables reconverged in 45s." },
            });
            fireEvent.click(screen.getByRole("button", { name: /save action taken/i }));
            await waitFor(() => {
                expect(api.createActionTaken).toHaveBeenCalledWith("ticket-uuid-101", expect.objectContaining({
                    description: "Rebooted edge router.",
                    result: "Routing tables reconverged in 45s.",
                    followUpRequired: false,
                }));
            });
            // New action appears in table
            await waitFor(() => {
                expect(screen.getByText("Rebooted edge router.")).toBeInTheDocument();
            });
            expect(screen.getByText("Routing tables reconverged in 45s.")).toBeInTheDocument();
        });
        it("shows error alert and prevents submit if description is empty or whitespace", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));
            fireEvent.change(screen.getByLabelText(/action description/i), {
                target: { value: "     " },
            });
            fireEvent.change(screen.getByLabelText(/result/i), {
                target: { value: "Valid result" },
            });
            fireEvent.click(screen.getByRole("button", { name: /save action taken/i }));
            expect(screen.getByText(/action description is required/i)).toBeInTheDocument();
            expect(api.createActionTaken).not.toHaveBeenCalled();
        });
        it("displays error banner when createActionTaken API fails", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);
            const apiError = new Error("Failed to save action");
            apiError.data = { error: { message: "Database lock timeout" } };
            vi.mocked(api.createActionTaken).mockRejectedValueOnce(apiError);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));
            fireEvent.change(screen.getByLabelText(/action description/i), {
                target: { value: "Valid description" },
            });
            fireEvent.change(screen.getByLabelText(/result/i), {
                target: { value: "Valid result" },
            });
            fireEvent.click(screen.getByRole("button", { name: /save action taken/i }));
            await waitFor(() => {
                expect(screen.getByText(/database lock timeout/i)).toBeInTheDocument();
            });
        });
        it("cancelling create form resets inputs and returns to list view", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));
            expect(screen.getByText("Record Action Taken")).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
            expect(screen.queryByText("Record Action Taken")).not.toBeInTheDocument();
            expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
        });
    });
    // ---------------------------------------------------------------------------
    // Edit Action Taken Flow & Role Restrictions
    // ---------------------------------------------------------------------------
    describe("Edit Action Taken Flow & Role Permissions", () => {
        it("allows author (Sarah) to click Edit on their own action", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce(sampleActions);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            await waitFor(() => {
                expect(screen.getByText("Tested AP signal strength with spectrum analyzer.")).toBeInTheDocument();
            });
            // Sarah can edit action-uuid-1 (she authored it)
            const editBtnSarah = screen.getByRole("button", { name: /edit/i });
            expect(editBtnSarah).toBeInTheDocument();
            fireEvent.click(editBtnSarah);
            // Edit row appears
            expect(screen.getByText("Edit Action Taken")).toBeInTheDocument();
            const descInput = screen.getByDisplayValue("Tested AP signal strength with spectrum analyzer.");
            expect(descInput).toBeInTheDocument();
        });
        it("allows Administrator to edit actions authored by other staff members", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce(sampleActions);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockAdminUser }));
            await waitFor(() => {
                expect(screen.getByText("Tested AP signal strength with spectrum analyzer.")).toBeInTheDocument();
            });
            // Admin can edit both actions
            const editButtons = screen.getAllByRole("button", { name: /edit/i });
            expect(editButtons.length).toBe(2);
        });
        it("disables edit button for non-author IT Staff", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce(sampleActions);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockOtherStaffUser }));
            await waitFor(() => {
                expect(screen.getByText("Tested AP signal strength with spectrum analyzer.")).toBeInTheDocument();
            });
            // Neither action was authored by Michael, so no Edit buttons should appear
            expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
        });
        it("updates action on valid edit submit", async () => {
            vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce(sampleActions);
            const updatedAction = {
                ...sampleActions[0],
                description: "Amended spectrum scan findings.",
            };
            vi.mocked(api.updateActionTaken).mockResolvedValueOnce(updatedAction);
            render(_jsx(ActionsTaken, { ticketId: "ticket-uuid-101", isStaffOrAdmin: true, currentUser: mockStaffUser }));
            await waitFor(() => {
                expect(screen.getByText("Tested AP signal strength with spectrum analyzer.")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole("button", { name: /edit/i }));
            const descTextarea = screen.getByDisplayValue("Tested AP signal strength with spectrum analyzer.");
            fireEvent.change(descTextarea, { target: { value: "Amended spectrum scan findings." } });
            fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
            await waitFor(() => {
                expect(api.updateActionTaken).toHaveBeenCalledWith("ticket-uuid-101", "action-uuid-1", expect.objectContaining({ description: "Amended spectrum scan findings." }));
            });
            await waitFor(() => {
                expect(screen.getByText("Amended spectrum scan findings.")).toBeInTheDocument();
            });
        });
    });
});
