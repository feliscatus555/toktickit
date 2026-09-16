const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

export const AUTH_TOKEN_KEY = "toktickit_auth_token";
export const AUTH_USER_KEY = "toktickit_auth_user";

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredAuthUser(): AuthUser | null {
  const saved = localStorage.getItem(AUTH_USER_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function setStoredAuthUser(user: AuthUser): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface RequesterUser {
  id: number;
  email: string;
  displayName: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  description?: string;
}

export interface Ticket {
  id: string;
  ticketNo: string;
  summary: string;
  description: string;
  status: string;
  requestedPriority: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: string;
  summary: string;
  description: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function fetchActiveRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters/active`);
  if (!res.ok) {
    throw new Error("Failed to fetch active development requesters");
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Failed to fetch ticket categories");
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error("Failed to fetch related systems");
  }
  return res.json();
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || "Invalid email or password. Please try again.";
    const err = new Error(errorMsg) as any;
    err.code = data?.error?.code;
    err.fieldErrors = data?.error?.fieldErrors;
    throw err;
  }

  setAuthToken(data.token);
  setStoredAuthUser(data.user);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
    });
  } catch {
    // Ignore network failure on logout
  } finally {
    clearAuthSession();
  }
}

export async function fetchCurrentUser(): Promise<AuthUser> {
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

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string; user: AuthUser }> {
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
    const err = new Error(errorMsg) as any;
    err.code = data?.error?.code;
    err.fieldErrors = data?.error?.fieldErrors;
    throw err;
  }

  setStoredAuthUser(data.user);
  return data;
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
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
      const err = new Error(data.error.message || "Failed to create ticket") as any;
      err.fieldErrors = data.error.fieldErrors;
      err.code = data.error.code;
      throw err;
    }
    throw new Error("Failed to create ticket");
  }

  return data;
}

export async function checkSystem(): Promise<SystemStatus> {
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

  const categories: Category[] = await categoriesRes.json();

  return { online: true, categories };
}

export interface TicketListItem {
  id: string;
  ticketNo: string;
  summary: string;
  status: string;
  requestedPriority: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester?: { id: number; displayName: string; email: string };
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FetchMyTicketsParams {
  requesterId: number;
  search?: string;
  categoryId?: number;
  status?: string;
  priority?: string;
  itPriority?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTicketsResponse {
  data: TicketListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function fetchMyTickets(params: FetchMyTicketsParams): Promise<PaginatedTicketsResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set("requesterId", String(params.requesterId));

  if (params.search) queryParams.set("search", params.search);
  if (params.categoryId) queryParams.set("categoryId", String(params.categoryId));
  if (params.status) queryParams.set("status", params.status);
  if (params.priority) queryParams.set("priority", params.priority);
  if (params.itPriority) queryParams.set("itPriority", params.itPriority);
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);
  if (params.page) queryParams.set("page", String(params.page));
  if (params.limit) queryParams.set("limit", String(params.limit));

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
      } else if (errData?.message) {
        errorMsg = errData.message;
      }
    } catch { }
    throw new Error(errorMsg);
  }

  return res.json();
}

export interface AttachmentItem {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedById?: number | null;
  deletionReason?: string | null;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  ticketNo: string;
  summary: string;
  description: string;
  status: string;
  requestedPriority: string;
  itPriority?: string | null;
  ownerName?: string | null;
  resolutionSummary?: string | null;
  requesterId: number;
  version: number;
  requester: { id: number; displayName: string; email: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  attachments: AttachmentItem[];
  createdAt: string;
  updatedAt: string;
}


export interface SoftRemoveAttachmentResponse {
  message: string;
  attachmentId: string;
  deletedAt: string;
}

export async function fetchTicketDetail(ticketId: string, requesterId: number): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    headers: {
      "X-Development-Requester-Id": String(requesterId),
      ...getAuthHeaders(),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || "Failed to fetch ticket detail";
    const err = new Error(errorMsg) as any;
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

export async function uploadAttachment(
  ticketId: string,
  file: File,
  uploaderId: number
): Promise<AttachmentItem> {
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
    const err = new Error(errorMsg) as any;
    err.code = data?.error?.code;
    throw err;
  }

  return data;
}

export function getAttachmentDownloadUrl(attachmentId: string, requesterId: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download?requesterId=${requesterId}`;
}

export async function downloadAttachmentBlob(attachmentId: string, requesterId: number): Promise<Blob> {
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
      if (data?.error?.message) errorMsg = data.error.message;
    } catch {}
    const err = new Error(errorMsg) as any;
    err.status = res.status;
    throw err;
  }

  return res.blob();
}

export async function softRemoveAttachment(
  attachmentId: string,
  removerId: number,
  reason: string
): Promise<SoftRemoveAttachmentResponse> {
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
    const err = new Error(errorMsg) as any;
    err.code = data?.error?.code;
    err.fieldErrors = data?.error?.fieldErrors;
    throw err;
  }

  return data;
}

export interface StaffTicketItem {
  id: string;
  ticketNo: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  category: {
    id: number;
    name: string;
  };
  requestedPriority: string;
  itPriority: string;
  status: string;
  owner: {
    id: number;
    displayName: string;
  } | null;
  requester: {
    id: number;
    displayName: string;
  };
  isProblemAppearsResolved?: boolean;
}

export interface StaffTicketsResponse {
  items: StaffTicketItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface FetchStaffTicketsParams {
  search?: string;
  category?: number | string;
  status?: string;
  priority?: string;
  owner?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function fetchStaffTickets(
  params: FetchStaffTicketsParams = {}
): Promise<StaffTicketsResponse> {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set("search", params.search);
  if (params.category !== undefined && params.category !== "") {
    queryParams.set("category", String(params.category));
  }
  if (params.status) queryParams.set("status", params.status);
  if (params.priority) queryParams.set("priority", params.priority);
  if (params.owner) queryParams.set("owner", params.owner);
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);
  if (params.page !== undefined) queryParams.set("page", String(params.page));
  if (params.limit !== undefined) queryParams.set("limit", String(params.limit));

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
    const err = new Error(errorMsg) as any;
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }

  return data;
}
