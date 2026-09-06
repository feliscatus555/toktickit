# Lab 2 Test Plan, Traceability and Results Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Approved Test Strategy & Traceability Specification
* **Target Sprint**: Lab 2 — Requester Ticketing MVP with UI Foundation
* **Base References**:
  * `TokTickIT-System-Level-SDS-v1.0.pdf` (Section *Testing Architecture*, Section *Mandatory Business-Rule Tests*)
  * `docs/lab-02/Lab_02_labsheet.pdf` (Section 9 *Test DD and TDD Deliverable*, Section 16 *Appendix B*)

---

## 1. Test Strategy & Verification Levels

TokTickIT applies Test-Driven Development (TDD) and Test-Driven Specification (Test DD). Automated test scenarios are planned before implementation and mapped directly to Acceptance Criteria (`AC-01` through `AC-25`).

1. **Unit Testing (Vitest)**: Validates pure domain logic, input validators, formatters, ticket number generator (`TKT-YYYY-NNNNN`), and state transformers without network/database side effects.
2. **API Integration Testing (Vitest + Supertest)**: Verifies Express routes, Prisma queries, payload validations, HTTP status codes, transactions, and ownership authorization against an isolated test database.
3. **UI Component Testing (Vitest + React Testing Library)**: Tests component rendering, input state changes, field-level error message placement, asterisks, button disabled/busy states, and requester context switching.
4. **Responsive & Visual Inspection (Playwright)**: Verifies responsive layout behavior at Desktop (`1280x800`), Tablet (`768x1024`), and Mobile (`375x667`) viewports, confirming zero horizontal overflow and accessible contrast.
5. **End-to-End Testing (Playwright E2E)**: Simulates complete requester workflows in a real browser: selecting a requester, creating a ticket with attachments, locating it in My Tickets, filtering/searching, opening Ticket Detail, downloading files, and soft-removing attachments.

---

## 2. Planned-Test Table

| Test ID | Level | Requirement / AC | What It Tests | Expected Result | Automated Test File Path | Status |
|---|---|---|---|---|---|---|
| **UNIT-01** | Unit | BR-01, FR-06 | Ticket Number generator format | Returns `TKT-YYYY-NNNNN` with current year and padded sequence | `server/tests/lab-02/ticket-number.unit.test.ts` | Passed |
| **UNIT-02** | Unit | BR-08, BR-09 | Input trimming and length validator | Trims whitespace; rejects summary < 5 or > 120 chars | `server/tests/lab-02/validation.unit.test.ts` | Passed |
| **UNIT-03** | Unit | BR-04 | Attachment file extension & size checker | Accepts PDF/PNG/JPG <= 5MB; rejects `.exe` or > 5MB | `server/tests/lab-02/attachment-validator.unit.test.ts` | Passed |
| **API-01** | API | AC-01, FR-06 | Valid ticket creation (`POST /api/tickets`) | Returns HTTP 201 Created with saved record & `TKT-YYYY-NNNNN` | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| **API-02** | API | AC-01, FR-08 | Ticket creation missing summary | Returns HTTP 422 Unprocessable Entity with `fieldErrors` array | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| **API-03** | API | AC-02, FR-01 | Retrieve active requesters (`GET /api/requesters/active`) | Returns HTTP 200 OK with active requesters; excludes inactive | `server/tests/lab-02/requesters_api.test.ts` | Passed |
| **API-04** | API | AC-03, FR-16 | Unauthorized ticket access (`GET /api/tickets/:id`) | Requester B accessing Requester A's ticket returns HTTP 403 | `server/tests/lab-02/ticket-detail.api.test.ts` | Passed |
| **API-05** | API | AC-07, FR-11 | Ticket search & filter (`GET /api/tickets?search=laptop`) | Returns HTTP 200 OK with matching owned tickets only | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| **API-06** | API | AC-04, FR-09 | Oversized attachment upload | Upload > 5 MB returns HTTP 422 with `INVALID_ATTACHMENT` | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **API-07** | API | AC-05, FR-09 | Exceeding 5 active attachments limit | 6th attachment upload returns HTTP 422 limit error | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **API-08** | API | AC-06, FR-15 | Soft removal of attachment | Returns HTTP 200 OK; sets `deletedAt`; binary deleted | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **API-09** | API | AC-06, FR-15 | Download soft-removed attachment | Download request to soft-removed attachment returns HTTP 410 | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **API-10** | API | AC-03, FR-16 | Unauthorized attachment download | Requester B downloading Requester A's file returns HTTP 403 | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **UI-01** | UI | AC-02, FR-01 | Requester selector rendering | Renders dropdown with active requesters and disclaimer | `client/tests/lab-02/RequesterSelector.test.tsx` | Passed |
| **UI-02** | UI | AC-01, FR-08 | Create Ticket required field asterisks | Red asterisks render on Summary, Description, Category | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| **UI-03** | UI | AC-01, FR-08 | Field validation error placement | Submitting empty form displays error text directly below inputs | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| **UI-04** | UI | AC-01, FR-05 | Submit button busy/loading state | Clicking submit disables button and displays spinner | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| **UI-05** | UI | AC-08, FR-03 | Changing requester identity context | Switching requester reloads list and updates shell header | `client/tests/lab-02/MyTickets.test.tsx` | Passed |
| **UI-06** | UI | AC-09, FR-10 | Empty state rendering | Zero tickets displays "No tickets submitted yet" message | `client/tests/lab-02/MyTickets.test.tsx` | Passed |
| **UI-07** | UI | AC-09, FR-11 | No search results state | Non-matching query renders no-results box & Clear button | `client/tests/lab-02/MyTickets.test.tsx` | Passed |
| **UI-08** | UI | AC-06, FR-15 | Soft removal modal confirmation | Clicking remove opens modal prompting for mandatory reason | `client/tests/lab-02/AttachmentSection.test.tsx` | Passed |
| **UI-09** | UI | AC-06, FR-15 | Display soft-removed tombstone | Soft-removed attachment renders as tombstone with reason | `client/tests/lab-02/AttachmentSection.test.tsx` | Passed |
| **UI-10** | UI | AC-01, FR-05 | Priority badge non-color icon render | Priority badges display text + icons (e.g. `↑ High`) | `client/tests/lab-02/Badge.test.tsx` | Passed |
| **E2E-01** | E2E | AC-01..08 | Complete ticket creation & lookup flow | User selects requester, creates ticket, locates in My Tickets | `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |
| **E2E-02** | E2E | AC-08 | Multi-requester isolation workflow | Requester A's tickets disappear when switching to Requester B | `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |
| **E2E-03** | E2E | AC-06 | Attachment upload & soft removal flow | Uploads PDF, downloads it, soft-removes with reason | `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |
| **E2E-04** | E2E | AC-10 | Responsive mobile viewport flow | Full mobile layout interaction at 375px without scroll | `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Primary Automated Test Cases | Test File Coverage |
|---|---|---|
| **AC-01** (Valid creation & Ticket #) | `API-01`, `UI-02`, `UI-03`, `E2E-01` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx`, `requester-ticket-flow.spec.ts` |
| **AC-02** (Requester selector requirement) | `API-03`, `UI-01`, `E2E-01` | `requesters.api.test.ts`, `RequesterSelector.test.tsx` |
| **AC-03** (Ownership isolation & 403) | `API-04`, `API-10`, `E2E-02` | `ticket-detail.api.test.ts`, `attachments.api.test.ts` |
| **AC-04** (Invalid file type/size error) | `UNIT-03`, `API-06` | `attachment-validator.unit.test.ts`, `attachments.api.test.ts` |
| **AC-05** (Max 5 attachments limit) | `API-07` | `attachments.api.test.ts` |
| **AC-06** (Soft removal & tombstone) | `API-08`, `API-09`, `UI-08`, `UI-09`, `E2E-03` | `attachments.api.test.ts`, `AttachmentSection.test.tsx` |
| **AC-07** (Search & filtering) | `API-05`, `UI-07`, `E2E-01` | `my-tickets.api.test.ts`, `MyTickets.test.tsx` |
| **AC-08** (Switching requester context) | `UI-05`, `E2E-02` | `MyTickets.test.tsx`, `requester-ticket-flow.spec.ts` |
| **AC-09** (Empty & no-results states) | `UI-06`, `UI-07` | `MyTickets.test.tsx` |
| **AC-10** (Mobile responsive layout) | `E2E-04` | `requester-ticket-flow.spec.ts` |

---

## 4. Test Execution Commands

```bash
# 1. Run Server Unit and API Integration Tests
npm --prefix server test

# 2. Run Client UI Component Tests
npm --prefix client test

# 3. Run End-to-End Playwright Tests
npx playwright test --config=e2e/playwright.config.ts
```

---

## 5. Responsive and Visual Inspection Checklist

- [x] **Desktop Viewport (`1280px`)**: Multi-column form layout, header navigation alignment, My Tickets table grid display without text truncation.
- [x] **Tablet Viewport (`768px`)**: Two-column field grouping, Summary and Description inputs span 100% width, flexible table grid container.
- [x] **Mobile Viewport (`375px`)**: Single-column vertical stacking, My Tickets table transforms into card view, touch targets >= 44x44px, zero horizontal page scroll bar (`overflow-x: hidden`).
- [x] **Zen Green Visual Palette**: Primary Green `#006B3C` header, Pale Green `#EAF6EF` selection highlight, dark red `#B3261E` validation error text below inputs.
- [x] **Non-Color Indicators**: Priority and Status badges contain visible icons (`↑ High`, `● New`).
