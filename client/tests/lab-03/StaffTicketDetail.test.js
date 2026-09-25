import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";
// Mock API functions
vi.mock("../../src/api.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        fetchTicketDetail: vi.fn(),
        fetchStaffTicketDetail: vi.fn(),
        assignTicket: vi.fn(),
        updateTicketPriority: vi.fn(),
        updateTicketStatus: vi.fn(),
        createTicketComment: vi.fn(),
        createTicketNote: vi.fn(),
        indicateProblemResolved: vi.fn(),
        fetchStaffUsers: vi.fn(),
    };
});
describe("Lab 3 Ticket Detail Screen Component Tests (Feature-11)", () => {
    const mockStaffUser = {
        id: 2,
        email: "sarah.johnson@kmutt.ac.th",
        displayName: "Sarah Johnson",
        role: "IT_STAFF",
        mustChangePassword: false,
    };
    const mockRequesterUser = {
        id: 1,
        email: "somchai.p@kmutt.ac.th",
        displayName: "Somchai Pattana",
        role: "REQUESTER",
        mustChangePassword: false,
    };
    const mockAssignableStaff = [
        { id: 2, displayName: "Sarah Johnson", email: "sarah.johnson@kmutt.ac.th", role: "IT_STAFF" },
        { id: 3, displayName: "Michael Brown", email: "michael.brown@kmutt.ac.th", role: "IT_STAFF" },
        { id: 4, displayName: "John Smith", email: "john.smith@kmutt.ac.th", role: "ADMINISTRATOR" },
    ];
    const baseTicketData = {
        id: "ticket-uuid-123",
        ticketNo: "TKT-2026-00042",
        summary: "Cannot connect to campus Wi-Fi",
        description: "Laptop keeps disconnecting after 5 minutes.",
        status: "InProgress",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        ownerId: null,
        ownerName: null,
        owner: null,
        resolutionSummary: null,
        isProblemAppearsResolved: false,
        requesterId: 1,
        version: 1,
        requester: { id: 1, displayName: "Somchai Pattana", email: "somchai.p@kmutt.ac.th", role: "REQUESTER" },
        category: { id: 4, name: "Network" },
        relatedSystem: { id: 2, name: "Campus Wi-Fi" },
        attachments: [],
        comments: [
            {
                id: "comm-1",
                ticketId: "ticket-uuid-123",
                authorId: 1,
                author: { displayName: "Somchai Pattana", role: "REQUESTER" },
                content: "Please look into this ASAP.",
                createdAt: "2026-09-15T10:00:00.000Z",
            },
        ],
        internalNotes: [
            {
                id: "note-1",
                ticketId: "ticket-uuid-123",
                authorId: 2,
                author: { displayName: "Sarah Johnson", role: "IT_STAFF" },
                content: "Internal note: RADIUS timeout issue.",
                createdAt: "2026-09-15T10:30:00.000Z",
            },
        ],
        createdAt: "2026-09-15T09:00:00.000Z",
        updatedAt: "2026-09-15T10:30:00.000Z",
    };
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.fetchStaffUsers).mockResolvedValue(mockAssignableStaff);
        vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue({ ...baseTicketData });
        vi.mocked(api.fetchTicketDetail).mockResolvedValue({
            ...baseTicketData,
            internalNotes: undefined,
        });
    });
    // -------------------------------------------------------------------------
    // UI-05 (AC-09, FR-20): Ticket Detail claim action and owner change
    // -------------------------------------------------------------------------
    describe("UI-05: Ticket Detail claim action and owner change (AC-09, FR-20)", () => {
        it("renders unassigned state and allows IT Staff to click Claim Ticket", async () => {
            vi.mocked(api.assignTicket).mockResolvedValue({
                id: "ticket-uuid-123",
                ownerId: 2,
                owner: { id: 2, displayName: "Sarah Johnson" },
            });
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockStaffUser, onBack: vi.fn() }));
            // Wait for ticket to load
            await waitFor(() => {
                expect(screen.getByText("TKT-2026-00042")).toBeInTheDocument();
            });
            // Verify Claim Ticket button exists
            const claimBtn = screen.getByRole("button", { name: /claim ticket/i });
            expect(claimBtn).toBeInTheDocument();
            // Click Claim Ticket
            fireEvent.click(claimBtn);
            await waitFor(() => {
                expect(api.assignTicket).toHaveBeenCalledWith("ticket-uuid-123", 2);
            });
            // Claim button disappears once claimed
            await waitFor(() => {
                expect(screen.queryByRole("button", { name: /claim ticket/i })).not.toBeInTheDocument();
            });
        });
        it("allows IT Staff to reassign ticket owner via the dropdown", async () => {
            vi.mocked(api.assignTicket).mockResolvedValue({
                id: "ticket-uuid-123",
                ownerId: 3,
                owner: { id: 3, displayName: "Michael Brown" },
            });
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockStaffUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByLabelText(/ticket owner:/i)).toBeInTheDocument();
            });
            const select = screen.getByLabelText(/ticket owner:/i);
            fireEvent.change(select, { target: { value: "3" } });
            await waitFor(() => {
                expect(api.assignTicket).toHaveBeenCalledWith("ticket-uuid-123", 3);
            });
        });
        it("allows IT Staff to update IT Priority", async () => {
            vi.mocked(api.updateTicketPriority).mockResolvedValue({
                id: "ticket-uuid-123",
                itPriority: "URGENT",
            });
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockStaffUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByLabelText(/it priority:/i)).toBeInTheDocument();
            });
            const select = screen.getByLabelText(/it priority:/i);
            fireEvent.change(select, { target: { value: "URGENT" } });
            await waitFor(() => {
                expect(api.updateTicketPriority).toHaveBeenCalledWith("ticket-uuid-123", "URGENT");
            });
        });
        it("allows IT Staff to update Current Status automatically upon selection", async () => {
            vi.mocked(api.updateTicketStatus).mockResolvedValue({
                id: "ticket-uuid-123",
                status: "WaitingForRequester",
            });
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockStaffUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
            });
            const select = screen.getByLabelText(/current status:/i);
            fireEvent.change(select, { target: { value: "WaitingForRequester" } });
            await waitFor(() => {
                expect(api.updateTicketStatus).toHaveBeenCalledWith("ticket-uuid-123", "WaitingForRequester");
            });
        });
    });
    // -------------------------------------------------------------------------
    // UI-06 (AC-12, AC-13, AC-04): Visual distinction of Comments vs Notes
    // -------------------------------------------------------------------------
    describe("UI-06: Comments vs Notes visual distinction & role isolation (AC-12, AC-13, AC-04)", () => {
        it("renders both Public Comments and Amber-styled Internal Notes for IT Staff", async () => {
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockStaffUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByText("💬 Public Comments")).toBeInTheDocument();
                expect(screen.getByText("🔒 Private Internal Notes")).toBeInTheDocument();
            });
            // Both feeds show their respective items
            expect(screen.getByText("Please look into this ASAP.")).toBeInTheDocument();
            expect(screen.getByText("Internal note: RADIUS timeout issue.")).toBeInTheDocument();
            // Post comment button and Post internal note button both exist
            expect(screen.getByRole("button", { name: /post comment/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /post internal note/i })).toBeInTheDocument();
        });
        it("strictly omits Internal Notes from the DOM when viewed by a Requester (AC-04)", async () => {
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockRequesterUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByText("TKT-2026-00042")).toBeInTheDocument();
            });
            // Public comments section IS rendered
            expect(screen.getByText("💬 Public Comments")).toBeInTheDocument();
            expect(screen.getByText("Please look into this ASAP.")).toBeInTheDocument();
            // Internal notes section is COMPLETELY absent from DOM
            expect(screen.queryByText(/private internal notes/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/internal note: radius timeout issue/i)).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: /post internal note/i })).not.toBeInTheDocument();
            expect(document.getElementById("internal-notes-container")).toBeNull();
        });
        it("allows posting a new public comment", async () => {
            vi.mocked(api.createTicketComment).mockResolvedValue({
                id: "comm-new",
                ticketId: "ticket-uuid-123",
                authorId: 1,
                author: { displayName: "Somchai Pattana", role: "REQUESTER" },
                content: "I rebooted the router as requested.",
                createdAt: "2026-09-15T11:00:00.000Z",
            });
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockRequesterUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/write a message visible to everyone/i)).toBeInTheDocument();
            });
            const input = screen.getByPlaceholderText(/write a message visible to everyone/i);
            fireEvent.change(input, { target: { value: "I rebooted the router as requested." } });
            const postBtn = screen.getByRole("button", { name: /post comment/i });
            fireEvent.click(postBtn);
            await waitFor(() => {
                expect(api.createTicketComment).toHaveBeenCalledWith("ticket-uuid-123", "I rebooted the router as requested.");
            });
            await waitFor(() => {
                expect(screen.getByText("I rebooted the router as requested.")).toBeInTheDocument();
            });
        });
        it("allows IT Staff to post an internal note", async () => {
            vi.mocked(api.createTicketNote).mockResolvedValue({
                id: "note-new",
                ticketId: "ticket-uuid-123",
                authorId: 2,
                author: { displayName: "Sarah Johnson", role: "IT_STAFF" },
                content: "Followed up with network operations center.",
                createdAt: "2026-09-15T11:30:00.000Z",
            });
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockStaffUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/add confidential diagnostic details/i)).toBeInTheDocument();
            });
            const input = screen.getByPlaceholderText(/add confidential diagnostic details/i);
            fireEvent.change(input, { target: { value: "Followed up with network operations center." } });
            const postNoteBtn = screen.getByRole("button", { name: /post internal note/i });
            fireEvent.click(postNoteBtn);
            await waitFor(() => {
                expect(api.createTicketNote).toHaveBeenCalledWith("ticket-uuid-123", "Followed up with network operations center.");
            });
            await waitFor(() => {
                expect(screen.getByText("Followed up with network operations center.")).toBeInTheDocument();
            });
        });
        it("renders Problem Appears Resolved button for Requester and handles click", async () => {
            vi.mocked(api.indicateProblemResolved).mockResolvedValue({
                id: "ticket-uuid-123",
                isProblemAppearsResolved: true,
                status: "InProgress",
            });
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockRequesterUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /problem appears resolved/i })).toBeInTheDocument();
            });
            const resolveBtn = screen.getByRole("button", { name: /problem appears resolved/i });
            fireEvent.click(resolveBtn);
            await waitFor(() => {
                expect(api.indicateProblemResolved).toHaveBeenCalledWith("ticket-uuid-123");
            });
            await waitFor(() => {
                expect(screen.getByText(/you indicated this issue appears resolved/i)).toBeInTheDocument();
            });
        });
        it("renders resolution summary validation error when transitioning to Resolved with empty text (UI Spec 2.1 & 4.4)", async () => {
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockStaffUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByLabelText(/current status:/i)).toBeInTheDocument();
            });
            const select = screen.getByLabelText(/current status:/i);
            fireEvent.change(select, { target: { value: "Resolved" } });
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/describe resolution steps taken/i)).toBeInTheDocument();
            });
            const confirmBtn = screen.getByRole("button", { name: /confirm resolve/i });
            fireEvent.click(confirmBtn);
            await waitFor(() => {
                expect(screen.getByText(/resolution summary is mandatory when resolving a ticket/i)).toBeInTheDocument();
                expect(document.getElementById("status-validation-error")).toBeInTheDocument();
            });
        });
        it("renders safe failure error banner when fetchStaffTicketDetail fails (UI Spec 10)", async () => {
            vi.mocked(api.fetchStaffTicketDetail).mockRejectedValueOnce(new Error("Failed to load ticket details: Internal Server Error"));
            render(_jsx(TicketDetail, { ticketId: "ticket-uuid-123", currentRequester: mockStaffUser, onBack: vi.fn() }));
            await waitFor(() => {
                expect(screen.getByRole("alert")).toBeInTheDocument();
                expect(screen.getByText(/error loading ticket/i)).toBeInTheDocument();
                expect(screen.getByText(/failed to load ticket details/i)).toBeInTheDocument();
                expect(document.getElementById("ticket-detail-error-banner")).toBeInTheDocument();
            });
        });
    });
});
