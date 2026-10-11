import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { fetchActionsTaken, createActionTaken, updateActionTaken, } from "./api.js";
export default function ActionsTaken({ ticketId, isStaffOrAdmin, currentUser, initialActions, onActionAdded, onActionsLoaded, }) {
    const [actions, setActions] = useState(initialActions || []);
    const [loading, setLoading] = useState(!initialActions);
    const [fetchError, setFetchError] = useState(null);
    // Create Mode State
    const [isCreating, setIsCreating] = useState(false);
    const [description, setDescription] = useState("");
    const [result, setResult] = useState("");
    const [followUpRequired, setFollowUpRequired] = useState(false);
    const [followUpNote, setFollowUpNote] = useState("");
    const [attachmentNotes, setAttachmentNotes] = useState("");
    const [actionDateTime, setActionDateTime] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    // Edit Mode State
    const [editingActionId, setEditingActionId] = useState(null);
    const [editDescription, setEditDescription] = useState("");
    const [editResult, setEditResult] = useState("");
    const [editFollowUpRequired, setEditFollowUpRequired] = useState(false);
    const [editFollowUpNote, setEditFollowUpNote] = useState("");
    const [editAttachmentNotes, setEditAttachmentNotes] = useState("");
    const [editActionDateTime, setEditActionDateTime] = useState("");
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState(null);
    const loadActions = async () => {
        try {
            setLoading(true);
            setFetchError(null);
            const data = await fetchActionsTaken(ticketId);
            setActions(data);
            if (onActionsLoaded) {
                onActionsLoaded(data);
            }
        }
        catch (err) {
            console.error("Failed to load actions taken:", err);
            setFetchError(err?.message || "Failed to load actions taken.");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (Array.isArray(initialActions)) {
            setActions(initialActions);
            setLoading(false);
            if (onActionsLoaded) {
                onActionsLoaded(initialActions);
            }
        }
        else {
            loadActions();
        }
    }, [ticketId, initialActions]);
    const resetCreateForm = () => {
        setDescription("");
        setResult("");
        setFollowUpRequired(false);
        setFollowUpNote("");
        setAttachmentNotes("");
        setActionDateTime("");
        setFormError(null);
        setIsCreating(false);
    };
    const handleStartCreate = () => {
        resetCreateForm();
        setEditingActionId(null);
        setEditError(null);
        setIsCreating(true);
    };
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        const trimmedDesc = description.trim();
        if (!trimmedDesc) {
            setFormError("Action description is required.");
            return;
        }
        const trimmedResult = result.trim();
        if (!trimmedResult) {
            setFormError("Action result is required.");
            return;
        }
        const trimmedFollowUp = followUpNote.trim();
        if (followUpRequired && !trimmedFollowUp) {
            setFormError("Follow-up note is required when follow-up is needed.");
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                description: trimmedDesc,
                result: trimmedResult,
                followUpRequired,
                followUpNote: followUpRequired ? trimmedFollowUp : null,
                attachmentNotes: attachmentNotes.trim() || null,
                actionDateTime: actionDateTime ? new Date(actionDateTime).toISOString() : undefined,
            };
            const newAction = await createActionTaken(ticketId, payload);
            setActions((prev) => [...prev, newAction]);
            resetCreateForm();
            if (onActionAdded) {
                onActionAdded(newAction);
            }
        }
        catch (err) {
            console.error("Error creating action taken:", err);
            setFormError(err?.data?.error?.message || err?.data?.error || err?.message || "Failed to save action taken.");
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleStartEdit = (action) => {
        setIsCreating(false);
        setEditingActionId(action.id);
        setEditDescription(action.description);
        setEditResult(action.result);
        setEditFollowUpRequired(action.followUpRequired);
        setEditFollowUpNote(action.followUpNote || "");
        setEditAttachmentNotes(action.attachmentNotes || "");
        try {
            const d = new Date(action.actionDateTime);
            const pad = (n) => String(n).padStart(2, "0");
            const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setEditActionDateTime(localIso);
        }
        catch {
            setEditActionDateTime("");
        }
        setEditError(null);
    };
    const handleCancelEdit = () => {
        setEditingActionId(null);
        setEditError(null);
    };
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingActionId)
            return;
        setEditError(null);
        const trimmedDesc = editDescription.trim();
        if (!trimmedDesc) {
            setEditError("Action description cannot be empty.");
            return;
        }
        const trimmedResult = editResult.trim();
        if (!trimmedResult) {
            setEditError("Action result cannot be empty.");
            return;
        }
        const trimmedFollowUp = editFollowUpNote.trim();
        if (editFollowUpRequired && !trimmedFollowUp) {
            setEditError("Follow-up note is required when follow-up is needed.");
            return;
        }
        setEditSubmitting(true);
        try {
            const payload = {
                description: trimmedDesc,
                result: trimmedResult,
                followUpRequired: editFollowUpRequired,
                followUpNote: editFollowUpRequired ? trimmedFollowUp : null,
                attachmentNotes: editAttachmentNotes.trim() || null,
                actionDateTime: editActionDateTime ? new Date(editActionDateTime).toISOString() : undefined,
            };
            const updated = await updateActionTaken(ticketId, editingActionId, payload);
            setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setEditingActionId(null);
        }
        catch (err) {
            console.error("Error updating action taken:", err);
            setEditError(err?.data?.error?.message || err?.data?.error || err?.message || "Failed to update action taken.");
        }
        finally {
            setEditSubmitting(false);
        }
    };
    const canEditAction = (action) => {
        if (!isStaffOrAdmin)
            return false;
        if (currentUser.role === "ADMINISTRATOR")
            return true;
        return action.performedById === currentUser.id;
    };
    const formatTimestamp = (iso) => {
        try {
            const d = new Date(iso);
            return d.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        catch {
            return iso;
        }
    };
    return (_jsxs("div", { className: "card border-0 shadow-sm mb-4", id: "actions-taken-section", style: {
            borderRadius: "10px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
        }, children: [_jsx("style", { children: `
        /* Responsive Actions Taken Table <-> Card Transformation */
        @media (max-width: 767px) {
          #actions-taken-list-container {
            overflow-x: visible !important;
          }

          #actions-taken-table,
          #actions-taken-table thead,
          #actions-taken-table tbody,
          #actions-taken-table th,
          #actions-taken-table td,
          #actions-taken-table tr {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          #actions-taken-table {
            border-collapse: separate !important;
            table-layout: auto !important;
          }

          #actions-taken-table thead {
            display: none !important;
          }

          #actions-taken-table tbody {
            display: flex !important;
            flex-direction: column !important;
            gap: 1rem !important;
          }

          #actions-taken-table tbody tr {
            margin-bottom: 0 !important;
            background-color: #FFFFFF !important;
            border: 1px solid #E2E8F0 !important;
            border-radius: 8px !important;
            padding: 1.1rem !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
            transition: box-shadow 0.2s ease, border-color 0.2s ease !important;
          }

          #actions-taken-table tbody tr:hover {
            background-color: #FFFFFF !important;
            border-color: #CBD5E1 !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08) !important;
          }

          #actions-taken-table tbody td {
            padding: 0 !important;
            border: none !important;
            display: block !important;
            text-align: left !important;
            width: 100% !important;
            background-color: transparent !important;
            box-shadow: none !important;
          }

          #actions-taken-table tbody tr:hover td,
          #actions-taken-table tbody tr td:hover {
            background-color: transparent !important;
          }

          #actions-taken-table tbody td[data-label]::before {
            content: attr(data-label);
            display: block !important;
            font-size: 0.72rem;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 0.25rem;
          }

          .btn-mobile-edit {
            width: 100% !important;
            min-height: 44px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 0.88rem !important;
            font-weight: 600 !important;
            margin-top: 0.25rem;
          }

          .btn-mobile-touch {
            min-height: 44px !important;
            min-width: 44px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }

          .action-form-actions {
            flex-direction: column-reverse !important;
            width: 100% !important;
          }

          .action-form-actions button {
            width: 100% !important;
          }

          #action-taken-create-form-container .form-control,
          #action-taken-edit-form-container .form-control {
            font-size: 16px !important;
          }
        }
      ` }), _jsxs("div", { className: "card-header bg-transparent d-flex justify-content-between align-items-center flex-wrap gap-2 py-3", style: { borderBottom: "1px solid #E2E8F0" }, children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsxs("h3", { className: "h6 mb-0 fw-bold text-dark d-flex align-items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDEE0\uFE0F" }), " Actions Taken"] }), _jsx("span", { className: "badge rounded-pill", id: "actions-taken-count-badge", style: {
                                    backgroundColor: "#D8F3DC",
                                    color: "#1B4332",
                                    fontWeight: 600,
                                    fontSize: "0.8rem",
                                }, children: actions.length })] }), isStaffOrAdmin && !isCreating && !editingActionId && (_jsxs("button", { type: "button", className: "btn btn-sm text-white fw-semibold d-flex align-items-center gap-1 btn-mobile-touch", id: "btn-add-action-taken", onClick: handleStartCreate, style: {
                            backgroundColor: "#1B4332",
                            borderColor: "#1B4332",
                            borderRadius: "6px",
                        }, children: [_jsx("span", { children: "+" }), " Add Action Taken"] }))] }), _jsxs("div", { className: "card-body p-3 p-md-4", children: [fetchError && (_jsx("div", { className: "alert alert-danger mb-3 py-2", role: "alert", children: fetchError })), isCreating && (_jsxs("div", { className: "p-3 mb-4 rounded border", id: "action-taken-create-form-container", style: { backgroundColor: "#F8FAF8", borderColor: "#D8F3DC" }, children: [_jsx("h4", { className: "h6 fw-bold mb-3", style: { color: "#1B4332" }, children: "Record Action Taken" }), formError && (_jsx("div", { className: "alert alert-danger py-2 mb-3", role: "alert", id: "action-taken-form-error", children: formError })), _jsxs("form", { id: "action-taken-create-form", onSubmit: handleCreateSubmit, noValidate: true, children: [_jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "input-action-date-time", className: "form-label small fw-semibold text-secondary", children: "Action Date / Time (Optional, defaults to now)" }), _jsx("input", { type: "datetime-local", className: "form-control form-control-sm", id: "input-action-date-time", value: actionDateTime, onChange: (e) => setActionDateTime(e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "input-action-attachment-notes", className: "form-label small fw-semibold text-secondary", children: "Attachment Notes (Optional file hints)" }), _jsx("input", { type: "text", className: "form-control form-control-sm", id: "input-action-attachment-notes", placeholder: "e.g. switch-log.txt, error-trace.png", value: attachmentNotes, onChange: (e) => setAttachmentNotes(e.target.value) })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "input-action-description", className: "form-label small fw-semibold text-secondary", children: ["Action Description ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("textarea", { className: "form-control form-control-sm", id: "input-action-description", rows: 2, placeholder: "Describe technical action performed (e.g. checked AP radio channel, restarted daemon)...", required: true, value: description, onChange: (e) => setDescription(e.target.value) })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "input-action-result", className: "form-label small fw-semibold text-secondary", children: ["Result ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("textarea", { className: "form-control form-control-sm", id: "input-action-result", rows: 2, placeholder: "Outcome, observations, or diagnostic findings...", required: true, value: result, onChange: (e) => setResult(e.target.value) })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "input-action-followup-required", checked: followUpRequired, onChange: (e) => setFollowUpRequired(e.target.checked) }), _jsx("label", { className: "form-check-label small fw-semibold text-secondary", htmlFor: "input-action-followup-required", children: "Follow-Up Required?" })] }) }), followUpRequired && (_jsxs("div", { className: "col-12", id: "action-followup-note-group", children: [_jsxs("label", { htmlFor: "input-action-followup-note", className: "form-label small fw-semibold text-warning-emphasis", children: ["Follow-up Note ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("textarea", { className: "form-control form-control-sm", id: "input-action-followup-note", rows: 2, placeholder: "Specify follow-up steps, testing window, or required monitoring...", required: followUpRequired, value: followUpNote, onChange: (e) => setFollowUpNote(e.target.value) })] }))] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-3 action-form-actions", children: [_jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary btn-mobile-touch", id: "btn-cancel-action-taken", onClick: resetCreateForm, disabled: submitting, children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-sm text-white fw-semibold btn-mobile-touch", id: "btn-save-action-taken", disabled: submitting, style: { backgroundColor: "#1B4332", borderColor: "#1B4332" }, children: submitting ? "Saving..." : "Save Action Taken" })] })] })] })), loading && (_jsxs("div", { className: "text-center py-4 text-muted small", id: "actions-taken-loading", children: [_jsx("div", { className: "spinner-border spinner-border-sm text-success me-2", role: "status" }), "Loading actions taken..."] })), !loading && actions.length === 0 && !isCreating && (_jsxs("div", { className: "text-center py-4 rounded", id: "actions-taken-empty", style: { backgroundColor: "#F8FAF8", border: "1px dashed #E2E8F0" }, children: [_jsx("p", { className: "text-muted small mb-0", children: "No actions taken recorded yet." }), isStaffOrAdmin && (_jsx("small", { className: "text-secondary d-block mt-1", children: "Click \"+ Add Action Taken\" above to document work done on this ticket." }))] })), editingActionId && (_jsxs("div", { className: "p-3 mb-4 rounded border", id: "action-taken-edit-form-container", style: {
                            backgroundColor: "#F8FAF8",
                            borderColor: "#C8E6C9",
                            width: "100%",
                            boxSizing: "border-box",
                        }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h4", { className: "h6 fw-bold mb-0 d-flex align-items-center gap-2", style: { color: "#1B4332" }, children: [_jsx("span", { children: "\u270F\uFE0F" }), " Edit Action Taken"] }), _jsx("span", { className: "badge", style: {
                                            backgroundColor: "#E0F2FE",
                                            color: "#0369A1",
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                        }, children: "Editing Mode" })] }), editError && (_jsx("div", { className: "alert alert-danger py-2 mb-3 small", role: "alert", id: "action-taken-edit-error", children: editError })), _jsxs("form", { id: `action-taken-edit-form-${editingActionId}`, onSubmit: handleEditSubmit, noValidate: true, style: { width: "100%" }, children: [_jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "input-edit-action-date-time", className: "form-label small fw-semibold text-secondary", children: "Action Date / Time" }), _jsx("input", { type: "datetime-local", className: "form-control form-control-sm", id: "input-edit-action-date-time", value: editActionDateTime, onChange: (e) => setEditActionDateTime(e.target.value) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "input-edit-action-attachment-notes", className: "form-label small fw-semibold text-secondary", children: "Attachment Notes (Optional file hints)" }), _jsx("input", { type: "text", className: "form-control form-control-sm", id: "input-edit-action-attachment-notes", placeholder: "e.g. switch-log.txt, error-trace.png", value: editAttachmentNotes, onChange: (e) => setEditAttachmentNotes(e.target.value) })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "input-edit-action-description", className: "form-label small fw-semibold text-secondary", children: ["Action Description ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("textarea", { className: "form-control form-control-sm", id: "input-edit-action-description", rows: 2, placeholder: "Describe technical action performed...", required: true, value: editDescription, onChange: (e) => setEditDescription(e.target.value) })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "input-edit-action-result", className: "form-label small fw-semibold text-secondary", children: ["Result ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("textarea", { className: "form-control form-control-sm", id: "input-edit-action-result", rows: 2, placeholder: "Outcome, observations, or diagnostic findings...", required: true, value: editResult, onChange: (e) => setEditResult(e.target.value) })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "input-edit-action-followup-required", checked: editFollowUpRequired, onChange: (e) => setEditFollowUpRequired(e.target.checked) }), _jsx("label", { className: "form-check-label small fw-semibold text-secondary", htmlFor: "input-edit-action-followup-required", children: "Follow-Up Required?" })] }) }), editFollowUpRequired && (_jsxs("div", { className: "col-12", id: "edit-action-followup-note-group", children: [_jsxs("label", { htmlFor: "input-edit-action-followup-note", className: "form-label small fw-semibold text-warning-emphasis", children: ["Follow-up Note ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("textarea", { className: "form-control form-control-sm", id: "input-edit-action-followup-note", rows: 2, placeholder: "Specify follow-up steps, testing window, or required monitoring...", required: editFollowUpRequired, value: editFollowUpNote, onChange: (e) => setEditFollowUpNote(e.target.value) })] }))] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-3 action-form-actions", children: [_jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary btn-mobile-touch", id: "btn-cancel-edit-action-taken", onClick: handleCancelEdit, disabled: editSubmitting, children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-sm text-white fw-semibold btn-mobile-touch", id: "btn-update-action-taken", disabled: editSubmitting, style: { backgroundColor: "#1B4332", borderColor: "#1B4332" }, children: editSubmitting ? "Updating..." : "Save Changes" })] })] })] })), !loading && actions.length > 0 && !editingActionId && (_jsx("div", { className: "table-responsive", id: "actions-taken-list-container", children: _jsxs("table", { className: "table table-hover align-middle mb-0", id: "actions-taken-table", style: {
                                fontSize: "0.84rem",
                                width: "100%",
                                tableLayout: "fixed",
                            }, children: [_jsx("thead", { className: "table-light text-secondary small", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", style: { width: "13%" }, children: "Date / Time" }), _jsx("th", { scope: "col", style: { width: "14%" }, children: "Performed By" }), _jsx("th", { scope: "col", style: { width: isStaffOrAdmin ? "23%" : "27%" }, children: "Action Description" }), _jsx("th", { scope: "col", style: { width: isStaffOrAdmin ? "21%" : "24%" }, children: "Result" }), _jsx("th", { scope: "col", style: { width: "10%" }, children: "Follow-up" }), _jsx("th", { scope: "col", style: { width: isStaffOrAdmin ? "11%" : "12%" }, children: "Attachment Notes" }), isStaffOrAdmin && _jsx("th", { scope: "col", style: { width: "8%", textAlign: "center" }, children: "Actions" })] }) }), _jsx("tbody", { children: actions.map((action) => (_jsxs("tr", { id: `action-row-${action.id}`, children: [_jsx("td", { "data-label": "Date / Time", className: "text-secondary small font-monospace", style: { wordBreak: "break-word" }, children: _jsx("div", { children: formatTimestamp(action.actionDateTime) }) }), _jsx("td", { "data-label": "Performed By", style: { wordBreak: "break-word" }, children: _jsxs("div", { className: "d-flex align-items-center justify-content-between justify-content-md-start flex-wrap gap-2", children: [_jsx("span", { className: "fw-semibold text-dark", children: action.performedBy?.displayName || `User #${action.performedById}` }), _jsx("span", { className: "badge", style: {
                                                                backgroundColor: action.performedBy?.role === "ADMINISTRATOR" ? "#FEF3C7" : "#E0F2FE",
                                                                color: action.performedBy?.role === "ADMINISTRATOR" ? "#92400E" : "#0369A1",
                                                                fontSize: "0.7rem",
                                                            }, children: action.performedBy?.role || "IT_STAFF" })] }) }), _jsx("td", { "data-label": "Action Description", className: "text-wrap", style: { wordBreak: "break-word", overflowWrap: "anywhere" }, children: _jsx("div", { children: action.description }) }), _jsx("td", { "data-label": "Result", className: "text-wrap", style: { wordBreak: "break-word", overflowWrap: "anywhere" }, children: _jsx("div", { children: action.result }) }), _jsx("td", { "data-label": "Follow-up", style: { wordBreak: "break-word" }, children: _jsx("div", { children: action.followUpRequired ? (_jsxs("div", { children: [_jsx("span", { className: "badge bg-warning text-dark mb-1", children: "Required" }), action.followUpNote && (_jsx("div", { className: "small text-muted p-2 rounded bg-light border mt-1", style: { fontSize: "0.75rem", wordBreak: "break-word" }, children: action.followUpNote }))] })) : (_jsx("span", { className: "badge bg-light text-secondary border", children: "No" })) }) }), _jsx("td", { "data-label": "Attachment Notes", className: "small text-muted", style: { wordBreak: "break-word", overflowWrap: "anywhere" }, children: _jsx("div", { children: action.attachmentNotes ? (_jsxs("span", { children: ["\uD83D\uDCCE ", action.attachmentNotes] })) : (_jsx("span", { className: "text-secondary opacity-50", children: "\u2014" })) }) }), isStaffOrAdmin && (_jsx("td", { style: { textAlign: "center" }, children: canEditAction(action) ? (_jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm py-1 px-3 btn-mobile-edit", id: `btn-edit-action-${action.id}`, onClick: () => handleStartEdit(action), title: "Edit Action Taken", style: { fontSize: "0.78rem" }, children: "Edit" })) : (_jsx("span", { className: "text-muted d-none d-md-inline", style: { fontSize: "0.75rem" }, children: "\u2014" })) }))] }, action.id))) })] }) }))] })] }));
}
