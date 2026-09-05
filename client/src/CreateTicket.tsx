import React, { useState, useEffect } from "react";
import {
  Category,
  RelatedSystem,
  RequesterUser,
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  uploadAttachment,
  Ticket,
} from "./api.js";


interface CreateTicketProps {
  activeRequester: RequesterUser;
  onSuccess?: (ticket: Ticket) => void;
  onCancel?: () => void;
}

export default function CreateTicket({ activeRequester, onSuccess, onCancel }: CreateTicketProps) {
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
  const [requestedPriority, setRequestedPriority] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showRequesterTooltip, setShowRequesterTooltip] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

  const processFiles = (filesList: File[]) => {
    setAttachmentError(null);
    if (filesList.length === 0) return;

    if (attachments.length + filesList.length > 5) {
      setAttachmentError("Maximum 5 attachments allowed per ticket.");
      return;
    }

    const validFiles: File[] = [];
    for (const file of filesList) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
        setAttachmentError(`Invalid file format "${file.name}". Allowed formats: JPG, PNG, WEBP, PDF.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError(`File "${file.name}" exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
        return;
      }
      validFiles.push(file);
    }

    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (attachments.length < 5) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (attachments.length >= 5) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
    e.target.value = "";
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentError(null);
  };

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

      if (attachments.length > 0) {
        for (const file of attachments) {
          try {
            await uploadAttachment(ticket.id, file, activeRequester.id);
          } catch (uploadErr) {
            console.error("Failed to upload attachment during ticket creation:", uploadErr);
          }
        }
      }

      setCreatedTicket(ticket);

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
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("");
    setSummary("");
    setDescription("");
    setAttachments([]);
    setAttachmentError(null);
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
    const selectedCategory = categories.find((c) => c.id === createdTicket.categoryId);
    const selectedSystem = relatedSystems.find((s) => s.id === createdTicket.relatedSystemId);

    return (
      <div
        style={{
          maxWidth: "760px",
          margin: "2rem auto",
          padding: "2.5rem 2rem",
          borderRadius: "10px",
          backgroundColor: "#FFFFFF",
          border: "1px solid #B5D5C5",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          textAlign: "center",
        }}
      >
        {/* Success Header Icon & Title */}
        <div
          style={{
            width: "64px",
            height: "64px",
            backgroundColor: "#EAF6EF",
            color: "#006B3C",
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            marginBottom: "1rem",
            border: "2px solid #006B3C",
          }}
        >
          ✓
        </div>

        <h2 style={{ marginTop: 0, color: "#006B3C", fontSize: "1.75rem", marginBottom: "0.5rem" }}>
          Ticket Created Successfully!
        </h2>
        <p style={{ color: "#5B6573", fontSize: "1rem", marginBottom: "1.5rem" }}>
          Your IT support request has been registered in TokTickIT.
        </p>

        {/* Ticket Number Highlight Badge */}
        <div
          style={{
            backgroundColor: "#EAF6EF",
            border: "1px solid #0B7A46",
            borderRadius: "8px",
            padding: "1rem 1.5rem",
            display: "inline-block",
            marginBottom: "1.75rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#0B7A46", letterSpacing: "0.5px" }}>
            Official Ticket Number
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#006B3C", marginTop: "0.2rem" }}>
            {createdTicket.ticketNo}
          </div>
        </div>

        {/* Details Summary Card */}
        <div
          style={{
            textAlign: "left",
            margin: "0 auto 2rem auto",
            padding: "1.25rem 1.5rem",
            backgroundColor: "#F5F7F6",
            borderRadius: "8px",
            border: "1px solid #E0E0E0",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.95rem" }}>
            <div style={{ gridColumn: "span 2" }}>
              <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }}>
                Summary
              </span>
              <div style={{ fontWeight: 600, color: "#1F2937" }}>{createdTicket.summary}</div>
            </div>

            <div>
              <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }}>
                Status
              </span>
              <div style={{ fontWeight: 600, color: "#006B3C" }}>● {createdTicket.status}</div>
            </div>

            <div>
              <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }}>
                Requested Priority
              </span>
              <div style={{ fontWeight: 600, color: "#1F2937" }}>{createdTicket.requestedPriority}</div>
            </div>

            {selectedCategory && (
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }}>
                  Category
                </span>
                <div style={{ fontWeight: 500, color: "#374151" }}>{selectedCategory.name}</div>
              </div>
            )}

            {selectedSystem && (
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }}>
                  Related System
                </span>
                <div style={{ fontWeight: 500, color: "#374151" }}>{selectedSystem.name}</div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          {onSuccess && (
            <button
              type="button"
              onClick={() => onSuccess(createdTicket)}
              style={{
                backgroundColor: "#006B3C",
                color: "#FFFFFF",
                padding: "0.75rem 1.5rem",
                border: "none",
                borderRadius: "6px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              📋 View My Tickets
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            style={{
              backgroundColor: "#EAF6EF",
              color: "#006B3C",
              border: "1px solid #0B7A46",
              padding: "0.75rem 1.5rem",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ➕ Create Another Ticket
          </button>
        </div>
      </div>
    );
  }


  return (
    <div
      style={{
        maxWidth: "960px",
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

      {/* Read-Only System Information Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          backgroundColor: "#F5F7F6",
          border: "1px solid #E0E0E0",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }}>
            Ticket Number
          </label>
          <div
            title={`TKT-${new Date().getFullYear()}-XXXXX (Auto)`}
            style={{
              backgroundColor: "#E9ECEF",
              padding: "0.45rem 0.7rem",
              borderRadius: "4px",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#006B3C",
              border: "1px solid #D1D5DB",
            }}
          >
            TKT-{new Date().getFullYear()}-XXXXX (Auto)
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }}>
            Ticket Date
          </label>
          <div
            title={new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            style={{
              backgroundColor: "#E9ECEF",
              padding: "0.45rem 0.7rem",
              borderRadius: "4px",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#1F2937",
              border: "1px solid #D1D5DB",
            }}
          >
            {new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div
          onMouseEnter={() => setShowRequesterTooltip(true)}
          onMouseLeave={() => setShowRequesterTooltip(false)}
          title={`👤 ${activeRequester.displayName} (${activeRequester.email})`}
          style={{ position: "relative", cursor: "pointer" }}
        >
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem", cursor: "pointer" }}>
            Requester Identity
          </label>
          <div
            title={`👤 ${activeRequester.displayName} (${activeRequester.email})`}
            style={{
              backgroundColor: "#E9ECEF",
              padding: "0.45rem 0.7rem",
              borderRadius: "4px",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#1F2937",
              border: "1px solid #D1D5DB",
              wordBreak: "break-word",
              lineHeight: "1.3",
              cursor: "pointer",
            }}
          >
            👤 {activeRequester.displayName} ({activeRequester.email})
          </div>

          {showRequesterTooltip && (
            <div
              style={{
                position: "absolute",
                bottom: "105%",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#1F2937",
                color: "#FFFFFF",
                padding: "0.55rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 500,
                whiteSpace: "normal",
                wordBreak: "break-word",
                minWidth: "220px",
                maxWidth: "340px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                zIndex: 100,
                pointerEvents: "none",
                textAlign: "center",
              }}
            >
              👤 {activeRequester.displayName} ({activeRequester.email})
            </div>
          )}
        </div>
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
            <option value="" disabled hidden>-- Select Category --</option>
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
            <option value="" disabled hidden>-- Select Related System --</option>
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
            <option value="" disabled hidden>-- Select Requested Priority --</option>
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

        {/* Attachments Section */}
        <div style={{ marginBottom: "1.75rem" }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }}>
            Attachments (Optional)
          </label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (attachments.length < 5 && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            style={{
              border: isDragging ? "2px dashed #006B3C" : "2px dashed #B5D5C5",
              backgroundColor: isDragging ? "#DDF2E6" : "#EAF6EF",
              borderRadius: "8px",
              padding: "1.75rem 1rem",
              textAlign: "center",
              cursor: attachments.length >= 5 ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.4rem", color: "#006B3C" }}>
              📂
            </div>
            <div style={{ fontWeight: 600, color: "#006B3C", fontSize: "1rem", marginBottom: "0.25rem" }}>
              {attachments.length >= 5 ? "Maximum attachment limit reached (5/5)" : "Drag & drop files here, or click to browse"}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#555" }}>
              Supported formats: JPG, PNG, WEBP, PDF • Max file size: 5 MB • Max 5 files
            </div>
          </div>

          {attachmentError && (
            <div style={{ color: "#B3261E", fontSize: "0.85rem", marginTop: "0.4rem" }}>
              ⚠️ {attachmentError}
            </div>
          )}

          {attachments.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem", color: "#1F2937" }}>
                Selected Attachments ({attachments.length}/5):
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {attachments.map((file, idx) => {
                  const isPdf = file.name.toLowerCase().endsWith(".pdf");
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0.9rem",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E0E0E0",
                        borderRadius: "6px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }}>
                        <span style={{ fontSize: "1.2rem" }}>{isPdf ? "📄" : "🖼️"}</span>
                        <div title={file.name} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1F2937" }}>{file.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAttachment(idx);
                        }}
                        style={{
                          backgroundColor: "transparent",
                          color: "#B3261E",
                          border: "none",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer Aligned to Right */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "2rem",
            paddingTop: "1rem",
            borderTop: "1px solid #EAF6EF",
          }}
        >
          <button
            type="button"
            onClick={onCancel ? onCancel : handleReset}
            disabled={submitting}
            style={{
              backgroundColor: "#EAF6EF",
              color: "#006B3C",
              border: "1px solid #0B7A46",
              padding: "0.75rem 1.5rem",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
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
        </div>
      </form>
    </div>
  );
}


