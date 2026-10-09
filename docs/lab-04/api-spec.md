# Lab 4 REST API Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Sprint 4 Authoritative REST API Specification
* **Target Sprint**: Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression
* **Target Branch**: `lab4-staging`
* **Base References**:
  * `docs/lab-04/SE_Lab_4.pdf` (Section 4.3, Section 4.5, Section 4.6, Section 6, Section 6.1, Section 6.2)
  * `docs/lab-03/api-spec.md` (Lab 3 API Specification Baseline)
  * `server/src/app.ts` (Existing REST API Implementation)

---

## 1. General Principles & Conventions
* **Base URL**: `/api` (configured via `VITE_API_URL` on client).
* **Authentication**: All endpoints require a valid JWT bearer token in the `Authorization: Bearer <token>` header unless explicitly marked public.
* **Payloads**: All request and response bodies use `application/json; charset=utf-8`.
* **Standard Error Response Format**:
  ```json
  {
    "error": "Human readable error message",
    "details": null
  }
  ```
* **Optimistic Concurrency Control**:
  Mutating ticket endpoints accept an optional/required `version` integer in the request body. If `version` does not match the stored database version, a `409 Conflict` is returned (`SE_Lab_4.pdf`, Section 5.1, Section 6.1).

---

## 2. HTTP Status Code Conventions
* `200 OK`: Request succeeded; returned with data payload.
* `201 Created`: Resource successfully created; returned with the created object.
* `400 Bad Request`: Validation failure, missing required fields, or illegal state transition.
* `401 Unauthorized`: Missing, expired, or invalid JWT token.
* `403 Forbidden`: Authenticated user lacks required role or ownership permissions.
* `404 Not Found`: Target resource does not exist.
* `409 Conflict`: Concurrency conflict (stale `version` mismatch) or race condition.
* `500 Internal Server Error`: Unhandled server error with safe generic error message.

---

## 3. Feature-13: Actions Taken Endpoints

### 3.1 `POST /api/tickets/:id/actions-taken`
Creates a new Action Taken line under the specified ticket (`SE_Lab_4.pdf`, Section 3, Section 4.3, Section 8.3).

* **Authorization**: `IT_STAFF` or `ADMINISTRATOR` only. Requesters receive `403 Forbidden`.
* **Request Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
* **URL Parameters**:
  * `id`: UUID of the parent Ticket.
* **Request Body**:
  ```json
  {
    "actionDateTime": "2026-10-09T14:30:00.000Z",
    "description": "Inspected network switch in server room 2",
    "result": "Port 14 was disabled due to loopback detection; re-enabled port and cleared error.",
    "followUpRequired": true,
    "followUpNote": "Monitor interface CRC errors over next 24 hours.",
    "attachmentNotes": "switch-logs-port14.txt"
  }
  ```
  * `actionDateTime` `[Optional / Defaults to now]`: ISO 8601 timestamp.
  * `description` `[Required]`: Non-empty string.
  * `result` `[Required]`: Non-empty string.
  * `followUpRequired` `[Required]`: Boolean.
  * `followUpNote` `[Conditional]`: Required if `followUpRequired === true`. Must be non-empty string.
  * `attachmentNotes` `[Optional]`: Text reference indicating related files or diagnostic artifacts.
* **Response `201 Created`**:
  ```json
  {
    "id": "c1f7a28e-5b23-45ef-962a-89a194bc0281",
    "ticketId": "a908f972-e0fb-40c0-b59a-16f3d132ce44",
    "performedById": 2,
    "performedBy": {
      "id": 2,
      "displayName": "Michael Brown",
      "email": "michael.brown@kmutt.ac.th",
      "role": "IT_STAFF"
    },
    "actionDateTime": "2026-10-09T14:30:00.000Z",
    "description": "Inspected network switch in server room 2",
    "result": "Port 14 was disabled due to loopback detection; re-enabled port and cleared error.",
    "followUpRequired": true,
    "followUpNote": "Monitor interface CRC errors over next 24 hours.",
    "attachmentNotes": "switch-logs-port14.txt",
    "createdAt": "2026-10-09T14:31:05.123Z",
    "updatedAt": "2026-10-09T14:31:05.123Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: `{"error": "Follow-up note is required when follow-up is needed"}`
  * `401 Unauthorized`: `{"error": "Authentication token missing or invalid"}`
  * `403 Forbidden`: `{"error": "Requesters are not permitted to create Actions Taken"}`
  * `404 Not Found`: `{"error": "Ticket not found"}`

### 3.2 `GET /api/tickets/:id/actions-taken`
Retrieves all Actions Taken records for the ticket, ordered chronologically (`SE_Lab_4.pdf`, Section 4.3, Section 8.3).

* **Authorization**:
  * `IT_STAFF` / `ADMINISTRATOR`: Access to any accessible ticket.
  * `REQUESTER`: Permitted **only** if the ticket is owned by the requester (`ticket.requesterId === req.user.id`).
* **Response `200 OK`**:
  ```json
  [
    {
      "id": "c1f7a28e-5b23-45ef-962a-89a194bc0281",
      "ticketId": "a908f972-e0fb-40c0-b59a-16f3d132ce44",
      "performedById": 2,
      "performedBy": {
        "id": 2,
        "displayName": "Michael Brown",
        "email": "michael.brown@kmutt.ac.th",
        "role": "IT_STAFF"
      },
      "actionDateTime": "2026-10-09T14:30:00.000Z",
      "description": "Inspected network switch in server room 2",
      "result": "Port 14 re-enabled.",
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": null,
      "createdAt": "2026-10-09T14:31:05.123Z",
      "updatedAt": "2026-10-09T14:31:05.123Z"
    }
  ]
  ```
* **Error Responses**:
  * `403 Forbidden`: `{"error": "Access denied: you do not own this ticket"}`
  * `404 Not Found`: `{"error": "Ticket not found"}`

### 3.3 `PATCH /api/tickets/:id/actions-taken/:actionId`
Updates an existing Action Taken record (`SE_Lab_4.pdf`, Section 4.3, Section 8.3).

* **Authorization**: `ADMINISTRATOR` or the original author (`performedById === req.user.id`).
* **Request Body**: Partial update containing `description`, `result`, `followUpRequired`, `followUpNote`, or `attachmentNotes`.
* **Response `200 OK`**: Returns updated `ActionTaken` object.
* **Error Responses**:
  * `400 Bad Request`: Validation failure on updated fields.
  * `403 Forbidden`: User is not the author or an Administrator.
  * `404 Not Found`: Action Taken record not found.

---

## 4. Feature-14: Ticket Status Workflow, Resolution Gate & Concurrency Endpoints

### 4.1 `PATCH /api/staff/tickets/:id/status`
Updates a ticket's status while enforcing the canonical status matrix, resolution gate, and optimistic concurrency check (`SE_Lab_4.pdf`, Section 4.5, Section 6.1).

* **Authorization**: `IT_STAFF` or `ADMINISTRATOR`.
* **Request Body**:
  ```json
  {
    "status": "Resolved",
    "version": 3,
    "resolutionSummary": "Replaced faulty Ethernet patch cable and verified Gigabit link."
  }
  ```
  * `status` `[Required]`: One of `Open`, `InProgress`, `WaitingForRequester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`.
  * `version` `[Required]`: Current ticket version counter integer.
  * `resolutionSummary` `[Optional / Conditional]`: Resolution summary note.
* **Resolution Gate Validation (`SE_Lab_4.pdf`, Section 4.5; Proposed Decision BR-08)**:
  When `status === "Resolved"`:
  1. The server checks that the ticket has at least one associated `ActionTaken` (`count >= 1`).
  2. The server checks that `ownerId` is populated with an active IT Staff / Admin user.
  3. If unfulfilled, responds with `400 Bad Request`: `{"error": "Ticket resolution requires at least one recorded Action Taken."}`
* **Optimistic Concurrency Check (`SE_Lab_4.pdf`, Section 6.1; Proposed Decision BR-10)**:
  If `body.version !== ticket.version`:
  * Responds with `409 Conflict`: `{"error": "Ticket has been modified by another user. Please refresh and retry.", "currentVersion": 4}`
* **Response `200 OK`**:
  ```json
  {
    "id": "a908f972-e0fb-40c0-b59a-16f3d132ce44",
    "ticketNo": "TKT-2026-00042",
    "status": "Resolved",
    "version": 4,
    "resolutionSummary": "Replaced faulty Ethernet patch cable.",
    "updatedAt": "2026-10-09T14:45:00.000Z"
  }
  ```

### 4.2 `PATCH /api/tickets/:id/problem-resolved` (Requester Continuity)
Allows the owning Requester to signal that the reported problem appears resolved (`SE_Lab_4.pdf`, Section 3, Section 4.5).

* **Authorization**: `REQUESTER` owning the ticket.
* **Behavior**: Sets `isProblemAppearsResolved = true`. **Does NOT** alter `ticket.status`.
* **Response `200 OK`**: Returns updated ticket with `isProblemAppearsResolved: true`.

---

## 5. Feature-15: IT Staff Operational Dashboard API

### 5.1 `GET /api/staff/dashboard`
Returns concise operational metrics and recent assigned tickets for the authenticated IT Staff or Administrator user (`SE_Lab_4.pdf`, Section 4.6, Section 6.2, Section 8.1, page 5 mockup).

* **Authorization**: `IT_STAFF` or `ADMINISTRATOR` only. Requesters receive `403 Forbidden`.
* **Calculation Window**: Trends calculate delta against count at `00:00:00 UTC` today (`Proposed Decision BR-11`).
* **Response `200 OK`**:
  ```json
  {
    "metrics": {
      "new": { "count": 14, "deltaFromYesterday": 3 },
      "open": { "count": 23, "deltaFromYesterday": -2 },
      "inProgress": { "count": 18, "deltaFromYesterday": 1 },
      "waitingForRequester": { "count": 7, "deltaFromYesterday": 0 },
      "myAssigned": { "count": 16, "deltaFromYesterday": 4 }
    },
    "recentTickets": [
      {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "ticketNo": "TKT-2026-00034",
        "summary": "Laptop battery drains quickly",
        "status": "InProgress",
        "itPriority": "MEDIUM",
        "updatedAt": "2026-10-09T09:14:00.000Z"
      }
    ],
    "adminCounts": {
      "totalUsers": 28,
      "activeUsers": 26
    }
  }
  ```
  * `adminCounts`: Returned only if the authenticated user has role `ADMINISTRATOR` (`SE_Lab_4.pdf`, Section 4.6).

---

## 6. Feature-16: Requester Dashboard API

### 6.1 `GET /api/requester/dashboard`
Returns concise metrics and recent tickets strictly for the authenticated Requester (`SE_Lab_4.pdf`, Section 4.6, Section 6.2, Section 8.2, page 6 mockup).

* **Authorization**: Authenticated `REQUESTER` (or any authenticated user accessing their own view).
* **Isolation Rule**: Queries are strictly scoped to `where: { requesterId: req.user.id }` (`SE_Lab_4.pdf`, Section 8.2, Section 9.1 AC-02).
* **Response `200 OK`**:
  ```json
  {
    "metrics": {
      "myOpenTickets": 3,
      "inProgress": 2,
      "resolved": 5,
      "closed": 12
    },
    "recentTickets": [
      {
        "id": "e2a1458b-01d8-4f8e-902e-c7ff41fa02a1",
        "ticketNo": "TKT-2026-00034",
        "summary": "Laptop battery drains quickly",
        "status": "InProgress",
        "updatedAt": "2026-10-09T09:14:00.000Z"
      }
    ]
  }
  ```

---

## 7. Role-Based Access Control (RBAC) Security Matrix

| Endpoint | Method | Requester | IT Staff | Administrator |
|---|---|:---:|:---:|:---:|
| `/api/auth/login` | `POST` | Permitted | Permitted | Permitted |
| `/api/auth/logout` | `POST` | Permitted | Permitted | Permitted |
| `/api/auth/me` | `GET` | Permitted | Permitted | Permitted |
| `/api/auth/change-password` | `POST` | Permitted | Permitted | Permitted |
| `/api/tickets` | `POST` | Permitted | Permitted | Permitted |
| `/api/tickets` (My Tickets) | `GET` | Owned only | Permitted | Permitted |
| `/api/tickets/:id` | `GET` | Owned only | Permitted | Permitted |
| `/api/tickets/:id/actions-taken` | `POST` | **403 Forbidden** | **Permitted** | **Permitted** |
| `/api/tickets/:id/actions-taken` | `GET` | Owned only (Read) | Permitted | Permitted |
| `/api/tickets/:id/actions-taken/:actionId` | `PATCH` | **403 Forbidden** | Author only | **Permitted** |
| `/api/tickets/:id/problem-resolved` | `PATCH` | Owned only | **403 Forbidden** | **403 Forbidden** |
| `/api/staff/tickets` (Queue) | `GET` | **403 Forbidden** | **Permitted** | **Permitted** |
| `/api/staff/tickets/:id/status` | `PATCH` | **403 Forbidden** | **Permitted** | **Permitted** |
| `/api/staff/dashboard` | `GET` | **403 Forbidden** | **Permitted** | **Permitted** |
| `/api/requester/dashboard` | `GET` | **Permitted** (Owned) | Permitted (Self) | Permitted (Self) |
| `/api/admin/users` | All | **403 Forbidden** | **403 Forbidden** | **Permitted** |
