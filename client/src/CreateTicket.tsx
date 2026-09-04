import React, { useState, useEffect } from "react";
import {
  Category,
  RelatedSystem,
  RequesterUser,
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  Ticket,
} from "./api.js";

interface CreateTicketProps {
  activeRequester: RequesterUser;
  onSuccess?: (ticket: Ticket) => void;
}

export default function CreateTicket({ activeRequester, onSuccess }: CreateTicketProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // Form State
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<string>("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoading(true);
        const [cats, systems] = await Promise.all([
          fetchCategories(),
          fetchRelatedSystems(),
        ]);
        setCategories(cats);
        setRelatedSystems(systems);
        if (cats.length > 0) setCategoryId(String(cats[0].id));
        if (systems.length > 0) setRelatedSystemId(String(systems[0].id));
      } catch (err: any) {
        setGeneralError("Failed to load reference data for ticket creation.");
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedSummary = summary.trim();
    const trimmedDesc = description.trim();

    if (!categoryId) {
      errors.categoryId = "Category is required.";
    }
    if (!relatedSystemId) {
      errors.relatedSystemId = "Related system is required.";
    }
    if (!requestedPriority) {
      errors.requestedPriority = "Requested priority is required.";
    }
    if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
      errors.summary = "Summary must be between 5 and 120 characters long.";
    }
    if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters long.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await createTicket({
        requesterId: activeRequester.id,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requestedPriority,
        summary: summary.trim(),
        description: description.trim(),
      });

      setCreatedTicket(ticket);
      if (onSuccess) onSuccess(ticket);
    } catch (err: any) {
      if (err.fieldErrors && Array.isArray(err.fieldErrors)) {
        const errorsMap: Record<string, string> = {};
        err.fieldErrors.forEach((fe: { field: string; message: string }) => {
          errorsMap[fe.field] = fe.message;
        });
        setFieldErrors(errorsMap);
      } else {
        setGeneralError(err.message || "An unexpected error occurred during ticket creation.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCreatedTicket(null);
    setSummary("");
    setDescription("");
    setFieldErrors({});
    setGeneralError(null);
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#555" }}>
        Loading ticket creation form...
      </div>
    );
  }

  if (createdTicket) {
    return (
      <div
        style={{
          maxWidth: "680px",
          margin: "2rem auto",
          padding: "2rem",
          borderRadius: "8px",
          backgroundColor: "#EAF6EF",
          border: "1px solid #006B3C",
          color: "#004B29",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#006B3C" }}>Ticket Created Successfully!</h2>
        <p style={{ fontSize: "1.1rem" }}>
          Official Ticket Number: <strong>{createdTicket.ticketNo}</strong>
        </p>
        <div style={{ margin: "1.5rem 0", padding: "1rem", backgroundColor: "#FFFFFF", borderRadius: "6px" }}>
          <p style={{ margin: "0.25rem 0" }}><strong>Summary:</strong> {createdTicket.summary}</p>
          <p style={{ margin: "0.25rem 0" }}><strong>Status:</strong> {createdTicket.status}</p>
          <p style={{ margin: "0.25rem 0" }}><strong>Requested Priority:</strong> {createdTicket.requestedPriority}</p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          style={{
            backgroundColor: "#006B3C",
            color: "#FFFFFF",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Create Another Ticket
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "760px",
        margin: "1.5rem auto",
        padding: "2rem",
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        border: "1px solid #E0E0E0",
      }}
    >
      <h2 style={{ marginTop: 0, color: "#006B3C", borderBottom: "2px solid #EAF6EF", paddingBottom: "0.5rem" }}>
        Create IT Support Ticket
      </h2>

      <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem", color: "#555" }}>
        Submitting on behalf of: <strong>{activeRequester.displayName}</strong> ({activeRequester.email})
      </div>

      {generalError && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            backgroundColor: "#FCE8E6",
            border: "1px solid #B3261E",
            borderRadius: "6px",
            color: "#B3261E",
          }}
        >
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Category */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }}>
            Category <span style={{ color: "#B3261E" }}>*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: fieldErrors.categoryId ? "1px solid #B3261E" : "1px solid #CCC",
              fontSize: "1rem",
            }}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && (
            <div style={{ color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {fieldErrors.categoryId}
            </div>
          )}
        </div>

        {/* Related System */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }}>
            Related System <span style={{ color: "#B3261E" }}>*</span>
          </label>
          <select
            value={relatedSystemId}
            onChange={(e) => setRelatedSystemId(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: fieldErrors.relatedSystemId ? "1px solid #B3261E" : "1px solid #CCC",
              fontSize: "1rem",
            }}
          >
            {relatedSystems.map((sys) => (
              <option key={sys.id} value={sys.id}>
                {sys.name} {sys.description ? `(${sys.description})` : ""}
              </option>
            ))}
          </select>
          {fieldErrors.relatedSystemId && (
            <div style={{ color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {fieldErrors.relatedSystemId}
            </div>
          )}
        </div>

        {/* Requested Priority */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }}>
            Requested Priority <span style={{ color: "#B3261E" }}>*</span>
          </label>
          <select
            value={requestedPriority}
            onChange={(e) => setRequestedPriority(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: fieldErrors.requestedPriority ? "1px solid #B3261E" : "1px solid #CCC",
              fontSize: "1rem",
            }}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          {fieldErrors.requestedPriority && (
            <div style={{ color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {fieldErrors.requestedPriority}
            </div>
          )}
        </div>

        {/* Summary */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }}>
            Ticket Summary <span style={{ color: "#B3261E" }}>*</span>
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief summary of the issue (5 - 120 characters)"
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: fieldErrors.summary ? "1px solid #B3261E" : "1px solid #CCC",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
          {fieldErrors.summary && (
            <div style={{ color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {fieldErrors.summary}
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }}>
            Description <span style={{ color: "#B3261E" }}>*</span>
          </label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the issue or request (10 - 2000 characters)"
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: fieldErrors.description ? "1px solid #B3261E" : "1px solid #CCC",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
          {fieldErrors.description && (
            <div style={{ color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {fieldErrors.description}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            backgroundColor: submitting ? "#A0C4B4" : "#006B3C",
            color: "#FFFFFF",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {submitting ? "Submitting Ticket..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}
