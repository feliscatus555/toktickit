const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export async function fetchActiveRequesters() {
    const res = await fetch(`${API_URL}/api/requesters/active`);
    if (!res.ok) {
        throw new Error("Failed to fetch active development requesters");
    }
    return res.json();
}
export async function fetchCategories() {
    const res = await fetch(`${API_URL}/api/categories`);
    if (!res.ok) {
        throw new Error("Failed to fetch ticket categories");
    }
    return res.json();
}
export async function fetchRelatedSystems() {
    const res = await fetch(`${API_URL}/api/related-systems`);
    if (!res.ok) {
        throw new Error("Failed to fetch related systems");
    }
    return res.json();
}
export async function createTicket(payload) {
    const res = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Development-Requester-Id": String(payload.requesterId),
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        if (data && data.error) {
            const err = new Error(data.error.message || "Failed to create ticket");
            err.fieldErrors = data.error.fieldErrors;
            err.code = data.error.code;
            throw err;
        }
        throw new Error("Failed to create ticket");
    }
    return data;
}
export async function checkSystem() {
    // TODO(Issue 2 & 4): implement the two fetch calls described above.
    const healthRes = await fetch(`${API_URL}/api/health`);
    if (!healthRes.ok) {
        throw new Error("Backend service unavailable, health check failed");
    }
    //categories for issue 4
    const categoriesRes = await fetch(`${API_URL}/api/categories`);
    if (!categoriesRes.ok) {
        throw new Error("Failed to fetch categories");
    }
    const categories = await categoriesRes.json();
    return { online: true, categories };
}
export async function fetchMyTickets(params) {
    const queryParams = new URLSearchParams();
    queryParams.set("requesterId", String(params.requesterId));
    if (params.search)
        queryParams.set("search", params.search);
    if (params.categoryId)
        queryParams.set("categoryId", String(params.categoryId));
    if (params.status)
        queryParams.set("status", params.status);
    if (params.priority)
        queryParams.set("priority", params.priority);
    if (params.itPriority)
        queryParams.set("itPriority", params.itPriority);
    if (params.sortBy)
        queryParams.set("sortBy", params.sortBy);
    if (params.sortOrder)
        queryParams.set("sortOrder", params.sortOrder);
    if (params.page)
        queryParams.set("page", String(params.page));
    if (params.limit)
        queryParams.set("limit", String(params.limit));
    const res = await fetch(`${API_URL}/api/tickets?${queryParams.toString()}`, {
        headers: {
            "X-Development-Requester-Id": String(params.requesterId),
        },
    });
    if (!res.ok) {
        let errorMsg = "Failed to fetch tickets list";
        try {
            const errData = await res.json();
            if (errData?.error?.message) {
                errorMsg = errData.error.message;
            }
            else if (errData?.message) {
                errorMsg = errData.message;
            }
        }
        catch { }
        throw new Error(errorMsg);
    }
    return res.json();
}
export async function fetchTicketDetail(ticketId, requesterId) {
    const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        headers: {
            "X-Development-Requester-Id": String(requesterId),
        },
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data?.error?.message || "Failed to fetch ticket detail";
        const err = new Error(errorMsg);
        err.code = data?.error?.code;
        throw err;
    }
    return data;
}
export async function uploadAttachment(ticketId, file, uploaderId) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploaderId", String(uploaderId));
    const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        headers: {
            "X-Development-Requester-Id": String(uploaderId),
        },
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data?.error?.message || "Failed to upload attachment";
        const err = new Error(errorMsg);
        err.code = data?.error?.code;
        throw err;
    }
    return data;
}
export function getAttachmentDownloadUrl(attachmentId, requesterId) {
    return `${API_URL}/api/attachments/${attachmentId}/download?requesterId=${requesterId}`;
}
export async function downloadAttachmentBlob(attachmentId, requesterId) {
    const res = await fetch(getAttachmentDownloadUrl(attachmentId, requesterId), {
        headers: {
            "X-Development-Requester-Id": String(requesterId),
        },
    });
    if (!res.ok) {
        let errorMsg = "Failed to download attachment";
        try {
            const data = await res.json();
            if (data?.error?.message)
                errorMsg = data.error.message;
        }
        catch { }
        const err = new Error(errorMsg);
        err.status = res.status;
        throw err;
    }
    return res.blob();
}
export async function softRemoveAttachment(attachmentId, removerId, reason) {
    const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "X-Development-Requester-Id": String(removerId),
        },
        body: JSON.stringify({ removerId, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data?.error?.message || "Failed to soft-remove attachment";
        const err = new Error(errorMsg);
        err.code = data?.error?.code;
        err.fieldErrors = data?.error?.fieldErrors;
        throw err;
    }
    return data;
}
