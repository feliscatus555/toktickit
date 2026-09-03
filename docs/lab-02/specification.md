# Lab 2 Sprint Engineering Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Draft Sprint 2 Specification Baseline
* **Target Sprint**: Lab 2 — Requester Ticketing MVP with UI Foundation
* **Target Branch**: `lab2-staging`
* **Base References**:
  * `TokTickIT-S
  ystem-Level-SDS-v1.0.pdf` (System-Level SDS)
  * `docs/lab-02/Lab_02_labsheet.pdf` (Lab 2 Labsheet & Handout)

---

## 1. Sprint Goal
Deliver the Requester-facing application increment of TokTickIT using a temporary Development Requester identity selection mechanism ("simulated login"). By the end of Sprint 2, an end-user Requester can select a seeded requester identity, create an IT support ticket with permitted attachments, receive a system-generated unique Ticket Number (`TKT-YYYY-NNNNN`), view owned tickets in My Tickets (with search, filtering, sorting, and pagination), inspect owned ticket details, add additional attachments, and soft-remove owned attachments with a mandatory removal reason, adhering strictly to the Zen Green Theme UI specification and Spec-Driven / Test-Driven Development criteria.

---

## 2. Stakeholder Request Interpretation
The IT department requires a professional, responsive, end-user-facing ticketing experience. Requesters must describe an issue, choose category and related system, specify requested priority, attach evidence (max 5 MB, JPG/PNG/WEBP/PDF), and submit the ticket. Following creation, requesters can search, filter, and inspect their own tickets, as well as manage attachments. Direct cross-requester access to another user's tickets or attachments is prohibited. Because real authentication is introduced in Lab 3, Lab 2 provides a Development Requester selector screen as a testing mechanism.

---

## 3. Scope

### Included Scope
* **Feature-5: Development Requester Selection & Identity Context**: Active requester loading, dropdown selection screen, application shell requester context header, "Change Requester" action.
* **Feature-6: Ticket Creation (Create Mode)**: Form input, category/system selection, requested priority selection (Low, Medium, High, Urgent), file upload, ticket number generation (`TKT-YYYY-NNNNN`), field-level validation error handling.
* **Feature-7: My Tickets (List Mode)**: Paginated ticket list, keyword search, status/category/priority filtering, multi-column sorting, desktop table view, mobile card view, empty and no-results states, strict requester ownership isolation.
* **Feature-8: Requester Ticket Detail (View Mode & Attachment Management)**: Read-only display of owned ticket details, active attachment download, additional attachment upload, attachment soft removal with reason, deleted metadata tombstone presentation, backend access control enforcement.
* **Zen Green UI System**: Color tokens, typography, component field states, button hierarchy, badge presentation, responsive breakpoints (`< 768px`, `768-991px`, `>= 992px`), WCAG 2.2 AA accessibility standards.

### Excluded Scope
* **Authentication & Security**: Passwords, email/password login, password hashing, sessions, tokens, roles, and real RBAC (SDS Decision D-04 / D-05 deferred to Lab 3; `docs/lab-02/Lab_02_labsheet.pdf`, Section 4.2).
* **IT Staff Workflow**: IT Staff dashboard, claiming/reassigning tickets, IT priority changes, resolution/closing actions (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.2).
* **Ticket Collaboration**: Public Comments, Internal Notes, Actions Taken (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.2).
* **Ticket Status Lifecycle**: Status transitions beyond initial `New` status (resolving, closing, reopening, cancelling) (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.2).
* **Administration**: User/Requester/Category administration (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.2).

---

## 4. GitHub Issues Decomposition, Branch Flow & Merge Order

### Decomposition Strategy (4 Feature Implementations)
* **Issue 5 (or Issue 12)**: `Development Requester context and identity selection screen`
  * *Feature*: Feature-5
  * *Scope*: `RequesterUser` Prisma model, seed data, active requester selector API, selection screen UI, context provider.
  * *Branch Name*: `feature/5-dev-requester-context` (or `feature/12-dev-requester-context`)
* **Issue 6 (or Issue 13)**: `Ticket creation form, validation, and official number generation`
  * *Feature*: Feature-6
  * *Scope*: Ticket creation API (`POST /api/v1/tickets`), Ticket model migration, form UI, validation, `TKT-YYYY-NNNNN` generator.
  * *Branch Name*: `feature/6-ticket-creation` (or `feature/13-ticket-creation`)
* **Issue 7 (or Issue 14)**: `My Tickets list with search, filtering, sorting, and pagination`
  * *Feature*: Feature-7
  * *Scope*: Ticket list API (`GET /api/v1/tickets`), pagination/search/filtering/sorting, desktop/mobile responsive UI.
  * *Branch Name*: `feature/7-my-tickets-list` (or `feature/14-my-tickets-list`)
* **Issue 8 (or Issue 15)**: `Requester Ticket Detail view and attachment lifecycle`
  * *Feature*: Feature-8
  * *Scope*: Ticket detail API (`GET /api/v1/tickets/:id`), Attachment upload/download/soft-remove APIs, detail view UI, attachment section UI.
  * *Branch Name*: `feature/8-ticket-detail-and-attachments` (or `feature/15-ticket-detail-and-attachments`)

### Branch Flow & Integration Sequence
1. Create `lab2-staging` from `main`.
2. Each Feature developed on its dedicated feature branch (`feature/5` through `feature/8`).
3. Peer PR review from `feature/X` into `lab2-staging`.
4. Integration testing on `lab2-staging`.
5. Release PR from `lab2-staging` into `main`.

---

## 5. Functional Requirements (FR)

* **FR-01**: The system shall retrieve active Development Requesters from PostgreSQL for the Requester Selection Screen (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.1).
* **FR-02**: The system shall display a disclaimer stating the Requester selector is for Lab 2 testing only and does not constitute real authentication (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.1).
* **FR-03**: The application shell shall maintain the selected Requester identity and expose a "Change Requester" action (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.1).
* **FR-04**: The system shall allow a Requester to select a Category and Related System from active database records (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.4, Section 5.3).
* **FR-05**: The system shall allow a Requester to enter Ticket Summary and Description, and select Requested Priority (Low, Medium, High, Urgent) (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.4; SDS D-03).
* **FR-06**: The system shall automatically generate a unique Ticket Number (`TKT-YYYY-NNNNN`) upon creation (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.3 BR-01; SDS D-10).
* **FR-07**: The system shall set the initial status of newly created tickets to `New` (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.3 BR-02; SDS Section *Ticket Status Baseline*).
* **FR-08**: The system shall validate inputs and display field-level error messages immediately below invalid controls (`docs/lab-02/Lab_02_labsheet.pdf`, Section 7, Section 8.3).
* **FR-09**: The system shall support uploading permitted attachments (max 5 MB, JPG/PNG/WEBP/PDF, max 5 active attachments per ticket) during or after ticket creation (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.5; SDS Section *Attachment Architecture*).
* **FR-10**: The system shall allow requesters to view a paginated list of tickets owned exclusively by their selected identity (`docs/lab-02/Lab_02_labsheet.pdf`, Section 6.1, Section 8.4).
* **FR-11**: The system shall support searching tickets by summary or ticket number (`docs/lab-02/Lab_02_labsheet.pdf`, Section 6.1).
* **FR-12**: The system shall support filtering tickets by Category, Status, and Requested Priority (`docs/lab-02/Lab_02_labsheet.pdf`, Section 6.1).
* **FR-13**: The system shall support multi-column sorting (default: createdAt descending) (`docs/lab-02/Lab_02_labsheet.pdf`, Section 6.1).
* **FR-14**: The system shall present read-only Ticket Details to the owning Requester (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.5).
* **FR-15**: The system shall support soft-removing an active attachment with a required removal reason, preserving metadata tombstones while blocking file downloads (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.5; SDS Decision D-11).
* **FR-16**: The backend shall enforce ownership security, rejecting unauthorized direct API/URL access to another requester's ticket or attachment (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.5; SDS Section *Authorization Model*).

---

## 6. Business Rules (BR)

### Source Requirements (Fixed by SDS & Labsheet)
* **BR-01** `[Source Requirement]`: The official Ticket Number is generated by the backend transactionally using format `TKT-YYYY-NNNNN` and must be unique (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.3 BR-01; `TokTickIT-System-Level-SDS-v1.0.pdf`, Decision D-10).
* **BR-02** `[Source Requirement]`: A new Ticket begins with Current Status `New` (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.3 BR-02; `TokTickIT-System-Level-SDS-v1.0.pdf`, Section *Ticket Status Baseline*).
* **BR-03** `[Source Requirement]`: Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.3 BR-03).
* **BR-04** `[Source Requirement]`: Allowed attachment file extensions are JPG/JPEG, PNG, WEBP, and PDF only. Maximum file size is 5 MB per file. Maximum active attachments per ticket is 5 (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.5; `TokTickIT-System-Level-SDS-v1.0.pdf`, Section *Attachment Architecture*).
* **BR-05** `[Source Requirement]`: Attachment removal is implemented as soft removal. Deleted file binary is removed from SeaweedFS, but database metadata remains as a tombstone (`deletedAt`, `deletedById`). Soft-removed attachments cannot be downloaded or previewed (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.5; `TokTickIT-System-Level-SDS-v1.0.pdf`, Decision D-11, Section *Removal and Audit Sequence*).
* **BR-06** `[Source Requirement]`: Inactive Development Requesters (`isActive = false`) must not appear in the Development Requester selector (`docs/lab-02/Lab_02_labsheet.pdf`, Section 5.3).
* **BR-07** `[Source Requirement]`: Requester ownership isolation: A Requester can view and manage attachments only on tickets where `requesterId` matches their currently selected identity (`docs/lab-02/Lab_02_labsheet.pdf`, Section 3, Section 8.5; `TokTickIT-System-Level-SDS-v1.0.pdf`, Section *Authorization Model*).

### Proposed Decisions (Resolving Implementation Choices)
* **BR-08** `[Proposed Decision]`: Ticket Summary is required, trimmed of leading/trailing whitespace, with length constrained between 5 and 120 characters.
* **BR-09** `[Proposed Decision]`: Ticket Description is required, trimmed of leading/trailing whitespace, with length constrained between 10 and 2000 characters.
* **BR-10** `[Proposed Decision]`: Attachment upload transactional compensation: If ticket creation succeeds but initial attachment file upload fails, the database transaction rolls back ticket creation and notifies the user with preserved form values.
* **BR-11** `[Proposed Decision]`: Soft removal of an attachment requires a non-empty removal reason string between 1 and 255 characters.
* **BR-12** `[Proposed Decision]`: Pagination defaults to `page=1` and `limit=10` (maximum permitted `limit=50`). Invalid page numbers default to page 1.
* **BR-13** `[Proposed Decision]`: Default ticket list sorting is `createdAt` descending (`DESC`), with secondary sort by `id` descending.
* **BR-14** `[Proposed Decision]`: Direct URL or API access to a non-existent ticket returns `404 Not Found`. Access to an existing ticket owned by a different requester returns `403 Forbidden`.

---

## 7. UI Specification Summary
* Reference: [`docs/lab-02/ui-spec.md`](file:///home/iris/Documents/toktickit/docs/lab-02/ui-spec.md)
* **Visual Theme**: Zen Green Theme per Labsheet Section 7 (`#006B3C` Primary Green, `#0B7A46` Secondary Green, `#EAF6EF` Pale Green, `#F5F7F6` Page Background).
* **Controls**: Labels above inputs, red asterisks `*` for required fields, error messages below inputs in dark red text. Read-only fields shaded in soft gray-green (`#E9ECEF` / `#EAF6EF`).
* **Buttons**: Visible text required; busy/loading state disables controls and displays spinner.
* **Badges**: Priority and Status badges use text + icons/shapes (non-color-only).
* **Responsiveness**: Multi-column desktop (`>= 992px`), 2-column tablet (`768-991px`), single-column stacked mobile (`< 768px`).

---

## 8. Data Model & Prisma Schema Changes

### Entity Design
* **`RequesterUser`**: `id` (Int/UUID), `email` (String unique), `displayName` (String), `isActive` (Boolean default true), `createdAt` (DateTime).
* **`Category`**: `id` (Int), `name` (String unique), `createdAt` (DateTime). [Preserved from Lab 1 Baseline]
* **`RelatedSystem`**: `id` (Int), `name` (String unique), `description` (String?), `isActive` (Boolean default true), `createdAt` (DateTime).
* **`Ticket`**: `id` (UUID), `ticketNo` (String unique), `summary` (String), `description` (String), `status` (Enum `New`), `requestedPriority` (Enum `Low`, `Medium`, `High`, `Urgent`), `requesterId` (FK -> `RequesterUser`), `categoryId` (FK -> `Category`), `relatedSystemId` (FK -> `RelatedSystem`), `version` (Int default 1), `createdAt` (DateTime), `updatedAt` (DateTime).
* **`Attachment`**: `id` (UUID), `ticketId` (FK -> `Ticket`), `uploadedById` (FK -> `RequesterUser`), `originalFilename` (String), `mimeType` (String), `sizeBytes` (Int), `storageKey` (String), `deletedAt` (DateTime?), `deletedById` (FK -> `RequesterUser`?), `deletedReason` (String?), `createdAt` (DateTime).

### Primary Key Strategy Decision
* **Reference Data (`Category`, `RelatedSystem`, `RequesterUser`)**: Use `Int @id @default(autoincrement())` for simplicity and compatibility with Lab 1 baseline & labsheet examples (`"requesterId": 1`).
* **Domain Data (`Ticket`, `Attachment`)**: Use `String @id @default(uuid())` per `TokTickIT-System-Level-SDS-v1.0.pdf` Section *Domain Data Model* (line 529).

---

## 9. API Contract Summary
* Reference: [`docs/lab-02/api-spec.md`](file:///home/iris/Documents/toktickit/docs/lab-02/api-spec.md)
* **Base Path**: `/api/v1`
* **Endpoints**:
  * `GET /api/v1/categories` (200)
  * `GET /api/v1/related-systems` (200)
  * `GET /api/requesters/active` (200)
  * `POST /api/v1/tickets` (201, 400, 422, 500)
  * `GET /api/v1/tickets` (200, 400, 500)
  * `GET /api/v1/tickets/:id` (200, 403, 404, 500)
  * `POST /api/v1/tickets/:id/attachments` (201, 400, 403, 404, 422, 500)
  * `GET /api/v1/attachments/:id` (200, 403, 404, 500)
  * `GET /api/v1/attachments/:id/download` (200, 403, 404, 410, 500)
  * `DELETE /api/v1/attachments/:id` (200, 400, 403, 404, 500)

---

## 10. Acceptance Criteria (AC)

* **AC-01**: Given valid Ticket data, when the Requester submits the form, then one Ticket is saved, status is `New`, and official Ticket Number `TKT-YYYY-NNNNN` is displayed.
* **AC-02**: Given no Development Requester is selected, when attempting to navigate to Create Ticket or My Tickets, then the Development Requester Selection screen is displayed.
* **AC-03**: Given Requester B is selected, when direct access to a Ticket belonging to Requester A is attempted via API or URL, then access is denied with HTTP 403 Forbidden.
* **AC-04**: Given an invalid file type (e.g. `.exe`, `.zip`) or file size > 5 MB, when attempting to attach, then upload is rejected with a clear field validation error message.
* **AC-05**: Given a ticket with 5 active attachments, when attempting to upload a 6th attachment, then the upload is rejected with an attachment limit error message.
* **AC-06**: Given an active attachment owned by Requester A, when Requester A confirms soft removal with a valid reason, then the attachment status updates to soft-removed, metadata tombstone is retained, file download is blocked, and `ATTACHMENT_REMOVED` event is recorded.
* **AC-07**: Given a search query `laptop`, when filtering My Tickets, then only tickets matching `laptop` in summary or ticket number owned by the active requester are displayed.
* **AC-08**: Given Requester A is active, when switching active identity to Requester B, then My Tickets list reloads displaying only Requester B's tickets.
* **AC-09**: Given empty search/filter results, then a clear "No matching tickets found" message is displayed with a "Clear Filters" action.
* **AC-10**: Given mobile viewport (`< 768px`), when viewing My Tickets, then table transforms into responsive card stacks with full touch-friendly interaction targets and zero horizontal scrolling.

---

## 11. Definition of Done (DoD)

### Part 1: Product Completion Checklist
- [ ] All Features 5-8 implemented according to approved engineering contract.
- [ ] Prisma models and migrations applied cleanly.
- [ ] Seed script executes idempotently (`npm --prefix server run prisma:seed`).
- [ ] All automated unit, API, UI, responsive, and Playwright E2E tests pass cleanly.
- [ ] Responsive UI verified on Desktop (`>= 992px`), Tablet (`768-991px`), and Mobile (`< 768px`).
- [ ] Form input preserved on API failure; safe error messages rendered.

### Part 2: Course Delivery Checklist
- [ ] GitHub Issues 11 through 15 created on Kanban board.
- [ ] Feature branches merged into `lab2-staging` via peer-reviewed Pull Requests.
- [ ] Release PR merged from `lab2-staging` into `main`.
- [ ] PDF submission compiled in required 9-part format.

---

## 12. Decision Register & Traceability Matrix

| Item | Source / Type | Decision / Value | Reference |
|---|---|---|---|
| Product Spelling | Source Requirement | `TokTickIT` | SDS Decision D-01 |
| Priority Vocabulary | Source Requirement | `Low`, `Medium`, `High`, `Urgent` | SDS Decision D-03 |
| Ticket Number Format | Source Requirement | `TKT-YYYY-NNNNN` | SDS Decision D-10; Labsheet BR-01 |
| Theme Palette | Source Requirement | Zen Green (`#006B3C`, `#0B7A46`, `#EAF6EF`) | Labsheet Section 7 |
| Single-Server Topology | Source Requirement | Local host running Express, Postgres, SeaweedFS | SDS Decision D-08 |
| Ticket Summary Length | Proposed Decision | 5 to 120 characters | `specification.md` Section 6 |
| Ticket Description Length | Proposed Decision | 10 to 2000 characters | `specification.md` Section 6 |
| Removal Reason Length | Proposed Decision | 1 to 255 characters | `specification.md` Section 6 |
| API Versioning Base | Proposed Decision | `/api/v1` with legacy root fallback | `api-spec.md` Section 1 |
