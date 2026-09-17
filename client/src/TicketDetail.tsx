import React, { useState, useEffect, ChangeEvent } from "react";
import {
  RequesterUser,
  TicketDetail as TicketDetailType,
  AttachmentItem,
  CommentItem,
  InternalNoteItem,
  StaffUser,
  fetchTicketDetail,
  fetchStaffTicketDetail,
  assignTicket,
  updateTicketPriority,
  updateTicketStatus,
  fetchTicketComments,
  createTicketComment,
  fetchTicketNotes,
  createTicketNote,
  indicateProblemResolved,
  fetchStaffUsers,
  uploadAttachment,
  getAttachmentDownloadUrl,
  softRemoveAttachment,
} from "./api.js";

interface TicketDetailProps {
  ticketId: string;
  currentRequester: RequesterUser & { role?: string };
  onBack: () => void;
  backLabel?: string;
}

function getPermittedStatusesForUI(currentStatus: string): string[] {
  if (!currentStatus) return [];
  const s = currentStatus.trim().toLowerCase();
  if (s === "new") return ["Open", "Cancelled"];
  if (s === "open") return ["InProgress", "WaitingForRequester", "Resolved", "Cancelled"];
  if (s === "inprogress" || s === "in progress") return ["WaitingForRequester", "Resolved", "Cancelled"];
  if (s === "waitingforrequester" || s === "waiting for requester") return ["InProgress", "Resolved", "Cancelled"];
  if (s === "resolved") return ["Closed", "Reopened"];
  if (s === "closed") return ["Reopened"];
  if (s === "reopened") return ["InProgress", "WaitingForRequester", "Resolved", "Cancelled"];
  return [];
}

function formatStatusDisplay(status: string): string {
  if (!status) return "";
  if (status === "InProgress" || status === "in progress") return "In Progress";
  if (status === "WaitingForRequester" || status === "waiting for requester") return "Waiting for Requester";
  return status;
}

export default function TicketDetail({ ticketId, currentRequester, onBack, backLabel }: TicketDetailProps) {
  const isStaffOrAdmin =
    currentRequester?.role === "IT_STAFF" ||
    currentRequester?.role === "ADMINISTRATOR";
  const displayBackLabel =
    backLabel || (isStaffOrAdmin ? "← Back to Ticket Queue" : "← Back to My Tickets");

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Staff Assignment State
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // IT Priority State
  const [updatingPriority, setUpdatingPriority] = useState<boolean>(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);

  // Status Workflow State
  const [selectedNextStatus, setSelectedNextStatus] = useState<string>("");
  const [resolutionSummaryInput, setResolutionSummaryInput] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Requester Problem Resolved State
  const [resolvingIndicator, setResolvingIndicator] = useState<boolean>(false);
  const [resolveIndicatorSuccess, setResolveIndicatorSuccess] = useState<boolean>(false);
  const [resolveIndicatorError, setResolveIndicatorError] = useState<string | null>(null);

  // Comments State
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentContent, setCommentContent] = useState<string>("");
  const [postingComment, setPostingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Internal Notes State (Staff/Admin Only)
  const [notes, setNotes] = useState<InternalNoteItem[]>([]);
  const [noteContent, setNoteContent] = useState<string>("");
  const [postingNote, setPostingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Soft-remove modal state
  const [targetAttachment, setTargetAttachment] = useState<AttachmentItem | null>(null);
  const [removalReason, setRemovalReason] = useState<string>("");
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<boolean>(false);

  // Tabbed view state: 'attachments' | 'comments' | 'notes'
  const [activeDetailTab, setActiveDetailTab] = useState<"attachments" | "comments" | "notes">("attachments");

  const hiddenTabPanelStyle: React.CSSProperties = {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        let data: TicketDetailType;
        if (isStaffOrAdmin) {
          data = await fetchStaffTicketDetail(ticketId);
          try {
            const users = await fetchStaffUsers();
            if (isMounted) setStaffUsers(users);
          } catch {
            // Ignore staff users fetch failure
          }
        } else {
          data = await fetchTicketDetail(ticketId, currentRequester.id);
        }

        if (isMounted) {
          setTicket(data);
          setComments(data.comments || []);
          if (isStaffOrAdmin && data.internalNotes) {
            setNotes(data.internalNotes);
          }
          if (data.isProblemAppearsResolved) {
            setResolveIndicatorSuccess(true);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load ticket details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [ticketId, currentRequester.id, isStaffOrAdmin]);

  const activeAttachments = ticket?.attachments.filter((a) => !a.isDeleted) || [];
  const removedAttachments = ticket?.attachments.filter((a) => a.isDeleted) || [];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Ownership Claim & Reassignment Handler
  const handleClaimTicket = async () => {
    if (!ticket) return;
    try {
      setAssigning(true);
      setAssignError(null);
      const res = await assignTicket(ticket.id, currentRequester.id);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ownerId: res.ownerId,
              ownerName: res.owner?.displayName || currentRequester.displayName,
              owner: res.owner || { id: currentRequester.id, displayName: currentRequester.displayName },
            }
          : prev
      );
    } catch (err: any) {
      setAssignError(err.message || "Failed to claim ticket.");
    } finally {
      setAssigning(false);
    }
  };

  const handleReassignTicket = async (newOwnerIdStr: string) => {
    if (!ticket) return;
    try {
      setAssigning(true);
      setAssignError(null);
      const targetOwnerId = newOwnerIdStr === "" || newOwnerIdStr === "unassigned" ? null : Number(newOwnerIdStr);
      const res = await assignTicket(ticket.id, targetOwnerId);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ownerId: res.ownerId,
              ownerName: res.owner?.displayName || (res.ownerId === null ? null : prev.ownerName),
              owner: res.owner,
            }
          : prev
      );
    } catch (err: any) {
      setAssignError(err.message || "Failed to reassign ticket.");
    } finally {
      setAssigning(false);
    }
  };

  // IT Priority Update Handler
  const handlePriorityChange = async (newPriority: string) => {
    if (!ticket) return;
    try {
      setUpdatingPriority(true);
      setPriorityError(null);
      const res = await updateTicketPriority(ticket.id, newPriority);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              itPriority: res.itPriority || newPriority,
            }
          : prev
      );
    } catch (err: any) {
      setPriorityError(err.message || "Failed to update IT priority.");
    } finally {
      setUpdatingPriority(false);
    }
  };

  // Status Transition Handler
  const handleExecuteStatusTransition = async () => {
    if (!ticket || !selectedNextStatus) return;
    if (selectedNextStatus === "Resolved" && !resolutionSummaryInput.trim()) {
      setStatusError("Resolution summary is mandatory when resolving a ticket.");
      return;
    }

    try {
      setUpdatingStatus(true);
      setStatusError(null);
      const res = await updateTicketStatus(
        ticket.id,
        selectedNextStatus,
        selectedNextStatus === "Resolved" ? resolutionSummaryInput.trim() : undefined
      );

      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: res.status,
              resolutionSummary: res.resolutionSummary !== undefined ? res.resolutionSummary : prev.resolutionSummary,
            }
          : prev
      );
      setSelectedNextStatus("");
    } catch (err: any) {
      setStatusError(err.message || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Problem Appears Resolved Handler (Requester)
  const handleProblemResolvedClick = async () => {
    if (!ticket) return;
    try {
      setResolvingIndicator(true);
      setResolveIndicatorError(null);
      await indicateProblemResolved(ticket.id);
      setResolveIndicatorSuccess(true);
      setTicket((prev) => (prev ? { ...prev, isProblemAppearsResolved: true } : prev));
    } catch (err: any) {
      setResolveIndicatorError(err.message || "Failed to update resolution indicator.");
    } finally {
      setResolvingIndicator(false);
    }
  };

  // Comments Form Submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    const trimmed = commentContent.trim();
    if (!trimmed) {
      setCommentError("Comment content cannot be empty.");
      return;
    }
    if (trimmed.length > 2000) {
      setCommentError("Comment cannot exceed 2,000 characters.");
      return;
    }

    try {
      setPostingComment(true);
      setCommentError(null);
      const newComment = await createTicketComment(ticket.id, trimmed);
      setComments((prev) => [...prev, newComment]);
      setCommentContent("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  };

  // Internal Notes Form Submission (Staff/Admin Only)
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    const trimmed = noteContent.trim();
    if (!trimmed) {
      setNoteError("Internal note content cannot be empty.");
      return;
    }
    if (trimmed.length > 2000) {
      setNoteError("Internal note cannot exceed 2,000 characters.");
      return;
    }

    try {
      setPostingNote(true);
      setNoteError(null);
      const newNote = await createTicketNote(ticket.id, trimmed);
      setNotes((prev) => [...prev, newNote]);
      setNoteContent("");
    } catch (err: any) {
      setNoteError(err.message || "Failed to post internal note.");
    } finally {
      setPostingNote(false);
    }
  };

  // Attachment Upload & Remove handlers
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const allowed = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
      if (!allowed.includes(ext)) {
        setUploadError(`Invalid file format "${file.name}". Allowed formats: JPG, PNG, WEBP, PDF.`);
        setSelectedFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`File "${file.name}" exceeds the maximum 5 MB size limit.`);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !ticket) return;

    if (activeAttachments.length >= 5) {
      setUploadError("Maximum 5 active attachments allowed per ticket.");
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const newAtt = await uploadAttachment(ticket.id, selectedFile, currentRequester.id);

      setTicket((prev) =>
        prev
          ? {
              ...prev,
              attachments: [...prev.attachments, newAtt],
            }
          : prev
      );

      setUploadSuccess(`Attachment "${newAtt.originalFilename}" uploaded successfully.`);
      setSelectedFile(null);
      const fileInput = document.getElementById("attachment-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload attachment.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmSoftRemove = async () => {
    if (!targetAttachment || !ticket) return;
    const trimmedReason = removalReason.trim();
    if (!trimmedReason) {
      setRemovalError("Reason is required to soft-remove an attachment.");
      return;
    }

    try {
      setRemoving(true);
      setRemovalError(null);

      const res = await softRemoveAttachment(targetAttachment.id, currentRequester.id, trimmedReason);

      setTicket((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          attachments: prev.attachments.map((a) =>
            a.id === targetAttachment.id
              ? {
                  ...a,
                  isDeleted: true,
                  deletedAt: res.deletedAt,
                  deletionReason: trimmedReason,
                  deletedById: currentRequester.id,
                }
              : a
          ),
        };
      });

      setTargetAttachment(null);
      setRemovalReason("");
    } catch (err: any) {
      setRemovalError(err.message || "Failed to soft-remove attachment.");
    } finally {
      setRemoving(false);
    }
  };

  const renderPriorityBadge = (p: string) => {
    const val = (p || "").toUpperCase();
    switch (val) {
      case "LOW":
        return (
          <span style={{ backgroundColor: "#E5E7EB", color: "#374151", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.82rem", fontWeight: 600 }}>
            ↓ Low
          </span>
        );
      case "MEDIUM":
        return (
          <span style={{ backgroundColor: "#E0E7FF", color: "#3730A3", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.82rem", fontWeight: 600 }}>
            = Medium
          </span>
        );
      case "HIGH":
        return (
          <span style={{ backgroundColor: "#FEF3C7", color: "#92400E", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.82rem", fontWeight: 600 }}>
            ↑ High
          </span>
        );
      case "URGENT":
        return (
          <span style={{ backgroundColor: "#FEE2E2", color: "#991B1B", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.82rem", fontWeight: 700, border: "1px solid #F87171" }}>
            ⚠ Urgent
          </span>
        );
      default:
        return <span>{p}</span>;
    }
  };

  const renderStatusBadge = (s: string) => {
    return (
      <span
        style={{
          backgroundColor: "#EAF6EF",
          color: "#006B3C",
          border: "1px solid #0B7A46",
          padding: "0.25rem 0.75rem",
          borderRadius: "12px",
          fontSize: "0.85rem",
          fontWeight: 700,
        }}
      >
        ● {formatStatusDisplay(s)}
      </span>
    );
  };

  const renderRolePill = (role?: string) => {
    switch (role) {
      case "IT_STAFF":
        return (
          <span className="badge" style={{ backgroundColor: "#E0F2FE", color: "#0369A1", border: "1px solid #7DD3FC", fontSize: "0.75rem" }}>
            🛠 IT Staff
          </span>
        );
      case "ADMINISTRATOR":
        return (
          <span className="badge" style={{ backgroundColor: "#FEF3C7", color: "#B45309", border: "1px solid #FCD34D", fontSize: "0.75rem" }}>
            🛡 Admin
          </span>
        );
      default:
        return (
          <span className="badge" style={{ backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #0B7A46", fontSize: "0.75rem" }}>
            👤 Requester
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 960, margin: "2rem auto", textAlign: "center", color: "#555" }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>Loading ticket details...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ maxWidth: 960, margin: "2rem auto" }}>
        <div className="alert alert-danger shadow-sm" role="alert">
          <h5 className="alert-heading fw-bold mb-1">Error Loading Ticket</h5>
          <p className="mb-3">{error || "Ticket not found or ownership denied."}</p>
          <button type="button" className="btn btn-outline-danger btn-sm fw-semibold" onClick={onBack}>
            {displayBackLabel}
          </button>
        </div>
      </div>
    );
  }

  const permittedNext = getPermittedStatusesForUI(ticket.status);
  const isTicketOwnerRequester = !isStaffOrAdmin && ticket.requesterId === currentRequester.id;

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Top Navigation & Status Bar */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <button
          type="button"
          onClick={onBack}
          style={{
            backgroundColor: "#EAF6EF",
            color: "#006B3C",
            border: "1px solid #0B7A46",
            padding: "0.45rem 1rem",
            borderRadius: "6px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {displayBackLabel}
        </button>
        <div className="d-flex align-items-center gap-2">
          {ticket.isProblemAppearsResolved && (
            <span
              className="badge"
              style={{
                backgroundColor: "#DEF7EC",
                color: "#03543F",
                border: "1px solid #31C48D",
                padding: "0.35rem 0.65rem",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              ✓ Problem Marked Resolved
            </span>
          )}
          <div>{renderStatusBadge(ticket.status)}</div>
        </div>
      </div>

      {/* Requester Problem Resolved Banner / Action */}
      {isTicketOwnerRequester && (
        <div className="mb-4">
          {resolveIndicatorSuccess || ticket.isProblemAppearsResolved ? (
            <div
              className="alert alert-success d-flex align-items-center gap-2 shadow-sm py-3 px-4 mb-0"
              style={{ backgroundColor: "#EAF6EF", borderColor: "#0B7A46", color: "#006B3C" }}
            >
              <span style={{ fontSize: "1.3rem" }}>✓</span>
              <div>
                <strong>You indicated this issue appears resolved.</strong> IT Staff will verify and formally close the ticket.
              </div>
            </div>
          ) : (
            (ticket.status === "InProgress" || ticket.status === "WaitingForRequester" || ticket.status === "Open") && (
              <div
                className="p-3 border rounded d-flex justify-content-between align-items-center flex-wrap gap-2 shadow-sm"
                style={{ backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }}
              >
                <div>
                  <div className="fw-bold text-success" style={{ fontSize: "0.92rem" }}>
                    Did the proposed solution fix your issue?
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.82rem" }}>
                    Let IT Staff know that the problem appears resolved from your end.
                  </div>
                </div>
                <button
                  type="button"
                  id="problem-appears-resolved-btn"
                  className="btn btn-sm text-white fw-bold px-3 py-2"
                  style={{ backgroundColor: "#006B3C" }}
                  onClick={handleProblemResolvedClick}
                  disabled={resolvingIndicator}
                >
                  {resolvingIndicator ? "Marking..." : "Problem Appears Resolved"}
                </button>
                {resolveIndicatorError && (
                  <div className="w-100 text-danger" style={{ fontSize: "0.8rem" }}>
                    {resolveIndicatorError}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Ticket Header Card */}
      <div
        className="card shadow-sm mb-4"
        style={{ borderRadius: "8px", border: "1px solid #E0E0E0", overflow: "hidden" }}
      >
        <div
          style={{
            backgroundColor: "#006B3C",
            color: "#FFFFFF",
            padding: "1rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <span style={{ fontSize: "0.85rem", opacity: 0.9, display: "block" }}>Official Ticket Number</span>
            <h2 className="h4 mb-0 fw-bold">{ticket.ticketNo}</h2>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.85rem", opacity: 0.9 }}>
            <span>Created: {new Date(ticket.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
        </div>

        <div className="card-body p-4" style={{ backgroundColor: "#FFFFFF" }}>
          {/* Main Info Grid */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-md-3">
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>Requester</label>
              <div
                style={{
                  backgroundColor: "#E9ECEF",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "6px",
                  fontSize: "0.92rem",
                  fontWeight: 600,
                  color: "#1F2937",
                }}
              >
                {ticket.requester.displayName}
                <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: "normal" }}>{ticket.requester.email}</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>Category</label>
              <div
                style={{
                  backgroundColor: "#E9ECEF",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "6px",
                  fontSize: "0.92rem",
                  fontWeight: 600,
                  color: "#1F2937",
                }}
              >
                {ticket.category.name}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>Related System</label>
              <div
                style={{
                  backgroundColor: "#E9ECEF",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "6px",
                  fontSize: "0.92rem",
                  fontWeight: 600,
                  color: "#1F2937",
                }}
              >
                {ticket.relatedSystem.name}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>Requested Priority</label>
              <div style={{ marginTop: "0.2rem" }}>{renderPriorityBadge(ticket.requestedPriority)}</div>
            </div>

            {/* Ticket Owner Box */}
            {isStaffOrAdmin ? (
              <div className="col-12 col-sm-6 col-md-4">
                <label
                  htmlFor="ticket-owner-select"
                  style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }}
                >
                  Ticket Owner:
                </label>
                <div className="d-flex gap-2 align-items-center">
                  <select
                    id="ticket-owner-select"
                    className="form-select form-select-sm"
                    value={ticket.ownerId ? String(ticket.ownerId) : "unassigned"}
                    onChange={(e) => handleReassignTicket(e.target.value)}
                    disabled={assigning}
                    style={{ fontSize: "0.85rem" }}
                  >
                    <option value="unassigned">— Unassigned —</option>
                    {staffUsers.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.displayName} ({u.role === "ADMINISTRATOR" ? "Admin" : "IT Staff"})
                      </option>
                    ))}
                    {ticket.ownerId && !staffUsers.some((u) => u.id === ticket.ownerId) && (
                      <option value={String(ticket.ownerId)}>
                        {ticket.ownerName || ticket.owner?.displayName || `User #${ticket.ownerId}`}
                      </option>
                    )}
                  </select>

                  {!ticket.ownerId && (
                    <button
                      type="button"
                      id="claim-ticket-btn"
                      className="btn btn-sm text-white fw-bold px-3 flex-shrink-0"
                      style={{ backgroundColor: "#006B3C" }}
                      onClick={handleClaimTicket}
                      disabled={assigning}
                    >
                      {assigning ? "Claiming..." : "Claim Ticket"}
                    </button>
                  )}
                </div>
                <div
                  id="ticket-owner-display"
                  style={{
                    fontSize: "0.78rem",
                    color: ticket.owner || ticket.ownerName ? "#1F2937" : "#6B7280",
                    marginTop: "0.25rem",
                  }}
                >
                  Assigned: <strong>{ticket.owner?.displayName || ticket.ownerName || "Unassigned"}</strong>
                </div>
                {assignError && (
                  <div className="text-danger mt-1" style={{ fontSize: "0.78rem" }}>
                    {assignError}
                  </div>
                )}
              </div>
            ) : (
              <div className="col-12 col-sm-6 col-md-3">
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>Ticket Owner</label>
                <div
                  id="ticket-owner-display"
                  style={{
                    backgroundColor: "#E9ECEF",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "6px",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    color: ticket.owner || ticket.ownerName ? "#1F2937" : "#6B7280",
                  }}
                >
                  {ticket.owner?.displayName || ticket.ownerName || "Unassigned"}
                </div>
              </div>
            )}

            {/* IT Priority Box */}
            {isStaffOrAdmin ? (
              <div className="col-12 col-sm-6 col-md-3">
                <label
                  htmlFor="it-priority-select"
                  style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }}
                >
                  IT Priority:
                </label>
                <select
                  id="it-priority-select"
                  className="form-select form-select-sm"
                  value={ticket.itPriority || ticket.requestedPriority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  disabled={updatingPriority}
                  style={{ fontSize: "0.85rem" }}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                {priorityError && (
                  <div className="text-danger mt-1" style={{ fontSize: "0.78rem" }}>
                    {priorityError}
                  </div>
                )}
              </div>
            ) : (
              <div className="col-12 col-sm-6 col-md-3">
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>IT Priority</label>
                <div style={{ marginTop: "0.2rem" }}>
                  {renderPriorityBadge(ticket.itPriority || ticket.requestedPriority)}
                </div>
              </div>
            )}

            {/* Current Status Box (Staff/Admin Only) */}
            {isStaffOrAdmin && (
              <div className="col-12 col-sm-12 col-md-5">
                <label
                  htmlFor="next-status-select"
                  style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }}
                >
                  Current Status:
                </label>
                <div className="d-flex gap-2">
                  <select
                    id="next-status-select"
                    className="form-select form-select-sm"
                    value={selectedNextStatus || ""}
                    onChange={(e) => setSelectedNextStatus(e.target.value)}
                    disabled={updatingStatus || permittedNext.length === 0}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {permittedNext.length === 0 ? (
                      <option value="">{formatStatusDisplay(ticket.status)} (Terminal State)</option>
                    ) : (
                      <>
                        <option value="" disabled>
                          {formatStatusDisplay(ticket.status)}
                        </option>
                        {permittedNext.map((st) => (
                          <option key={st} value={st}>
                            {formatStatusDisplay(st)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  <button
                    type="button"
                    id="apply-status-transition-btn"
                    className="btn btn-sm btn-outline-primary fw-bold flex-shrink-0"
                    disabled={
                      updatingStatus ||
                      !selectedNextStatus ||
                      (selectedNextStatus === "Resolved" && !resolutionSummaryInput.trim())
                    }
                    onClick={handleExecuteStatusTransition}
                  >
                    {updatingStatus ? "Updating..." : "Update Status"}
                  </button>
                </div>
                {statusError && (
                  <div className="alert alert-danger py-1 px-2 mt-2 mb-0" style={{ fontSize: "0.82rem" }}>
                    {statusError}
                  </div>
                )}
              </div>
            )}

            {/* Resolution Summary input (visible when transitioning to Resolved) */}
            {isStaffOrAdmin && selectedNextStatus === "Resolved" && (
              <div className="col-12 mt-2 p-3 border rounded" style={{ backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }}>
                <label className="fw-bold mb-1 text-success d-block" style={{ fontSize: "0.85rem" }}>
                  Resolution Summary <span className="text-danger">*</span> (Required for Resolved state)
                </label>
                <textarea
                  id="resolution-summary-input"
                  className="form-control form-control-sm mb-2"
                  rows={2}
                  placeholder="Describe resolution steps taken..."
                  value={resolutionSummaryInput}
                  onChange={(e) => setResolutionSummaryInput(e.target.value)}
                />
              </div>
            )}
          </div>

          <hr style={{ borderColor: "#E5E7EB" }} />

          {/* Ticket Summary */}
          <div className="mb-4">
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }}>
              Summary
            </label>
            <div
              style={{
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: "6px",
                padding: "0.75rem 1rem",
                fontSize: "1rem",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              {ticket.summary}
            </div>
          </div>

          {/* Ticket Description */}
          <div className="mb-4">
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }}>
              Description
            </label>
            <div
              style={{
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: "6px",
                padding: "0.85rem 1rem",
                fontSize: "0.95rem",
                color: "#374151",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                minHeight: "100px",
              }}
            >
              {ticket.description}
            </div>
          </div>

          {/* Resolution Summary Box */}
          <div className="mb-2">
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }}>
              Resolution Summary
            </label>
            <div
              style={{
                backgroundColor: ticket.resolutionSummary ? "#EAF6EF" : "#F9FAFB",
                border: ticket.resolutionSummary ? "1px solid #0B7A46" : "1px solid #E5E7EB",
                borderRadius: "6px",
                padding: "0.85rem 1rem",
                fontSize: "0.95rem",
                color: ticket.resolutionSummary ? "#006B3C" : "#6B7280",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                minHeight: "65px",
              }}
            >
              {ticket.resolutionSummary ? (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>✓</span>
                  <div>{ticket.resolutionSummary}</div>
                </div>
              ) : (
                <em style={{ color: "#9CA3AF" }}>No resolution summary provided yet. (Pending IT Staff resolution)</em>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity & Attachments Tabs Card */}
      <div className="card shadow-sm mb-4" style={{ borderRadius: "8px", border: "1px solid #E0E0E0", backgroundColor: "#FFFFFF" }}>
        {/* Navigation Tabs Header */}
        <div className="card-header bg-white p-0 border-bottom">
          <ul className="nav nav-tabs card-header-tabs m-0 border-0" role="tablist" style={{ paddingLeft: "1rem", paddingTop: "0.5rem" }}>
            {/* Attachments Tab Button */}
            <li className="nav-item" role="presentation">
              <button
                type="button"
                id="tab-btn-attachments"
                role="tab"
                aria-selected={activeDetailTab === "attachments"}
                className={`nav-link fw-semibold ${activeDetailTab === "attachments" ? "active" : ""}`}
                onClick={() => setActiveDetailTab("attachments")}
                style={{
                  color: activeDetailTab === "attachments" ? "#006B3C" : "#5B6573",
                  borderBottom: activeDetailTab === "attachments" ? "3px solid #006B3C" : "3px solid transparent",
                  backgroundColor: activeDetailTab === "attachments" ? "#FFFFFF" : "transparent",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  padding: "0.6rem 1rem",
                }}
              >
                📎 Attachments
                <span
                  className="badge ms-2"
                  style={{
                    backgroundColor: activeAttachments.length >= 5 ? "#FEE2E2" : activeDetailTab === "attachments" ? "#006B3C" : "#E5E7EB",
                    color: activeAttachments.length >= 5 ? "#991B1B" : activeDetailTab === "attachments" ? "#FFFFFF" : "#374151",
                    fontSize: "0.75rem",
                  }}
                >
                  {activeAttachments.length}
                </span>
              </button>
            </li>

            {/* Public Comments Tab Button */}
            <li className="nav-item" role="presentation">
              <button
                type="button"
                id="tab-btn-public-comments"
                role="tab"
                aria-selected={activeDetailTab === "comments"}
                className={`nav-link fw-semibold ${activeDetailTab === "comments" ? "active" : ""}`}
                onClick={() => setActiveDetailTab("comments")}
                style={{
                  color: activeDetailTab === "comments" ? "#006B3C" : "#5B6573",
                  borderBottom: activeDetailTab === "comments" ? "3px solid #006B3C" : "3px solid transparent",
                  backgroundColor: activeDetailTab === "comments" ? "#FFFFFF" : "transparent",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  padding: "0.6rem 1rem",
                }}
              >
                💬 Public Comments
                <span
                  className="badge ms-2"
                  style={{
                    backgroundColor: activeDetailTab === "comments" ? "#006B3C" : "#E5E7EB",
                    color: activeDetailTab === "comments" ? "#FFFFFF" : "#374151",
                    fontSize: "0.75rem",
                  }}
                >
                  {comments.length}
                </span>
              </button>
            </li>

            {/* Internal Notes Tab Button (Staff/Admin only) */}
            {isStaffOrAdmin && (
              <li className="nav-item" role="presentation">
                <button
                  type="button"
                  id="tab-btn-internal-notes"
                  role="tab"
                  aria-selected={activeDetailTab === "notes"}
                  className={`nav-link fw-semibold ${activeDetailTab === "notes" ? "active" : ""}`}
                  onClick={() => setActiveDetailTab("notes")}
                  style={{
                    color: activeDetailTab === "notes" ? "#B45309" : "#5B6573",
                    borderBottom: activeDetailTab === "notes" ? "3px solid #D97706" : "3px solid transparent",
                    backgroundColor: activeDetailTab === "notes" ? "#FFFBEB" : "transparent",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    padding: "0.6rem 1rem",
                  }}
                >
                  🔒 Private Internal Notes
                  <span
                    className="badge ms-2"
                    style={{
                      backgroundColor: activeDetailTab === "notes" ? "#D97706" : "#FEF3C7",
                      color: activeDetailTab === "notes" ? "#FFFFFF" : "#92400E",
                      fontSize: "0.75rem",
                    }}
                  >
                    {notes.length}
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>

        {/* Tab Panel: Ticket Attachments */}
        <div
          id="tab-panel-attachments"
          role="tabpanel"
          style={activeDetailTab === "attachments" ? { padding: "1.5rem" } : hiddenTabPanelStyle}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h6 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              📎 Ticket Attachments
              <span
                className="badge"
                style={{
                  backgroundColor: activeAttachments.length >= 5 ? "#FEE2E2" : "#EAF6EF",
                  color: activeAttachments.length >= 5 ? "#991B1B" : "#006B3C",
                  fontSize: "0.78rem",
                }}
              >
                {activeAttachments.length} / 5 Active
              </span>
            </h3>
          </div>

          {/* Active Attachments List */}
          {activeAttachments.length === 0 ? (
            <div className="p-3 text-center text-muted border rounded bg-light mb-4" style={{ fontSize: "0.9rem" }}>
              No active attachments for this ticket yet.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2 mb-4">
              {activeAttachments.map((att) => (
                <div
                  key={att.id}
                  className="d-flex justify-content-between align-items-center p-3 border rounded"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                >
                  <div className="d-flex align-items-center gap-3 overflow-hidden">
                    <span style={{ fontSize: "1.4rem" }}>
                      {att.mimeType.includes("pdf") ? "📄" : "🖼️"}
                    </span>
                    <div className="text-truncate">
                      <div className="fw-semibold text-dark text-truncate" style={{ fontSize: "0.92rem" }}>
                        {att.originalFilename}
                      </div>
                      <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                        {formatFileSize(att.sizeBytes)} • Uploaded{" "}
                        {new Date(att.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2 ms-2 flex-shrink-0">
                    <a
                      href={getAttachmentDownloadUrl(att.id, currentRequester.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm fw-semibold"
                      style={{
                        backgroundColor: "#EAF6EF",
                        color: "#006B3C",
                        border: "1px solid #0B7A46",
                        fontSize: "0.82rem",
                        padding: "0.3rem 0.75rem",
                      }}
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger fw-semibold"
                      style={{ fontSize: "0.82rem", padding: "0.3rem 0.75rem" }}
                      onClick={() => {
                        setTargetAttachment(att);
                        setRemovalReason("");
                        setRemovalError(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Form */}
          <div className="p-3 border rounded" style={{ backgroundColor: "#F9FAFB" }}>
            <h4 className="h6 fw-bold mb-2 text-dark">Add Supporting Attachment</h4>
            <p className="text-muted mb-3" style={{ fontSize: "0.82rem" }}>
              Permitted formats: <strong>JPG, PNG, WEBP, PDF</strong> (Max 5 MB per file). Max 5 active attachments.
            </p>

            {uploadError && (
              <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: "0.88rem" }}>
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="alert alert-success py-2 px-3 mb-3" style={{ fontSize: "0.88rem" }}>
                {uploadSuccess}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="d-flex flex-wrap align-items-center gap-2">
              <input
                id="attachment-file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                disabled={uploading || activeAttachments.length >= 5}
                className="form-control form-control-sm"
                style={{ maxWidth: 360 }}
              />
              <button
                type="submit"
                disabled={!selectedFile || uploading || activeAttachments.length >= 5}
                className="btn btn-sm text-white fw-bold px-3"
                style={{ backgroundColor: "#006B3C" }}
              >
                {uploading ? "Uploading..." : "Upload File"}
              </button>
            </form>
          </div>

          {/* Soft-Removed Attachments List */}
          {removedAttachments.length > 0 && (
            <div className="mt-4 pt-3 border-top">
              <h4 className="h6 fw-bold text-secondary mb-3">Soft-Removed Attachment Tombstones</h4>
              <div className="d-flex flex-column gap-2">
                {removedAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 border rounded"
                    style={{ backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" }}
                  >
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                      <div>
                        <div className="fw-semibold text-secondary" style={{ fontSize: "0.9rem", textDecoration: "line-through" }}>
                          🗑️ {att.originalFilename} ({formatFileSize(att.sizeBytes)})
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                          Removed on{" "}
                          {att.deletedAt
                            ? new Date(att.deletedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                            : "—"}
                        </div>
                      </div>
                      <span className="badge bg-secondary">Soft-Removed</span>
                    </div>
                    {att.deletionReason && (
                      <div className="mt-2 text-danger" style={{ fontSize: "0.82rem", fontStyle: "italic" }}>
                        Reason: "{att.deletionReason}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab Panel: Public Comments */}
        <div
          id="tab-panel-public-comments"
          role="tabpanel"
          style={activeDetailTab === "comments" ? { padding: "1.5rem" } : hiddenTabPanelStyle}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              Conversation Thread
              <span className="badge" style={{ backgroundColor: "#006B3C", color: "#FFFFFF" }}>
                {comments.length}
              </span>
            </h4>
            <span style={{ fontSize: "0.78rem", fontWeight: "normal", color: "#0B7A46", backgroundColor: "#EAF6EF", padding: "0.25rem 0.6rem", borderRadius: "4px" }}>
              Visible to Requester & Staff
            </span>
          </div>

          {/* Comments Feed */}
          <div
            className="overflow-auto mb-3 pe-1"
            style={{ maxHeight: "380px", display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {comments.length === 0 ? (
              <div className="p-3 text-center text-muted border rounded bg-light" style={{ fontSize: "0.85rem" }}>
                No public comments yet. Post the first message below.
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 border rounded"
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderColor: "#E5E7EB",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                    <div className="d-flex align-items-center gap-2">
                      <strong style={{ fontSize: "0.88rem", color: "#111827" }}>
                        {c.author?.displayName || `User #${c.authorId}`}
                      </strong>
                      {renderRolePill(c.author?.role)}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                      {new Date(c.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                    {c.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input Form */}
          <form onSubmit={handleCommentSubmit} className="pt-2 border-top">
            {commentError && (
              <div className="alert alert-danger py-1 px-2 mb-2" style={{ fontSize: "0.82rem" }}>
                {commentError}
              </div>
            )}
            <div className="mb-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", margin: 0 }}>
                  Add Public Comment
                </label>
                <span style={{ fontSize: "0.75rem", color: commentContent.length > 2000 ? "#B3261E" : "#6B7280" }}>
                  {commentContent.length} / 2000
                </span>
              </div>
              <textarea
                id="public-comment-input"
                rows={3}
                maxLength={2000}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a message visible to everyone on this ticket..."
                className="form-control form-control-sm"
                disabled={postingComment}
              />
            </div>
            <div className="text-end">
              <button
                type="submit"
                id="post-public-comment-btn"
                className="btn btn-sm text-white fw-bold px-3"
                style={{ backgroundColor: "#006B3C" }}
                disabled={postingComment || !commentContent.trim() || commentContent.length > 2000}
              >
                {postingComment ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>
        </div>

        {/* Tab Panel: Internal Notes (Strictly omitted from DOM if !isStaffOrAdmin) */}
        {isStaffOrAdmin && (
          <div
            id="internal-notes-container"
            role="tabpanel"
            style={
              activeDetailTab === "notes"
                ? {
                    padding: "1.5rem",
                    backgroundColor: "#FFFBEB",
                    borderRadius: "0 0 8px 8px",
                  }
                : hiddenTabPanelStyle
            }
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="h6 fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: "#92400E" }}>
                Internal Staff Log
                <span className="badge" style={{ backgroundColor: "#D97706", color: "#FFFFFF" }}>
                  {notes.length}
                </span>
              </h4>
              <span style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#B45309", backgroundColor: "#FEF3C7", padding: "0.25rem 0.6rem", borderRadius: "4px", border: "1px solid #FDE68A" }}>
                Staff Only (Hidden from Requester)
              </span>
            </div>

            {/* Notes Feed */}
            <div
              className="overflow-auto mb-3 pe-1"
              style={{ maxHeight: "380px", display: "flex", flexDirection: "column", gap: "0.75rem" }}
            >
              {notes.length === 0 ? (
                <div className="p-3 text-center text-muted border rounded" style={{ backgroundColor: "#FFFBEB", fontSize: "0.85rem", borderColor: "#FDE68A" }}>
                  No internal notes recorded yet.
                </div>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 border rounded"
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#FDE68A",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                      <div className="d-flex align-items-center gap-2">
                        <strong style={{ fontSize: "0.88rem", color: "#92400E" }}>
                          {n.author?.displayName || `User #${n.authorId}`}
                        </strong>
                        {renderRolePill(n.author?.role)}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#78350F" }}>
                        {new Date(n.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#451A03", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                      {n.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Note Input Form */}
            <form onSubmit={handleNoteSubmit} className="pt-2 border-top" style={{ borderColor: "#FDE68A" }}>
              {noteError && (
                <div className="alert alert-danger py-1 px-2 mb-2" style={{ fontSize: "0.82rem" }}>
                  {noteError}
                </div>
              )}
              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400E", margin: 0 }}>
                    Add Internal Operational Note
                  </label>
                  <span style={{ fontSize: "0.75rem", color: noteContent.length > 2000 ? "#B3261E" : "#78350F" }}>
                    {noteContent.length} / 2000
                  </span>
                </div>
                <textarea
                  id="internal-note-input"
                  rows={3}
                  maxLength={2000}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add confidential diagnostic details, logs, or hand-off notes..."
                  className="form-control form-control-sm"
                  disabled={postingNote}
                  style={{ borderColor: "#F59E0B" }}
                />
              </div>
              <div className="text-end">
                <button
                  type="submit"
                  id="post-internal-note-btn"
                  className="btn btn-sm text-white fw-bold px-3"
                  style={{ backgroundColor: "#D97706", borderColor: "#B45309" }}
                  disabled={postingNote || !noteContent.trim() || noteContent.length > 2000}
                >
                  {postingNote ? "Saving Note..." : "Post Internal Note"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Removal Confirmation Modal */}
      {targetAttachment && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header bg-danger text-white py-2 px-3">
                <h5 className="modal-title h6 fw-bold mb-0">Confirm Attachment Soft-Removal</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setTargetAttachment(null)}
                ></button>
              </div>

              <div className="modal-body p-3">
                <p className="mb-2" style={{ fontSize: "0.9rem" }}>
                  Are you sure you want to soft-remove <strong>"{targetAttachment.originalFilename}"</strong>?
                </p>
                <p className="text-muted mb-3" style={{ fontSize: "0.82rem" }}>
                  The file binary will be removed from download access immediately. A tombstone record will be retained for audit purposes.
                </p>

                {removalError && (
                  <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: "0.85rem" }}>
                    {removalError}
                  </div>
                )}

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", margin: 0 }}>
                      Reason for Removal <span className="text-danger">*</span>
                    </label>
                    <span style={{ fontSize: "0.75rem", color: removalReason.trim().length > 255 ? "#B3261E" : "#6B7280" }}>
                      {removalReason.trim().length} / 255 characters
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={255}
                    value={removalReason}
                    onChange={(e) => {
                      setRemovalReason(e.target.value);
                      setRemovalError(null);
                    }}
                    placeholder="Enter mandatory reason for removing this attachment..."
                    className="form-control form-control-sm"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer py-2 px-3 bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTargetAttachment(null)}
                  disabled={removing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm fw-bold"
                  onClick={handleConfirmSoftRemove}
                  disabled={removing || !removalReason.trim() || removalReason.trim().length > 255}
                >
                  {removing ? "Removing..." : "Confirm Removal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
