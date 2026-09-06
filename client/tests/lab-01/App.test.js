import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
describe("App", () => {
    // WORKED EXAMPLE — provided for you.
    it("renders the TokTickIT heading", () => {
        render(_jsx(App, {}));
        expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    });
    // Issue 4 — write these yourself. Hint: mock the api module with
    // vi.spyOn(api, "checkSystem").mockResolvedValue(...) / .mockRejectedValue(...)
    // then click the button and assert the Online list / Offline message.
    it("shows Online and the seeded categories on success", async () => {
        vi.spyOn(api, "checkSystem").mockResolvedValue({
            online: true,
            categories: [
                { id: 1, name: "Account and Access" },
                { id: 2, name: "Hardware" },
                { id: 3, name: "Software" },
                { id: 4, name: "Network" },
            ],
        });
        render(_jsx(App, {}));
        fireEvent.click(screen.getByRole("button", { name: /Check System/i }));
        expect(await screen.findByText(/Status: Online/i)).toBeInTheDocument();
        expect(await screen.findByText("Account and Access")).toBeInTheDocument();
        expect(await screen.findByText("Hardware")).toBeInTheDocument();
        expect(await screen.findByText("Software")).toBeInTheDocument();
        expect(await screen.findByText("Network")).toBeInTheDocument();
    });
    it("shows an Offline error message when the API is unavailable", async () => {
        // 1. Mock api.checkSystem to throw an error
        vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Backend service unavailable"));
        // 2. Render the React App
        render(_jsx(App, {}));
        // 3. Click the "Check System" button
        fireEvent.click(screen.getByRole("button", { name: /Check System/i }));
        // 4. Assert that "Status: Offline" and the error message appear on screen
        expect(await screen.findByText(/Status: Offline/i)).toBeInTheDocument();
        expect(await screen.findByText(/Backend service unavailable/i)).toBeInTheDocument();
    });
});
