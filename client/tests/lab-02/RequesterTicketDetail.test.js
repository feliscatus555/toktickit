import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TicketDetail from "../../src/TicketDetail";
import * as api from "../../src/api";
const mockRequester = {
    id: 1,
    email: "somchai.p@kmutt.ac.th",
    displayName: "Somchai Pattana",
};
const mockTicketData = {
    id: "tkt-101",
    ticketNo: "TKT-2026-00001",
    summary: "Laptop battery drains rapidly after update",
    description: "Detailed description of the hardware issue with OS battery status indicator.",
    status: "New",
    requestedPriority: "HIGH",
    itPriority: "URGENT",
    ownerName: "IT Support Agent A",
    resolutionSummary: "Replaced internal battery module and calibrated charging IC.",
    requesterId: 1,
    version: 1,
    requester: { id: 1, displayName: "Somchai Pattana", email: "somchai.p@kmutt.ac.th" },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 1, name: "Email" },
    attachments: [],
    createdAt: "2026-09-05T09:00:00.000Z",
    updatedAt: "2026-09-05T09:00:00.000Z",
};
describe("UI Component — RequesterTicketDetail.test.tsx", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    it("renders ticket details including IT priority, owner, and resolution summary box", async () => {
        vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketData);
        render(_jsx(TicketDetail, { ticketId: "tkt-101", currentRequester: mockRequester, onBack: vi.fn() }));
        await waitFor(() => {
            expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
        });
        expect(screen.getByText("Laptop battery drains rapidly after update")).toBeInTheDocument();
        expect(screen.getByText("Hardware")).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("IT Priority")).toBeInTheDocument();
        expect(screen.getByText("Ticket Owner")).toBeInTheDocument();
        expect(screen.getByText("IT Support Agent A")).toBeInTheDocument();
        expect(screen.getByText("Resolution Summary")).toBeInTheDocument();
        expect(screen.getByText("Replaced internal battery module and calibrated charging IC.")).toBeInTheDocument();
    });
    it("triggers onBack callback when clicking Back to My Tickets button", async () => {
        vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketData);
        const handleBack = vi.fn();
        render(_jsx(TicketDetail, { ticketId: "tkt-101", currentRequester: mockRequester, onBack: handleBack }));
        await waitFor(() => {
            expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
        });
        const backBtn = screen.getByRole("button", { name: /Back to My Tickets/i });
        fireEvent.click(backBtn);
        expect(handleBack).toHaveBeenCalledTimes(1);
    });
    it("displays error alert banner on ticket fetch failure or ownership denial", async () => {
        vi.spyOn(api, "fetchTicketDetail").mockRejectedValue(new Error("You are not authorized to view this ticket."));
        render(_jsx(TicketDetail, { ticketId: "tkt-101", currentRequester: mockRequester, onBack: vi.fn() }));
        await waitFor(() => {
            expect(screen.getByText("Error Loading Ticket")).toBeInTheDocument();
            expect(screen.getByText("You are not authorized to view this ticket.")).toBeInTheDocument();
        });
    });
});
