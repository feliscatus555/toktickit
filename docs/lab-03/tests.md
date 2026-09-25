# Lab 3 Test Plan, Traceability and Results Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Approved Test Strategy, Execution & Traceability Specification
* **Target Sprint**: Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens
* **Base References**:
  * `docs/lab-03/Lab_3_sheet.pdf` (Section 10 *Test DD and TDD Deliverable*, Section 12 *Required Repository Increment*, Section 14 Part 3)
  * `docs/lab-02/tests.md` (Lab 2 Test Plan Baseline)

---

## 1. Test Strategy & Verification Levels

TokTickIT applies Test-Driven Development (TDD) and Test-Driven Specification (Test DD). Automated test scenarios are planned before implementation and mapped directly to Acceptance Criteria (`AC-01` through `AC-20`).

1. **Unit Testing (Vitest)**: Validates pure domain logic, password complexity validators, status transition matrix validation, and ticket number generator without database or network overhead.
2. **API Integration Testing (Vitest + Supertest)**: Verifies Express routes, Prisma queries, credential hashing, authentication sessions, role-based authorization guards, and administrative safety rules against PostgreSQL.
3. **UI Component Testing (Vitest + React Testing Library)**: Tests component rendering, login form state, password change checklist interactivity, ticket queue table rendering, comments/notes posting, and user management modals.
4. **Responsive & Visual Inspection**: Validates layout integrity across Desktop (`1280x800`), Tablet (`768x1024`), and Mobile (`375x667`) viewports, confirming zero horizontal overflow, touch target accessibility, and badge styling.
5. **End-to-End Testing (Playwright E2E)**: Simulates complete cross-role browser journeys:
   - Initial password login and mandatory change flow.
   - IT Staff queue search, filter, ticket opening, claiming, priority change, status progression, and internal note addition.
   - Requester regression flow, public comment posting, and problem resolution indication.
   - Administrator user creation, duplicate rejection, editing, and safety constraint enforcement.

---

## 2. Planned-Test Table

Per `Lab_3_sheet.pdf`, Section 10 and Section 12, all planned tests are categorized, mapped, and verified below:

| Test ID | Level | Requirement / AC | What It Tests | Expected Result | Automated Test File Path | Status |
|---|---|---|---|---|---|---|
| **UNIT-01** | Unit | BR-18 | Password complexity validator | Rejects passwords missing uppercase, number, or special char; accepts valid | `server/tests/lab-03/validation.unit.test.ts` | Passed |
| **UNIT-02** | Unit | BR-22 | Ticket status transition engine | Validates permitted status transitions; rejects invalid jumps | `server/tests/lab-03/status-transition.unit.test.ts` | Passed |
| **UNIT-03** | Unit | BR-23 | Comment/note content validator | Rejects empty or whitespace-only content; accepts trimmed text <= 2000 chars | `server/tests/lab-03/validation.unit.test.ts` | Passed |
| **API-01** | API | AC-01, FR-01 | Valid user authentication (`POST /api/auth/login`) | Returns HTTP 200 with authenticated user identity, role, and session token | `server/tests/lab-03/auth.api.test.ts` | Passed |
| **API-02** | API | AC-05, FR-02 | Inactive user login attempt | Returns HTTP 401 Unauthorized with safe error message | `server/tests/lab-03/auth.api.test.ts` | Passed |
| **API-03** | API | AC-02, FR-03 | User requiring password change accessing app | `mustChangePassword = true` restricts access until changed | `server/tests/lab-03/auth.api.test.ts` | Passed |
| **API-04** | API | AC-02, FR-04 | Password change (`POST /api/auth/change-password`) | Saves new hashed password, clears flag, returns HTTP 200 | `server/tests/lab-03/auth.api.test.ts` | Passed |
| **API-05** | API | AC-06, FR-06 | User logout (`POST /api/auth/logout`) | Invalidates session; subsequent request returns HTTP 401 | `server/tests/lab-03/auth.api.test.ts` | Passed |
| **API-06** | API | AC-03, FR-09 | Requester ownership anti-tampering | Backend applies authenticated identity, ignoring client `requesterId` | `server/tests/lab-03/authorization.api.test.ts` | Passed |
| **API-07** | API | AC-03, FR-17 | Requester accessing IT Staff queue | Returns HTTP 403 Forbidden; queue data is protected | `server/tests/lab-03/authorization.api.test.ts` | Passed |
| **API-08** | API | AC-04, FR-26 | Requester requesting Internal Notes | Returns HTTP 403 Forbidden without leaking note content | `server/tests/lab-03/comments-notes.api.test.ts` | Passed |
| **API-09** | API | AC-07, FR-10 | IT Staff Ticket Queue retrieval | Returns HTTP 200 with tickets across all requesters and pagination metadata | `server/tests/lab-03/staff-queue.api.test.ts` | Passed |
| **API-10** | API | AC-08, FR-11 | IT Staff Queue search and filtering | Filters tickets by category, priority, status, and summary keyword | `server/tests/lab-03/staff-queue.api.test.ts` | Passed |
| **API-11** | API | AC-09, FR-20 | Ticket ownership claim and reassignment | Updates `ownerId` to specified active IT Staff/Admin; rejects inactive | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Passed |
| **API-12** | API | AC-10, FR-21 | IT Priority update | Updates `itPriority` without altering `requestedPriority` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Passed |
| **API-13** | API | AC-11, FR-23 | Ticket status transition enforcement | Valid transition updates status; invalid transition returns HTTP 422 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Passed |
| **API-14** | API | AC-12, FR-24 | Public Comment creation and retrieval | Saves append-only comment; author and timestamp recorded | `server/tests/lab-03/comments-notes.api.test.ts` | Passed |
| **API-15** | API | AC-13, FR-25 | Internal Note creation by IT Staff | Saves append-only internal note; visible only to IT Staff/Admin | `server/tests/lab-03/comments-notes.api.test.ts` | Passed |
| **API-16** | API | AC-14, FR-29 | Requester resolution indication | Sets `isProblemAppearsResolved = true`; does not close ticket | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Passed |
| **API-17** | API | AC-15, FR-32 | Admin user list retrieval | Returns all users with search and role filter; non-admin gets 403 | `server/tests/lab-03/users-admin.api.test.ts` | Passed |
| **API-18** | API | AC-16, FR-34 | Admin user creation and duplicate email rejection | Creates user with initial password; duplicate email returns HTTP 409 | `server/tests/lab-03/users-admin.api.test.ts` | Passed |
| **API-19** | API | AC-17, FR-38 | Admin self-deactivation prevention | Admin deactivating own account returns HTTP 422 error | `server/tests/lab-03/users-admin.api.test.ts` | Passed |
| **API-20** | API | AC-18, FR-39 | Last active Admin deactivation prevention | Deactivating sole active Admin returns HTTP 422 error | `server/tests/lab-03/users-admin.api.test.ts` | Passed |
| **API-21** | API | FR-37 | Reset initial password by Admin | Sets new initial password and marks `mustChangePassword = true` | `server/tests/lab-03/users-admin.api.test.ts` | Passed |
| **UI-01** | UI | AC-01, FR-01 | Login screen rendering & validation | Renders email/password inputs, busy spinner, and safe failure text | `client/tests/lab-03/Login.test.tsx` | Passed |
| **UI-02** | UI | AC-02, FR-03 | Change password checklist rules | Dynamic checkmarks update as user satisfies password criteria | `client/tests/lab-03/ChangePassword.test.tsx` | Passed |
| **UI-03** | UI | AC-07, FR-15 | IT Staff Ticket Queue table rendering | Renders justified columns, status badges, priority badges, and owner | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Passed |
| **UI-04** | UI | AC-08, FR-11 | Queue search and filter reactivity | Typing search query or changing filter updates table and pagination | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Passed |
| **UI-05** | UI | AC-09, FR-20 | Ticket Detail claim action and owner change | Clicking "Claim" immediately updates owner display | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Passed |
| **UI-06** | UI | AC-12, AC-13 | Visual distinction of Comments vs Notes | Comments render with green theme; Notes render with amber lock theme | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Passed |
| **UI-07** | UI | AC-15, FR-33 | Admin User Management table rendering | Renders user list with Name, Email, Role pill, and Status badge | `client/tests/lab-03/UserManagement.test.tsx` | Passed |
| **UI-08** | UI | AC-16, FR-34 | Admin Create User form and initial password | Modal validates fields, shows password helper, handles duplicate error | `client/tests/lab-03/UserManagement.test.tsx` | Passed |
| **UI-09** | UI | AC-17, FR-38 | Self-deactivation warning and disablement | Deactivate button disabled or triggers safety error on own row | `client/tests/lab-03/UserManagement.test.tsx` | Passed |
| **E2E-01** | E2E | AC-01, FR-01 | Full authentication and role navigation flow | User logs in, shell displays name/role, navigates permitted screens | `e2e/lab-03/authentication.spec.ts` | Passed |
| **E2E-02** | E2E | AC-02, FR-03 | Initial password login and mandatory change | First-time user forced to change password before entering app | `e2e/lab-03/authentication.spec.ts` | Passed |
| **E2E-03** | E2E | AC-07..14 | IT Staff queue and ticket operational flow | Staff finds ticket in queue, claims it, sets priority, adds note | `e2e/lab-03/staff-ticket-flow.spec.ts` | Passed |
| **E2E-04** | E2E | AC-14, FR-29 | Requester resolution indication workflow | Requester clicks "Problem Appears Resolved", Staff sees updated state | `e2e/lab-03/staff-ticket-flow.spec.ts` | Passed |
| **E2E-05** | E2E | AC-15..19 | Administrator user administration lifecycle | Admin creates user, resets password, and verifies safety guards | `e2e/lab-03/user-administration.spec.ts` | Passed |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Primary Automated Test Cases | Target Test File Paths |
|---|---|---|
| **AC-01** (Valid login returns identity & role) | `API-01`, `UI-01`, `E2E-01` | `server/tests/lab-03/auth.api.test.ts`, `client/tests/lab-03/Login.test.tsx`, `e2e/lab-03/authentication.spec.ts` |
| **AC-02** (Mandatory first-login password change) | `API-03`, `API-04`, `UI-02`, `E2E-02` | `server/tests/lab-03/auth.api.test.ts`, `client/tests/lab-03/ChangePassword.test.tsx`, `e2e/lab-03/authentication.spec.ts` |
| **AC-03** (Requester ownership anti-tampering) | `API-06`, `API-07` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-04** (Internal Notes hidden from Requester) | `API-08`, `UI-06` | `server/tests/lab-03/comments-notes.api.test.ts`, `client/tests/lab-03/StaffTicketDetail.test.tsx` |
| **AC-05** (Inactive user authentication rejected) | `API-02`, `UI-01` | `server/tests/lab-03/auth.api.test.ts`, `client/tests/lab-03/Login.test.tsx` |
| **AC-06** (Logout invalidates session) | `API-05`, `E2E-01` | `server/tests/lab-03/auth.api.test.ts`, `e2e/lab-03/authentication.spec.ts` |
| **AC-07** (IT Staff Queue cross-requester listing) | `API-09`, `UI-03`, `E2E-03` | `server/tests/lab-03/staff-queue.api.test.ts`, `client/tests/lab-03/StaffTicketQueue.test.tsx`, `e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-08** (Queue search, filtering, and pagination) | `API-10`, `UI-04`, `E2E-03` | `server/tests/lab-03/staff-queue.api.test.ts`, `client/tests/lab-03/StaffTicketQueue.test.tsx` |
| **AC-09** (Ticket ownership claim / reassign) | `API-11`, `UI-05`, `E2E-03` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `client/tests/lab-03/StaffTicketDetail.test.tsx` |
| **AC-10** (IT Priority update) | `API-12`, `E2E-03` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-11** (Permitted status transitions) | `UNIT-02`, `API-13`, `E2E-03` | `server/tests/lab-03/status-transition.unit.test.ts`, `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| **AC-12** (Public Comments posting & display) | `API-14`, `UI-06`, `E2E-03` | `server/tests/lab-03/comments-notes.api.test.ts`, `client/tests/lab-03/StaffTicketDetail.test.tsx` |
| **AC-13** (Internal Notes posting & role isolation) | `API-15`, `UI-06`, `E2E-03` | `server/tests/lab-03/comments-notes.api.test.ts`, `client/tests/lab-03/StaffTicketDetail.test.tsx` |
| **AC-14** (Requester resolution indication) | `API-16`, `E2E-04` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-15** (Admin user list with search & filter) | `API-17`, `UI-07`, `E2E-05` | `server/tests/lab-03/users-admin.api.test.ts`, `client/tests/lab-03/UserManagement.test.tsx`, `e2e/lab-03/user-administration.spec.ts` |
| **AC-16** (Admin create user & duplicate rejection) | `API-18`, `UI-08`, `E2E-05` | `server/tests/lab-03/users-admin.api.test.ts`, `client/tests/lab-03/UserManagement.test.tsx` |
| **AC-17** (Self-deactivation prevention) | `API-19`, `UI-09`, `E2E-05` | `server/tests/lab-03/users-admin.api.test.ts`, `client/tests/lab-03/UserManagement.test.tsx` |
| **AC-18** (Last active Admin deactivation prevention)| `API-20`, `UI-09`, `E2E-05` | `server/tests/lab-03/users-admin.api.test.ts`, `client/tests/lab-03/UserManagement.test.tsx` |
| **AC-19** (Non-Admin forbidden from admin APIs) | `API-17`, `E2E-05` | `server/tests/lab-03/users-admin.api.test.ts`, `e2e/lab-03/user-administration.spec.ts` |
| **AC-20** (Responsive viewport behavior) | `E2E-03`, `E2E-05` | `e2e/lab-03/staff-ticket-flow.spec.ts`, `e2e/lab-03/user-administration.spec.ts` |

---

## 4. Test Execution Commands

```bash
# 1. Run all backend unit and API integration tests (Lab 1, Lab 2, and Lab 3)
npm run test:server

# 2. Run single Lab 3 server test suite
npm --prefix server test tests/lab-03/auth.api.test.ts

# 3. Run all client UI component tests (Lab 1, Lab 2, and Lab 3)
npm run test:client

# 4. Run single Lab 3 client test suite
npm --prefix client test tests/lab-03/Login.test.tsx

# 5. Run Playwright End-to-End test suites
npm run test:e2e
```

---

## 5. Responsive and Visual Inspection Checklist

Per `Lab_3_sheet.pdf`, Section 14 (Part 9), the visual checklist confirms:

- [x] **Desktop Viewport (`1280px`)**:
  - Full application shell header showing authenticated user name and role badge (`Requester`, `IT Staff`, or `Admin`).
  - Navigation links filtered strictly by role.
  - IT Staff Ticket Queue displays all 8 justified columns with proper text truncation and tooltips.
  - Ticket Detail displays two-column layout with distinct styling for Public Comments (green) and Internal Notes (amber).
  - User Management table renders all user columns and modal actions cleanly.
- [x] **Tablet Viewport (`768px`)**:
  - Two-column grid wraps cleanly without clipping form labels or badges.
  - Ticket Queue table maintains touch-friendly scroll or flexible cell distribution.
  - User Management controls stack gracefully.
- [x] **Mobile Viewport (`375px`)**:
  - Single-column vertical layout.
  - Ticket Queue table converts to stacked card view with bold Ticket Number headers and status pills.
  - Zero horizontal page scrolling (`overflow-x: hidden`).
  - Form buttons and action links satisfy minimum $44 \times 44\text{px}$ touch target size.
- [x] **Zen Green Visual Consistency**:
  - Primary Green `#006B3C` used for header and primary buttons.
  - Pale Green `#EAF6EF` used for selection and public comment accent.
  - Muted gray-green `#E9ECEF` used for read-only shaded fields.
  - Dark Red `#B3261E` used for validation error text placed immediately below inputs.
  - Amber `#D97706` used exclusively for Internal Notes and warning alerts.
- [x] **Non-Color Indicators**:
  - All status, priority, and role indicators include visible text and geometric icons/shapes.
