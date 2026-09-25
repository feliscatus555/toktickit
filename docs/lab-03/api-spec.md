# Lab 3 REST API Contract Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Draft Sprint 3 API Design Baseline
* **Target Version**: `/api`
* **Base References**:
  * `docs/lab-03/Lab_3_sheet.pdf` (Section 6 *Required REST API Contract*, Section 6.1, Section 6.2, Section 6.3)
  * `docs/lab-02/api-spec.md` (Lab 2 REST API Contract Baseline)

---

## 1. General Principles & Conventions

* **Base Endpoint Path**: All application API endpoints are rooted under `/api` (`docs/lab-03/Lab_3_sheet.pdf`, Section 6).
* **Content Negotiation**: Request payloads and response bodies use JSON (`application/json`), except file upload endpoints (`multipart/form-data`) and file download endpoints (`binary stream`).
* **Property Naming**: Request and response fields use `camelCase`.
* **Date & Time Format**: Timestamps are formatted as UTC ISO 8601 strings (e.g. `2026-09-15T12:00:00.000Z`).
* **Identity Determination Rule** `[Source Requirement]`:
  * In Lab 2, user identity was determined via `X-Development-Requester-Id` or request body `requesterId`.
  * In Lab 3, the authenticated user identity—established via credentials and verified on the server—determines ownership for all operations (`Lab_3_sheet.pdf`, Section 4.4 BR-03). Client-supplied requester IDs are ignored.
* **Authentication Scheme** `[Proposed Decision]`:
  * Bearer token or signed session cookie: `Authorization: Bearer <jwt_or_session_token>` header, or HTTP-only cookie.
  * Secret keys must never be exposed to client code or committed to source control (`Lab_3_sheet.pdf`, Section 6.1).
* **Standard Error Response Envelope**:
  ```json
  {
    "error": {
      "code": "ERROR_CODE_STRING",
      "message": "Human-readable error explanation",
      "fieldErrors": [
        { "field": "email", "message": "Email address is already in use." }
      ],
      "correlationId": "uuid-v4-string"
    }
  }
  ```
* **Safe Error Behavior** `[Source Requirement]`:
  * Endpoints must avoid leaking whether another user's protected Ticket, Attachment, or Internal Note exists (`Lab_3_sheet.pdf`, Section 6.2). Access to non-existent or unauthorized resources returns safe 404 or 403 responses without sensitive metadata.

---

## 2. HTTP Status Code Conventions

| Status Code | Description | Usage Scenario in Lab 3 |
|---|---|---|
| `200 OK` | Successful operation | Retrieval of collections, single records, successful updates, logout |
| `201 Created` | Resource created | User created, ticket created, comment/note posted, attachment uploaded |
| `400 Bad Request` | Malformed request syntax | Malformed JSON body, invalid query parameter format |
| `401 Unauthorized` | Missing or invalid authentication | Unauthenticated access attempt to a protected endpoint; invalid login credentials |
| `403 Forbidden` | Authenticated but unauthorized | Requester attempting to access staff queue, internal notes, or admin APIs; non-owner access |
| `404 Not Found` | Resource does not exist | Ticket, user, or attachment ID not found |
| `409 Conflict` | Business conflict or duplicate | Attempt to create/update user with an existing email address; state conflict |
| `410 Gone` | Resource removed | Attempt to download a soft-removed attachment binary |
| `422 Unprocessable Entity` | Field validation or rule failure | Password complexity failure, invalid status transition, self-deactivation attempt |
| `500 Internal Server Error` | Unexpected server failure | Database connection failure, unhandled runtime exception |

---

## 3. Authentication & Password Endpoints (Feature-9)

### 3.1 `POST /api/auth/login`
* **Purpose**: Authenticate an active user with email and password (`Lab_3_sheet.pdf`, Section 1, Section 6, Section 8.1).
* **Access**: Public / Unauthenticated.
* **Request Body**:
  ```json
  {
    "email": "jennifer.anderson@kmutt.ac.th",
    "password": "InitialPassword123!"
  }
  ```
* **Success Response `200 OK`**:
  ```json
  {
    "token": "signed-session-or-jwt-token-string",
    "user": {
      "id": 1,
      "email": "jennifer.anderson@kmutt.ac.th",
      "displayName": "Jennifer Anderson",
      "role": "IT_STAFF",
      "mustChangePassword": true
    }
  }
  ```
* **Error Responses**:
  * `401 Unauthorized`: Invalid credentials or inactive user account (`Lab_3_sheet.pdf`, Section 4.4 BR-01).
    ```json
    { "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email address or password." } }
    ```
  * `422 Unprocessable Entity`: Missing required email or password fields.

### 3.2 `POST /api/auth/logout`
* **Purpose**: Invalidate authenticated session (`Lab_3_sheet.pdf`, Section 4.1, Section 6, Section 8.1).
* **Access**: Authenticated (`Requester`, `IT_STAFF`, `ADMINISTRATOR`).
* **Success Response `200 OK`**:
  ```json
  { "message": "Successfully logged out." }
  ```

### 3.3 `GET /api/auth/me`
* **Purpose**: Retrieve currently authenticated user identity and permissions (`Lab_3_sheet.pdf`, Section 4.1, Section 6).
* **Access**: Authenticated (`Requester`, `IT_STAFF`, `ADMINISTRATOR`).
* **Success Response `200 OK`**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "jennifer.anderson@kmutt.ac.th",
      "displayName": "Jennifer Anderson",
      "role": "IT_STAFF",
      "mustChangePassword": false
    }
  }
  ```
* **Error Response `401 Unauthorized`**: Token missing, expired, or invalid.

### 3.4 `POST /api/auth/change-password`
* **Purpose**: Perform mandatory first-login password change or voluntary password update (`Lab_3_sheet.pdf`, Section 1, Section 4.4 BR-02, Section 6, Section 8.1).
* **Access**: Authenticated.
* **Request Body**:
  ```json
  {
    "currentPassword": "InitialPassword123!",
    "newPassword": "SecureNewPassword2026!",
    "confirmPassword": "SecureNewPassword2026!"
  }
  ```
* **Success Response `200 OK`**:
  ```json
  {
    "message": "Password updated successfully.",
    "user": {
      "id": 1,
      "email": "jennifer.anderson@kmutt.ac.th",
      "displayName": "Jennifer Anderson",
      "role": "IT_STAFF",
      "mustChangePassword": false
    }
  }
  ```
* **Error Responses**:
  * `401 Unauthorized`: Current password verification failed.
  * `422 Unprocessable Entity`: New password does not satisfy complexity rules or confirmation does not match.

---

## 4. Requester Ticketing Endpoints (Regression & Continuity)

All Lab 2 endpoints continue functioning without the Development Requester selector (`Lab_3_sheet.pdf`, Section 1, Section 6, Section 8.2).

### 4.1 `GET /api/categories` & `GET /api/related-systems`
* Preserved from Lab 1/Lab 2 baselines (`200 OK`).

### 4.2 `POST /api/tickets`
* **Purpose**: Create a new support ticket.
* **Access**: Authenticated (`Requester`, `IT_STAFF`, `ADMINISTRATOR`).
* **Identity Source**: Derived strictly from the session user (`req.user.id`). Client cannot override `requesterId` (`Lab_3_sheet.pdf`, Section 4.4 BR-03).
* **Request Body**:
  ```json
  {
    "categoryId": 2,
    "relatedSystemId": 1,
    "requestedPriority": "HIGH",
    "summary": "Laptop battery drains quickly after OS update",
    "description": "The laptop battery decreases from 100% to 10% within 45 minutes."
  }
  ```
* **Behavior**:
  * `ticketNo` generated transactionally (`TKT-YYYY-NNNNN`).
  * `status` initialized to `New`.
  * `itPriority` automatically initialized copying `requestedPriority` (`Lab_3_sheet.pdf`, Section 4.5).
* **Success Response `201 Created`**: Returns full ticket object.

### 4.3 `GET /api/tickets` (Requester's My Tickets)
* **Purpose**: Retrieve tickets owned exclusively by the authenticated user (`Lab_3_sheet.pdf`, Section 4.3).
* **Access**: Authenticated `Requester`.
* **Query Parameters**: `search`, `category`, `status`, `priority`, `sortBy`, `sortOrder`, `page`, `limit`.
* **Success Response `200 OK`**: Paginated array of owned tickets.

### 4.4 `GET /api/tickets/:id` (Ticket Detail)
* **Purpose**: Retrieve ticket detail.
* **Access**: Owning `Requester`, or any `IT_STAFF`, or `ADMINISTRATOR`.
* **Behavior**:
  * Non-owning Requesters receive `403 Forbidden` (`Lab_3_sheet.pdf`, Section 6.2; Section 9.1 AC-03).
  * Includes `attachments` (excluding soft-removed binaries) and `comments` (Public Comments).
  * **Excludes** `internalNotes` when requested by a `Requester` (`Lab_3_sheet.pdf`, Section 4.4 BR-04; Section 9.1 AC-04).

### 4.5 `POST /api/tickets/:id/attachments`
* Preserved from Lab 2. Authenticated user must be ticket owner or IT Staff.

### 4.6 `GET /api/attachments/:id/download` & `DELETE /api/attachments/:id`
* Preserved from Lab 2. Downloads return `410 Gone` if soft-removed; deletion requires non-empty reason string.

### 4.7 `PATCH /api/tickets/:id/resolve-indication`
* **Purpose**: Requester indicates that the problem appears resolved (`Lab_3_sheet.pdf`, Section 1, Section 3, Section 4.4 BR-05, Section 8.2).
* **Access**: Owning `Requester`.
* **Request Body**:
  ```json
  { "isProblemAppearsResolved": true }
  ```
* **Success Response `200 OK`**:
  ```json
  {
    "id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "isProblemAppearsResolved": true,
    "status": "In Progress"
  }
  ```
* **Rule**: Does not set status to `Resolved` or `Closed` (`Lab_3_sheet.pdf`, Section 4.4 BR-05).

---

## 5. IT Staff Ticket Queue API (Feature-10)

### 5.1 `GET /api/staff/tickets`
* **Purpose**: Retrieve shared ticket queue for IT Staff operations (`Lab_3_sheet.pdf`, Section 6, Section 6.3, Section 8.3).
* **Access**: `IT_STAFF`, `ADMINISTRATOR` (Forbidden to `Requester` -> `403 Forbidden`).
* **Query Parameters**:
  * `search` (optional string): Case-insensitive match against `ticketNo` or `summary`.
  * `category` (optional int): Filter by `categoryId`.
  * `status` (optional string): Filter by `TicketStatus` (`New`, `Open`, `InProgress`, etc.).
  * `priority` (optional string): Filter by `RequestedPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  * `owner` (optional string): Filter by `unassigned`, `me`, or specific user ID.
  * `sortBy` (optional string): Sort field (`createdAt`, `updatedAt`, `ticketNo`, `requestedPriority`, `itPriority`). Default: `createdAt`.
  * `sortOrder` (optional string): `asc` or `desc`. Default: `desc`.
  * `page` (optional int): Page number (default: 1).
  * `limit` (optional int): Items per page (default: 10, max: 50).
* **Success Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
        "ticketNo": "TKT-2026-00012",
        "summary": "Cannot connect to campus VPN",
        "createdAt": "2026-09-15T08:30:00.000Z",
        "updatedAt": "2026-09-15T09:15:00.000Z",
        "category": { "id": 4, "name": "Network" },
        "requestedPriority": "HIGH",
        "itPriority": "HIGH",
        "status": "Open",
        "owner": { "id": 2, "displayName": "Sarah Johnson" },
        "requester": { "id": 5, "displayName": "Jennifer Anderson" },
        "isProblemAppearsResolved": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 42,
      "totalPages": 5
    }
  }
  ```

---

## 6. IT Staff Ticket Operations API (Feature-11)

### 6.1 `GET /api/staff/tickets/:id`
* **Purpose**: Retrieve comprehensive ticket detail for IT Staff workflows (`Lab_3_sheet.pdf`, Section 6, Section 8.4).
* **Access**: `IT_STAFF`, `ADMINISTRATOR`.
* **Success Response `200 OK`**: Returns full ticket object with attachments, public comments, and internal notes.

### 6.2 `PATCH /api/staff/tickets/:id/assignment`
* **Purpose**: Claim an unassigned ticket or reassign ownership (`Lab_3_sheet.pdf`, Section 1, Section 4.5, Section 6, Section 8.4).
* **Access**: `IT_STAFF`, `ADMINISTRATOR`.
* **Request Body**:
  ```json
  {
    "ownerId": 2
  }
  ```
  *(Pass `ownerId: null` to unassign, or the target active IT Staff/Admin user ID).*
* **Success Response `200 OK`**:
  ```json
  {
    "id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "ownerId": 2,
    "owner": { "id": 2, "displayName": "Sarah Johnson" }
  }
  ```
* **Error Response `422 Unprocessable Entity`**: Assigned user does not exist, is inactive, or does not have `IT_STAFF` or `ADMINISTRATOR` role.

### 6.3 `PATCH /api/staff/tickets/:id/priority`
* **Purpose**: Update IT Priority (`Lab_3_sheet.pdf`, Section 1, Section 4.5, Section 6, Section 8.4).
* **Access**: `IT_STAFF`, `ADMINISTRATOR`.
* **Request Body**:
  ```json
  { "itPriority": "URGENT" }
  ```
* **Success Response `200 OK`**: Returns updated ticket with new `itPriority`.

### 6.4 `PATCH /api/staff/tickets/:id/status`
* **Purpose**: Update ticket status following permitted transition rules (`Lab_3_sheet.pdf`, Section 4.5, Section 6, Section 8.4).
* **Access**: `IT_STAFF`, `ADMINISTRATOR`.
* **Request Body**:
  ```json
  {
    "status": "Resolved",
    "resolutionSummary": "Configured VPN routing table on user endpoint."
  }
  ```
* **Success Response `200 OK`**:
  ```json
  {
    "id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "status": "Resolved",
    "resolutionSummary": "Configured VPN routing table on user endpoint."
  }
  ```
* **Error Response `422 Unprocessable Entity`**: Invalid status transition attempted (e.g. `New` -> `Resolved` without intermediate workflow).

### 6.5 `POST /api/tickets/:id/comments` (Public Comments)
* **Purpose**: Add append-only Public Comment (`Lab_3_sheet.pdf`, Section 4.4 BR-04, Section 4.6, Section 6, Section 8.4).
* **Access**: Authenticated `Requester` (if ticket owner), `IT_STAFF`, or `ADMINISTRATOR`.
* **Request Body**:
  ```json
  { "content": "Thank you for the update. The issue appears only when on campus Wi-Fi." }
  ```
* **Success Response `201 Created`**:
  ```json
  {
    "id": "a1b2c3d4-uuid-string",
    "ticketId": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "authorId": 1,
    "author": { "displayName": "Somchai Pattana", "role": "REQUESTER" },
    "content": "Thank you for the update. The issue appears only when on campus Wi-Fi.",
    "createdAt": "2026-09-15T10:00:00.000Z"
  }
  ```
* **Error Response `422 Unprocessable Entity`**: Empty or whitespace-only content (`Lab_3_sheet.pdf`, Section 4.6).

### 6.6 `GET /api/tickets/:id/comments`
* **Purpose**: Retrieve Public Comments for a ticket.
* **Access**: Owning `Requester`, `IT_STAFF`, `ADMINISTRATOR`.
* **Success Response `200 OK`**: Array of comment objects sorted by `createdAt ASC`.

### 6.7 `POST /api/staff/tickets/:id/notes` (Internal Notes)
* **Purpose**: Add append-only private Internal Note (`Lab_3_sheet.pdf`, Section 4.4 BR-04, Section 4.6, Section 6, Section 8.4).
* **Access**: `IT_STAFF`, `ADMINISTRATOR` only. (Returns `403 Forbidden` for `Requester` without leaking note existence, `Lab_3_sheet.pdf`, Section 6.2; Section 9.1 AC-04).
* **Request Body**:
  ```json
  { "content": "Checked radius server logs. User certificate expired yesterday." }
  ```
* **Success Response `201 Created`**:
  ```json
  {
    "id": "e5f6a7b8-uuid-string",
    "ticketId": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "authorId": 2,
    "author": { "displayName": "Sarah Johnson", "role": "IT_STAFF" },
    "content": "Checked radius server logs. User certificate expired yesterday.",
    "createdAt": "2026-09-15T10:15:00.000Z"
  }
  ```

### 6.8 `GET /api/staff/tickets/:id/notes`
* **Purpose**: Retrieve Internal Notes for a ticket.
* **Access**: `IT_STAFF`, `ADMINISTRATOR` only (`403 Forbidden` for `Requester`).
* **Success Response `200 OK`**: Array of note objects sorted by `createdAt ASC`.

---

## 7. Administrator User Management API (Feature-12)

All endpoints in this section require `ADMINISTRATOR` role (`Lab_3_sheet.pdf`, Section 4.3, Section 6, Section 8.5). Any access by `Requester` or `IT_STAFF` returns `403 Forbidden`.

### 7.1 `GET /api/admin/users`
* **Purpose**: Retrieve list of users with search and role filter (`Lab_3_sheet.pdf`, Section 6, Section 8.5).
* **Access**: `ADMINISTRATOR`.
* **Query Parameters**:
  * `search` (optional string): Search across `displayName` and `email`.
  * `role` (optional string): Filter by `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
* **Success Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "email": "jennifer.anderson@kmutt.ac.th",
      "displayName": "Jennifer Anderson",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-01T08:00:00.000Z"
    },
    {
      "id": 2,
      "email": "sarah.johnson@kmutt.ac.th",
      "displayName": "Sarah Johnson",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-01T08:00:00.000Z"
    }
  ]
  ```

### 7.2 `POST /api/admin/users`
* **Purpose**: Create a new user with one permitted role and initial password (`Lab_3_sheet.pdf`, Section 4.4, Section 6, Section 8.5).
* **Access**: `ADMINISTRATOR`.
* **Request Body**:
  ```json
  {
    "displayName": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF",
    "isActive": true,
    "initialPassword": "InitialPassword123!"
  }
  ```
* **Success Response `201 Created`**:
  ```json
  {
    "id": 10,
    "displayName": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": true,
    "createdAt": "2026-09-15T11:00:00.000Z"
  }
  ```
* **Error Responses**:
  * `409 Conflict`: Email address already registered (`Lab_3_sheet.pdf`, Section 4.4).
  * `422 Unprocessable Entity`: Invalid role or password fails complexity rules.

### 7.3 `PATCH /api/admin/users/:id`
* **Purpose**: Update user's name, email, role, and activation state (`Lab_3_sheet.pdf`, Section 4.4, Section 6, Section 8.5).
* **Access**: `ADMINISTRATOR`.
* **Request Body**:
  ```json
  {
    "displayName": "Alex Thompson Updated",
    "email": "alex.t@toktickit.com",
    "role": "IT_STAFF",
    "isActive": false
  }
  ```
* **Safety Rules Enforced on Server**:
  * If `req.user.id === targetId && isActive === false`: Reject with `422 Unprocessable Entity` ("Administrators cannot deactivate their own account", `Lab_3_sheet.pdf`, Section 4.4).
  * If target user is the sole active Administrator and update attempts deactivation or role change: Reject with `422 Unprocessable Entity` ("Cannot remove or deactivate the last active Administrator", `Lab_3_sheet.pdf`, Section 4.4).
* **Success Response `200 OK`**: Returns updated user object.

### 7.4 `POST /api/admin/users/:id/reset-password`
* **Purpose**: Issue a new initial password that the user must change at next login (`Lab_3_sheet.pdf`, Section 4.4, Section 6, Section 8.5).
* **Access**: `ADMINISTRATOR`.
* **Request Body**:
  ```json
  {
    "newInitialPassword": "TemporaryPass2026!"
  }
  ```
* **Behavior**:
  * Updates `passwordHash`.
  * Sets `mustChangePassword = true` (`Lab_3_sheet.pdf`, Section 4.4, Section 8.5).
* **Success Response `200 OK`**:
  ```json
  {
    "message": "Initial password reset successfully. User must change password at next login.",
    "mustChangePassword": true
  }
  ```

---

## 8. Role-Based Access Control (RBAC) Security Matrix

| Endpoint Pattern | Method | Requester | IT Staff | Administrator |
|---|---|:---:|:---:|:---:|
| `/api/auth/login` | `POST` | Allow | Allow | Allow |
| `/api/auth/logout` | `POST` | Allow | Allow | Allow |
| `/api/auth/me` | `GET` | Allow | Allow | Allow |
| `/api/auth/change-password` | `POST` | Allow | Allow | Allow |
| `/api/categories` | `GET` | Allow | Allow | Allow |
| `/api/related-systems` | `GET` | Allow | Allow | Allow |
| `/api/tickets` (Create) | `POST` | Allow (owns) | Allow (owns) | Allow (owns) |
| `/api/tickets` (List) | `GET` | Allow (own only) | Allow (own only) | Allow (own only) |
| `/api/tickets/:id` | `GET` | Allow (if owner) | Allow (any) | Allow (any) |
| `/api/tickets/:id/resolve-indication` | `PATCH` | Allow (if owner) | Deny (`403`) | Deny (`403`) |
| `/api/tickets/:id/comments` | `GET` / `POST` | Allow (if owner) | Allow (any) | Allow (any) |
| `/api/staff/tickets` (Queue) | `GET` | Deny (`403`) | Allow | Allow |
| `/api/staff/tickets/:id` | `GET` | Deny (`403`) | Allow | Allow |
| `/api/staff/tickets/:id/assignment` | `PATCH` | Deny (`403`) | Allow | Allow |
| `/api/staff/tickets/:id/priority` | `PATCH` | Deny (`403`) | Allow | Allow |
| `/api/staff/tickets/:id/status` | `PATCH` | Deny (`403`) | Allow | Allow |
| `/api/staff/tickets/:id/notes` | `GET` / `POST` | Deny (`403`) | Allow | Allow |
| `/api/admin/users*` | All | Deny (`403`) | Deny (`403`) | Allow |
