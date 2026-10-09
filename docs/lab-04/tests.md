# Lab 4 Software Test Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Sprint 4 Authoritative Test Specification Baseline
* **Target Sprint**: Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression
* **Target Branch**: `lab4-staging`
* **Base References**:
  * `docs/lab-04/SE_Lab_4.pdf` (Section 10, Section 12, Section 14)
  * `docs/lab-04/specification.md` (Sprint 4 Engineering Specification)
  * `docs/lab-04/api-spec.md` (Sprint 4 REST API Specification)

---

## 1. Test Strategy & Verification Levels
TokTickIT utilizes a multi-layered verification strategy combining Spec DD, Test DD, and TDD (`SE_Lab_4.pdf`, Section 2, Section 10):

1. **Unit Tests (Vitest)**: Fast isolated validation of status transition rules, optimistic version incrementing, and input sanitization.
2. **API & Integration Tests (Vitest + Supertest)**: Rigorous endpoint-level testing against the PostgreSQL/Prisma database verifying authorization boundaries, resolution gates, optimistic concurrency handling, and dashboard calculation accuracy.
3. **UI Component Tests (Vitest + React Testing Library)**: Rendering, interaction, debouncing, role conditional display, and responsive state handling in the React client.
4. **End-to-End Tests (Playwright)**: Full browser automated user workflows covering multi-role login, action creation, ticket resolution gates, and dashboard navigation.
5. **Full Regression Suite**: Unbroken verification of all Labs 1 through 3 test suites ensuring no regressions in previous capabilities (`SE_Lab_4.pdf`, Section 8.5).

---

## 2. Planned-Test Table

| Test ID | Level | Requirement / AC | What It Tests | Expected Result | Automated Test File | Target Status |
|---|---|---|---|---|---|---|
| **UNIT-01** | Unit | FR-52, BR-04 | Status transition engine permits only valid transitions | Invalid jumps (e.g. `New` -> `Resolved`) rejected | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **UNIT-02** | Unit | FR-46, BR-01 | Action Taken validation logic requires followUpNote when flagged | Returns validation error on empty follow-up note | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-01** | API | FR-44, AC-01 | Create Action Taken auto-associates authenticated performer | Performer ID matches JWT user, not client input | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-02** | API | FR-45, BR-02 | Non-owner IT Staff can record action on assigned ticket | Action successfully created under ticket | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-03** | API | FR-43, AC-01 | Create valid Action Taken with complete fields (`SE_Lab_4.pdf`, Sec 10) | Created under correct Ticket and actor (`201 Created`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04** | API | FR-50, AC-06 | Requester attempts to `POST` Action Taken | Request rejected with `403 Forbidden` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-05** | API | FR-49, AC-05 | Requester retrieves Actions Taken for owned ticket | Returns chronological list (`200 OK`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-06** | API | FR-49, AC-05 | Requester retrieves Actions Taken for unowned ticket | Request rejected with `403 Forbidden` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-07** | API | FR-57, AC-07 | Transition to `Resolved` with zero Actions Taken | Rejected by resolution gate with `400 Bad Request` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-08** | API | FR-55, AC-08 | Transition to `Resolved` with >=1 Action Taken and owner | Status updated to `Resolved` (`200 OK`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-09** | API | FR-56, AC-09 | Requester marks problem resolved indication | Flag updated to `true`, status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-10** | API | FR-58, AC-10 | Stale update submitted with mismatched `version` counter | Request rejected with `409 Conflict` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-11** | API | FR-61, AC-12 | IT Staff retrieves operational dashboard metrics | Returns accurate server counts for all 5 statuses | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-12** | API | FR-70, AC-15 | Requester attempts to access staff dashboard | Request rejected with `403 Forbidden` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-13** | API | FR-71, AC-16 | Requester retrieves dashboard metrics (`SE_Lab_4.pdf`, Sec 9.1 AC-02) | Returns metrics strictly for authenticated requester | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-14** | API | FR-72, AC-16 | Requester dashboard does not leak tickets of other users | Cross-user records completely isolated | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **UI-01** | UI | FR-51, AC-03 | Renders Actions Taken section on Ticket Detail | Displays table with date, performer, result | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-02** | UI | FR-46, AC-04 | Follow-up checkbox toggles required follow-up note field | Note textarea becomes enabled and required | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-03** | UI | FR-50, AC-05 | Requester view omits create/edit controls for Actions Taken | Form buttons completely absent from DOM | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04** | UI | FR-59, AC-11 | Dynamic status dropdown shows only permitted next states | Invalid options omitted or disabled | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-05** | UI | FR-60, AC-08 | Successful status transition updates summary status immediately | Status badge updates without full reload | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-06** | UI | FR-62, AC-12 | IT Staff dashboard renders 5 metric cards and recent list | Cards display counts and comparison trends | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-07** | UI | FR-65, AC-13 | Clicking metric card navigates to filtered IT Staff Queue | URL / state updates with selected filter | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-08** | UI | FR-72, AC-16 | Requester dashboard renders 4 metric cards and quick actions | Cards show requester counts and action links | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **UI-09** | UI | FR-78, AC-18 | Double-click on submit button debounces duplicate request | Exactly one HTTP request dispatched | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **E2E-01** | E2E | FR-43, AC-01 | Full multi-role Actions Taken lifecycle (`SE_Lab_4.pdf`, Sec 10 E2E-02) | Action recorded, verified, and displayed | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-02** | E2E | FR-57, AC-07 | Ticket resolution gate E2E flow | Resolution blocked until action recorded | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| **E2E-03** | E2E | FR-61, AC-12 | Role dashboards navigation and metric drill-down | Cards navigate to filtered queues accurately | `e2e/lab-04/dashboards.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Functional Requirement | Verifying Test IDs | Test Type |
|---|---|---|---|
| **AC-01** (Action creation & performer) | FR-43, FR-44 | `API-01`, `API-03`, `E2E-01` | API / E2E |
| **AC-02** (Requester dashboard isolation) | FR-71, FR-72 | `API-13`, `API-14`, `UI-08` | API / UI |
| **AC-03** (Stable chronological order) | FR-43, FR-51 | `API-05`, `UI-01`, `E2E-01` | API / UI / E2E |
| **AC-04** (Mandatory follow-up note validation) | FR-46, FR-47 | `UNIT-02`, `API-03`, `UI-02` | Unit / API / UI |
| **AC-05** (Requester read-only actions view) | FR-49, FR-50 | `API-05`, `UI-03` | API / UI |
| **AC-06** (Requester create/edit action forbidden) | FR-50 | `API-04`, `API-06` | API |
| **AC-07** (Resolution gate blocks without action) | FR-57 | `API-07`, `E2E-02` | API / E2E |
| **AC-08** (Resolution succeeds with action) | FR-55, FR-60 | `API-08`, `UI-05`, `E2E-02` | API / UI / E2E |
| **AC-09** (Requester advisory flag unchanged status) | FR-56 | `API-09` | API |
| **AC-10** (Optimistic concurrency 409 conflict) | FR-58 | `API-10` | API |
| **AC-11** (UI displays only permitted transitions) | FR-59 | `UNIT-01`, `UI-04` | Unit / UI |
| **AC-12** (IT Staff dashboard 5 metrics) | FR-61, FR-62 | `API-11`, `UI-06`, `E2E-03` | API / UI / E2E |
| **AC-13** (Metric card queue drill-down) | FR-65 | `UI-07`, `E2E-03` | UI / E2E |
| **AC-14** (Recent ticket detail navigation) | FR-66 | `UI-06`, `E2E-03` | UI / E2E |
| **AC-15** (Staff dashboard forbidden to requester) | FR-70 | `API-12` | API |
| **AC-16** (Requester dashboard scoped metrics) | FR-72 | `API-13`, `UI-08` | API / UI |
| **AC-17** (Requester card drill-down) | FR-74 | `UI-08` | UI |
| **AC-18** (Button double-click debounce) | FR-78 | `UI-09` | UI |
| **AC-19** (Form data retention on failure) | FR-79 | `UI-02` | UI |
| **AC-20** (Full regression & zero console errors) | FR-77, FR-80 | Full Suite Run (`test:server`, `test:client`, `test:e2e`) | Regression |

---

## 4. Test Execution Commands

```bash
# Execute all server unit and integration tests (including Lab 1, 2, 3, and 4)
npm run test:server

# Execute all client unit and component tests (including Lab 1, 2, 3, and 4)
npm run test:client

# Execute Playwright End-to-End test suites
npm run test:e2e
```

---

## 5. Responsive and Visual Inspection Checklist
Screenshots must be saved to the following artifact paths for submission evidence (`SE_Lab_4.pdf`, Section 12, Section 14):

* **IT Staff Dashboard** (`artifacts/lab-04/screenshots/staff-dashboard/`):
  * [ ] Desktop (1280px): 5 metric cards, recent tickets list, quick actions panel.
  * [ ] Tablet (768px): clean metric wrapping and stacked sections.
  * [ ] Mobile (375px): single-column cards, no horizontal scroll.
* **Requester Dashboard** (`artifacts/lab-04/screenshots/requester-dashboard/`):
  * [ ] Desktop (1280px): 4 metric cards, owned recent tickets, quick actions.
  * [ ] Mobile (375px): accessible touch targets (>= 44px) and stacked layout.
* **Actions Taken on Ticket Detail** (`artifacts/lab-04/screenshots/actions-taken/`):
  * [ ] List view showing multiple recorded actions with performer and results.
  * [ ] Create mode form with validated follow-up note field.
  * [ ] Requester read-only view confirming absence of action controls.
