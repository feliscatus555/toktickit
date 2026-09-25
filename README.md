# TokTickIT

## What We Are Building Across Labs 1 to 4

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests. Across seven individual sprints, each student will incrementally build the same product from a full-stack foundation into a polished local web application. The instructor acts as the stakeholder and product owner, releasing a new engineering contract for each sprint. Every contract defines the required behavior, UI, business rules, acceptance criteria, and tests. Students use AI coding agents to assist with implementation, but remain responsible for the specifications, code, tests, reviews, and final product quality.

The final application supports three roles: **Requester**, **IT Staff**, and **Administrator**. A Ticket stores the current state of the request and contains related Public Comments, Internal Notes, Actions Taken, and Attachments. Requesters and IT Staff share functions such as public comments and attachments, while role-based rules control sensitive actions such as assignment, IT priority, status changes, internal notes, and user management.

---

## Lab 03 Implementation Summary — Role-Governed Multi-User Service Desk

In **Lab 03**, TokTickIT transitioned from a single-requester prototype to a secure, role-governed multi-user service desk application covering four core features (**Features 9 through 12**, Issues 16–20):

### 1. Database Schema & Data Models (Prisma + PostgreSQL)
* **`User` Model**: Added user accounts supporting three explicit roles (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), with bcrypt `passwordHash`, `isActive` status flag, `mustChangePassword` security flag, and relations to owned tickets, assigned tickets, comments, and internal notes.
* **`Ticket` Model Extensions**: Added `itPriority`, `ownerId` foreign key referencing the assigned `User` (IT Staff / Admin), `isProblemAppearsResolved` boolean indication, and expanded status to the full 7-state lifecycle state machine (`New`, `Open`, `InProgress`, `WaitingForRequester`, `Resolved`, `Closed`, `Reopened`).
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
* **Role-Governed App Shell (`App.tsx`)**: Header displays user initials avatar, display name, and role pill badge (`👤 Requester`, `💻 IT Staff`, `🛡 Admin`). Top navigation links and mobile drawer are strictly filtered according to permitted role views.
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

## Testing Architecture & Execution Results (251 / 251 Passed)

All test suites pass 100% across unit, API integration, UI component, and full-stack end-to-end browser automation:

| Test Suite | Scope & Coverage | Test Files | Tests Passed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Server Tests** (`npm run test:server`) | Health, categories, ticket creation, my tickets, attachments, auth, authorization, staff queue, staff detail, comments/notes, admin user management, status transitions, validation | 17 files | **167 / 167** | **PASS (100%)** |
| **Client UI Tests** (`npm run test:client`) | App shell, Login, Change Password, Create Ticket, My Tickets, Requester Ticket Detail, Staff Ticket Queue, Staff Ticket Detail, User Management, Attachments | 13 files | **79 / 79** | **PASS (100%)** |
| **Playwright E2E Tests** (`npm run test:e2e`) | E2E-01 (Auth & navigation), E2E-02 (Password change), E2E-03 & E2E-04 (Queue & staff operations), E2E-05 (Admin user management & safety guards) | 4 specs | **5 / 5** | **PASS (100%)** |
| **Total Automated Tests** | **Full application coverage across Labs 1, 2, and 3** | **34 files** | **251 / 251** | **PASS (100%)** |

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

# Seed categories and default test accounts
npm --prefix server run prisma:seed
```

### 2. Development Servers
```bash
# Start backend Express server (http://localhost:3000)
npm --prefix server run dev

# Start frontend Vite server (http://localhost:5173)
npm --prefix client run dev
```

### 3. Running Automated Test Suites
```bash
# Run backend server unit & API integration tests (167 tests)
npm run test:server

# Run frontend React component tests (79 tests)
npm run test:client

# Run Playwright end-to-end test suite (5 browser flows)
npm run test:e2e
```

### 4. Test Accounts Reference
| Email | Password | Role | Notes |
| :--- | :--- | :--- | :--- |
| `somchai.p@kmutt.ac.th` | `Password123!` | Requester | Active requester account |
| `initial.user@kmutt.ac.th` | `InitialPassword123!` | Requester | Requires password change on first login |
| `sarah.johnson@kmutt.ac.th` | `Password123!` | IT Staff | Active staff account |
| `john.smith@kmutt.ac.th` | `Password123!` | Administrator | Active administrator account |
| `inactive.test@kmutt.ac.th` | `Password123!` | Requester | Inactive account (login rejected with 401) |
