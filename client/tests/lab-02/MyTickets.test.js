import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MyTickets from "../../src/MyTickets.js";
import * as api from "../../src/api.js";
const mockRequester = {
    id: 1,
    email: "somchai.p@kmutt.ac.th",
    displayName: "Somchai Pattana",
};
const mockCategories = [
    { id: 1, name: "Account and Access" },
    { id: 2, name: "Hardware" },
];
const mockTicketList = [
    {
        id: "t1",
        ticketNo: "TKT-2026-00001",
        summary: "Laptop battery issue after OS update",
        status: "Pending",
        requestedPriority: "HIGH",
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 1, name: "Email" },
        attachmentCount: 1,
        createdAt: "2026-09-03T12:00:00.000Z",
        updatedAt: "2026-09-03T12:00:00.000Z",
    },
];
describe("MyTickets Component", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    });
    it("renders title, header, and ticket items table", async () => {
        vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
            data: mockTicketList,
            pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
        });
        render(_jsx(MyTickets, { activeRequester: mockRequester }));
        await waitFor(() => {
            expect(screen.getByText(/My Submitted Tickets/i)).toBeInTheDocument();
            expect(screen.getByText(/Somchai Pattana/i)).toBeInTheDocument();
            expect(screen.getAllByText("TKT-2026-00001")[0]).toBeInTheDocument();
            expect(screen.getAllByText("Laptop battery issue after OS update")[0]).toBeInTheDocument();
            expect(screen.getAllByText("↑ High")[0]).toBeInTheDocument();
            expect(screen.getAllByText("● Pending")[0]).toBeInTheDocument();
        });
    });
    it("renders empty state message when zero tickets exist", async () => {
        vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
            data: [],
            pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
        });
        render(_jsx(MyTickets, { activeRequester: mockRequester }));
        await waitFor(() => {
            expect(screen.getByText(/You have not submitted any tickets yet/i)).toBeInTheDocument();
        });
    });
    it("renders no-search-results state and clears filters when button clicked", async () => {
        vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
            data: [],
            pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
        });
        render(_jsx(MyTickets, { activeRequester: mockRequester }));
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Search by summary or ticket #/i)).toBeInTheDocument();
        });
        const searchInput = screen.getByPlaceholderText(/Search by summary or ticket #/i);
        fireEvent.change(searchInput, { target: { value: "nonexistent" } });
        await waitFor(() => {
            expect(screen.getByText(/No tickets match your search filters/i)).toBeInTheDocument();
        });
        const clearButton = screen.getAllByRole("button", { name: /Clear Filters/i })[0];
        fireEvent.click(clearButton);
        await waitFor(() => {
            expect(searchInput).toHaveValue("");
        });
    });
    it("displays error message banner when fetching tickets fails", async () => {
        vi.spyOn(api, "fetchMyTickets").mockRejectedValue(new Error("Failed to fetch tickets list from server"));
        render(_jsx(MyTickets, { activeRequester: mockRequester }));
        await waitFor(() => {
            expect(screen.getByText(/Failed to fetch tickets list from server/i)).toBeInTheDocument();
        });
    });
    it("calls onCreateTicketClick when Create Ticket button is clicked", async () => {
        vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
            data: mockTicketList,
            pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
        });
        const handleCreateClick = vi.fn();
        render(_jsx(MyTickets, { activeRequester: mockRequester, onCreateTicketClick: handleCreateClick }));
        await waitFor(() => {
            expect(screen.getAllByText("TKT-2026-00001")[0]).toBeInTheDocument();
        });
        const createBtn = screen.getByRole("button", { name: /\+ Create Ticket/i });
        fireEvent.click(createBtn);
        expect(handleCreateClick).toHaveBeenCalledTimes(1);
    });
});
