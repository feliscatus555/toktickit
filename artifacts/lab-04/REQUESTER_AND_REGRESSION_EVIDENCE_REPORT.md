# Lab 4 Submission Evidence: Requester Dashboard & Final Regression UI

**Author:** Iris French (67070503478) — GitHub: [@feliscatus555](https://github.com/feliscatus555)  
**Task:** Part 8: Working Requester Dashboard and Final Regression UI (`SE_Lab_4.pdf`, Section 14, Item 8 — 5 Points)  
**Specification Reference:** [`docs/lab-04/specification.md`](file:///home/iris/Documents/toktickit/docs/lab-04/specification.md) (FR-71 to FR-76, BR-07, AC-02, AC-16, AC-17)  
**Test Reference:** [`docs/lab-04/tests.md`](file:///home/iris/Documents/toktickit/docs/lab-04/tests.md) (`server/tests/lab-04/requester-dashboard.api.test.ts`, `client/tests/lab-04/RequesterDashboard.test.tsx`)  
**Storage Directory:** [`artifacts/lab-04/screenshots/requester-and-regression/`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/)

---

## 1. Overview & Verification Checklist

| # | Requirement Category | Screenshot File | Verification Summary |
|---|---|---|---|
| 1 | **Requester-Owned Metrics** | [`01-requester-owned-metrics.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/01-requester-owned-metrics.png) | Requester dashboard (`Somchai Pattana`) rendering 4 server-computed metrics (`My Open Tickets: 64`, `In Progress: 9`, `Resolved: 9`, `Closed: 0`) and personalized greeting. |
| 2 | **Recent & Attention-Required Tickets** | [`02-recent-and-attention-required-tickets.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/02-recent-and-attention-required-tickets.png) | Focused table showing recent tickets with amber `• Waiting for You` status badge indicating attention required from the requester alongside `• In Progress` and `• New`. |
| 3 | **Drill-Down Behavior** | [`03-metric-drilldown-filtered-my-tickets.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/03-metric-drilldown-filtered-my-tickets.png) | Clicking the "In Progress" metric card navigates to My Tickets with status dropdown automatically filtered to `In Progress` displaying 9 matching tickets. |
| 4 | **Ownership Protection** | [`04-ownership-protection-requester-isolation.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/04-ownership-protection-requester-isolation.png) | Cross-user isolation proof: Ananya Srisuk logs in and sees only her scoped metrics (`Open: 139`, `In Progress: 11`, `Resolved: 1`) and tickets, with zero access to Somchai's data. |
| 5 | **Authentication Regression** | [`05-regression-authentication.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/05-regression-authentication.png) | Standardized Zen Green sign-in portal with email/password authentication, password masking toggle, and input validation. |
| 6 | **My Tickets Regression** | [`06-regression-my-tickets.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/06-regression-my-tickets.png) | Requester ticket management list with full text search, multi-criteria filtering (status, category, priority), deterministic sorting, and pagination. |
| 7 | **Ticket Detail (Requester)** | [`07-regression-ticket-detail.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/07-regression-ticket-detail.png) | Requester view of Ticket Detail on `TKT-2026-98551`: metadata header, description, read-only Actions Taken, and strictly hidden IT Staff controls. |
| 8 | **Attachments Regression** | [`08-regression-attachments.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/08-regression-attachments.png) | Ticket Detail Attachments tab showing active uploaded file `vpn_gateway_error.png` (`240.0 KB`), download button, remove action, and upload dropzone. |
| 9 | **Public Comments Regression** | [`09-regression-public-comments.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/09-regression-public-comments.png) | Bi-directional public conversation thread between Requester and IT Staff with role badges, timestamps, and comment form. |
| 10 | **IT Staff Functions Regression** | [`10-regression-it-staff-functions.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/10-regression-it-staff-functions.png) | Staff view (`Sarah Johnson`) showing operational workflow controls: Owner selector, IT Priority selector, Next Status transition select, and `+ Add Action Taken`. |
| 11 | **Internal Notes Regression** | [`11-regression-internal-notes.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/11-regression-internal-notes.png) | Staff-only yellow confidential notes tab (`🔒 Private Internal Notes`) showing internal diagnostic log hidden from Requesters per FR-58. |
| 12 | **Admin User Management** | [`12-regression-admin-user-management.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/12-regression-admin-user-management.png) | Administrator console (`John Smith`) managing accounts, roles (`Administrator`, `IT Staff`, `Requester`), active status toggles, and user creation. |

---

## 2. Visual Evidence Gallery

### Part A: Requester Dashboard & Ownership Protection

#### 1. Requester-Owned Operational Metrics
![Requester Owned Metrics](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/01-requester-owned-metrics.png)
- **Path:** [`artifacts/lab-04/screenshots/requester-and-regression/01-requester-owned-metrics.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/01-requester-owned-metrics.png)
- **Verification:** Logged in as `Somchai Pattana` (`somchai.p@kmutt.ac.th`). The dashboard displays:
  - Personalized greeting: `"Welcome, Somchai Pattana!"`
  - 4 server-computed metric cards: `My Open Tickets (64)`, `In Progress (9)`, `Resolved (9)`, `Closed (0)`.
  - Quick Actions panel with direct buttons for `+ Create Ticket` and `View My Tickets`.

#### 2. Recent & Attention-Required Tickets
![Recent and Attention Required Tickets](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/02-recent-and-attention-required-tickets.png)
- **Path:** [`artifacts/lab-04/screenshots/requester-and-regression/02-recent-and-attention-required-tickets.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/02-recent-and-attention-required-tickets.png)
- **Verification:** Focused view of "My Recent Tickets" table:
  - Top ticket `TKT-2026-98496` prominently renders the amber `• Waiting for You` status badge, alerting the requester that staff requires clarification.
  - Displays ticket IDs, summaries, formatted timestamps, and `View` action buttons.

#### 3. Metric Card Drill-Down Behavior
![Metric Drilldown Filtered](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/03-metric-drilldown-filtered-my-tickets.png)
- **Path:** [`artifacts/lab-04/screenshots/requester-and-regression/03-metric-drilldown-filtered-my-tickets.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/03-metric-drilldown-filtered-my-tickets.png)
- **Verification:** Clicking the `In Progress` metric card seamlessly navigates to the "My Tickets" view:
  - Status dropdown selector (`#my-tickets-status-filter`) is pre-populated with `In Progress`.
  - Table displays exclusively In Progress records (`Showing 1 to 9 of 9 tickets`, matching the exact count of 9 on the dashboard card).

#### 4. Strict Ownership Protection (Cross-Requester Isolation)
![Ownership Protection Isolation](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/04-ownership-protection-requester-isolation.png)
- **Path:** [`artifacts/lab-04/screenshots/requester-and-regression/04-ownership-protection-requester-isolation.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/04-ownership-protection-requester-isolation.png)
- **Verification:** Authenticated as second requester `Ananya Srisuk` (`ananya.s@kmutt.ac.th`):
  - Greeting updates to `"Welcome, Ananya Srisuk!"`.
  - Metrics are strictly scoped to Ananya's records: `My Open Tickets: 139`, `In Progress: 11`, `Resolved: 1`.
  - Recent tickets display only Ananya's tickets (`TKT-2026-00004`, `TKT-2026-98566`, etc.). No cross-user ticket leakage occurs.

---

### Part B: Representative Regression Evidence

#### 5 & 6. Authentication and Ticket Management
````carousel
![Authentication Screen](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/05-regression-authentication.png)
<!-- slide -->
![My Tickets Screen](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/06-regression-my-tickets.png)
````
- **Paths:** [`05-regression-authentication.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/05-regression-authentication.png) & [`06-regression-my-tickets.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/06-regression-my-tickets.png)
- **Verification:** 
  - **Auth:** Standardized login interface with institutional branding, email validation, and role session establishment.
  - **My Tickets:** Full ticket catalog for Requester with search, multi-filter dropdowns (Category, Status, Priority), and pagination controls.

#### 7, 8, & 9. Ticket Detail, Attachments, and Public Comments
````carousel
![Ticket Detail View](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/07-regression-ticket-detail.png)
<!-- slide -->
![Attachments Tab](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/08-regression-attachments.png)
<!-- slide -->
![Public Comments Tab](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/09-regression-public-comments.png)
````
- **Paths:** 
  - [`07-regression-ticket-detail.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/07-regression-ticket-detail.png)
  - [`08-regression-attachments.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/08-regression-attachments.png)
  - [`09-regression-public-comments.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/09-regression-public-comments.png)
- **Verification:** 
  - **Ticket Detail:** Requester view with clean summary, description, and read-only Actions Taken section. Staff controls are omitted.
  - **Attachments:** Active attachment list showing `vpn_gateway_error.png` (`240.0 KB`), upload timestamp, and file upload zone.
  - **Public Comments:** Chronological discussion thread between Requester and IT Staff with role badges and composition form.

#### 10 & 11. IT Staff Workflow Controls and Confidential Internal Notes
````carousel
![IT Staff Controls](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/10-regression-it-staff-functions.png)
<!-- slide -->
![Internal Notes Tab](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/11-regression-internal-notes.png)
````
- **Paths:** [`10-regression-it-staff-functions.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/10-regression-it-staff-functions.png) & [`11-regression-internal-notes.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/11-regression-internal-notes.png)
- **Verification:**
  - **IT Staff Controls:** Logged in as `Sarah Johnson` (`IT Staff` badge). Workflow controls are active: Ticket Owner selector, IT Priority selector, Next Status selector, and `+ Add Action Taken` button.
  - **Internal Notes:** Staff-only confidential tab (`🔒 Private Internal Notes`) rendered with yellow header badge `Staff Only (Hidden from Requester)`. Note authoring form and immutable log are strictly inaccessible to Requesters.

#### 12. Administrator User Management
![Admin User Management](/home/iris/.gemini/antigravity-ide/brain/e2c92947-1193-4fc8-9977-636eef486eea/12-regression-admin-user-management.png)
- **Path:** [`artifacts/lab-04/screenshots/requester-and-regression/12-regression-admin-user-management.png`](file:///home/iris/Documents/toktickit/artifacts/lab-04/screenshots/requester-and-regression/12-regression-admin-user-management.png)
- **Verification:** Authenticated as Administrator `John Smith` (`🛡 Administrator`). Displays user accounts table with Display Name, Email, Role badges, Active/Inactive status pills, Edit modal triggers, and `+ Create User` button.
