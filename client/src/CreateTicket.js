import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { fetchCategories, fetchRelatedSystems, createTicket, uploadAttachment, } from "./api.js";
export default function CreateTicket({ activeRequester, onSuccess, onCancel }) {
    const [categories, setCategories] = useState([]);
    const [relatedSystems, setRelatedSystems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [generalError, setGeneralError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [createdTicket, setCreatedTicket] = useState(null);
    // Form State
    const [categoryId, setCategoryId] = useState("");
    const [relatedSystemId, setRelatedSystemId] = useState("");
    const [requestedPriority, setRequestedPriority] = useState("");
    const [summary, setSummary] = useState("");
    const [description, setDescription] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [attachmentError, setAttachmentError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showRequesterTooltip, setShowRequesterTooltip] = useState(false);
    const fileInputRef = React.useRef(null);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
    const processFiles = (filesList) => {
        setAttachmentError(null);
        if (filesList.length === 0)
            return;
        if (attachments.length + filesList.length > 5) {
            setAttachmentError("Maximum 5 attachments allowed per ticket.");
            return;
        }
        const validFiles = [];
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
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (attachments.length < 5) {
            setIsDragging(true);
        }
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (attachments.length >= 5)
            return;
        const droppedFiles = Array.from(e.dataTransfer.files);
        processFiles(droppedFiles);
    };
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        processFiles(selectedFiles);
        e.target.value = "";
    };
    const handleRemoveAttachment = (index) => {
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
            }
            catch (err) {
                setGeneralError("Failed to load reference data for ticket creation.");
            }
            finally {
                setLoading(false);
            }
        }
        loadFormData();
    }, []);
    const validateForm = () => {
        const errors = {};
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
    const handleSubmit = async (e) => {
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
                    }
                    catch (uploadErr) {
                        console.error("Failed to upload attachment during ticket creation:", uploadErr);
                    }
                }
            }
            setCreatedTicket(ticket);
        }
        catch (err) {
            if (err.fieldErrors && Array.isArray(err.fieldErrors)) {
                const errorsMap = {};
                err.fieldErrors.forEach((fe) => {
                    errorsMap[fe.field] = fe.message;
                });
                setFieldErrors(errorsMap);
            }
            else {
                setGeneralError(err.message || "An unexpected error occurred during ticket creation.");
            }
        }
        finally {
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
        return (_jsx("div", { style: { padding: "2rem", textAlign: "center", color: "#555" }, children: "Loading ticket creation form..." }));
    }
    if (createdTicket) {
        const selectedCategory = categories.find((c) => c.id === createdTicket.categoryId);
        const selectedSystem = relatedSystems.find((s) => s.id === createdTicket.relatedSystemId);
        return (_jsxs("div", { style: {
                maxWidth: "760px",
                margin: "2rem auto",
                padding: "2.5rem 2rem",
                borderRadius: "10px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #B5D5C5",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                textAlign: "center",
            }, children: [_jsx("div", { style: {
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
                    }, children: "\u2713" }), _jsx("h2", { style: { marginTop: 0, color: "#006B3C", fontSize: "1.75rem", marginBottom: "0.5rem" }, children: "Ticket Created Successfully!" }), _jsx("p", { style: { color: "#5B6573", fontSize: "1rem", marginBottom: "1.5rem" }, children: "Your IT support request has been registered in TokTickIT." }), _jsxs("div", { style: {
                        backgroundColor: "#EAF6EF",
                        border: "1px solid #0B7A46",
                        borderRadius: "8px",
                        padding: "1rem 1.5rem",
                        display: "inline-block",
                        marginBottom: "1.75rem",
                    }, children: [_jsx("div", { style: { fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#0B7A46", letterSpacing: "0.5px" }, children: "Official Ticket Number" }), _jsx("div", { style: { fontSize: "1.5rem", fontWeight: 800, color: "#006B3C", marginTop: "0.2rem" }, children: createdTicket.ticketNo })] }), _jsx("div", { style: {
                        textAlign: "left",
                        margin: "0 auto 2rem auto",
                        padding: "1.25rem 1.5rem",
                        backgroundColor: "#F5F7F6",
                        borderRadius: "8px",
                        border: "1px solid #E0E0E0",
                    }, children: _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.95rem" }, children: [_jsxs("div", { style: { gridColumn: "span 2" }, children: [_jsx("span", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }, children: "Summary" }), _jsx("div", { style: { fontWeight: 600, color: "#1F2937" }, children: createdTicket.summary })] }), _jsxs("div", { children: [_jsx("span", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }, children: "Status" }), _jsxs("div", { style: { fontWeight: 600, color: "#006B3C" }, children: ["\u25CF ", createdTicket.status] })] }), _jsxs("div", { children: [_jsx("span", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }, children: "Requested Priority" }), _jsx("div", { style: { fontWeight: 600, color: "#1F2937" }, children: createdTicket.requestedPriority })] }), selectedCategory && (_jsxs("div", { children: [_jsx("span", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }, children: "Category" }), _jsx("div", { style: { fontWeight: 500, color: "#374151" }, children: selectedCategory.name })] })), selectedSystem && (_jsxs("div", { children: [_jsx("span", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }, children: "Related System" }), _jsx("div", { style: { fontWeight: 500, color: "#374151" }, children: selectedSystem.name })] }))] }) }), _jsxs("div", { style: { display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }, children: [onSuccess && (_jsx("button", { type: "button", onClick: () => onSuccess(createdTicket), style: {
                                backgroundColor: "#006B3C",
                                color: "#FFFFFF",
                                padding: "0.75rem 1.5rem",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "1rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }, children: "\uD83D\uDCCB View My Tickets" })), _jsx("button", { type: "button", onClick: handleReset, style: {
                                backgroundColor: "#EAF6EF",
                                color: "#006B3C",
                                border: "1px solid #0B7A46",
                                padding: "0.75rem 1.5rem",
                                borderRadius: "6px",
                                fontSize: "1rem",
                                fontWeight: 600,
                                cursor: "pointer",
                            }, children: "\u2795 Create Another Ticket" })] })] }));
    }
    return (_jsxs("div", { style: {
            maxWidth: "960px",
            margin: "1.5rem auto",
            padding: "2rem",
            backgroundColor: "#FFFFFF",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            border: "1px solid #E0E0E0",
        }, children: [_jsx("h2", { style: { marginTop: 0, color: "#006B3C", borderBottom: "2px solid #EAF6EF", paddingBottom: "0.5rem" }, children: "Create IT Support Ticket" }), _jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    backgroundColor: "#F5F7F6",
                    border: "1px solid #E0E0E0",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }, children: "Ticket Number" }), _jsxs("div", { title: `TKT-${new Date().getFullYear()}-XXXXX (Auto)`, style: {
                                    backgroundColor: "#E9ECEF",
                                    padding: "0.45rem 0.7rem",
                                    borderRadius: "4px",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    color: "#006B3C",
                                    border: "1px solid #D1D5DB",
                                }, children: ["TKT-", new Date().getFullYear(), "-XXXXX (Auto)"] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem" }, children: "Ticket Date" }), _jsx("div", { title: new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }), style: {
                                    backgroundColor: "#E9ECEF",
                                    padding: "0.45rem 0.7rem",
                                    borderRadius: "4px",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    color: "#1F2937",
                                    border: "1px solid #D1D5DB",
                                }, children: new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) })] }), _jsxs("div", { onMouseEnter: () => setShowRequesterTooltip(true), onMouseLeave: () => setShowRequesterTooltip(false), title: `👤 ${activeRequester.displayName} (${activeRequester.email})`, style: { position: "relative", cursor: "pointer" }, children: [_jsx("label", { style: { display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#5B6573", marginBottom: "0.2rem", cursor: "pointer" }, children: "Requester Identity" }), _jsxs("div", { title: `👤 ${activeRequester.displayName} (${activeRequester.email})`, style: {
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
                                }, children: ["\uD83D\uDC64 ", activeRequester.displayName, " (", activeRequester.email, ")"] }), showRequesterTooltip && (_jsxs("div", { style: {
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
                                }, children: ["\uD83D\uDC64 ", activeRequester.displayName, " (", activeRequester.email, ")"] }))] })] }), generalError && (_jsx("div", { style: {
                    padding: "0.75rem 1rem",
                    marginBottom: "1.5rem",
                    backgroundColor: "#FCE8E6",
                    border: "1px solid #B3261E",
                    borderRadius: "6px",
                    color: "#B3261E",
                }, children: generalError })), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("div", { style: { marginBottom: "1.25rem" }, children: [_jsxs("label", { htmlFor: "categoryId", style: { display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }, children: ["Category ", _jsx("span", { style: { color: "#B3261E" }, children: "*" })] }), _jsxs("select", { id: "categoryId", value: categoryId, onChange: (e) => setCategoryId(e.target.value), style: {
                                    width: "100%",
                                    padding: "0.6rem 0.8rem",
                                    borderRadius: "6px",
                                    border: fieldErrors.categoryId ? "1px solid #B3261E" : "1px solid #CCC",
                                    fontSize: "1rem",
                                }, children: [_jsx("option", { value: "", disabled: true, hidden: true, children: "-- Select Category --" }), categories.map((cat) => (_jsx("option", { value: cat.id, children: cat.name }, cat.id)))] }), fieldErrors.categoryId && (_jsx("div", { style: { color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }, children: fieldErrors.categoryId }))] }), _jsxs("div", { style: { marginBottom: "1.25rem" }, children: [_jsxs("label", { htmlFor: "relatedSystemId", style: { display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }, children: ["Related System ", _jsx("span", { style: { color: "#B3261E" }, children: "*" })] }), _jsxs("select", { id: "relatedSystemId", value: relatedSystemId, onChange: (e) => setRelatedSystemId(e.target.value), style: {
                                    width: "100%",
                                    padding: "0.6rem 0.8rem",
                                    borderRadius: "6px",
                                    border: fieldErrors.relatedSystemId ? "1px solid #B3261E" : "1px solid #CCC",
                                    fontSize: "1rem",
                                }, children: [_jsx("option", { value: "", disabled: true, hidden: true, children: "-- Select Related System --" }), relatedSystems.map((sys) => (_jsxs("option", { value: sys.id, children: [sys.name, " ", sys.description ? `(${sys.description})` : ""] }, sys.id)))] }), fieldErrors.relatedSystemId && (_jsx("div", { style: { color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }, children: fieldErrors.relatedSystemId }))] }), _jsxs("div", { style: { marginBottom: "1.25rem" }, children: [_jsxs("label", { htmlFor: "requestedPriority", style: { display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }, children: ["Requested Priority ", _jsx("span", { style: { color: "#B3261E" }, children: "*" })] }), _jsxs("select", { id: "requestedPriority", value: requestedPriority, onChange: (e) => setRequestedPriority(e.target.value), style: {
                                    width: "100%",
                                    padding: "0.6rem 0.8rem",
                                    borderRadius: "6px",
                                    border: fieldErrors.requestedPriority ? "1px solid #B3261E" : "1px solid #CCC",
                                    fontSize: "1rem",
                                }, children: [_jsx("option", { value: "", disabled: true, hidden: true, children: "-- Select Requested Priority --" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] }), fieldErrors.requestedPriority && (_jsx("div", { style: { color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }, children: fieldErrors.requestedPriority }))] }), _jsxs("div", { style: { marginBottom: "1.25rem" }, children: [_jsxs("label", { htmlFor: "summary", style: { display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }, children: ["Ticket Summary ", _jsx("span", { style: { color: "#B3261E" }, children: "*" })] }), _jsx("input", { id: "summary", type: "text", value: summary, onChange: (e) => setSummary(e.target.value), placeholder: "Brief summary of the issue (5 - 120 characters)", style: {
                                    width: "100%",
                                    padding: "0.6rem 0.8rem",
                                    borderRadius: "6px",
                                    border: fieldErrors.summary ? "1px solid #B3261E" : "1px solid #CCC",
                                    fontSize: "1rem",
                                    boxSizing: "border-box",
                                } }), fieldErrors.summary && (_jsx("div", { style: { color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }, children: fieldErrors.summary }))] }), _jsxs("div", { style: { marginBottom: "1.5rem" }, children: [_jsxs("label", { htmlFor: "description", style: { display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }, children: ["Description ", _jsx("span", { style: { color: "#B3261E" }, children: "*" })] }), _jsx("textarea", { id: "description", rows: 5, value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Detailed description of the issue or request (10 - 2000 characters)", style: {
                                    width: "100%",
                                    padding: "0.6rem 0.8rem",
                                    borderRadius: "6px",
                                    border: fieldErrors.description ? "1px solid #B3261E" : "1px solid #CCC",
                                    fontSize: "1rem",
                                    boxSizing: "border-box",
                                } }), fieldErrors.description && (_jsx("div", { style: { color: "#B3261E", fontSize: "0.85rem", marginTop: "0.25rem" }, children: fieldErrors.description }))] }), _jsxs("div", { style: { marginBottom: "1.75rem" }, children: [_jsx("label", { style: { display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "#222" }, children: "Attachments (Optional)" }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, accept: ".jpg,.jpeg,.png,.webp,.pdf", onChange: handleFileChange, style: { display: "none" } }), _jsxs("div", { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, onClick: () => {
                                    if (attachments.length < 5 && fileInputRef.current) {
                                        fileInputRef.current.click();
                                    }
                                }, style: {
                                    border: isDragging ? "2px dashed #006B3C" : "2px dashed #B5D5C5",
                                    backgroundColor: isDragging ? "#DDF2E6" : "#EAF6EF",
                                    borderRadius: "8px",
                                    padding: "1.75rem 1rem",
                                    textAlign: "center",
                                    cursor: attachments.length >= 5 ? "not-allowed" : "pointer",
                                    transition: "all 0.2s ease",
                                    boxSizing: "border-box",
                                }, children: [_jsx("div", { style: { fontSize: "2rem", marginBottom: "0.4rem", color: "#006B3C" }, children: "\uD83D\uDCC2" }), _jsx("div", { style: { fontWeight: 600, color: "#006B3C", fontSize: "1rem", marginBottom: "0.25rem" }, children: attachments.length >= 5 ? "Maximum attachment limit reached (5/5)" : "Drag & drop files here, or click to browse" }), _jsx("div", { style: { fontSize: "0.85rem", color: "#555" }, children: "Supported formats: JPG, PNG, WEBP, PDF \u2022 Max file size: 5 MB \u2022 Max 5 files" })] }), attachmentError && (_jsxs("div", { style: { color: "#B3261E", fontSize: "0.85rem", marginTop: "0.4rem" }, children: ["\u26A0\uFE0F ", attachmentError] })), attachments.length > 0 && (_jsxs("div", { style: { marginTop: "1rem" }, children: [_jsxs("div", { style: { fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem", color: "#1F2937" }, children: ["Selected Attachments (", attachments.length, "/5):"] }), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: attachments.map((file, idx) => {
                                            const isPdf = file.name.toLowerCase().endsWith(".pdf");
                                            return (_jsxs("div", { style: {
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "0.6rem 0.9rem",
                                                    backgroundColor: "#FFFFFF",
                                                    border: "1px solid #E0E0E0",
                                                    borderRadius: "6px",
                                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                                }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }, children: [_jsx("span", { style: { fontSize: "1.2rem" }, children: isPdf ? "📄" : "🖼️" }), _jsxs("div", { title: file.name, style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: "0.9rem", color: "#1F2937" }, children: file.name }), _jsxs("div", { style: { fontSize: "0.8rem", color: "#6B7280" }, children: [(file.size / (1024 * 1024)).toFixed(2), " MB"] })] })] }), _jsx("button", { type: "button", onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleRemoveAttachment(idx);
                                                        }, style: {
                                                            backgroundColor: "transparent",
                                                            color: "#B3261E",
                                                            border: "none",
                                                            fontWeight: 600,
                                                            fontSize: "0.85rem",
                                                            cursor: "pointer",
                                                            padding: "0.25rem 0.5rem",
                                                            borderRadius: "4px",
                                                        }, children: "\u2715 Remove" })] }, idx));
                                        }) })] }))] }), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: "0.75rem",
                            marginTop: "2rem",
                            paddingTop: "1rem",
                            borderTop: "1px solid #EAF6EF",
                        }, children: [_jsx("button", { type: "button", onClick: onCancel ? onCancel : handleReset, disabled: submitting, style: {
                                    backgroundColor: "#EAF6EF",
                                    color: "#006B3C",
                                    border: "1px solid #0B7A46",
                                    padding: "0.75rem 1.5rem",
                                    borderRadius: "6px",
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                }, children: "Cancel" }), _jsx("button", { type: "submit", disabled: submitting, style: {
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
                                }, children: submitting ? "Submitting Ticket..." : "Submit Ticket" })] })] })] }));
}
