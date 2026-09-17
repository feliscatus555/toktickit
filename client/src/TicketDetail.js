import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { fetchTicketDetail, fetchStaffTicketDetail, assignTicket, updateTicketPriority, updateTicketStatus, createTicketComment, createTicketNote, indicateProblemResolved, fetchStaffUsers, uploadAttachment, getAttachmentDownloadUrl, softRemoveAttachment, } from "./api.js";
function getPermittedStatusesForUI(currentStatus) {
    if (!currentStatus)
        return [];
    const s = currentStatus.trim().toLowerCase();
    if (s === "new")
        return ["Open", "Cancelled"];
    if (s === "open")
        return ["InProgress", "WaitingForRequester", "Resolved", "Cancelled"];
    if (s === "inprogress" || s === "in progress")
        return ["WaitingForRequester", "Resolved", "Cancelled"];
    if (s === "waitingforrequester" || s === "waiting for requester")
        return ["InProgress", "Resolved", "Cancelled"];
    if (s === "resolved")
        return ["Closed", "Reopened"];
    if (s === "closed")
        return ["Reopened"];
    if (s === "reopened")
        return ["InProgress", "WaitingForRequester", "Resolved", "Cancelled"];
    return [];
}
function formatStatusDisplay(status) {
    if (!status)
        return "";
    if (status === "InProgress" || status === "in progress")
        return "In Progress";
    if (status === "WaitingForRequester" || status === "waiting for requester")
        return "Waiting for Requester";
    return status;
}
export default function TicketDetail({ ticketId, currentRequester, onBack, backLabel }) {
    const isStaffOrAdmin = currentRequester?.role === "IT_STAFF" ||
        currentRequester?.role === "ADMINISTRATOR";
    const displayBackLabel = backLabel || (isStaffOrAdmin ? "← Back to Ticket Queue" : "← Back to My Tickets");
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Staff Assignment State
    const [staffUsers, setStaffUsers] = useState([]);
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState(null);
    // IT Priority State
    const [updatingPriority, setUpdatingPriority] = useState(false);
    const [priorityError, setPriorityError] = useState(null);
    // Status Workflow State
    const [selectedNextStatus, setSelectedNextStatus] = useState("");
    const [resolutionSummaryInput, setResolutionSummaryInput] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusError, setStatusError] = useState(null);
    // Requester Problem Resolved State
    const [resolvingIndicator, setResolvingIndicator] = useState(false);
    const [resolveIndicatorSuccess, setResolveIndicatorSuccess] = useState(false);
    const [resolveIndicatorError, setResolveIndicatorError] = useState(null);
    // Comments State
    const [comments, setComments] = useState([]);
    const [commentContent, setCommentContent] = useState("");
    const [postingComment, setPostingComment] = useState(false);
    const [commentError, setCommentError] = useState(null);
    // Internal Notes State (Staff/Admin Only)
    const [notes, setNotes] = useState([]);
    const [noteContent, setNoteContent] = useState("");
    const [postingNote, setPostingNote] = useState(false);
    const [noteError, setNoteError] = useState(null);
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
    // Tabbed view state: 'attachments' | 'comments' | 'notes'
    const [activeDetailTab, setActiveDetailTab] = useState("attachments");
    const hiddenTabPanelStyle = {
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
                let data;
                if (isStaffOrAdmin) {
                    data = await fetchStaffTicketDetail(ticketId);
                    try {
                        const users = await fetchStaffUsers();
                        if (isMounted)
                            setStaffUsers(users);
                    }
                    catch {
                        // Ignore staff users fetch failure
                    }
                }
                else {
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
        loadData();
        return () => {
            isMounted = false;
        };
    }, [ticketId, currentRequester.id, isStaffOrAdmin]);
    const activeAttachments = ticket?.attachments.filter((a) => !a.isDeleted) || [];
    const removedAttachments = ticket?.attachments.filter((a) => a.isDeleted) || [];
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };
    // Ownership Claim & Reassignment Handler
    const handleClaimTicket = async () => {
        if (!ticket)
            return;
        try {
            setAssigning(true);
            setAssignError(null);
            const res = await assignTicket(ticket.id, currentRequester.id);
            setTicket((prev) => prev
                ? {
                    ...prev,
                    ownerId: res.ownerId,
                    ownerName: res.owner?.displayName || currentRequester.displayName,
                    owner: res.owner || { id: currentRequester.id, displayName: currentRequester.displayName },
                }
                : prev);
        }
        catch (err) {
            setAssignError(err.message || "Failed to claim ticket.");
        }
        finally {
            setAssigning(false);
        }
    };
    const handleReassignTicket = async (newOwnerIdStr) => {
        if (!ticket)
            return;
        try {
            setAssigning(true);
            setAssignError(null);
            const targetOwnerId = newOwnerIdStr === "" || newOwnerIdStr === "unassigned" ? null : Number(newOwnerIdStr);
            const res = await assignTicket(ticket.id, targetOwnerId);
            setTicket((prev) => prev
                ? {
                    ...prev,
                    ownerId: res.ownerId,
                    ownerName: res.owner?.displayName || (res.ownerId === null ? null : prev.ownerName),
                    owner: res.owner,
                }
                : prev);
        }
        catch (err) {
            setAssignError(err.message || "Failed to reassign ticket.");
        }
        finally {
            setAssigning(false);
        }
    };
    // IT Priority Update Handler
    const handlePriorityChange = async (newPriority) => {
        if (!ticket)
            return;
        try {
            setUpdatingPriority(true);
            setPriorityError(null);
            const res = await updateTicketPriority(ticket.id, newPriority);
            setTicket((prev) => prev
                ? {
                    ...prev,
                    itPriority: res.itPriority || newPriority,
                }
                : prev);
        }
        catch (err) {
            setPriorityError(err.message || "Failed to update IT priority.");
        }
        finally {
            setUpdatingPriority(false);
        }
    };
    // Status Change Handler (auto-updates on select)
    const handleStatusChange = async (newStatus) => {
        if (!ticket || !newStatus || newStatus === ticket.status)
            return;
        if (newStatus === "Resolved") {
            setSelectedNextStatus("Resolved");
            setStatusError(null);
            return;
        }
        try {
            setUpdatingStatus(true);
            setStatusError(null);
            const res = await updateTicketStatus(ticket.id, newStatus);
            setTicket((prev) => prev
                ? {
                    ...prev,
                    status: res.status,
                    resolutionSummary: res.resolutionSummary !== undefined ? res.resolutionSummary : prev.resolutionSummary,
                }
                : prev);
            setSelectedNextStatus("");
        }
        catch (err) {
            setStatusError(err.message || "Failed to update status.");
            setSelectedNextStatus("");
        }
        finally {
            setUpdatingStatus(false);
        }
    };
    // Confirm Resolve Handler (when status is Resolved and summary is entered)
    const handleConfirmResolve = async () => {
        if (!ticket)
            return;
        if (!resolutionSummaryInput.trim()) {
            setStatusError("Resolution summary is mandatory when resolving a ticket.");
            return;
        }
        try {
            setUpdatingStatus(true);
            setStatusError(null);
            const res = await updateTicketStatus(ticket.id, "Resolved", resolutionSummaryInput.trim());
            setTicket((prev) => prev
                ? {
                    ...prev,
                    status: res.status,
                    resolutionSummary: res.resolutionSummary !== undefined ? res.resolutionSummary : prev.resolutionSummary,
                }
                : prev);
            setSelectedNextStatus("");
            setResolutionSummaryInput("");
        }
        catch (err) {
            setStatusError(err.message || "Failed to resolve ticket.");
        }
        finally {
            setUpdatingStatus(false);
        }
    };
    // Problem Appears Resolved Handler (Requester)
    const handleProblemResolvedClick = async () => {
        if (!ticket)
            return;
        try {
            setResolvingIndicator(true);
            setResolveIndicatorError(null);
            await indicateProblemResolved(ticket.id);
            setResolveIndicatorSuccess(true);
            setTicket((prev) => (prev ? { ...prev, isProblemAppearsResolved: true } : prev));
        }
        catch (err) {
            setResolveIndicatorError(err.message || "Failed to update resolution indicator.");
        }
        finally {
            setResolvingIndicator(false);
        }
    };
    // Comments Form Submission
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!ticket)
            return;
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
        }
        catch (err) {
            setCommentError(err.message || "Failed to post comment.");
        }
        finally {
            setPostingComment(false);
        }
    };
    // Internal Notes Form Submission (Staff/Admin Only)
    const handleNoteSubmit = async (e) => {
        e.preventDefault();
        if (!ticket)
            return;
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
        }
        catch (err) {
            setNoteError(err.message || "Failed to post internal note.");
        }
        finally {
            setPostingNote(false);
        }
    };
    // Attachment Upload & Remove handlers
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
        const val = (p || "").toUpperCase();
        switch (val) {
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
        return (_jsxs("span", { style: {
                backgroundColor: "#EAF6EF",
                color: "#006B3C",
                border: "1px solid #0B7A46",
                padding: "0.25rem 0.75rem",
                borderRadius: "12px",
                fontSize: "0.85rem",
                fontWeight: 700,
            }, children: ["\u25CF ", formatStatusDisplay(s)] }));
    };
    const renderRolePill = (role) => {
        switch (role) {
            case "IT_STAFF":
                return (_jsx("span", { className: "badge", style: { backgroundColor: "#E0F2FE", color: "#0369A1", border: "1px solid #7DD3FC", fontSize: "0.75rem" }, children: "\uD83D\uDEE0 IT Staff" }));
            case "ADMINISTRATOR":
                return (_jsx("span", { className: "badge", style: { backgroundColor: "#FEF3C7", color: "#B45309", border: "1px solid #FCD34D", fontSize: "0.75rem" }, children: "\uD83D\uDEE1 Admin" }));
            default:
                return (_jsx("span", { className: "badge", style: { backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #0B7A46", fontSize: "0.75rem" }, children: "\uD83D\uDC64 Requester" }));
        }
    };
    if (loading) {
        return (_jsx("div", { style: { maxWidth: 960, margin: "2rem auto", textAlign: "center", color: "#555" }, children: _jsx("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: "Loading ticket details..." }) }));
    }
    if (error || !ticket) {
        return (_jsx("div", { style: { maxWidth: 960, margin: "2rem auto" }, children: _jsxs("div", { className: "alert alert-danger shadow-sm", role: "alert", children: [_jsx("h5", { className: "alert-heading fw-bold mb-1", children: "Error Loading Ticket" }), _jsx("p", { className: "mb-3", children: error || "Ticket not found or ownership denied." }), _jsx("button", { type: "button", className: "btn btn-outline-danger btn-sm fw-semibold", onClick: onBack, children: displayBackLabel })] }) }));
    }
    const permittedNext = getPermittedStatusesForUI(ticket.status);
    const isTicketOwnerRequester = !isStaffOrAdmin && ticket.requesterId === currentRequester.id;
    return (_jsxs("div", { style: { maxWidth: 1040, margin: "0 auto", paddingBottom: "3rem" }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: onBack, style: {
                            backgroundColor: "#EAF6EF",
                            color: "#006B3C",
                            border: "1px solid #0B7A46",
                            padding: "0.45rem 1rem",
                            borderRadius: "6px",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }, children: displayBackLabel }), _jsxs("div", { className: "d-flex align-items-center gap-2", children: [ticket.isProblemAppearsResolved && (_jsx("span", { className: "badge", style: {
                                    backgroundColor: "#DEF7EC",
                                    color: "#03543F",
                                    border: "1px solid #31C48D",
                                    padding: "0.35rem 0.65rem",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                }, children: "\u2713 Problem Marked Resolved" })), _jsx("div", { children: renderStatusBadge(ticket.status) })] })] }), isTicketOwnerRequester && (_jsx("div", { className: "mb-4", children: resolveIndicatorSuccess || ticket.isProblemAppearsResolved ? (_jsxs("div", { className: "alert alert-success d-flex align-items-center gap-2 shadow-sm py-3 px-4 mb-0", style: { backgroundColor: "#EAF6EF", borderColor: "#0B7A46", color: "#006B3C" }, children: [_jsx("span", { style: { fontSize: "1.3rem" }, children: "\u2713" }), _jsxs("div", { children: [_jsx("strong", { children: "You indicated this issue appears resolved." }), " IT Staff will verify and formally close the ticket."] })] })) : ((ticket.status === "InProgress" || ticket.status === "WaitingForRequester" || ticket.status === "Open") && (_jsxs("div", { className: "p-3 border rounded d-flex justify-content-between align-items-center flex-wrap gap-2 shadow-sm", style: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }, children: [_jsxs("div", { children: [_jsx("div", { className: "fw-bold text-success", style: { fontSize: "0.92rem" }, children: "Did the proposed solution fix your issue?" }), _jsx("div", { className: "text-muted", style: { fontSize: "0.82rem" }, children: "Let IT Staff know that the problem appears resolved from your end." })] }), _jsx("button", { type: "button", id: "problem-appears-resolved-btn", className: "btn btn-sm text-white fw-bold px-3 py-2", style: { backgroundColor: "#006B3C" }, onClick: handleProblemResolvedClick, disabled: resolvingIndicator, children: resolvingIndicator ? "Marking..." : "Problem Appears Resolved" }), resolveIndicatorError && (_jsx("div", { className: "w-100 text-danger", style: { fontSize: "0.8rem" }, children: resolveIndicatorError }))] }))) })), _jsxs("div", { className: "card shadow-sm mb-4", style: { borderRadius: "8px", border: "1px solid #E0E0E0", overflow: "hidden" }, children: [_jsxs("div", { style: {
                            backgroundColor: "#006B3C",
                            color: "#FFFFFF",
                            padding: "1rem 1.5rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                        }, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: "0.85rem", opacity: 0.9, display: "block" }, children: "Official Ticket Number" }), _jsx("h2", { className: "h4 mb-0 fw-bold", children: ticket.ticketNo })] }), _jsx("div", { style: { textAlign: "right", fontSize: "0.85rem", opacity: 0.9 }, children: _jsxs("span", { children: ["Created: ", new Date(ticket.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })] }) })] }), _jsxs("div", { className: "card-body p-4", style: { backgroundColor: "#FFFFFF" }, children: [_jsxs("div", { className: "row g-3 mb-4", children: [_jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Requester" }), _jsxs("div", { style: {
                                                    backgroundColor: "#E9ECEF",
                                                    padding: "0.4rem 0.6rem",
                                                    borderRadius: "6px",
                                                    fontSize: "0.92rem",
                                                    fontWeight: 600,
                                                    color: "#1F2937",
                                                }, children: [ticket.requester.displayName, _jsx("div", { style: { fontSize: "0.75rem", color: "#6B7280", fontWeight: "normal" }, children: ticket.requester.email })] })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Category" }), _jsx("div", { style: {
                                                    backgroundColor: "#E9ECEF",
                                                    padding: "0.4rem 0.6rem",
                                                    borderRadius: "6px",
                                                    fontSize: "0.92rem",
                                                    fontWeight: 600,
                                                    color: "#1F2937",
                                                }, children: ticket.category.name })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Related System" }), _jsx("div", { style: {
                                                    backgroundColor: "#E9ECEF",
                                                    padding: "0.4rem 0.6rem",
                                                    borderRadius: "6px",
                                                    fontSize: "0.92rem",
                                                    fontWeight: 600,
                                                    color: "#1F2937",
                                                }, children: ticket.relatedSystem.name })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Requested Priority" }), _jsx("div", { style: { marginTop: "0.2rem" }, children: renderPriorityBadge(ticket.requestedPriority) })] }), isStaffOrAdmin ? (_jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { htmlFor: "ticket-owner-select", style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }, children: "Ticket Owner:" }), _jsxs("div", { className: "d-flex gap-2 align-items-center", children: [_jsxs("select", { id: "ticket-owner-select", className: "form-select form-select-sm", value: ticket.ownerId ? String(ticket.ownerId) : "unassigned", onChange: (e) => handleReassignTicket(e.target.value), disabled: assigning, style: { fontSize: "0.85rem" }, children: [_jsx("option", { value: "unassigned", children: "\u2014 Unassigned \u2014" }), staffUsers.map((u) => (_jsxs("option", { value: String(u.id), children: [u.displayName, " (", u.role === "ADMINISTRATOR" ? "Admin" : "IT Staff", ")"] }, u.id))), ticket.ownerId && !staffUsers.some((u) => u.id === ticket.ownerId) && (_jsx("option", { value: String(ticket.ownerId), children: ticket.ownerName || ticket.owner?.displayName || `User #${ticket.ownerId}` }))] }), !ticket.ownerId && (_jsx("button", { type: "button", id: "claim-ticket-btn", className: "btn btn-sm text-white fw-bold px-3 flex-shrink-0", style: { backgroundColor: "#006B3C" }, onClick: handleClaimTicket, disabled: assigning, children: assigning ? "Claiming..." : "Claim Ticket" }))] }), _jsxs("div", { id: "ticket-owner-display", style: {
                                                    fontSize: "0.78rem",
                                                    color: ticket.owner || ticket.ownerName ? "#1F2937" : "#6B7280",
                                                    marginTop: "0.25rem",
                                                }, children: ["Assigned: ", _jsx("strong", { children: ticket.owner?.displayName || ticket.ownerName || "Unassigned" })] }), assignError && (_jsx("div", { className: "text-danger mt-1", style: { fontSize: "0.78rem" }, children: assignError }))] })) : (_jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "Ticket Owner" }), _jsx("div", { id: "ticket-owner-display", style: {
                                                    backgroundColor: "#E9ECEF",
                                                    padding: "0.4rem 0.6rem",
                                                    borderRadius: "6px",
                                                    fontSize: "0.92rem",
                                                    fontWeight: 600,
                                                    color: ticket.owner || ticket.ownerName ? "#1F2937" : "#6B7280",
                                                }, children: ticket.owner?.displayName || ticket.ownerName || "Unassigned" })] })), isStaffOrAdmin ? (_jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { htmlFor: "it-priority-select", style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }, children: "IT Priority:" }), _jsxs("select", { id: "it-priority-select", className: "form-select form-select-sm", value: ticket.itPriority || ticket.requestedPriority, onChange: (e) => handlePriorityChange(e.target.value), disabled: updatingPriority, style: { fontSize: "0.85rem" }, children: [_jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] }), priorityError && (_jsx("div", { className: "text-danger mt-1", style: { fontSize: "0.78rem" }, children: priorityError }))] })) : (_jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block" }, children: "IT Priority" }), _jsx("div", { style: { marginTop: "0.2rem" }, children: renderPriorityBadge(ticket.itPriority || ticket.requestedPriority) })] })), isStaffOrAdmin && (_jsxs("div", { className: "col-12 col-sm-6 col-md-4", children: [_jsx("label", { htmlFor: "next-status-select", style: { fontSize: "0.78rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }, children: "Current Status:" }), _jsx("select", { id: "next-status-select", className: "form-select form-select-sm", value: selectedNextStatus || "", onChange: (e) => handleStatusChange(e.target.value), disabled: updatingStatus || permittedNext.length === 0, style: { fontSize: "0.85rem" }, children: permittedNext.length === 0 ? (_jsxs("option", { value: "", children: [formatStatusDisplay(ticket.status), " (Terminal State)"] })) : (_jsxs(_Fragment, { children: [_jsx("option", { value: "", disabled: true, children: formatStatusDisplay(ticket.status) }), permittedNext.map((st) => (_jsx("option", { value: st, children: formatStatusDisplay(st) }, st)))] })) }), statusError && (_jsx("div", { className: "alert alert-danger py-1 px-2 mt-2 mb-0", style: { fontSize: "0.82rem" }, children: statusError }))] })), isStaffOrAdmin && selectedNextStatus === "Resolved" && (_jsxs("div", { className: "col-12 mt-2 p-3 border rounded", style: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }, children: [_jsxs("label", { className: "fw-bold mb-1 text-success d-block", style: { fontSize: "0.85rem" }, children: ["Resolution Summary ", _jsx("span", { className: "text-danger", children: "*" }), " (Required for Resolved state)"] }), _jsx("textarea", { id: "resolution-summary-input", className: "form-control form-control-sm mb-2", rows: 2, placeholder: "Describe resolution steps taken...", value: resolutionSummaryInput, onChange: (e) => setResolutionSummaryInput(e.target.value) }), _jsxs("div", { className: "d-flex gap-2 justify-content-end", children: [_jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: () => {
                                                            setSelectedNextStatus("");
                                                            setResolutionSummaryInput("");
                                                            setStatusError(null);
                                                        }, disabled: updatingStatus, children: "Cancel" }), _jsx("button", { type: "button", id: "confirm-resolve-btn", className: "btn btn-sm text-white fw-bold", style: { backgroundColor: "#006B3C" }, disabled: updatingStatus || !resolutionSummaryInput.trim(), onClick: handleConfirmResolve, children: updatingStatus ? "Resolving..." : "Confirm Resolve" })] })] }))] }), _jsx("hr", { style: { borderColor: "#E5E7EB" } }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { style: { fontSize: "0.8rem", fontWeight: 700, color: "#5B6573", display: "block", marginBottom: "0.3rem" }, children: "Summary" }), _jsx("div", { style: {
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
                                        }, children: ticket.resolutionSummary ? (_jsxs("div", { style: { display: "flex", gap: "0.5rem", alignItems: "flex-start" }, children: [_jsx("span", { style: { fontWeight: "bold", fontSize: "1.1rem" }, children: "\u2713" }), _jsx("div", { children: ticket.resolutionSummary })] })) : (_jsx("em", { style: { color: "#9CA3AF" }, children: "No resolution summary provided yet. (Pending IT Staff resolution)" })) })] })] })] }), _jsxs("div", { className: "card shadow-sm mb-4", style: { borderRadius: "8px", border: "1px solid #E0E0E0", backgroundColor: "#FFFFFF" }, children: [_jsx("div", { className: "card-header bg-white p-0 border-bottom", children: _jsxs("ul", { className: "nav nav-tabs card-header-tabs m-0 border-0", role: "tablist", style: { paddingLeft: "1rem", paddingTop: "0.5rem" }, children: [_jsx("li", { className: "nav-item", role: "presentation", children: _jsxs("button", { type: "button", id: "tab-btn-attachments", role: "tab", "aria-selected": activeDetailTab === "attachments", className: `nav-link fw-semibold ${activeDetailTab === "attachments" ? "active" : ""}`, onClick: () => setActiveDetailTab("attachments"), style: {
                                            color: activeDetailTab === "attachments" ? "#006B3C" : "#5B6573",
                                            borderBottom: activeDetailTab === "attachments" ? "3px solid #006B3C" : "3px solid transparent",
                                            backgroundColor: activeDetailTab === "attachments" ? "#FFFFFF" : "transparent",
                                            cursor: "pointer",
                                            fontSize: "0.9rem",
                                            padding: "0.6rem 1rem",
                                        }, children: ["\uD83D\uDCCE Attachments", _jsx("span", { className: "badge ms-2", style: {
                                                    backgroundColor: activeAttachments.length >= 5 ? "#FEE2E2" : activeDetailTab === "attachments" ? "#006B3C" : "#E5E7EB",
                                                    color: activeAttachments.length >= 5 ? "#991B1B" : activeDetailTab === "attachments" ? "#FFFFFF" : "#374151",
                                                    fontSize: "0.75rem",
                                                }, children: activeAttachments.length })] }) }), _jsx("li", { className: "nav-item", role: "presentation", children: _jsxs("button", { type: "button", id: "tab-btn-public-comments", role: "tab", "aria-selected": activeDetailTab === "comments", className: `nav-link fw-semibold ${activeDetailTab === "comments" ? "active" : ""}`, onClick: () => setActiveDetailTab("comments"), style: {
                                            color: activeDetailTab === "comments" ? "#006B3C" : "#5B6573",
                                            borderBottom: activeDetailTab === "comments" ? "3px solid #006B3C" : "3px solid transparent",
                                            backgroundColor: activeDetailTab === "comments" ? "#FFFFFF" : "transparent",
                                            cursor: "pointer",
                                            fontSize: "0.9rem",
                                            padding: "0.6rem 1rem",
                                        }, children: ["\uD83D\uDCAC Public Comments", _jsx("span", { className: "badge ms-2", style: {
                                                    backgroundColor: activeDetailTab === "comments" ? "#006B3C" : "#E5E7EB",
                                                    color: activeDetailTab === "comments" ? "#FFFFFF" : "#374151",
                                                    fontSize: "0.75rem",
                                                }, children: comments.length })] }) }), isStaffOrAdmin && (_jsx("li", { className: "nav-item", role: "presentation", children: _jsxs("button", { type: "button", id: "tab-btn-internal-notes", role: "tab", "aria-selected": activeDetailTab === "notes", className: `nav-link fw-semibold ${activeDetailTab === "notes" ? "active" : ""}`, onClick: () => setActiveDetailTab("notes"), style: {
                                            color: activeDetailTab === "notes" ? "#B45309" : "#5B6573",
                                            borderBottom: activeDetailTab === "notes" ? "3px solid #D97706" : "3px solid transparent",
                                            backgroundColor: activeDetailTab === "notes" ? "#FFFBEB" : "transparent",
                                            cursor: "pointer",
                                            fontSize: "0.9rem",
                                            padding: "0.6rem 1rem",
                                        }, children: ["\uD83D\uDD12 Private Internal Notes", _jsx("span", { className: "badge ms-2", style: {
                                                    backgroundColor: activeDetailTab === "notes" ? "#D97706" : "#FEF3C7",
                                                    color: activeDetailTab === "notes" ? "#FFFFFF" : "#92400E",
                                                    fontSize: "0.75rem",
                                                }, children: notes.length })] }) }))] }) }), _jsxs("div", { id: "tab-panel-attachments", role: "tabpanel", style: activeDetailTab === "attachments" ? { padding: "1.5rem" } : hiddenTabPanelStyle, children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsxs("h3", { className: "h6 mb-0 fw-bold text-dark d-flex align-items-center gap-2", children: ["\uD83D\uDCCE Ticket Attachments", _jsxs("span", { className: "badge", style: {
                                                backgroundColor: activeAttachments.length >= 5 ? "#FEE2E2" : "#EAF6EF",
                                                color: activeAttachments.length >= 5 ? "#991B1B" : "#006B3C",
                                                fontSize: "0.78rem",
                                            }, children: [activeAttachments.length, " / 5 Active"] })] }) }), activeAttachments.length === 0 ? (_jsx("div", { className: "p-3 text-center text-muted border rounded bg-light mb-4", style: { fontSize: "0.9rem" }, children: "No active attachments for this ticket yet." })) : (_jsx("div", { className: "d-flex flex-column gap-2 mb-4", children: activeAttachments.map((att) => (_jsxs("div", { className: "d-flex justify-content-between align-items-center p-3 border rounded", style: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }, children: [_jsxs("div", { className: "d-flex align-items-center gap-3 overflow-hidden", children: [_jsx("span", { style: { fontSize: "1.4rem" }, children: att.mimeType.includes("pdf") ? "📄" : "🖼️" }), _jsxs("div", { className: "text-truncate", children: [_jsx("div", { className: "fw-semibold text-dark text-truncate", style: { fontSize: "0.92rem" }, children: att.originalFilename }), _jsxs("div", { className: "text-muted", style: { fontSize: "0.78rem" }, children: [formatFileSize(att.sizeBytes), " \u2022 Uploaded", " ", new Date(att.createdAt).toLocaleDateString("en-US", {
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
                                                                            : "—"] })] }), _jsx("span", { className: "badge bg-secondary", children: "Soft-Removed" })] }), att.deletionReason && (_jsxs("div", { className: "mt-2 text-danger", style: { fontSize: "0.82rem", fontStyle: "italic" }, children: ["Reason: \"", att.deletionReason, "\""] }))] }, att.id))) })] }))] }), _jsxs("div", { id: "tab-panel-public-comments", role: "tabpanel", style: activeDetailTab === "comments" ? { padding: "1.5rem" } : hiddenTabPanelStyle, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h4", { className: "h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2", children: ["Conversation Thread", _jsx("span", { className: "badge", style: { backgroundColor: "#006B3C", color: "#FFFFFF" }, children: comments.length })] }), _jsx("span", { style: { fontSize: "0.78rem", fontWeight: "normal", color: "#0B7A46", backgroundColor: "#EAF6EF", padding: "0.25rem 0.6rem", borderRadius: "4px" }, children: "Visible to Requester & Staff" })] }), _jsx("div", { className: "overflow-auto mb-3 pe-1", style: { maxHeight: "380px", display: "flex", flexDirection: "column", gap: "0.75rem" }, children: comments.length === 0 ? (_jsx("div", { className: "p-3 text-center text-muted border rounded bg-light", style: { fontSize: "0.85rem" }, children: "No public comments yet. Post the first message below." })) : (comments.map((c) => (_jsxs("div", { className: "p-3 border rounded", style: {
                                        backgroundColor: "#F9FAFB",
                                        borderColor: "#E5E7EB",
                                    }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1", children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("strong", { style: { fontSize: "0.88rem", color: "#111827" }, children: c.author?.displayName || `User #${c.authorId}` }), renderRolePill(c.author?.role)] }), _jsx("span", { style: { fontSize: "0.75rem", color: "#6B7280" }, children: new Date(c.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) })] }), _jsx("div", { style: { fontSize: "0.9rem", color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.4 }, children: c.content })] }, c.id)))) }), _jsxs("form", { onSubmit: handleCommentSubmit, className: "pt-2 border-top", children: [commentError && (_jsx("div", { className: "alert alert-danger py-1 px-2 mb-2", style: { fontSize: "0.82rem" }, children: commentError })), _jsxs("div", { className: "mb-2", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#374151", margin: 0 }, children: "Add Public Comment" }), _jsxs("span", { style: { fontSize: "0.75rem", color: commentContent.length > 2000 ? "#B3261E" : "#6B7280" }, children: [commentContent.length, " / 2000"] })] }), _jsx("textarea", { id: "public-comment-input", rows: 3, maxLength: 2000, value: commentContent, onChange: (e) => setCommentContent(e.target.value), placeholder: "Write a message visible to everyone on this ticket...", className: "form-control form-control-sm", disabled: postingComment })] }), _jsx("div", { className: "text-end", children: _jsx("button", { type: "submit", id: "post-public-comment-btn", className: "btn btn-sm text-white fw-bold px-3", style: { backgroundColor: "#006B3C" }, disabled: postingComment || !commentContent.trim() || commentContent.length > 2000, children: postingComment ? "Posting..." : "Post Comment" }) })] })] }), isStaffOrAdmin && (_jsxs("div", { id: "internal-notes-container", role: "tabpanel", style: activeDetailTab === "notes"
                            ? {
                                padding: "1.5rem",
                                backgroundColor: "#FFFBEB",
                                borderRadius: "0 0 8px 8px",
                            }
                            : hiddenTabPanelStyle, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h4", { className: "h6 fw-bold mb-0 d-flex align-items-center gap-2", style: { color: "#92400E" }, children: ["Internal Staff Log", _jsx("span", { className: "badge", style: { backgroundColor: "#D97706", color: "#FFFFFF" }, children: notes.length })] }), _jsx("span", { style: { fontSize: "0.78rem", fontWeight: "bold", color: "#B45309", backgroundColor: "#FEF3C7", padding: "0.25rem 0.6rem", borderRadius: "4px", border: "1px solid #FDE68A" }, children: "Staff Only (Hidden from Requester)" })] }), _jsx("div", { className: "overflow-auto mb-3 pe-1", style: { maxHeight: "380px", display: "flex", flexDirection: "column", gap: "0.75rem" }, children: notes.length === 0 ? (_jsx("div", { className: "p-3 text-center text-muted border rounded", style: { backgroundColor: "#FFFBEB", fontSize: "0.85rem", borderColor: "#FDE68A" }, children: "No internal notes recorded yet." })) : (notes.map((n) => (_jsxs("div", { className: "p-3 border rounded", style: {
                                        backgroundColor: "#FFFFFF",
                                        borderColor: "#FDE68A",
                                    }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1", children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("strong", { style: { fontSize: "0.88rem", color: "#92400E" }, children: n.author?.displayName || `User #${n.authorId}` }), renderRolePill(n.author?.role)] }), _jsx("span", { style: { fontSize: "0.75rem", color: "#78350F" }, children: new Date(n.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) })] }), _jsx("div", { style: { fontSize: "0.9rem", color: "#451A03", whiteSpace: "pre-wrap", lineHeight: 1.4 }, children: n.content })] }, n.id)))) }), _jsxs("form", { onSubmit: handleNoteSubmit, className: "pt-2 border-top", style: { borderColor: "#FDE68A" }, children: [noteError && (_jsx("div", { className: "alert alert-danger py-1 px-2 mb-2", style: { fontSize: "0.82rem" }, children: noteError })), _jsxs("div", { className: "mb-2", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("label", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#92400E", margin: 0 }, children: "Add Internal Operational Note" }), _jsxs("span", { style: { fontSize: "0.75rem", color: noteContent.length > 2000 ? "#B3261E" : "#78350F" }, children: [noteContent.length, " / 2000"] })] }), _jsx("textarea", { id: "internal-note-input", rows: 3, maxLength: 2000, value: noteContent, onChange: (e) => setNoteContent(e.target.value), placeholder: "Add confidential diagnostic details, logs, or hand-off notes...", className: "form-control form-control-sm", disabled: postingNote, style: { borderColor: "#F59E0B" } })] }), _jsx("div", { className: "text-end", children: _jsx("button", { type: "submit", id: "post-internal-note-btn", className: "btn btn-sm text-white fw-bold px-3", style: { backgroundColor: "#D97706", borderColor: "#B45309" }, disabled: postingNote || !noteContent.trim() || noteContent.length > 2000, children: postingNote ? "Saving Note..." : "Post Internal Note" }) })] })] }))] }), targetAttachment && (_jsx("div", { className: "modal d-block", tabIndex: -1, style: { backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content shadow", children: [_jsxs("div", { className: "modal-header bg-danger text-white py-2 px-3", children: [_jsx("h5", { className: "modal-title h6 fw-bold mb-0", children: "Confirm Attachment Soft-Removal" }), _jsx("button", { type: "button", className: "btn-close btn-close-white", onClick: () => setTargetAttachment(null) })] }), _jsxs("div", { className: "modal-body p-3", children: [_jsxs("p", { className: "mb-2", style: { fontSize: "0.9rem" }, children: ["Are you sure you want to soft-remove ", _jsxs("strong", { children: ["\"", targetAttachment.originalFilename, "\""] }), "?"] }), _jsx("p", { className: "text-muted mb-3", style: { fontSize: "0.82rem" }, children: "The file binary will be removed from download access immediately. A tombstone record will be retained for audit purposes." }), removalError && (_jsx("div", { className: "alert alert-danger py-2 px-3 mb-3", style: { fontSize: "0.85rem" }, children: removalError })), _jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsxs("label", { style: { fontSize: "0.82rem", fontWeight: 700, color: "#374151", margin: 0 }, children: ["Reason for Removal ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("span", { style: { fontSize: "0.75rem", color: removalReason.trim().length > 255 ? "#B3261E" : "#6B7280" }, children: [removalReason.trim().length, " / 255 characters"] })] }), _jsx("textarea", { rows: 3, maxLength: 255, value: removalReason, onChange: (e) => {
                                                    setRemovalReason(e.target.value);
                                                    setRemovalError(null);
                                                }, placeholder: "Enter mandatory reason for removing this attachment...", className: "form-control form-control-sm" })] })] }), _jsxs("div", { className: "modal-footer py-2 px-3 bg-light", children: [_jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setTargetAttachment(null), disabled: removing, children: "Cancel" }), _jsx("button", { type: "button", className: "btn btn-danger btn-sm fw-bold", onClick: handleConfirmSoftRemove, disabled: removing || !removalReason.trim() || removalReason.trim().length > 255, children: removing ? "Removing..." : "Confirm Removal" })] })] }) }) }))] }));
}
