const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export const AUTH_TOKEN_KEY = "toktickit_auth_token";
export const AUTH_USER_KEY = "toktickit_auth_user";
export function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}
export function setAuthToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}
export function clearAuthSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}
export function getStoredAuthUser() {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    if (!saved)
        return null;
    try {
        return JSON.parse(saved);
    }
    catch {
        localStorage.removeItem(AUTH_USER_KEY);
        return null;
    }
}
export function setStoredAuthUser(user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
export function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
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
export async function login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data?.error?.message || "Invalid email or password. Please try again.";
        const err = new Error(errorMsg);
        err.code = data?.error?.code;
        err.fieldErrors = data?.error?.fieldErrors;
        throw err;
    }
    setAuthToken(data.token);
    setStoredAuthUser(data.user);
    return data;
}
export async function logout() {
    try {
        await fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            headers: {
                ...getAuthHeaders(),
            },
        });
    }
    catch {
        // Ignore network failure on logout
    }
    finally {
        clearAuthSession();
    }
}
export async function fetchCurrentUser() {
    const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    const data = await res.json();
    if (!res.ok) {
        clearAuthSession();
        throw new Error(data?.error?.message || "Failed to fetch user profile");
    }
    setStoredAuthUser(data.user);
    return data.user;
}
export async function changePassword(payload) {
    const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data?.error?.message || "Failed to change password";
        const err = new Error(errorMsg);
        err.code = data?.error?.code;
        err.fieldErrors = data?.error?.fieldErrors;
        throw err;
    }
    setStoredAuthUser(data.user);
    return data;
}
export async function createTicket(payload) {
    const res = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Development-Requester-Id": String(payload.requesterId),
            ...getAuthHeaders(),
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
            ...getAuthHeaders(),
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
            ...getAuthHeaders(),
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
            ...getAuthHeaders(),
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
            ...getAuthHeaders(),
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
            ...getAuthHeaders(),
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
export async function fetchStaffTickets(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.search)
        queryParams.set("search", params.search);
    if (params.category !== undefined && params.category !== "") {
        queryParams.set("category", String(params.category));
    }
    if (params.status)
        queryParams.set("status", params.status);
    if (params.priority)
        queryParams.set("priority", params.priority);
    if (params.owner)
        queryParams.set("owner", params.owner);
    if (params.sortBy)
        queryParams.set("sortBy", params.sortBy);
    if (params.sortOrder)
        queryParams.set("sortOrder", params.sortOrder);
    if (params.page !== undefined)
        queryParams.set("page", String(params.page));
    if (params.limit !== undefined)
        queryParams.set("limit", String(params.limit));
    const queryString = queryParams.toString();
    const url = `${API_URL}/api/staff/tickets${queryString ? `?${queryString}` : ""}`;
    const res = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data?.error?.message || "Failed to fetch IT staff tickets.";
        const err = new Error(errorMsg);
        err.code = data?.error?.code;
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function fetchStaffTicketDetail(ticketId) {
    const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to fetch staff ticket detail");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function assignTicket(ticketId, ownerId) {
    const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/assignment`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ ownerId }),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to assign ticket");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function updateTicketPriority(ticketId, itPriority) {
    const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/priority`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ itPriority }),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to update priority");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function updateTicketStatus(ticketId, status, resolutionSummary) {
    const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ status, resolutionSummary }),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to update status");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function fetchTicketComments(ticketId) {
    const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to fetch comments");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function createTicketComment(ticketId, content) {
    const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to post comment");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function fetchTicketNotes(ticketId) {
    const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/notes`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to fetch internal notes");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function createTicketNote(ticketId, content) {
    const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to post internal note");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function indicateProblemResolved(ticketId) {
    const res = await fetch(`${API_URL}/api/tickets/${ticketId}/resolve-indication`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ isProblemAppearsResolved: true }),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to indicate problem resolved");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function fetchStaffUsers() {
    const res = await fetch(`${API_URL}/api/staff/users`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to fetch staff users");
        err.status = res.status;
        throw err;
    }
    return data;
}
export async function fetchAdminUsers(params) {
    const queryParams = new URLSearchParams();
    if (params?.search)
        queryParams.set("search", params.search);
    if (params?.role && params.role !== "ALL")
        queryParams.set("role", params.role);
    const qs = queryParams.toString();
    const url = `${API_URL}/api/admin/users${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to fetch users");
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}
export async function createAdminUser(userData) {
    const res = await fetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to create user");
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}
export async function updateAdminUser(id, userData) {
    const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to update user");
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}
export async function resetUserPassword(id, newInitialPassword) {
    const res = await fetch(`${API_URL}/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ newInitialPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || "Failed to reset password");
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}
