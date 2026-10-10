import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import {
  ActionTakenItem,
  fetchActionsTaken,
  createActionTaken,
  updateActionTaken,
} from "./api.js";

interface ActionsTakenProps {
  ticketId: string;
  isStaffOrAdmin: boolean;
  currentUser: {
    id: number;
    displayName: string;
    role?: string;
  };
  initialActions?: ActionTakenItem[];
  onActionAdded?: (action: ActionTakenItem) => void;
}

export default function ActionsTaken({
  ticketId,
  isStaffOrAdmin,
  currentUser,
  initialActions,
  onActionAdded,
}: ActionsTakenProps) {
  const [actions, setActions] = useState<ActionTakenItem[]>(initialActions || []);
  const [loading, setLoading] = useState<boolean>(!initialActions);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Create Mode State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");
  const [actionDateTime, setActionDateTime] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Mode State
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");
  const [editResult, setEditResult] = useState<string>("");
  const [editFollowUpRequired, setEditFollowUpRequired] = useState<boolean>(false);
  const [editFollowUpNote, setEditFollowUpNote] = useState<string>("");
  const [editAttachmentNotes, setEditAttachmentNotes] = useState<string>("");
  const [editActionDateTime, setEditActionDateTime] = useState<string>("");
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadActions = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await fetchActionsTaken(ticketId);
      setActions(data);
    } catch (err: any) {
      console.error("Failed to load actions taken:", err);
      setFetchError(err?.message || "Failed to load actions taken.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Array.isArray(initialActions)) {
      setActions(initialActions);
      setLoading(false);
    } else {
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

  const handleCreateSubmit = async (e: FormEvent) => {
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
    } catch (err: any) {
      console.error("Error creating action taken:", err);
      setFormError(err?.data?.error?.message || err?.data?.error || err?.message || "Failed to save action taken.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (action: ActionTakenItem) => {
    setIsCreating(false);
    setEditingActionId(action.id);
    setEditDescription(action.description);
    setEditResult(action.result);
    setEditFollowUpRequired(action.followUpRequired);
    setEditFollowUpNote(action.followUpNote || "");
    setEditAttachmentNotes(action.attachmentNotes || "");
    try {
      const d = new Date(action.actionDateTime);
      const pad = (n: number) => String(n).padStart(2, "0");
      const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setEditActionDateTime(localIso);
    } catch {
      setEditActionDateTime("");
    }
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingActionId(null);
    setEditError(null);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingActionId) return;
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
    } catch (err: any) {
      console.error("Error updating action taken:", err);
      setEditError(err?.data?.error?.message || err?.data?.error || err?.message || "Failed to update action taken.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const canEditAction = (action: ActionTakenItem): boolean => {
    if (!isStaffOrAdmin) return false;
    if (currentUser.role === "ADMINISTRATOR") return true;
    return action.performedById === currentUser.id;
  };

  const formatTimestamp = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="card border-0 shadow-sm mb-4"
      id="actions-taken-section"
      style={{
        borderRadius: "10px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
      }}
    >
      <style>{`
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
      `}</style>

      <div
        className="card-header bg-transparent d-flex justify-content-between align-items-center flex-wrap gap-2 py-3"
        style={{ borderBottom: "1px solid #E2E8F0" }}
      >
        <div className="d-flex align-items-center gap-2">
          <h3 className="h6 mb-0 fw-bold text-dark d-flex align-items-center gap-2">
            <span>🛠️</span> Actions Taken
          </h3>
          <span
            className="badge rounded-pill"
            id="actions-taken-count-badge"
            style={{
              backgroundColor: "#D8F3DC",
              color: "#1B4332",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            {actions.length}
          </span>
        </div>

        {isStaffOrAdmin && !isCreating && !editingActionId && (
          <button
            type="button"
            className="btn btn-sm text-white fw-semibold d-flex align-items-center gap-1 btn-mobile-touch"
            id="btn-add-action-taken"
            onClick={handleStartCreate}
            style={{
              backgroundColor: "#1B4332",
              borderColor: "#1B4332",
              borderRadius: "6px",
            }}
          >
            <span>+</span> Add Action Taken
          </button>
        )}
      </div>

      <div className="card-body p-3 p-md-4">
        {fetchError && (
          <div className="alert alert-danger mb-3 py-2" role="alert">
            {fetchError}
          </div>
        )}

        {/* Create Mode Form */}
        {isCreating && (
          <div
            className="p-3 mb-4 rounded border"
            id="action-taken-create-form-container"
            style={{ backgroundColor: "#F8FAF8", borderColor: "#D8F3DC" }}
          >
            <h4 className="h6 fw-bold mb-3" style={{ color: "#1B4332" }}>
              Record Action Taken
            </h4>
            {formError && (
              <div
                className="alert alert-danger py-2 mb-3"
                role="alert"
                id="action-taken-form-error"
              >
                {formError}
              </div>
            )}
            <form id="action-taken-create-form" onSubmit={handleCreateSubmit} noValidate>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label htmlFor="input-action-date-time" className="form-label small fw-semibold text-secondary">
                    Action Date / Time (Optional, defaults to now)
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    id="input-action-date-time"
                    value={actionDateTime}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setActionDateTime(e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="input-action-attachment-notes" className="form-label small fw-semibold text-secondary">
                    Attachment Notes (Optional file hints)
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    id="input-action-attachment-notes"
                    placeholder="e.g. switch-log.txt, error-trace.png"
                    value={attachmentNotes}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setAttachmentNotes(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label htmlFor="input-action-description" className="form-label small fw-semibold text-secondary">
                    Action Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    id="input-action-description"
                    rows={2}
                    placeholder="Describe technical action performed (e.g. checked AP radio channel, restarted daemon)..."
                    required
                    value={description}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label htmlFor="input-action-result" className="form-label small fw-semibold text-secondary">
                    Result <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    id="input-action-result"
                    rows={2}
                    placeholder="Outcome, observations, or diagnostic findings..."
                    required
                    value={result}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setResult(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="input-action-followup-required"
                      checked={followUpRequired}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFollowUpRequired(e.target.checked)}
                    />
                    <label className="form-check-label small fw-semibold text-secondary" htmlFor="input-action-followup-required">
                      Follow-Up Required?
                    </label>
                  </div>
                </div>

                {followUpRequired && (
                  <div className="col-12" id="action-followup-note-group">
                    <label htmlFor="input-action-followup-note" className="form-label small fw-semibold text-warning-emphasis">
                      Follow-up Note <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      id="input-action-followup-note"
                      rows={2}
                      placeholder="Specify follow-up steps, testing window, or required monitoring..."
                      required={followUpRequired}
                      value={followUpNote}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFollowUpNote(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3 action-form-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary btn-mobile-touch"
                  id="btn-cancel-action-taken"
                  onClick={resetCreateForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white fw-semibold btn-mobile-touch"
                  id="btn-save-action-taken"
                  disabled={submitting}
                  style={{ backgroundColor: "#1B4332", borderColor: "#1B4332" }}
                >
                  {submitting ? "Saving..." : "Save Action Taken"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4 text-muted small" id="actions-taken-loading">
            <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
            Loading actions taken...
          </div>
        )}

        {/* Empty State */}
        {!loading && actions.length === 0 && !isCreating && (
          <div
            className="text-center py-4 rounded"
            id="actions-taken-empty"
            style={{ backgroundColor: "#F8FAF8", border: "1px dashed #E2E8F0" }}
          >
            <p className="text-muted small mb-0">No actions taken recorded yet.</p>
            {isStaffOrAdmin && (
              <small className="text-secondary d-block mt-1">
                Click "+ Add Action Taken" above to document work done on this ticket.
              </small>
            )}
          </div>
        )}

        {/* Edit Mode Form */}
        {editingActionId && (
          <div
            className="p-3 mb-4 rounded border"
            id="action-taken-edit-form-container"
            style={{
              backgroundColor: "#F8FAF8",
              borderColor: "#C8E6C9",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="h6 fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: "#1B4332" }}>
                <span>✏️</span> Edit Action Taken
              </h4>
              <span
                className="badge"
                style={{
                  backgroundColor: "#E0F2FE",
                  color: "#0369A1",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Editing Mode
              </span>
            </div>

            {editError && (
              <div
                className="alert alert-danger py-2 mb-3 small"
                role="alert"
                id="action-taken-edit-error"
              >
                {editError}
              </div>
            )}

            <form
              id={`action-taken-edit-form-${editingActionId}`}
              onSubmit={handleEditSubmit}
              noValidate
              style={{ width: "100%" }}
            >
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label htmlFor="input-edit-action-date-time" className="form-label small fw-semibold text-secondary">
                    Action Date / Time
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    id="input-edit-action-date-time"
                    value={editActionDateTime}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditActionDateTime(e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="input-edit-action-attachment-notes" className="form-label small fw-semibold text-secondary">
                    Attachment Notes (Optional file hints)
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    id="input-edit-action-attachment-notes"
                    placeholder="e.g. switch-log.txt, error-trace.png"
                    value={editAttachmentNotes}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditAttachmentNotes(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label htmlFor="input-edit-action-description" className="form-label small fw-semibold text-secondary">
                    Action Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    id="input-edit-action-description"
                    rows={2}
                    placeholder="Describe technical action performed..."
                    required
                    value={editDescription}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label htmlFor="input-edit-action-result" className="form-label small fw-semibold text-secondary">
                    Result <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    id="input-edit-action-result"
                    rows={2}
                    placeholder="Outcome, observations, or diagnostic findings..."
                    required
                    value={editResult}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditResult(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="input-edit-action-followup-required"
                      checked={editFollowUpRequired}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditFollowUpRequired(e.target.checked)}
                    />
                    <label className="form-check-label small fw-semibold text-secondary" htmlFor="input-edit-action-followup-required">
                      Follow-Up Required?
                    </label>
                  </div>
                </div>

                {editFollowUpRequired && (
                  <div className="col-12" id="edit-action-followup-note-group">
                    <label htmlFor="input-edit-action-followup-note" className="form-label small fw-semibold text-warning-emphasis">
                      Follow-up Note <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      id="input-edit-action-followup-note"
                      rows={2}
                      placeholder="Specify follow-up steps, testing window, or required monitoring..."
                      required={editFollowUpRequired}
                      value={editFollowUpNote}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditFollowUpNote(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3 action-form-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary btn-mobile-touch"
                  id="btn-cancel-edit-action-taken"
                  onClick={handleCancelEdit}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white fw-semibold btn-mobile-touch"
                  id="btn-update-action-taken"
                  disabled={editSubmitting}
                  style={{ backgroundColor: "#1B4332", borderColor: "#1B4332" }}
                >
                  {editSubmitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List of Actions Taken */}
        {!loading && actions.length > 0 && !editingActionId && (
          <div className="table-responsive" id="actions-taken-list-container">
            <table
              className="table table-hover align-middle mb-0"
              id="actions-taken-table"
              style={{
                fontSize: "0.84rem",
                width: "100%",
                tableLayout: "fixed",
              }}
            >
              <thead className="table-light text-secondary small">
                <tr>
                  <th scope="col" style={{ width: "13%" }}>Date / Time</th>
                  <th scope="col" style={{ width: "14%" }}>Performed By</th>
                  <th scope="col" style={{ width: isStaffOrAdmin ? "23%" : "27%" }}>Action Description</th>
                  <th scope="col" style={{ width: isStaffOrAdmin ? "21%" : "24%" }}>Result</th>
                  <th scope="col" style={{ width: "10%" }}>Follow-up</th>
                  <th scope="col" style={{ width: isStaffOrAdmin ? "11%" : "12%" }}>Attachment Notes</th>
                  {isStaffOrAdmin && <th scope="col" style={{ width: "8%", textAlign: "center" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.id} id={`action-row-${action.id}`}>
                    <td data-label="Date / Time" className="text-secondary small font-monospace" style={{ wordBreak: "break-word" }}>
                      <div>{formatTimestamp(action.actionDateTime)}</div>
                    </td>
                    <td data-label="Performed By" style={{ wordBreak: "break-word" }}>
                      <div className="d-flex align-items-center justify-content-between justify-content-md-start flex-wrap gap-2">
                        <span className="fw-semibold text-dark">
                          {action.performedBy?.displayName || `User #${action.performedById}`}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              action.performedBy?.role === "ADMINISTRATOR" ? "#FEF3C7" : "#E0F2FE",
                            color:
                              action.performedBy?.role === "ADMINISTRATOR" ? "#92400E" : "#0369A1",
                            fontSize: "0.7rem",
                          }}
                        >
                          {action.performedBy?.role || "IT_STAFF"}
                        </span>
                      </div>
                    </td>
                    <td data-label="Action Description" className="text-wrap" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      <div>{action.description}</div>
                    </td>
                    <td data-label="Result" className="text-wrap" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      <div>{action.result}</div>
                    </td>
                    <td data-label="Follow-up" style={{ wordBreak: "break-word" }}>
                      <div>
                        {action.followUpRequired ? (
                          <div>
                            <span className="badge bg-warning text-dark mb-1">Required</span>
                            {action.followUpNote && (
                              <div
                                className="small text-muted p-2 rounded bg-light border mt-1"
                                style={{ fontSize: "0.75rem", wordBreak: "break-word" }}
                              >
                                {action.followUpNote}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="badge bg-light text-secondary border">No</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Attachment Notes" className="small text-muted" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      <div>
                        {action.attachmentNotes ? (
                          <span>📎 {action.attachmentNotes}</span>
                        ) : (
                          <span className="text-secondary opacity-50">—</span>
                        )}
                      </div>
                    </td>
                    {isStaffOrAdmin && (
                      <td style={{ textAlign: "center" }}>
                        {canEditAction(action) ? (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm py-1 px-3 btn-mobile-edit"
                            id={`btn-edit-action-${action.id}`}
                            onClick={() => handleStartEdit(action)}
                            title="Edit Action Taken"
                            style={{ fontSize: "0.78rem" }}
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-muted d-none d-md-inline" style={{ fontSize: "0.75rem" }}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
