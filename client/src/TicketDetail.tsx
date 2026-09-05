import React, { useState, useEffect, ChangeEvent } from "react";
import {
  RequesterUser,
  TicketDetail as TicketDetailType,
  AttachmentItem,
  fetchTicketDetail,
  uploadAttachment,
  getAttachmentDownloadUrl,
  softRemoveAttachment,
} from "./api.js";

interface TicketDetailProps {
  ticketId: string;
  currentRequester: RequesterUser;
  onBack: () => void;
}

export default function TicketDetail({ ticketId, currentRequester, onBack }: TicketDetailProps) {
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;
    async function loadTicket() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTicketDetail(ticketId, currentRequester.id);
        if (isMounted) setTicket(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load ticket details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadTicket();
    return () => {
      isMounted = false;
    };
  }, [ticketId, currentRequester.id]);

  const activeAttachments = ticket?.attachments.filter((a) => !a.isDeleted) || [];
  const removedAttachments = ticket?.attachments.filter((a) => a.isDeleted) || [];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

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
      // Reset input element
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
    switch (p.toUpperCase()) {
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
      <span style={{ backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #0B7A46", padding: "0.25rem 0.75rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 700 }}>
        ● {s}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "2rem auto", textAlign: "center", color: "#555" }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>Loading ticket details...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ maxWidth: 900, margin: "2rem auto" }}>
        <div className="alert alert-danger shadow-sm" role="alert">
          <h5 className="alert-heading fw-bold mb-1">Error Loading Ticket</h5>
          <p className="mb-3">{error || "Ticket not found or ownership denied."}</p>
          <button type="button" className="btn btn-outline-danger btn-sm fw-semibold" onClick={onBack}>
            ← Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Top Navigation */}
      <div className="d-flex justify-content-between align-items-center mb-3">
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
          ← Back to My Tickets
        </button>
        <div>{renderStatusBadge(ticket.status)}</div>
      </div>

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
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1F2937" }}>
                {ticket.requester.displayName}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6B7280" }}>{ticket.requester.email}</div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>Category</label>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1F2937" }}>
                {ticket.category.name}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>Related System</label>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1F2937" }}>
                {ticket.relatedSystem.name}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>Requested Priority</label>
              <div style={{ marginTop: "0.2rem" }}>{renderPriorityBadge(ticket.requestedPriority)}</div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>IT Priority</label>
              <div style={{ marginTop: "0.2rem" }}>
                {renderPriorityBadge(ticket.itPriority || ticket.requestedPriority)}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }}>Ticket Owner</label>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1F2937" }}>
                {ticket.ownerName || "Unassigned"}
              </div>
            </div>
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


      {/* Attachments Section Card */}
      <div className="card shadow-sm mb-4" style={{ borderRadius: "8px", border: "1px solid #E0E0E0" }}>
        <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center">
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

        <div className="card-body p-4">
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
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", display: "block" }}>
                    Reason for Removal <span className="text-danger">*</span>
                  </label>
                  <textarea
                    rows={3}
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
                  disabled={removing || !removalReason.trim()}
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
