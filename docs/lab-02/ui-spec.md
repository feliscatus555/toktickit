# Lab 2 Zen Green Theme UI Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Approved Visual & Interaction UI Design Specification
* **Target Theme**: Zen Green Design Language (`docs/lab-02/Lab_02_labsheet.pdf`, Section 7)
* **Base References**:
  * `TokTickIT-System-Level-SDS-v1.0.pdf` (Section *Frontend and UI Design System*, Section *System-Wide UI Standards*)
  * `docs/lab-02/Lab_02_labsheet.pdf` (Section 7, Section 8, Section 17)

---

## 1. Zen Green Color System Tokens

| Token Name | Hex Code | Usage & Specification | Citation |
|---|---|---|---|
| **Primary Green** | `#006B3C` | Application shell header, primary call-to-action buttons, active navigation emphasis | Labsheet Section 7 |
| **Secondary Green** | `#0B7A46` | Active tab highlights, focus outline rings, interactive text links, hover states | Labsheet Section 7 |
| **Pale Green** | `#EAF6EF` | Selected card/table row emphasis, success callout background, subtle container shading | Labsheet Section 7 |
| **Page Background** | `#F5F7F6` | Quiet, low-contrast off-white page background | Labsheet Section 7 |
| **Surface / Card** | `#FFFFFF` | Card containers, form white backgrounds, table surfaces with restrained shadow | Labsheet Section 7 |
| **Primary Text** | `#1F2937` | Dark charcoal-green text for maximum legibility (never pure `#000000`) | Labsheet Section 7; SDS |
| **Secondary Text** | `#5B6573` | Muted labels, secondary metadata, breadcrumbs | SDS System-Level |
| **Editable Field** | `#FFFFFF` | Input background with neutral `#D1D5DB` border | Labsheet Section 7 |
| **Read-Only Field** | `#E9ECEF` / `#EAF6EF` | Soft gray-green shading clearly distinguishing static values from editable inputs | Labsheet Section 7, 4.4 |
| **Error** | `#B3261E` | Dark red border and text; validation message positioned immediately below input | Labsheet Section 7 |
| **Warning** | `#D97706` | Amber badge or callout container; prohibited from generic aesthetic decoration | Labsheet Section 7 |
| **Success** | `#2E7D32` | Dark green confirmation text and icon wrapper | Labsheet Section 7 |

---

## 2. Global Component Design Rules

### 2.1 Form Control & Validation States
* **Label Placement**: Labels are positioned directly above their respective form controls, using a semi-bold weight (`font-weight: 600`) and a `4px` bottom margin (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.3).
* **Required Field Marker**: Every required input field includes a red asterisk `*` (`color: #B3261E`) adjacent to its label. The asterisk acts as a visual prompt but **does not replace** explicit validation message text (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.3).
* **Read-Only Shading**: System-generated or read-only controls (e.g. Ticket Number, Ticket Date, Requester Name in Create Mode) use a soft gray-green background (`#E9ECEF`) to ensure immediate visual distinction from editable controls (`docs/lab-02/Lab_02_labsheet.pdf`, Section 4.4, Section 7).
* **Validation Error Placement**: Validation error text is rendered in dark red (`#B3261E`) **immediately below** the associated input field, not aggregated solely in a top summary alert (`docs/lab-02/Lab_02_labsheet.pdf`, Section 7, Section 8.3).

### 2.2 Button Hierarchy & Interactive States
* **Primary Button**: Background `#006B3C`, white text. Used for main form submission (e.g., "Submit Ticket", "Continue").
* **Secondary Button**: Background `#EAF6EF`, text `#006B3C`, border `#0B7A46`. Used for secondary actions (e.g., "Cancel", "Change Requester", "Clear Filters").
* **Destructive Button**: Background `#B3261E`, white text. Used for removal actions (e.g., "Remove Attachment").
* **Busy / Processing State**: During active API processing, the button displays a spinning loading icon alongside busy text (e.g., "Submitting...") and is programmatically `disabled` to prevent duplicate submissions (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.3).
* **Accessible Labels**: Every icon-only button must include an explicit `aria-label` attribute and a browser tooltip (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.3).

### 2.3 Status & Priority Badges
* **Non-Color Reliance Rule**: Priority and Status badges must never rely on color alone to communicate information (`TokTickIT-System-Level-SDS-v1.0.pdf`, Section *System-Wide UI Standards*; `docs/lab-02/Lab_02_labsheet.pdf`, Section 7, Section 8.3). Every badge combines text with a clear icon or distinct container shape.
* **Requested Priority Badges**:
  * `Low`: Gray-green badge with down-arrow icon `↓ Low`
  * `Medium`: Blue-grey badge with horizontal icon `= Medium`
  * `High`: Dark orange badge with up-arrow icon `↑ High`
  * `Urgent`: Red callout badge with exclamation icon `⚠ Urgent`
* **Status Badges**:
  * `New`: Solid pale green badge `#EAF6EF` with text `● New`

---

## 3. Screen Layout Specifications

### 3.1 Application Shell & Requester Selection Screen
* **Application Shell**:
  * Top navigation bar styled in Primary Green (`#006B3C`) featuring the `TokTickIT` logo, "My Tickets" link, "Create Ticket" link, and currently active Development Requester identity display (e.g. `👤 Somchai Pattana`).
  * "Change Requester" action link opens the Requester Selection modal/screen.
* **Development Requester Selector Screen**:
  * Central container on `#F5F7F6` background.
  * Headline: "Development Requester Selection".
  * Explanatory Alert: "Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3." (`docs/lab-02/Lab_02_labsheet.pdf`, Section 8.1).
  * Dropdown selector loading active requesters from API (`GET /api/requesters/active`).
  * "Continue" primary button.

### 3.2 Create Ticket Screen (Create Mode)
* **Header Area**: Displays title "Create IT Support Ticket".
* **System-Generated / Read-Only Strip**: Displays `Ticket Number: (Generated on Submission)` and `Requester: [Selected Requester Name]` in read-only shaded boxes (`#E9ECEF`).
* **Classification Row**: Two-column layout on desktop containing Category dropdown (`* Required`) and Related System dropdown (`* Required`).
* **Priority Selection**: Radio button group or custom pill selector for Requested Priority (`Low`, `Medium`, `High`, `Urgent`).
* **Content Fields**:
  * Summary input (`* Required`, single-line text input, 5–120 characters).
  * Description input (`* Required`, multiline textarea, 10–2000 characters).
* **Attachment Drag & Drop Zone**: File picker supporting JPG, PNG, WEBP, PDF (max 5 MB per file, max 5 files).
* **Action Footer**: "Cancel" secondary button and "Submit Ticket" primary button.

### 3.3 My Tickets Screen (List Mode)
* **Filter & Search Toolbar**:
  * Search input field with search magnifying icon ("Search by summary or ticket #...").
  * Category dropdown filter ("All Categories").
  * Status dropdown filter ("All Statuses").
  * Priority dropdown filter ("All Priorities").
  * Sort selector ("Sort by: Newest First").
  * "Create Ticket" primary action button positioned prominently.
* **Desktop Table View (`>= 992px`)**:
  * Columns: `Ticket #`, `Summary`, `Category`, `Priority`, `Status`, `Last Updated`, `Actions`.
  * Hover state on rows with pale green `#EAF6EF` highlight.
* **Mobile Card View (`< 768px`)**:
  * Table transforms into stacked card components. Each card displays Ticket Number as bold header, Category pill, Priority badge, Summary snippet, and "View Detail" full-width button.
* **Empty & No-Results States**:
  * Empty List: "You have not submitted any tickets yet. Click 'Create Ticket' to start."
  * No Search Results: "No tickets match your search filters." Includes a "Clear Filters" secondary button.

### 3.4 Requester Ticket Detail Screen (View Mode)
* **Read-Only Information Card**: All ticket header fields (Ticket Number, Requester, Date, Category, Related System, Requested Priority, Status, Summary, Description) rendered as static read-only text controls.
* **Attachment Section**:
  * Active Attachments list displaying file icon, original filename, file size (MB/KB), "Download" link, and "Remove" destructive button.
  * "Add Attachment" button (visible if active attachments < 5).
  * Soft-Removed Attachments tombstone list displaying file name, removal timestamp, removal reason, and a disabled "File Removed" badge.
* **Removal Confirmation Modal**: Modal dialog prompting for a mandatory "Reason for Attachment Removal" input before executing soft removal.

---

## 4. Responsive Breakpoint Rules

| Viewport Category | Width Range | Layout Adaptation Rules | Citation |
|---|---|---|---|
| **Desktop** | `>= 992px` | Multi-column grid layout, centered page wrapper with max-width `1200px`, full tabular data grid for My Tickets. | Labsheet Section 8.7 |
| **Tablet** | `768px - 991px` | Two-column form field grouping, Summary and Description inputs receive 100% width, flexible table grid with horizontal scrolling container. | Labsheet Section 8.7 |
| **Mobile** | `< 768px` | Single-column vertical field stacking, table transforms to card grid, touch targets minimum `44x44px`, zero horizontal page scrolling. | Labsheet Section 8.7 |

---

## 5. Accessibility & Visual Inspection Checklist

* **WCAG 2.2 AA Compliance**: Text contrast ratio `>= 4.5:1` against background (`#1F2937` on `#FFFFFF` / `#F5F7F6`).
* **Keyboard Focus**: Visible secondary green outline ring (`#0B7A46`, `2px solid`) on all focused interactive elements.
* **Screen Reader Attributes**: All input controls linked via `aria-describedby` to their respective field error messages.
* **Visual Inspection Screenshot Paths** (`docs/lab-02/Lab_02_labsheet.pdf`, Section 12):
  * `artifacts/lab-02/screenshots/create-ticket/desktop-initial.png`
  * `artifacts/lab-02/screenshots/create-ticket/desktop-validation-error.png`
  * `artifacts/lab-02/screenshots/my-tickets/desktop-list.png`
  * `artifacts/lab-02/screenshots/my-tickets/mobile-cards.png`
  * `artifacts/lab-02/screenshots/ticket-detail/desktop-detail.png`
  * `artifacts/lab-02/screenshots/ticket-detail/soft-removal-modal.png`
