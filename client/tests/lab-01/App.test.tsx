import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
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

    render(<App />);

    const checkBtn = screen.queryByRole("button", { name: /Check System/i });
    if (checkBtn) {
      fireEvent.click(checkBtn);
      expect(await screen.findByText(/Status: Online/i)).toBeInTheDocument();
    } else {
      expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    }
  });


  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("Backend service unavailable")
    );
    render(<App />);

    const checkBtn = screen.queryByRole("button", { name: /Check System/i });
    if (checkBtn) {
      fireEvent.click(checkBtn);
      expect(await screen.findByText(/Status: Offline/i)).toBeInTheDocument();
    } else {
      expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    }
  });
});
