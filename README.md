# TokTickIT

## What We Are Building Across Labs 1 to 4

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests. Across seven individual sprints, each student will incrementally build the same product from a full-stack foundation into a polished local web application. The instructor acts as the stakeholder and product owner, releasing a new engineering contract for each sprint. Every contract defines the required behavior, UI, business rules, acceptance criteria, and tests. Students use AI coding agents to assist with implementation, but remain responsible for the specifications, code, tests, reviews, and final product quality.

The final application supports three roles: **Requester**, **IT Staff**, and **Administrator**. A Ticket stores the current state of the request and contains related Public Comments, Internal Notes, Actions Taken, and Attachments. Requesters and IT Staff share functions such as public comments and attachments, while role-based rules control sensitive actions such as assignment, IT priority, status changes, internal notes, and user management.

---

## Lab 04 Implementation Summary — Child-Level Work Tracking, Operational Dashboards & System Hardening

In **Lab 04**, TokTickIT completed the final operational increments of the service desk application, implementing child-level technical work tracking, authoritative lifecycle state transitions, role-tailored operational dashboards, and full system regression hardening (**Features 13 through 16**, Issues 21–24):

### 1. Database Schema & Data Models (Prisma + PostgreSQL)
* **`ActionTaken` Model**: Added parent-child child work tracking under tickets capturing:
  * `ticketId`: Foreign key relation to the parent `Ticket` (`onDelete: Cascade`).
  * `actionDate`: Timestamp when the technical action was performed.
  * `actionDescription`: Detailed narrative of technical troubleshooting or remediation.
  * `actionResult`: Standardized outcome of the action.
  * `performedById`: Auto-populated foreign key referencing the authenticated IT Staff or Administrator account.
  * `followUpRequired`: Boolean flag indicating whether subsequent intervention is necessary.
  * `followUpNote`: Conditional text note, enforced whenever `followUpRequired = true`.
  * `attachmentNotes`: Optional notes referencing physical or digital artifacts.
  * `createdAt` / `updatedAt`: Automatic audit timestamps.
* **`Ticket` Model Extensions**:
  * `version`: Integer version counter incremented on every status update to support optimistic concurrency control and stale-update detection (`BR-05, AC-10`).
  * Relation mapping to the `ActionTaken` child collection.
* **Idempotent Seed Script (`server/prisma/seed.ts`)**: Populates realistic Actions Taken records across existing seed tickets, demonstrating varied performers, outcomes, follow-up flags, and attachment notes.

### 2. Backend Express API Endpoints & State Machine (`server/src/`)
* **Feature-13: Actions Taken Management & Audit Log** (Issue 21, FR-43–51)
  * `POST /api/tickets/:id/actions`: Creates an action record under a ticket. Derives `performedById` strictly from the verified JWT session (`AC-01`). Allows any authorized IT Staff member to record actions regardless of ticket ownership (`BR-02`). Validates mandatory `followUpNote` when `followUpRequired = true` (`BR-01, AC-04`). Rejects Requesters with `HTTP 403 Forbidden` (`AC-06`).
  * `GET /api/tickets/:id/actions`: Returns all actions for a ticket in stable chronological order (`AC-03`). Ticket-owning Requesters are permitted read-only access (`AC-05`); unauthenticated users or non-owner requesters receive `HTTP 403 Forbidden`.
  * `PATCH /api/tickets/:id/actions/:actionId`: Allows IT Staff or Administrator to update action records while preserving actor accountability.
* **Feature-14: Ticket Status Workflow, Resolution Gate & Concurrency Protection** (Issue 22, FR-52–60)
  * `PATCH /api/staff/tickets/:id/status`: Enforces the authoritative 8-state lifecycle state machine (`New`, `Open`, `InProgress`, `WaitingForRequester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`). Obsolete legacy states (`Assigned`, `Pending`) are rejected (`BR-04, AC-11`).
  * **Authoritative Resolution Gate (`BR-03, AC-07, AC-08`)**: Transition to `Resolved` is strictly blocked unless the ticket has at least one recorded Action Taken (`HTTP 400 Bad Request` with `RESOLUTION_ACTION_REQUIRED`). Requires IT Staff ownership and non-empty `resolutionSummary`.
  * **Optimistic Concurrency Protection (`BR-05, AC-10`)**: Requires client to supply the current `version` integer. If the record was modified concurrently, the server aborts the transaction with `HTTP 409 Conflict` (`STALE_UPDATE_DETECTED`).
  * **Advisory Requester Indication Independence (`BR-04, AC-09`)**: Requester's "Problem Appears Resolved" flag (`isProblemAppearsResolved = true`) remains purely informational and cannot bypass the formal IT Staff resolution gate.
* **Feature-15: IT Staff and Administrator Operational Dashboard** (Issue 23, FR-61–70)
  * `GET /api/staff/dashboard`: Delivers operational metrics across 5 canonical statuses (`New`, `Open`, `InProgress`, `WaitingForRequester`, `myAssigned` scoped to `req.user.id`) with comparison trend deltas (e.g., `+2 from yesterday`).
  * Delivers the 5 most recently updated tickets for immediate queue access.
  * Administrator role view conditionally includes system user counts (`totalUsers`, `activeUsers`).
  * Requesters attempting to access the staff dashboard receive `HTTP 403 Forbidden` (`AC-15`).
* **Feature-16: Requester Operational Dashboard** (Issue 24, FR-71–80)
  * `GET /api/requester/dashboard`: Scoped strictly to the authenticated requester (`where: { requesterId: req.user.id }`), guaranteeing zero cross-user data leakage (`BR-07, AC-02, AC-16`).
  * Calculates 4 operational counts: `myOpenTickets` (`New` + `Open`), `inProgress`, `resolved`, `closed`.
  * Delivers the 5 most recent tickets submitted by the authenticated requester.

### 3. Frontend UI Components (`client/src/`)
* **Actions Taken Component (`ActionsTaken.tsx`)**:
  * Embedded directly within Ticket Detail view below Attachments and Notes tabs.
  * Chronological table displaying date, performer name, action description, result, follow-up flags, and attachment notes.
  * IT Staff / Admin action composer with dynamic follow-up textarea toggle and character validation.
  * Requester read-only mode completely omitting create and edit controls from the DOM (`AC-05`).
* **Dynamic Ticket Status Transition & Concurrency (`TicketWorkflow.tsx`, `TicketDetail.tsx`)**:
  * State-aware dropdown offering only permitted next states based on the current lifecycle state (`AC-11`).
  * Instant status badge and resolution summary UI refresh upon transition (`AC-08`).
  * Stale update warning dialog upon 409 Conflict prompting user to refresh ticket data.
  * Submit button double-click debounce protection preventing duplicate HTTP requests (`UI-09, AC-18`).
* **IT Staff Operational Dashboard (`StaffDashboard.tsx`)**:
  * 5 interactive metric cards with top-accent status borders, numeric counts, and comparison trend badges (`+/-` from yesterday).
  * Direct drill-down clicking any metric card navigates to IT Staff Queue pre-filtered by that status or assignee (`AC-13`).
  * Recent Tickets table with one-click navigation to Ticket Detail (`AC-14`).
  * Quick Actions panel: "+ Create Ticket", "Search Tickets", "My Queue".
  * Administrator User Overview card rendering total and active user counts.
  * Personalized header greeting (`"Welcome back, [Name]!"`) and manual Refresh button.
* **Requester Operational Dashboard (`RequesterDashboard.tsx`)**:
  * Accessible via dedicated `#nav-requester-dashboard` and mobile navigation.
  * Personalized greeting (`"Welcome, [Name]!"`, `#requester-dashboard-welcome-msg`) and manual Refresh button.
  * 4 interactive metric cards (`My Open Tickets`, `In Progress`, `Resolved`, `Closed`) with status accents and counts.
  * Metric card and "View all →" drill-down navigation to My Tickets pre-filtered by status (`AC-17`).
  * Recent Tickets table with "View" buttons navigating into Ticket Detail.
  * Empty state (`#req-recent-tickets-empty`) with "+ Create your first ticket" action.
  * Quick Actions panel: "+ Create Ticket", "View My Tickets".
  * Error state with retry recovery button.
* **System-Wide Hardening & Accessibility**:
  * Zen Green design tokens applied across all views.
  * Responsive layout verified across Desktop (1280px), Tablet (768px), and Mobile (375px/320px) with zero horizontal overflow.
  * Input retention upon recoverable validation errors (`AC-19`).
  * Zero console errors and clean DOM structure (`AC-20`).

---

## Lab 03 Implementation Summary — Role-Governed Multi-User Service Desk

In **Lab 03**, TokTickIT transitioned from a single-requester prototype to a secure, role-governed multi-user service desk application covering four core features (**Features 9 through 12**, Issues 16–20):

### 1. Database Schema & Data Models (Prisma + PostgreSQL)
* **`User` Model**: Added user accounts supporting three explicit roles (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), with bcrypt `passwordHash`, `isActive` status flag, `mustChangePassword` security flag, and relations to owned tickets, assigned tickets, comments, and internal notes.
* **`Ticket` Model Extensions**: Added `itPriority`, `ownerId` foreign key referencing the assigned `User` (IT Staff / Admin), `isProblemAppearsResolved` boolean indication, and expanded status to the full lifecycle state machine (`New`, `Open`, `InProgress`, `WaitingForRequester`, `Resolved`, `Closed`, `Reopened`).
* **`Comment` Model**: Added public comments feed linking tickets and author accounts with a 1–2000 character body constraint and creation timestamps.
* **`InternalNote` Model**: Added private operational internal notes linking tickets and author accounts, strictly restricted to IT staff and administrators.
* **Idempotent Seed Script (`server/prisma/seed.ts`)**: Populates categories and test accounts across all three roles (active and inactive, default password and initial password requiring change).

### 2. Backend Express API Endpoints & Security Architecture (`server/src/`)
* **Feature-9: Authentication Foundation & Mandatory Password Change** (Issues 16 & 17)
  * `POST /api/auth/login`: Authenticates active users via email and password; generates signed JWT tokens; rejects inactive accounts (`isActive = false`) with safe error messages.
  * `POST /api/auth/logout`: Terminates sessions and clears client auth tokens.
  * `GET /api/auth/me`: Returns the authenticated user's identity, role, and password change status.
  * `POST /api/auth/change-password`: Validates password complexity (minimum 8 characters, uppercase, lowercase, digit, special character), hashes with bcrypt, updates password, and clears `mustChangePassword`.
  * **Middleware Guard**: Blocks users with `mustChangePassword = true` from accessing normal application APIs until their password is changed.
  * **Simulated Requester Removal**: Completely eliminated the development requester switcher; all operations derive identity strictly from the verified JWT session.
* **Feature-10: IT Staff Ticket Queue** (Issue 18)
  * `GET /api/staff/tickets`: Shared ticket queue restricted to `IT_STAFF` and `ADMINISTRATOR` roles (`HTTP 403 Forbidden` for Requesters).
  * Supports full-text search across ticket number (`TKT-YYYY-NNNNN`) and summary, filtering by lifecycle status, priority, category, and staff assignee, multi-column sorting, and pagination metadata.
* **Feature-11: IT Staff Ticket Operations & Collaboration** (Issue 19)
  * `GET /api/staff/tickets/:id`: Retrieves full operational ticket details, including ownership, public comments, and internal notes.
  * `PATCH /api/staff/tickets/:id/assignment`: Self-claim or reassign ticket ownership to active IT Staff or Administrator accounts. Rejects assigning to Requesters (`HTTP 400 Bad Request`).
  * `PATCH /api/staff/tickets/:id/priority`: Allows IT staff to adjust `itPriority` independently of the requester's initial `requestedPriority`.
  * `PATCH /api/staff/tickets/:id/status`: Validates status transitions through the lifecycle state machine (`server/src/services/statusTransition.ts`). Enforces mandatory non-empty `resolutionSummary` when transitioning to `Resolved`.
  * `POST /api/tickets/:id/comments` & `GET /api/tickets/:id/comments`: Public comments thread accessible by both Requesters and IT Staff.
  * `POST /api/staff/tickets/:id/notes` & `GET /api/staff/tickets/:id/notes`: Private operational notes strictly restricted to `IT_STAFF` and `ADMINISTRATOR`. Returns `HTTP 403 Forbidden` for Requesters with zero note metadata leakage.
  * `PATCH /api/tickets/:id/resolve-indication`: Allows ticket-owning Requesters to indicate that their issue appears resolved without granting formal ticket closure rights.
* **Feature-12: Administrator User Management & Safety Rules** (Issue 20)
  * `GET /api/admin/users`: Lists user accounts with search across name and email, and role filtering. Restricted to `ADMINISTRATOR` (`HTTP 403 Forbidden` for non-admins).
  * `POST /api/admin/users`: Account provisioning enforcing password complexity, duplicate email rejection (`HTTP 409 Conflict`), bcrypt hashing, and automatic `mustChangePassword = true` enforcement.
  * `PATCH /api/admin/users/:id`: Updates name, email, role, and active status, backed by core safety guards:
    * **Self-Deactivation Guard (`BR-13`, `AC-17`)**: Rejects an administrator deactivating their own account with `HTTP 422 Unprocessable Entity` (`SELF_DEACTIVATION_PREVENTED`).
    * **Last-Admin Guard (`BR-14`, `AC-18`)**: Rejects deactivating or demoting the last active administrator with `HTTP 422 Unprocessable Entity` (`LAST_ADMIN_PREVENTED`).
    * **Email Uniqueness Guard**: Rejects updates that conflict with an existing user's email (`HTTP 409 Conflict`).
  * `POST /api/admin/users/:id/reset-password`: Issues a new initial password with complexity verification and forces `mustChangePassword = true` on next login.

### 3. Frontend UI Components (`client/src/`)
* **Role-Governed App Shell (`App.tsx`)**: Header displays user initials avatar, display name, and role pill badge (`👤 Requester`, `🛠 IT Staff`, `🛡 Admin`). Top navigation links and mobile drawer are strictly filtered according to permitted role views.
* **Zen Green Login Card (`Login.tsx`)**: Clean authentication screen with email and password inputs, busy indicators, and safe generic error messaging.
* **Mandatory Password Change Modal (`ChangePasswordModal.tsx`)**: Non-dismissible modal shown when `mustChangePassword = true`, featuring live complexity requirements and instant validation feedback.
* **IT Staff Ticket Queue (`StaffTicketQueue.tsx`)**: 8 justified columns (`Ticket #`, `Summary`, `Requester`, `Category`, `System`, `Priority`, `Status`, `Assignee`), interactive search, multi-filter dropdowns, and responsive stacked cards on mobile (`< 768px`).
* **Integrated Ticket Detail View (`TicketDetail.tsx`)**:
  * **Operational Detail Boxes**: Ticket Owner (with Claim / Reassign dropdown), IT Priority (form-select), and Current Status (auto-updating on selection, prompting for resolution summary on Resolved) integrated directly into the main details grid.
  * **Unified Tabbed Activity Section**:
    * **Tab 1: 📎 Attachments** (`#tab-btn-attachments`): Active files, download actions, soft-removal modals with reason tracking, and upload form.
    * **Tab 2: 💬 Public Comments** (`#tab-btn-public-comments`): Shared discussion feed with author role badges, timestamps, and 2000-character composer.
    * **Tab 3: 🔒 Private Internal Notes** (`#tab-btn-internal-notes`): Amber-styled private operational log visible exclusively to IT staff and admins; completely omitted from the DOM for Requesters.
  * **Requester Resolution Indication**: Prominent "Problem Appears Resolved" button switching to a confirmation banner upon submission.
* **Administrator User Management Screen (`UserManagement.tsx`)**:
  * Clean desktop table (`#user-table`) with user avatars, roles, status pills, and Edit triggers.
  * Responsive mobile stacked cards (`#mobile-user-cards`) with zero horizontal overflow on mobile viewports ($\le 390\text{px}$).
  * Search & Filter toolbar with text search, role select, and clear filters action.
  * Create User modal with integrated **Compliant Password Generator** and one-click clipboard copy.
  * Edit User modal with disabled toggles and prominent safety warning alerts for self-deactivation and last-admin protection.
  * Reset Initial Password dialog workflow.

---

## Lab 02 Implementation Summary — Requester Ticketing MVP & Attachment Management

In **Lab 02**, we implemented Feature 8 (`feature/8-ticket-detail`) covering the full Requester Ticket Detail view mode, Attachment Management, database schema synchronization, and End-to-End test suites.

### 1. Database Schema & Data Models (Prisma + PostgreSQL)
* **`Attachment` Model**: Added schema for attachments tracking `originalFilename`, `storageKey`, `mimeType`, `sizeBytes`, `isDeleted`, `deletedAt`, `deletedById`, `deletionReason`, and timestamps.
* **`Ticket` Model Extensions**: Added `itPriority`, `ownerName`, and `resolutionSummary` fields.
* **Sequence Counter**: Transactional ticket number generator generating official formatted strings (`TKT-YYYY-NNNNN`).

### 2. Backend Express API Endpoints (`server/src/app.ts`)
* **`POST /api/tickets`**: Ticket creation endpoint validating inputs and generating official ticket numbers.
* **`GET /api/tickets/:id`**: Detailed ticket retrieval enforcing ownership isolation (`HTTP 403 Forbidden` for non-owner requesters).
* **`POST /api/tickets/:id/attachments`**: Attachment upload endpoint enforcing allowed extensions (`.pdf`, `.png`, `.jpg`), file size limit ($\le 5\text{MB}$), and maximum active attachments limit ($\le 5$).
* **`GET /api/attachments/:id/download`**: Binary file download stream returning `HTTP 410 Gone` if soft-removed and `HTTP 403 Forbidden` for unauthorized users.
* **`DELETE /api/attachments/:id`**: Soft-removal endpoint enforcing mandatory deletion reason ($\le 255$ characters), deleting binary files from local storage immediately (SDS Decision D-11), and preserving tombstone records for auditability.

### 3. Frontend UI Components (`client/src/`)
* **Zen Green Design System**: Implemented palette with Primary Green `#006B3C`, Accent `#0B7A46`, Soft Background Canvas `#F5F7F6`, and Dark Red `#B3261E` validation text.
* **Non-Color Indicators**: Priority and Status badges render visible text combined with icons (`⚡ URGENT`, `↑ HIGH`, `● New`, `✓ Resolved`).
* **Create Ticket Form (`CreateTicket.tsx`)**: Form with required field asterisks (`*`), error text directly below inputs, busy state feedback, and immediate attachment uploading upon submission.
* **My Submitted Tickets (`MyTickets.tsx`)**: Ticket list view with search & category filtering, responsive card grid, and empty states.
* **Ticket Detail View (`TicketDetail.tsx`)**: Detailed view displaying read-only ticket info, IT Priority, Ticket Owner, Resolution Summary Box, active attachments list, upload zone, and soft-removal modal with live character counter (`0 / 255 characters`).

---

## Testing Architecture & Execution Results (373 / 373 Passed — 100%)

TokTickIT enforces strict test-driven quality assurance across all layers of the stack. All 373 automated tests pass 100% with zero regressions:

| Test Suite | Scope & Coverage | Test Files | Tests Passed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Server Tests** (`npm run test:server`) | Health, categories, ticket creation, my tickets, attachments, auth, authorization, staff queue, staff detail, comments/notes, admin user management, status transitions, validation, actions taken, staff dashboard, requester dashboard | 21 files | **227 / 227** | **PASS (100%)** |
| **Client UI Tests** (`npm run test:client`) | App shell, Login, Change Password, Create Ticket, My Tickets, Requester Detail, Staff Queue, Staff Detail, User Management, Attachments, Actions Taken, Staff Dashboard, Requester Dashboard, Ticket Workflow | 17 files | **133 / 133** | **PASS (100%)** |
| **Lab 04 Playwright E2E** (`TEST_DIR="./lab-04" npx playwright test`) | Actions Taken lifecycle (`E2E-01`), Resolution Gate workflow (`E2E-02`), Staff & Requester Dashboards navigation & drill-down (`E2E-03a..d`) | 3 specs | **8 / 8** | **PASS (100%)** |
| **Lab 03 Playwright E2E** (`TEST_DIR="./lab-03" npx playwright test`) | Auth & navigation (`E2E-01`), Password change (`E2E-02`), Queue filtering (`E2E-03`), Staff operations (`E2E-04`), Admin user lifecycle (`E2E-05`) | 4 specs | **5 / 5** | **PASS (100%)** |
| **Total Automated Tests** | **Full application coverage across Labs 1, 2, 3, and 4** | **45 files** | **373 / 373** | **PASS (100%)** |

---

## Getting Started & Execution Commands

### 1. Prerequisites & Setup
```bash
# Install root, server, and client dependencies
npm install
npm --prefix server install
npm --prefix client install

# Setup database & apply Prisma migrations
npm --prefix server run prisma:migrate

# Seed categories, default test accounts, and sample tickets with actions
npm --prefix server run prisma:seed
```

### 2. Development Servers
```bash
# Start backend Express server (http://localhost:3000)
npm --prefix server run dev

# Start frontend Vite server (http://localhost:5173)
npm --prefix client run dev
```

### 3. Building for Production
```bash
# Compile server TypeScript
npm --prefix server run build

# Compile and bundle client application
npm --prefix client run build
```

### 4. Running Automated Test Suites
```bash
# Run backend server unit & API integration tests (227 tests)
npm run test:server

# Run frontend React component tests (133 tests)
npm run test:client

# Run Playwright end-to-end tests
# Lab 04 E2E (8 browser tests covering Actions Taken, Resolution Gate, and Dashboards):
TEST_DIR="./lab-04" npx playwright test --config=e2e/playwright.config.ts

# Lab 03 E2E (5 browser tests covering Auth, Staff Operations, and User Admin):
TEST_DIR="./lab-03" npx playwright test --config=e2e/playwright.config.ts

# Run default E2E suite:
npm run test:e2e
```

### 5. Test Accounts Reference
| Email | Password | Role | Persona / Use Case |
| :--- | :--- | :--- | :--- |
| `somchai.p@kmutt.ac.th` | `Password123!` | Requester | Active requester (Somchai Pattana) with tickets & dashboard access |
| `ananya.s@kmutt.ac.th` | `Password123!` | Requester | Active requester (Ananya Srisuk) used for cross-user isolation testing |
| `initial.user@kmutt.ac.th` | `InitialPassword123!` | Requester | Initial account requiring mandatory password change on first login |
| `sarah.johnson@kmutt.ac.th` | `Password123!` | IT Staff | Active IT Staff (Sarah Johnson) with queue, actions, and staff dashboard |
| `john.smith@kmutt.ac.th` | `Password123!` | Administrator | Active Administrator (John Smith) with user admin and admin dashboard |
| `inactive.test@kmutt.ac.th` | `Password123!` | Requester | Inactive account (login rejected with HTTP 401 Unauthorized) |
