# Lab 2 REST API Contract Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Approved API Design Baseline
* **Target Version**: `/api`
* **Base References**:
  * `TokTickIT-System-Level-SDS-v1.0.pdf` (Section *API Design Standards*, Section *Security Architecture*)
  * `docs/lab-02/Lab_02_labsheet.pdf` (Section 6 *Required REST API Contract*)

---

## 1. General Principles & Conventions

* **Base Endpoint Path**: All application API endpoints are rooted under `/api`. Legacy Lab 1 endpoints `/api/health` and `/api/categories` remain accessible for backward compatibility.
* **Content Negotiation**: All request payloads and response bodies use JSON (`application/json`), except file upload endpoints (`multipart/form-data`) and file download endpoints (`binary stream`).
* **Property Naming**: Request and response fields use `camelCase`.
* **Date & Time Format**: All timestamps are formatted as UTC ISO 8601 strings (e.g. `2026-09-03T12:00:00.000Z`).
* **Standard Error Response Envelope** (`TokTickIT-System-Level-SDS-v1.0.pdf`, Section *API Design Standards*, line 1027):
  ```json
  {
    "error": {
      "code": "ERROR_CODE_STRING",
      "message": "Human-readable error explanation",
      "fieldErrors": [
        { "field": "summary", "message": "Summary must be at least 5 characters long." }
      ],
      "correlationId": "uuid-v4-string"
    }
  }
  ```

---

## 2. HTTP Status Code Conventions

| Status Code | Description | Usage Scenario |
|---|---|---|
| `200 OK` | Successful operation | Retrieval of collections, single records, download stream, soft removal success |
| `201 Created` | Resource created | Ticket created, Attachment uploaded |
| `400 Bad Request` | Malformed payload | Missing JSON payload, invalid query parameters |
| `403 Forbidden` | Ownership / authorization denial | Direct access attempt to a ticket or attachment owned by another requester |
| `404 Not Found` | Resource does not exist | Ticket or attachment ID not found |
| `409 Conflict` | Stale update or conflict | Optimistic concurrency version mismatch |
| `410 Gone` | Resource removed | Attempt to download a soft-removed attachment binary |
| `422 Unprocessable Entity` | Field validation failure | Invalid file extension, file size > 5 MB, missing required ticket summary |
| `500 Internal Server Error` | Unexpected server exception | Database connection error, disk failure (logs correlation ID, hides stack trace) |

---

## 3. Detailed Endpoint Contracts

### 3.1 Reference Data Endpoints

#### 1. `GET /api/categories`
* **Purpose**: Retrieve active ticket categories.
* **Response `200 OK`**:
  ```json
  [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
  ```

#### 2. `GET /api/related-systems`
* **Purpose**: Retrieve active related systems for ticket classification.
* **Response `200 OK`**:
  ```json
  [
    { "id": 1, "name": "Email", "description": "Campus Email System" },
    { "id": 2, "name": "Campus Wi-Fi", "description": "Wireless Network Access" },
    { "id": 3, "name": "VPN", "description": "Remote Access Service" },
    { "id": 4, "name": "LEB2 App", "description": "Learning Management System" },
    { "id": 5, "name": "Grade Submission App", "description": "Faculty Grading Portal" },
    { "id": 6, "name": "Printer", "description": "Network Printing Services" }
  ]
  ```

#### 3. `GET /api/requesters/active`
* **Purpose**: Retrieve active Development Requesters for the identity selection dropdown. Excludes inactive requesters (`isActive = false`) (`docs/lab-02/Lab_02_labsheet.pdf`, Section 5.3).
* **Response `200 OK`**:
  ```json
  [
    { "id": 1, "email": "somchai.p@kmutt.ac.th", "displayName": "Somchai Pattana" },
    { "id": 2, "email": "ananya.s@kmutt.ac.th", "displayName": "Ananya Srisuk" },
    { "id": 3, "email": "chattarin.k@kmutt.ac.th", "displayName": "Chattarin Kiat" },
    { "id": 4, "email": "nattaya.w@kmutt.ac.th", "displayName": "Nattaya Wong" }
  ]
  ```

---

### 3.2 Ticket Management Endpoints

#### 4. `POST /api/tickets`
* **Purpose**: Create a new IT support ticket for the selected Development Requester.
* **Request Headers**: `X-Development-Requester-Id: 1` (or request body `requesterId: 1`)
* **Request Body**:
  ```json
  {
    "requesterId": 1,
    "categoryId": 2,
    "relatedSystemId": 1,
    "requestedPriority": "HIGH",
    "summary": "Laptop battery drains quickly after OS update",
    "description": "The laptop battery decreases from 100% to 10% within 45 minutes of standard usage."
  }
  ```
* **Response `201 Created`**:
  ```json
  {
    "id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "ticketNo": "TKT-2026-00001",
    "summary": "Laptop battery drains quickly after OS update",
    "description": "The laptop battery decreases from 100% to 10% within 45 minutes of standard usage.",
    "status": "New",
    "requestedPriority": "HIGH",
    "requesterId": 1,
    "categoryId": 2,
    "relatedSystemId": 1,
    "version": 1,
    "createdAt": "2026-09-03T12:30:00.000Z",
    "updatedAt": "2026-09-03T12:30:00.000Z"
  }
  ```
* **Response `422 Unprocessable Entity`** (Validation Failure):
  ```json
  {
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "Ticket creation failed due to invalid field values.",
      "fieldErrors": [
        { "field": "summary", "message": "Summary must be between 5 and 120 characters long." }
      ],
      "correlationId": "8f3b2c1a-9876-5432-10fe-dcba98765432"
    }
  }
  ```

#### 5. `GET /api/tickets`
* **Purpose**: Retrieve a paginated list of tickets owned by the selected Development Requester.
* **Query Parameters**:
  * `requesterId` (required, Int): ID of active requester context.
  * `search` (optional, String): Keyword search against `summary` or `ticketNo`.
  * `categoryId` (optional, Int): Filter by category ID.
  * `status` (optional, String): Filter by ticket status (e.g. `New`).
  * `priority` (optional, String): Filter by priority (e.g. `HIGH`).
  * `sortBy` (optional, String): Field to sort by (`createdAt`, `ticketNo`, `requestedPriority`, `summary`). Default: `createdAt`.
  * `sortOrder` (optional, String): `asc` or `desc`. Default: `desc`.
  * `page` (optional, Int): Page number (1-indexed). Default: `1`.
  * `limit` (optional, Int): Items per page (max 50). Default: `10`.
* **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
        "ticketNo": "TKT-2026-00001",
        "summary": "Laptop battery drains quickly after OS update",
        "status": "New",
        "requestedPriority": "HIGH",
        "category": { "id": 2, "name": "Hardware" },
        "relatedSystem": { "id": 1, "name": "Email" },
        "attachmentCount": 1,
        "createdAt": "2026-09-03T12:30:00.000Z",
        "updatedAt": "2026-09-03T12:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 1,
      "totalPages": 1
    }
  }
  ```

#### 6. `GET /api/tickets/:id`
* **Purpose**: Retrieve detailed information for a single owned ticket.
* **Headers / Parameters**: `X-Development-Requester-Id: 1`
* **Response `200 OK`**:
  ```json
  {
    "id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "ticketNo": "TKT-2026-00001",
    "summary": "Laptop battery drains quickly after OS update",
    "description": "The laptop battery decreases from 100% to 10% within 45 minutes of standard usage.",
    "status": "New",
    "requestedPriority": "HIGH",
    "requester": { "id": 1, "displayName": "Somchai Pattana", "email": "somchai.p@kmutt.ac.th" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 1, "name": "Email" },
    "attachments": [
      {
        "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
        "originalFilename": "battery_diagnostics.pdf",
        "mimeType": "application/pdf",
        "sizeBytes": 1048576,
        "isDeleted": false,
        "createdAt": "2026-09-03T12:31:00.000Z"
      }
    ],
    "createdAt": "2026-09-03T12:30:00.000Z",
    "updatedAt": "2026-09-03T12:30:00.000Z"
  }
  ```
* **Response `403 Forbidden`** (Ownership Violation):
  ```json
  {
    "error": {
      "code": "OWNERSHIP_DENIED",
      "message": "You are not authorized to view this ticket.",
      "correlationId": "7a6b5c4d-3e2f-1a0b-9c8d-7e6f5a4b3c2d"
    }
  }
  ```

---

### 3.3 Attachment Endpoints

#### 7. `POST /api/tickets/:id/attachments`
* **Purpose**: Upload an attachment file to an existing owned ticket.
* **Content-Type**: `multipart/form-data`
* **Form Fields**: `file` (Binary), `uploaderId` (Int)
* **Response `201 Created`**:
  ```json
  {
    "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    "ticketId": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "originalFilename": "screenshot.png",
    "mimeType": "image/png",
    "sizeBytes": 245760,
    "createdAt": "2026-09-03T12:35:00.000Z"
  }
  ```
* **Response `422 Unprocessable Entity`** (Oversized file or unsupported type):
  ```json
  {
    "error": {
      "code": "INVALID_ATTACHMENT",
      "message": "File exceeds maximum permitted size of 5 MB.",
      "correlationId": "5c4d3e2f-1a0b-9c8d-7e6f-5a4b3c2d1e0f"
    }
  }
  ```

#### 8. `GET /api/attachments/:id/download`
* **Purpose**: Download binary attachment content.
* **Response `200 OK`**: Streams file binary with `Content-Type: application/pdf` or `image/png` and `Content-Disposition: attachment; filename="battery_diagnostics.pdf"`.
* **Response `410 Gone`** (Soft-Removed Attachment):
  ```json
  {
    "error": {
      "code": "ATTACHMENT_DELETED",
      "message": "This attachment has been soft-removed and cannot be downloaded.",
      "correlationId": "4d3e2f1a-0b9c-8d7e-6f5a-4b3c2d1e0f9a"
    }
  }
  ```

#### 9. `DELETE /api/attachments/:id`
* **Purpose**: Soft-remove an attachment owned by the selected requester.
* **Request Body**:
  ```json
  {
    "removerId": 1,
    "reason": "Uploaded sensitive credential file by mistake"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "message": "Attachment soft-removed successfully.",
    "attachmentId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    "deletedAt": "2026-09-03T12:40:00.000Z"
  }
  ```
