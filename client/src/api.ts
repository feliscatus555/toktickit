const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
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

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
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




