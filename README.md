# TokTickIT 

## What We Are Building Across Labs 1 to 4

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests. Across seven individual sprints, each student will incrementally build the same product from a full-stack foundation into a polished local web application. The instructor acts as the stakeholder and product owner, releasing a new engineering contract for each sprint. Every contract defines the required behavior, UI, business rules, acceptance criteria, and tests. Students use AI coding agents to assist with implementation, but remain responsible for the specifications, code, tests, reviews, and final product quality.

The final application will support three roles: Requester, IT Staff, and Administrator. A Ticket stores the current state of the request and contains related Public Comments, Internal Notes, Actions Taken, and Attachments. Requesters and IT Staff share some functions, such as public comments and attachments, while role-based rules control sensitive actions such as assignment, IT priority, status changes, internal notes, and user management.

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
* **Requester Identity Switcher (`RequesterSelector.tsx`)**: Modal dropdown allowing live requester identity context switching.
* **Create Ticket Form (`CreateTicket.tsx`)**: Form with required field asterisks (`*`), error text directly below inputs, busy state feedback, and immediate attachment uploading upon submission.
* **My Submitted Tickets (`MyTickets.tsx`)**: Ticket list view with search & category filtering, responsive card grid, and empty states.
* **Ticket Detail View (`TicketDetail.tsx`)**: Detailed view displaying read-only ticket info, IT Priority, Ticket Owner, Resolution Summary Box, active attachments list, upload zone, and soft-removal modal with live character counter (`0 / 255 characters`).

### 4. Testing Architecture & Execution Results (90 / 90 Passed)
* **Server Unit & API Integration Tests** (`npm run test:server`): **46 / 46 passed** across 9 test files.
* **Client UI Component Tests** (`npm run test:client`): **40 / 40 passed** across 8 test files.
* **Playwright End-to-End Tests** (`npm run test:e2e`): **4 / 4 passed** covering full browser workflows.

---

## Getting Started & Test Execution Commands

```bash
# 1. Install root dependencies
npm install

# 2. Run Backend Server Tests
npm run test:server

# 3. Run Client Component UI Tests
npm run test:client

# 4. Run Playwright End-to-End Tests
npm run test:e2e
```
