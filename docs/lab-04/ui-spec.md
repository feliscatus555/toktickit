# Lab 4 UI Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Sprint 4 Authoritative UI Specification
* **Target Sprint**: Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression
* **Target Branch**: `lab4-staging`
* **Base References**:
  * `docs/lab-04/SE_Lab_4.pdf` (Section 3, Section 7, Section 8.1–8.6, page 5 & page 6 mockups)
  * `docs/lab-03/ui-spec.md` (Lab 3 UI Specification Baseline)
  * `client/src/App.tsx` (Current Application Shell)

---

## 1. Zen Green Color System Tokens & Design Language
TokTickIT preserves the Zen Green design system established in Lab 2 and Lab 3 (`SE_Lab_4.pdf`, Section 3, Section 7):

| Token Name | Hex Code | Semantic Role |
|---|---|---|
| `--zen-primary` | `#1b4332` | Primary brand green; nav headers, active links, primary buttons |
| `--zen-primary-hover` | `#2d6a4f` | Interactive hover state for primary elements |
| `--zen-accent` | `#40916c` | Secondary highlights, quick action accents, active borders |
| `--zen-subtle` | `#d8f3dc` | Soft tint backgrounds for cards, badges, and table highlights |
| `--zen-bg-page` | `#f8faf8` | Clean neutral-tinted page canvas |
| `--zen-surface` | `#ffffff` | Elevated card surfaces and container backgrounds |
| `--zen-border` | `#e2e8f0` | Crisp structural borders and card dividers |
| `--zen-text-main` | `#1e293b` | Primary high-contrast body typography |
| `--zen-text-muted` | `#64748b` | Secondary captions, timestamps, and card labels |
| `--zen-success` | `#2e7d32` | Success alerts and `Resolved` / `Closed` indicators |
| `--zen-warning` | `#ed6c02` | `Waiting for Requester` and follow-up alerts |
| `--zen-danger` | `#d32f2f` | `Cancelled` badges, conflict alerts, and field validation errors |

---

## 2. Global Component Design Rules

### 2.1 Metric Card Design (`SE_Lab_4.pdf`, Section 7, Section 8.1, Section 8.2)
* **Structure**: Clean elevated white container (`border-radius: 8px`, subtle shadow `0 1px 3px rgba(0,0,0,0.08)`).
* **Content Stack**:
  1. **Label**: Muted uppercase caption (e.g. `NEW`, `MY OPEN TICKETS`), `font-size: 0.85rem`, bold.
  2. **Value**: Prominent numerical display, `font-size: 2.25rem`, bold, color `--zen-text-main`.
  3. **Trend / Delta Indicator**: Subtitle showing comparison (e.g. `▲ +3 from yesterday`), colored in green for positive or muted gray for neutral (`SE_Lab_4.pdf`, page 5 mockup).
  4. **Drill-down Action**: Text link "View all" or full-card click target with clear focus indicator.
* **Hover State**: Slight elevation lift (`translateY(-2px)`) and subtle border color transition to `--zen-accent`.

### 2.2 Button Hierarchy & Double-Click Debounce (`SE_Lab_4.pdf`, Section 8.5)
* **Primary Action**: Solid `--zen-primary` with high-contrast white text.
* **Secondary Action**: Border button with `--zen-border` and `--zen-text-main`.
* **Debounce Safeguard**: All submission and status transition buttons must immediately disable upon click (`disabled={isSubmitting}`), render an inline loading spinner, and ignore repeated clicks during flight.

### 2.3 Non-Color Status Cues (`SE_Lab_4.pdf`, Section 7)
* Status badges must always display explicit text labels paired with distinctive shape/border treatments or icons:
  * `New`: Outline pill badge with circular dot icon.
  * `Open`: Solid blue-tint pill with folder icon.
  * `InProgress`: Solid amber-tint pill with gear/progress icon.
  * `WaitingForRequester`: Striped warning pill with hourglass icon.
  * `Resolved`: Solid green pill with checkmark icon.
  * `Closed`: Muted gray pill with lock icon.
  * `Cancelled`: Dark gray pill with strikethrough.

---

## 3. Screen Layout Specifications

### 3.1 Application Shell & Navigation Header (`SE_Lab_4.pdf`, Section 7)
* **Navbar**:
  * Brand logo: "TikTockIT" with Zen Green emblem.
  * Navigation links:
    * Requester view: `Dashboard`, `My Tickets`, `Create Ticket`.
    * IT Staff / Admin view: `Dashboard`, `Ticket Queue`, `Create Ticket`, plus `User Management` (Admin only).
  * Active link indicator: Solid 3px bottom border in `--zen-primary` and font weight 600.
  * User menu: Displays user display name, role badge, and `Logout` button.

### 3.2 IT Staff Dashboard (`SE_Lab_4.pdf`, Section 8.1, page 5 mockup)
* **Header Bar**:
  * Title: "Welcome back, [Name]!"
  * Subtitle: "Here's what's happening with your queue today"
  * Action: "Refresh" button (with refresh icon).
* **Metric Cards Grid (5-column layout on desktop, 1-column on mobile)**:
  * Card 1: `New` (e.g. `14`, `▲ +3 from yesterday`).
  * Card 2: `Open` (e.g. `23`, `▼ -2 from yesterday`).
  * Card 3: `In Progress` (e.g. `18`, `▲ +1 from yesterday`).
  * Card 4: `Waiting for Requester` (e.g. `7`, `• 0 from yesterday`).
  * Card 5: `My Assigned` (e.g. `16`, `▲ +4 from yesterday`).
* **Main Content Area (2-column layout on desktop: 8 cols left, 4 cols right)**:
  * **Left Column — "My Recent Tickets"**:
    * Section header with "View all" link pointing to IT Staff Queue.
    * Concise table with columns: `Ticket ID`, `Summary`, `Status`, `Last Updated`.
    * Clicking any row navigates directly to Ticket Detail.
  * **Right Column — "Quick Actions"**:
    * Clean card container with 3 prominent clickable action blocks:
      1. `+ Create Ticket` (subtitle: "Submit a new request")
      2. `Search Tickets` (subtitle: "Search by number or keyword")
      3. `My Queue` (subtitle: "View tickets assigned to you")

### 3.3 Requester Dashboard (`SE_Lab_4.pdf`, Section 8.2, page 6 mockup)
* **Header Bar**:
  * Title: "Welcome, [Name]!"
  * Subtitle: "Here's the latest on your requests"
* **Metric Cards Grid (4-column layout on desktop, 1-column on mobile)**:
  * Card 1: `My Open Tickets` (e.g. `3`) + "View all" link.
  * Card 2: `In Progress` (e.g. `2`) + "View all" link.
  * Card 3: `Resolved` (e.g. `5`) + "View all" link.
  * Card 4: `Closed` (e.g. `12`) + "View all" link.
* **Main Content Area (2-column layout: 8 cols left, 4 cols right)**:
  * **Left Column — "My Recent Tickets"**:
    * Table listing recent tickets owned by this requester with Ticket Number, Summary, Status badge, Timestamp, and "View all" link.
  * **Right Column — "Quick Actions"**:
    * 2 clickable action blocks:
      1. `+ Create Ticket` (subtitle: "Submit a new request")
      2. `View My Tickets` (subtitle: "Track existing requests")

### 3.4 Actions Taken on Ticket Detail (`SE_Lab_4.pdf`, Section 8.3)
* **Location**: Embedded on Ticket Detail view directly below Ticket Summary/Description and above the Comments/Notes tabs.
* **List / Table View**:
  * Columns: `Action Date/Time`, `Description`, `Result`, `Performed By`, `Follow-up?`, `Attachment Notes`, `Actions`.
  * If `followUpRequired` is true: Displays an alert pill ("Follow-up Required") and shows `followUpNote` in a callout block.
* **Create Mode (IT Staff & Admin only)**:
  * Form fields:
    * Description (`<textarea>` required, min 5 chars).
    * Result (`<textarea>` required, min 5 chars).
    * Follow-up Required (`<input type="checkbox">`).
    * Follow-up Note (`<textarea>`, dynamically enabled and required when checkbox is checked).
    * Attachment Notes (`<input type="text">` optional file hint).
  * "Save Action" button (with debounce protection) and "Cancel" button.
* **Requester View**:
  * Displays the full list of recorded Actions Taken in read-only mode (`SE_Lab_4.pdf`, Section 4.3, Section 8.3).
  * Create, edit, and status action buttons are omitted.

### 3.5 Ticket Workflow & Resolution Gate UI (`SE_Lab_4.pdf`, Section 8.4)
* **Dynamic Status Controls**:
  * The status update dropdown/button group dynamically displays only permitted next states based on current state.
  * If ticket has 0 Actions Taken, selecting `Resolved` displays an inline warning banner: *"Resolution requires at least one recorded Action Taken."* and disables the confirmation button (`BR-08`).
* **Optimistic Concurrency Collision Feedback**:
  * If a concurrent edit collision occurs (HTTP 409), renders a prominent non-intrusive alert: *"Another user modified this ticket. Click here to reload current changes without losing your input."*

---

## 4. Screen Modes and User Feedback

| State / Condition | Visual Representation | Recovery / Drill-Down Action |
|---|---|---|
| **Loading** | Accessible skeleton placeholders matching card dimensions | Automatic on response |
| **Empty Metrics** | Large `0` count with muted gray status text | "No tickets currently in this status" |
| **Empty Recent Tickets** | Clean icon container with friendly text | Direct link: "+ Create your first ticket" |
| **Validation Error** | Red inline message under affected field (`--zen-danger`) | Focus automatically shifted to invalid input |
| **Resolution Blocked** | Amber warning banner above status button | "Record an Action Taken before marking Resolved" |
| **409 Concurrency Conflict** | Prominent warning callout banner | "Reload ticket data" button preserving draft note |
| **403 Forbidden** | Clean Zen Green unauthorized card | "Return to Dashboard" action |

---

## 5. Responsive and Accessibility Checklist

### 5.1 Responsive Breakpoint Guidelines (`SE_Lab_4.pdf`, Section 7, Section 8.6)
* **Desktop (>= 992px)**:
  * Staff dashboard: 5 metric cards across a single row; 2-column layout (8 cols list, 4 cols quick actions).
  * Requester dashboard: 4 metric cards across a single row; 2-column layout.
  * Actions Taken: full table layout with all columns visible.
* **Tablet (768px - 991px)**:
  * Metric cards: 2 or 3 cards per row wrapping cleanly.
  * Main content stacks into a single column with quick actions positioned below the recent tickets list.
* **Mobile (< 768px)**:
  * Metric cards: 1 card per row, full width.
  * Tables collapse into stacked, card-based list items without horizontal scrolling.
  * Minimum touch target size: 44px x 44px on all interactive buttons and links.

### 5.2 Accessibility Standards (WCAG 2.1 AA) (`SE_Lab_4.pdf`, Section 7, Section 14 Part 9)
* [x] All interactive elements possess visible, high-contrast focus rings (`outline: 2px solid var(--zen-accent)`).
* [x] All form inputs have explicit, programmatically associated `<label>` elements.
* [x] Color contrast ratios strictly exceed 4.5:1 for body text and 3:1 for large headings.
* [x] Status badges combine visible color with text labels and semantic icons.
* [x] Modal dialogs trap focus and support `Escape` key dismissal.
* [x] Zero horizontal overflow on viewport widths down to 320px.
