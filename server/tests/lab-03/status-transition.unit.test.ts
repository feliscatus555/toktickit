import { describe, it, expect } from "vitest";
import {
  isValidStatusTransition,
  getPermittedNextStatuses,
  normalizeStatus,
} from "../../src/services/statusTransition.js";

describe("UNIT-02 — Ticket Status Transition Engine (BR-22)", () => {
  describe("normalizeStatus", () => {
    it("normalizes spaced and lowercase status strings", () => {
      expect(normalizeStatus("in progress")).toBe("InProgress");
      expect(normalizeStatus("In Progress")).toBe("InProgress");
      expect(normalizeStatus("waiting for requester")).toBe("WaitingForRequester");
      expect(normalizeStatus("Waiting for Requester")).toBe("WaitingForRequester");
      expect(normalizeStatus("new")).toBe("New");
      expect(normalizeStatus("RESOLVED")).toBe("Resolved");
    });
  });

  describe("Permitted Status Transitions", () => {
    it("allows New -> Open and New -> Cancelled", () => {
      expect(isValidStatusTransition("New", "Open")).toBe(true);
      expect(isValidStatusTransition("New", "Cancelled")).toBe(true);
    });

    it("allows Open -> InProgress, WaitingForRequester, Resolved, Cancelled", () => {
      expect(isValidStatusTransition("Open", "InProgress")).toBe(true);
      expect(isValidStatusTransition("Open", "In Progress")).toBe(true);
      expect(isValidStatusTransition("Open", "WaitingForRequester")).toBe(true);
      expect(isValidStatusTransition("Open", "Waiting for Requester")).toBe(true);
      expect(isValidStatusTransition("Open", "Resolved")).toBe(true);
      expect(isValidStatusTransition("Open", "Cancelled")).toBe(true);
    });

    it("allows InProgress -> WaitingForRequester, Resolved, Cancelled", () => {
      expect(isValidStatusTransition("InProgress", "WaitingForRequester")).toBe(true);
      expect(isValidStatusTransition("In Progress", "Waiting for Requester")).toBe(true);
      expect(isValidStatusTransition("InProgress", "Resolved")).toBe(true);
      expect(isValidStatusTransition("InProgress", "Cancelled")).toBe(true);
    });

    it("allows WaitingForRequester -> InProgress, Resolved, Cancelled", () => {
      expect(isValidStatusTransition("WaitingForRequester", "InProgress")).toBe(true);
      expect(isValidStatusTransition("Waiting for Requester", "In Progress")).toBe(true);
      expect(isValidStatusTransition("WaitingForRequester", "Resolved")).toBe(true);
      expect(isValidStatusTransition("WaitingForRequester", "Cancelled")).toBe(true);
    });

    it("allows Resolved -> Closed and Resolved -> Reopened", () => {
      expect(isValidStatusTransition("Resolved", "Closed")).toBe(true);
      expect(isValidStatusTransition("Resolved", "Reopened")).toBe(true);
    });

    it("allows Closed -> Reopened", () => {
      expect(isValidStatusTransition("Closed", "Reopened")).toBe(true);
    });
  });

  describe("Rejected Status Transitions", () => {
    it("rejects illegal jumps from New (e.g. New -> Resolved, New -> Closed)", () => {
      expect(isValidStatusTransition("New", "Resolved")).toBe(false);
      expect(isValidStatusTransition("New", "Closed")).toBe(false);
      expect(isValidStatusTransition("New", "InProgress")).toBe(false);
      expect(isValidStatusTransition("New", "WaitingForRequester")).toBe(false);
    });

    it("rejects transition from Cancelled to any status (terminal state)", () => {
      expect(isValidStatusTransition("Cancelled", "New")).toBe(false);
      expect(isValidStatusTransition("Cancelled", "Open")).toBe(false);
      expect(isValidStatusTransition("Cancelled", "InProgress")).toBe(false);
      expect(isValidStatusTransition("Cancelled", "Reopened")).toBe(false);
      expect(isValidStatusTransition("Cancelled", "Resolved")).toBe(false);
    });

    it("rejects transition from Closed to InProgress directly", () => {
      expect(isValidStatusTransition("Closed", "InProgress")).toBe(false);
      expect(isValidStatusTransition("Closed", "Resolved")).toBe(false);
      expect(isValidStatusTransition("Closed", "New")).toBe(false);
    });

    it("rejects transition to the same status", () => {
      expect(isValidStatusTransition("Open", "Open")).toBe(false);
      expect(isValidStatusTransition("InProgress", "In Progress")).toBe(false);
    });

    it("rejects invalid or unknown statuses", () => {
      expect(isValidStatusTransition("Unknown", "Open")).toBe(false);
      expect(isValidStatusTransition("Open", "NonExistentStatus")).toBe(false);
    });
  });

  describe("getPermittedNextStatuses helper", () => {
    it("returns correct list of permitted transitions for given state", () => {
      expect(getPermittedNextStatuses("New")).toEqual(["Open", "Cancelled"]);
      expect(getPermittedNextStatuses("Resolved")).toEqual(["Closed", "Reopened"]);
      expect(getPermittedNextStatuses("Cancelled")).toEqual([]);
    });
  });
});
