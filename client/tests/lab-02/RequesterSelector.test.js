import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequesterSelector from "../../src/RequesterSelector.js";
import * as api from "../../src/api.js";
describe("RequesterSelector", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    it("renders title and mandatory testing disclaimer text", async () => {
        vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue([
            { id: 1, email: "somchai.p@kmutt.ac.th", displayName: "Somchai Pattana" },
            { id: 2, email: "ananya.s@kmutt.ac.th", displayName: "Ananya Srisuk" },
        ]);
        render(_jsx(RequesterSelector, { onSelectRequester: vi.fn() }));
        expect(screen.getByText(/Development Requester Selection/i)).toBeInTheDocument();
        expect(screen.getByText(/Select a Development Requester to test requester-specific ticket behavior\. This is not a login screen/i)).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByRole("combobox")).toBeInTheDocument();
        });
    });
    it("loads and displays active requesters in the dropdown", async () => {
        vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue([
            { id: 1, email: "somchai.p@kmutt.ac.th", displayName: "Somchai Pattana" },
            { id: 2, email: "ananya.s@kmutt.ac.th", displayName: "Ananya Srisuk" },
        ]);
        render(_jsx(RequesterSelector, { onSelectRequester: vi.fn() }));
        await waitFor(() => {
            expect(screen.getByText(/Somchai Pattana/i)).toBeInTheDocument();
            expect(screen.getByText(/Ananya Srisuk/i)).toBeInTheDocument();
        });
    });
    it("calls onSelectRequester when a requester is selected and Continue is clicked", async () => {
        const handleSelect = vi.fn();
        vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue([
            { id: 1, email: "somchai.p@kmutt.ac.th", displayName: "Somchai Pattana" },
            { id: 2, email: "ananya.s@kmutt.ac.th", displayName: "Ananya Srisuk" },
        ]);
        render(_jsx(RequesterSelector, { onSelectRequester: handleSelect }));
        await waitFor(() => {
            expect(screen.getByRole("combobox")).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
        expect(handleSelect).toHaveBeenCalledWith({
            id: 2,
            email: "ananya.s@kmutt.ac.th",
            displayName: "Ananya Srisuk",
        });
    });
    it("displays error message if fetching requesters fails", async () => {
        vi.spyOn(api, "fetchActiveRequesters").mockRejectedValue(new Error("Failed to load active requesters"));
        render(_jsx(RequesterSelector, { onSelectRequester: vi.fn() }));
        expect(await screen.findByText(/Failed to load active requesters/i)).toBeInTheDocument();
    });
});
