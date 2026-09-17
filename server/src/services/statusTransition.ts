export type TicketStatusType =
  | "New"
  | "Open"
  | "InProgress"
  | "WaitingForRequester"
  | "Resolved"
  | "Closed"
  | "Reopened"
  | "Cancelled";

export function normalizeStatus(status: string): string {
  if (!status || typeof status !== "string") return "";
  const s = status.trim();
  if (s.toLowerCase() === "in progress" || s.toLowerCase() === "inprogress") {
    return "InProgress";
  }
  if (s.toLowerCase() === "waiting for requester" || s.toLowerCase() === "waitingforrequester") {
    return "WaitingForRequester";
  }

  const map: Record<string, string> = {
    new: "New",
    open: "Open",
    inprogress: "InProgress",
    waitingforrequester: "WaitingForRequester",
    resolved: "Resolved",
    closed: "Closed",
    reopened: "Reopened",
    cancelled: "Cancelled",
    assigned: "Assigned",
    pending: "Pending",
  };
  return map[s.toLowerCase()] || s;
}

export const PERMITTED_TRANSITIONS: Record<string, string[]> = {
  New: ["Open", "Cancelled"],
  Open: ["InProgress", "WaitingForRequester", "Resolved", "Cancelled"],
  InProgress: ["WaitingForRequester", "Resolved", "Cancelled"],
  WaitingForRequester: ["InProgress", "Resolved", "Cancelled"],
  Resolved: ["Closed", "Reopened"],
  Closed: ["Reopened"],
  Cancelled: [],
  Assigned: ["InProgress", "WaitingForRequester", "Resolved", "Cancelled"],
  Pending: ["InProgress", "WaitingForRequester", "Resolved", "Cancelled"],
};

export function isValidStatusTransition(currentStatus: string, targetStatus: string): boolean {
  const current = normalizeStatus(currentStatus);
  const target = normalizeStatus(targetStatus);

  if (!current || !target) return false;
  if (current === target) return false;

  const allowed = PERMITTED_TRANSITIONS[current];
  if (!allowed) return false;

  return allowed.includes(target);
}

export function getPermittedNextStatuses(currentStatus: string): string[] {
  const current = normalizeStatus(currentStatus);
  return PERMITTED_TRANSITIONS[current] || [];
}
