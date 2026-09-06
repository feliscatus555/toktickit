import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { fetchTicketDetail, uploadAttachment, getAttachmentDownloadUrl, softRemoveAttachment, } from "./api.js";
export default function TicketDetail({ ticketId, currentRequester, onBack }) {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Upload state
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(null);
    // Soft-remove modal state
    const [targetAttachment, setTargetAttachment] = useState(null);
    const [removalReason, setRemovalReason] = useState("");
    const [removalError, setRemovalError] = useState(null);
    const [removing, setRemoving] = useState(false);
    useEffect(() => {
        let isMounted = true;
        async function loadTicket() {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchTicketDetail(ticketId, currentRequester.id);
                if (isMounted)
                    setTicket(data);
            }
            catch (err) {
                if (isMounted)
                    setError(err.message || "Failed to load ticket details.");
            }
            finally {
                if (isMounted)
                    setLoading(false);
            }
        }
        loadTicket();
        return () => {
            isMounted = false;
        };
    }, [ticketId, currentRequester.id]);
    const activeAttachments = ticket?.attachments.filter((a) => !a.isDeleted) || [];
    const removedAttachments = ticket?.attachments.filter((a) => a.isDeleted) || [];
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };
    const handleFileChange = (e) => {
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
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile || !ticket)
            return;
        if (activeAttachments.length >= 5) {
            setUploadError("Maximum 5 active attachments allowed per ticket.");
            return;
        }
        try {
            setUploading(true);
            setUploadError(null);
            setUploadSuccess(null);
            const newAtt = await uploadAttachment(ticket.id, selectedFile, currentRequester.id);
            setTicket((prev) => prev
                ? {
                    ...prev,
                    attachments: [...prev.attachments, newAtt],
                }
                : prev);
            setUploadSuccess(`Attachment "${newAtt.originalFilename}" uploaded successfully.`);
            setSelectedFile(null);
            // Reset input element
            const fileInput = document.getElementById("attachment-file-input");
            if (fileInput)
                fileInput.value = "";
        }
        catch (err) {
            setUploadError(err.message || "Failed to upload attachment.");
        }
        finally {
            setUploading(false);
        }
    };
    const handleConfirmSoftRemove = async () => {
        if (!targetAttachment || !ticket)
            return;
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
                if (!prev)
                    return prev;
                return {
                    ...prev,
                    attachments: prev.attachments.map((a) => a.id === targetAttachment.id
                        ? {
                            ...a,
                            isDeleted: true,
                            deletedAt: res.deletedAt,
                            deletionReason: trimmedReason,
                            deletedById: currentRequester.id,
                        }
                        : a),
                };
            });
            setTargetAttachment(null);
            setRemovalReason("");
        }
        catch (err) {
            setRemovalError(err.message || "Failed to soft-remove attachment.");
        }
        finally {
            setRemoving(false);
        }
    };
    const renderPriorityBadge = (p) => {
        switch (p.toUpperCase()) {
            case "LOW":
                return (_jsx("span", { style: { backgroundColor: "#E5E7EB", color: "#374151", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.82rem", fontWeight: 600 }, children: "\u2193 Low" }));
            case "MEDIUM":
                return (_jsx("span", { style: { backgroundColor: "#E0E7FF", color: "#3730A3", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.82rem", fontWeight: 600 }, children: "= Medium" }));
            case "HIGH":
                return (_jsx("span", { style: { backgroundColor: "#FEF3C7", color: "#92400E", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.82rem", fontWeight: 600 }, children: "\u2191 High" }));
            case "URGENT":
                return (_jsx("span", { style: { backgroundColor: "#FEE2E2", color: "#991B1B", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.82rem", fontWeight: 700, border: "1px solid #F87171" }, children: "\u26A0 Urgent" }));
            default:
                return _jsx("span", { children: p });
        }
    };
    const renderStatusBadge = (s) => {
        return (_jsxs("span", { style: { backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #0B7A46", padding: "0.25rem 0.75rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 700 }, children: ["\u25CF ", s] }));
    };
    if (loading) {
        return (_jsx("div", { style: { maxWidth: 900, margin: "2rem auto", textAlign: "center", color: "#555" }, children: _jsx("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: "Loading ticket details..." }) }));
    }
    if (error || !ticket) {
        return (_jsx("div", { style: { maxWidth: 900, margin: "2rem auto" }, children: _jsxs("div", { className: "alert alert-danger shadow-sm", role: "alert", children: [_jsx("h5", { className: "alert-heading fw-bold mb-1", children: "Error Loading Ticket" }), _jsx("p", { className: "mb-3", children: error || "Ticket not found or ownership denied." }), _jsx("button", { type: "button", className: "btn btn-outline-danger btn-sm fw-semibold", onClick: onBack, children: "\u2190 Back to My Tickets" })] }) }));
    }
    return (_jsxs("div", { style: { maxWidth: 960, margin: "0 auto", paddingBottom: "3rem" }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("button", { type: "button", onClick: onBack, style: {
                            backgroundColor: "#EAF6EF",
                            color: "#006B3C",
                            border: "1px solid #0B7A46",
                            padding: "0.45rem 1rem",
                            borderRadius: "6px",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }, children: "\u2190 Back to My Tickets" }), _jsx("div", { children: renderStatusBadge(ticket.status) })] }), _jsxs("div", { className: "card shadow-sm mb-4", style: { borderRadius: "8px", border: "1px solid #E0E0E0", overflow: "hidden" }, children: [_jsxs("div", { style: {
                            backgroundColor: "#006B3C",
                            color: "#FFFFFF",
                            padding: "1rem 1.5rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                        }, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: "0.85rem", opacity: 0.9, display: "block" }, children: "Official Ticket Number" }), _jsx("h2", { className: "h4 mb-0 fw-bold", children: ticket.ticketNo })] }), _jsx("div", { style: { textAlign: "right", fontSize: "0.85rem", opacity: 0.9 }, children: _jsxs("span", { children: ["Created: ", new Date(ticket.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })] }) })] }), _jsxs("div", { className: "card-body p-4", style: { backgroundColor: "#FFFFFF" }, children: [_jsxs("div", { className: "row g-3 mb-4", children: [_jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Requester" }), _jsx("div", { style: { fontSize: "0.95rem", fontWeight: 600, color: "#1F2937" }, children: ticket.requester.displayName }), _jsx("div", { style: { fontSize: "0.8rem", color: "#6B7280" }, children: ticket.requester.email })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Category" }), _jsx("div", { style: { fontSize: "0.95rem", fontWeight: 600, color: "#1F2937" }, children: ticket.category.name })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Related System" }), _jsx("div", { style: { fontSize: "0.95rem", fontWeight: 600, color: "#1F2937" }, children: ticket.relatedSystem.name })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Requested Priority" }), _jsx("div", { style: { marginTop: "0.2rem" }, children: renderPriorityBadge(ticket.requestedPriority) })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "IT Priority" }), _jsx("div", { style: { marginTop: "0.2rem" }, children: renderPriorityBadge(ticket.itPriority || ticket.requestedPriority) })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Ticket Owner" }), _jsx("div", { style: { fontSize: "0.95rem", fontWeight: 600, color: "#1F2937" }, children: ticket.ownerName || "Unassigned" })] })] }), _jsx("hr", { style: { borderColor: "#E5E7EB" } }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { style: { fontSize: "0.8rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }, children: "Summary" }), _jsx("div", { style: {
                                            backgroundColor: "#F9FAFB",
                                            border: "1px solid #E5E7EB",
                                            borderRadius: "6px",
                                            padding: "0.75rem 1rem",
                                            fontSize: "1rem",
                                            fontWeight: 600,
                                            color: "#111827",
                                        }, children: ticket.summary })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { style: { fontSize: "0.8rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }, children: "Description" }), _jsx("div", { style: {
                                            backgroundColor: "#F9FAFB",
                                            border: "1px solid #E5E7EB",
                                            borderRadius: "6px",
                                            padding: "0.85rem 1rem",
                                            fontSize: "0.95rem",
                                            color: "#374151",
                                            whiteSpace: "pre-wrap",
                                            lineHeight: 1.5,
                                            minHeight: "100px",
                                        }, children: ticket.description })] }), _jsxs("div", { className: "mb-2", children: [_jsx("label", { style: { fontSize: "0.8rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }, children: "Resolution Summary" }), _jsx("div", { style: {
                                            backgroundColor: ticket.resolutionSummary ? "#EAF6EF" : "#F9FAFB",
                                            border: ticket.resolutionSummary ? "1px solid #0B7A46" : "1px solid #E5E7EB",
                                            borderRadius: "6px",
                                            padding: "0.85rem 1rem",
                                            fontSize: "0.95rem",
                                            color: ticket.resolutionSummary ? "#006B3C" : "#6B7280",
                                            whiteSpace: "pre-wrap",
                                            lineHeight: 1.5,
                                            minHeight: "65px",
                                        }, children: ticket.resolutionSummary ? (_jsxs("div", { style: { display: "flex", gap: "0.5rem", alignItems: "flex-start" }, children: [_jsx("span", { style: { fontWeight: "bold", fontSize: "1.1rem" }, children: "\u2713" }), _jsx("div", { children: ticket.resolutionSummary })] })) : (_jsx("em", { style: { color: "#9CA3AF" }, children: "No resolution summary provided yet. (Pending IT Staff resolution)" })) })] })] })] }), _jsxs("div", { className: "card shadow-sm mb-4", style: { borderRadius: "8px", border: "1px solid #E0E0E0" }, children: [_jsx("div", { className: "card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center", children: _jsxs("h3", { className: "h6 mb-0 fw-bold text-dark d-flex align-items-center gap-2", children: ["\uD83D\uDCCE Ticket Attachments", _jsxs("span", { className: "badge", style: {
                                        backgroundColor: activeAttachments.length >= 5 ? "#FEE2E2" : "#EAF6EF",
                                        color: activeAttachments.length >= 5 ? "#991B1B" : "#006B3C",
                                        fontSize: "0.78rem",
                                    }, children: [activeAttachments.length, " / 5 Active"] })] }) }), _jsxs("div", { className: "card-body p-4", children: [activeAttachments.length === 0 ? (_jsx("div", { className: "p-3 text-center text-muted border rounded bg-light mb-4", style: { fontSize: "0.9rem" }, children: "No active attachments for this ticket yet." })) : (_jsx("div", { className: "d-flex flex-column gap-2 mb-4", children: activeAttachments.map((att) => (_jsxs("div", { className: "d-flex justify-content-between align-items-center p-3 border rounded", style: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }, children: [_jsxs("div", { className: "d-flex align-items-center gap-3 overflow-hidden", children: [_jsx("span", { style: { fontSize: "1.4rem" }, children: att.mimeType.includes("pdf") ? "📄" : "🖼️" }), _jsxs("div", { className: "text-truncate", children: [_jsx("div", { className: "fw-semibold text-dark text-truncate", style: { fontSize: "0.92rem" }, children: att.originalFilename }), _jsxs("div", { className: "text-muted", style: { fontSize: "0.78rem" }, children: [formatFileSize(att.sizeBytes), " \u2022 Uploaded", " ", new Date(att.createdAt).toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                })] })] })] }), _jsxs("div", { className: "d-flex gap-2 ms-2 flex-shrink-0", children: [_jsx("a", { href: getAttachmentDownloadUrl(att.id, currentRequester.id), target: "_blank", rel: "noopener noreferrer", className: "btn btn-sm fw-semibold", style: {
                                                        backgroundColor: "#EAF6EF",
                                                        color: "#006B3C",
                                                        border: "1px solid #0B7A46",
                                                        fontSize: "0.82rem",
                                                        padding: "0.3rem 0.75rem",
                                                    }, children: "Download" }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger fw-semibold", style: { fontSize: "0.82rem", padding: "0.3rem 0.75rem" }, onClick: () => {
                                                        setTargetAttachment(att);
                                                        setRemovalReason("");
                                                        setRemovalError(null);
                                                    }, children: "Remove" })] })] }, att.id))) })), _jsxs("div", { className: "p-3 border rounded", style: { backgroundColor: "#F9FAFB" }, children: [_jsx("h4", { className: "h6 fw-bold mb-2 text-dark", children: "Add Supporting Attachment" }), _jsxs("p", { className: "text-muted mb-3", style: { fontSize: "0.82rem" }, children: ["Permitted formats: ", _jsx("strong", { children: "JPG, PNG, WEBP, PDF" }), " (Max 5 MB per file). Max 5 active attachments."] }), uploadError && (_jsx("div", { className: "alert alert-danger py-2 px-3 mb-3", style: { fontSize: "0.88rem" }, children: uploadError })), uploadSuccess && (_jsx("div", { className: "alert alert-success py-2 px-3 mb-3", style: { fontSize: "0.88rem" }, children: uploadSuccess })), _jsxs("form", { onSubmit: handleUploadSubmit, className: "d-flex flex-wrap align-items-center gap-2", children: [_jsx("input", { id: "attachment-file-input", type: "file", accept: ".jpg,.jpeg,.png,.webp,.pdf", onChange: handleFileChange, disabled: uploading || activeAttachments.length >= 5, className: "form-control form-control-sm", style: { maxWidth: 360 } }), _jsx("button", { type: "submit", disabled: !selectedFile || uploading || activeAttachments.length >= 5, className: "btn btn-sm text-white fw-bold px-3", style: { backgroundColor: "#006B3C" }, children: uploading ? "Uploading..." : "Upload File" })] })] }), removedAttachments.length > 0 && (_jsxs("div", { className: "mt-4 pt-3 border-top", children: [_jsx("h4", { className: "h6 fw-bold text-secondary mb-3", children: "Soft-Removed Attachment Tombstones" }), _jsx("div", { className: "d-flex flex-column gap-2", children: removedAttachments.map((att) => (_jsxs("div", { className: "p-3 border rounded", style: { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start flex-wrap gap-2", children: [_jsxs("div", { children: [_jsxs("div", { className: "fw-semibold text-secondary", style: { fontSize: "0.9rem", textDecoration: "line-through" }, children: ["\uD83D\uDDD1\uFE0F ", att.originalFilename, " (", formatFileSize(att.sizeBytes), ")"] }), _jsxs("div", { className: "text-muted", style: { fontSize: "0.78rem" }, children: ["Removed on", " ", att.deletedAt
                                                                            ? new Date(att.deletedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                                                                            : "—"] })] }), _jsx("span", { className: "badge bg-secondary", children: "Soft-Removed" })] }), att.deletionReason && (_jsxs("div", { className: "mt-2 text-danger", style: { fontSize: "0.82rem", fontStyle: "italic" }, children: ["Reason: \"", att.deletionReason, "\""] }))] }, att.id))) })] }))] })] }), targetAttachment && (_jsx("div", { className: "modal d-block", tabIndex: -1, style: { backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content shadow", children: [_jsxs("div", { className: "modal-header bg-danger text-white py-2 px-3", children: [_jsx("h5", { className: "modal-title h6 fw-bold mb-0", children: "Confirm Attachment Soft-Removal" }), _jsx("button", { type: "button", className: "btn-close btn-close-white", onClick: () => setTargetAttachment(null) })] }), _jsxs("div", { className: "modal-body p-3", children: [_jsxs("p", { className: "mb-2", style: { fontSize: "0.9rem" }, children: ["Are you sure you want to soft-remove ", _jsxs("strong", { children: ["\"", targetAttachment.originalFilename, "\""] }), "?"] }), _jsx("p", { className: "text-muted mb-3", style: { fontSize: "0.82rem" }, children: "The file binary will be removed from download access immediately. A tombstone record will be retained for audit purposes." }), removalError && (_jsx("div", { className: "alert alert-danger py-2 px-3 mb-3", style: { fontSize: "0.85rem" }, children: removalError })), _jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsxs("label", { style: { fontSize: "0.82rem", fontWeight: 700, color: "#374151", margin: 0 }, children: ["Reason for Removal ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("span", { style: { fontSize: "0.75rem", color: removalReason.trim().length > 255 ? "#B3261E" : "#6B7280" }, children: [removalReason.trim().length, " / 255 characters"] })] }), _jsx("textarea", { rows: 3, maxLength: 255, value: removalReason, onChange: (e) => {
                                                    setRemovalReason(e.target.value);
                                                    setRemovalError(null);
                                                }, placeholder: "Enter mandatory reason for removing this attachment...", className: "form-control form-control-sm" })] })] }), _jsxs("div", { className: "modal-footer py-2 px-3 bg-light", children: [_jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setTargetAttachment(null), disabled: removing, children: "Cancel" }), _jsx("button", { type: "button", className: "btn btn-danger btn-sm fw-bold", onClick: handleConfirmSoftRemove, disabled: removing || !removalReason.trim() || removalReason.trim().length > 255, children: removing ? "Removing..." : "Confirm Removal" })] })] }) }) }))] }));
}
