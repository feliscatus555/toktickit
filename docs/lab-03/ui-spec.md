# Lab 3 Zen Green Theme UI Specification — TokTickIT

## Document Control & Citation Reference
* **Document Status**: Draft Sprint 3 Visual & Interaction UI Design Specification
* **Target Theme**: Zen Green Design Language (`docs/lab-03/Lab_3_sheet.pdf`, Section 7)
* **Base References**:
  * `docs/lab-03/Lab_3_sheet.pdf` (Section 7, Section 8, Section 14 Part 9)
  * `docs/lab-02/ui-spec.md` (Lab 2 UI Specification Baseline)

---

## 1. Zen Green Color System Tokens

| Token Name | Hex Code | Usage & Specification | Citation |
|---|---|---|---|
| **Primary Green** | `#006B3C` | Application shell header, primary call-to-action buttons, active navigation emphasis | `Lab_3_sheet.pdf`, Section 7 |
| **Secondary Green** | `#0B7A46` | Active tab highlights, focus outline rings, interactive text links, hover states | `Lab_3_sheet.pdf`, Section 7 |
| **Pale Green** | `#EAF6EF` | Selected card/table row emphasis, success callout background, subtle container shading | `Lab_3_sheet.pdf`, Section 7 |
| **Page Background** | `#F5F7F6` | Quiet, low-contrast off-white page background | `Lab_3_sheet.pdf`, Section 7 |
| **Surface / Card** | `#FFFFFF` | Card containers, form white backgrounds, table surfaces with restrained shadow | `Lab_3_sheet.pdf`, Section 7 |
| **Primary Text** | `#1F2937` | Dark charcoal-green text for maximum legibility (never pure `#000000`) | `Lab_3_sheet.pdf`, Section 7 |
| **Secondary Text** | `#5B6573` | Muted labels, secondary metadata, breadcrumbs, timestamp text | SDS System-Level |
| **Editable Field** | `#FFFFFF` | Input background with neutral `#D1D5DB` border | `Lab_3_sheet.pdf`, Section 7 |
| **Read-Only Field** | `#E9ECEF` / `#EAF6EF` | Soft gray-green shading distinguishing static values from editable inputs | `Lab_3_sheet.pdf`, Section 7 |
| **Error / Validation** | `#B3261E` | Dark red border and text; validation message positioned immediately below input | `Lab_3_sheet.pdf`, Section 7 |
| **Warning / Internal Note** | `#D97706` | Amber badge, callout border, and Internal Note visual accent | `Lab_3_sheet.pdf`, Section 7, 8.4 |
| **Success** | `#2E7D32` | Dark green confirmation text and icon wrapper | `Lab_3_sheet.pdf`, Section 7 |

---

## 2. Global Component Design Rules

### 2.1 Form Control & Validation States
* **Label Placement**: Labels are positioned directly above their respective form controls, using semi-bold weight (`font-weight: 600`) and a `4px` bottom margin (`Lab_3_sheet.pdf`, Section 7).
* **Required Field Marker**: Every required input field includes a red asterisk `*` (`color: #B3261E`) adjacent to its label. The asterisk acts as a visual prompt but **does not replace** explicit validation message text (`Lab_3_sheet.pdf`, Section 7).
* **Read-Only Shading**: System-generated or non-editable controls (e.g. Ticket Number, Created Date, Requester Name on staff detail view) use a soft gray-green background (`#E9ECEF`) to ensure immediate visual distinction from editable controls (`Lab_3_sheet.pdf`, Section 7, Section 8.4).
* **Validation Error Placement**: Validation error text is rendered in dark red (`#B3261E`) **immediately below** the associated input field, not aggregated solely in a top alert banner (`Lab_3_sheet.pdf`, Section 7, Section 8.1, Section 8.5).

### 2.2 Button Hierarchy & Interactive States
* **Primary Button**: Background `#006B3C`, white text (`color: #FFFFFF`). Used for main actions (e.g., "Sign In", "Save User", "Claim Ticket", "Post Comment").
* **Secondary Button**: Background `#EAF6EF`, text `#006B3C`, border `#0B7A46`. Used for secondary actions (e.g., "Cancel", "Back to Queue", "Clear Filters").
* **Destructive Button**: Background `#B3261E`, white text. Used for critical actions (e.g., "Deactivate User", "Remove Attachment").
* **Busy / Processing State**: During active network requests, the button displays a spinning loading icon alongside busy text (e.g., "Signing in...", "Saving...") and is programmatically `disabled` to prevent duplicate submissions (`Lab_3_sheet.pdf`, Section 8.1, Section 8.6).

### 2.3 Badges & Non-Color Indicators
* **Non-Color Reliance Rule** `[Source Requirement]`: Priority, Status, and Role badges must never rely on color alone to communicate state (`Lab_3_sheet.pdf`, Section 7; SDS Section *System-Wide UI Standards*). Every badge combines text with a clear icon or distinct container shape.
* **Requested Priority & IT Priority Badges**:
  * `Low`: Gray-green pill with down-arrow icon `↓ Low`
  * `Medium`: Neutral pill with horizontal icon `= Medium`
  * `High`: Orange-amber pill with up-arrow icon `↑ High`
  * `Urgent`: Red callout pill with lightning/exclamation icon `⚡ Urgent`
* **Status Badges** (`Lab_3_sheet.pdf`, Section 4.5):
  * `New`: Pale green badge with dot icon `● New`
  * `Open`: Blue badge with circle icon `○ Open`
  * `In Progress`: Blue-gray badge with gear icon `⚙ In Progress`
  * `Waiting for Requester`: Amber badge with clock icon `⏳ Waiting for Requester`
  * `Resolved`: Green badge with checkmark icon `✓ Resolved`
  * `Closed`: Dark slate badge with lock icon `🔒 Closed`
  * `Reopened`: Purple badge with refresh icon `⟲ Reopened`
  * `Cancelled`: Muted gray badge with cross icon `✕ Cancelled`
* **Role Badges**:
  * `Requester`: `#EAF6EF` background with green border `👤 Requester`
  * `IT Staff`: `#E0F2FE` background with blue border `🛠 IT Staff`
  * `Administrator`: `#FEF3C7` background with amber border `🛡 Admin`

### 2.4 Collaboration UI: Public Comments vs. Internal Notes Distinction
* **Visual Isolation Rule** `[Source Requirement]`: Public Comments and Internal Notes must be visually distinct so private information is not accidentally posted publicly (`Lab_3_sheet.pdf`, Section 8.4).
* **Public Comments Section**:
  * Accent: Pale Green (`#EAF6EF`) border and header icon `💬 Public Comments`.
  * Context Subtitle: *"Visible to Requester, IT Staff, and Administrator"*.
  * Comment Bubbles: Crisp white surface with green author tag (e.g. `Jennifer Anderson [Requester]`).
* **Internal Notes Section**:
  * Accent: Amber/gold callout border (`#D97706`), soft amber background tint (`#FFFBEB`), and lock icon `🔒 Internal Notes`.
  * Context Warning Banner: *"PRIVATE: Visible only to IT Staff and Administrators. Requesters cannot see this feed."*
  * Submit Action: Distinct button styled in amber `#D97706` labelled "Add Internal Note".

---

## 3. Screen Layout Specifications

### 3.1 Application Shell & Navigation
* **Top Navigation Bar**:
  * Background: Primary Green (`#006B3C`).
  * Logo: `TokTickIT` branding on the left.
  * Role-Permitted Navigation Destinations:
    * `Requester`: "My Tickets", "Create Ticket".
    * `IT Staff`: "My Queue", "Create Ticket".
    * `Administrator`: "User Management".
  * User Identity Area (Right Header):
    * Displays user avatar/icon, display name, and role badge (e.g., `👤 Sarah Johnson [IT Staff]`).
    * Dropdown menu with "Change Password" and "Logout" actions.
* **Development Requester Selector Removal** `[Source Requirement]`:
  * The Lab 2 simulated requester identity dropdown is completely removed from the navbar and application shell (`Lab_3_sheet.pdf`, Section 1, Section 7, Section 8.2).

### 3.2 Login & Mandatory First-Login Password Change Screens
* **Login Screen** (`Lab_3_sheet.pdf`, Section 8.1, wireframe page 8):
  * Centered card on `#F5F7F6` page canvas.
  * Header: "TokTickIT", Subtitle: "Sign in to your account".
  * Inputs:
    * "Email address" input with placeholder `name@toktickit.com`.
    * "Password" input with visibility toggle icon (eye icon).
  * Error Alert: "Invalid email or password. Please try again." rendered if credentials fail or account is inactive.
  * Button: "Sign In" primary button (shows spinner during processing).
* **Mandatory Password Change Screen** (`Lab_3_sheet.pdf`, Section 8.1, wireframe page 8):
  * Presented immediately upon login when user account has `mustChangePassword = true`.
  * Header: "Change Your Password", Subtitle: "You must change your password to continue".
  * Inputs:
    * "Current (temporary) password" with visibility toggle.
    * "New password" with visibility toggle.
    * "Confirm new password" with visibility toggle.
  * Password Rules Checklist (interactive green checkmarks upon satisfying each rule):
    * `✓ Be at least 8 characters`
    * `✓ Include upper and lower case letters`
    * `✓ Include a number and a special character`
  * Action: "Continue" primary button. Advances into normal application screen upon success.

### 3.3 Requester Ticket Detail Screen (View Mode & Collaboration)
* **Ticket Header & Read-Only Fields**: Grouped ticket metadata preserved from Lab 2.
* **Resolution Indication Button** (`Lab_3_sheet.pdf`, Section 1, Section 4.4 BR-05, Section 8.2):
  * "Problem Appears Resolved" secondary button visible to the owning Requester when status is `In Progress` or `Waiting for Requester`.
  * Clicking updates `isProblemAppearsResolved = true` and shows a confirmation banner: *"You indicated this issue appears resolved. IT Staff will verify and formally close the ticket."*
* **Public Comments Stream**:
  * Input textarea with character counter (0 / 2000).
  * "Post Comment" button.
  * Chronological feed showing author name, role, timestamp, and comment body.
* **Internal Notes**:
  * Completely hidden and omitted from Requester DOM (`Lab_3_sheet.pdf`, Section 4.4 BR-04, Section 8.2).

### 3.4 IT Staff Ticket Queue Screen
* **Toolbar & Query Controls** (`Lab_3_sheet.pdf`, Section 8.3, wireframe page 9):
  * Search input: "Search by ticket number or summary..." with search icon.
  * Category dropdown filter ("All Categories").
  * Status dropdown filter ("All Statuses").
  * Priority dropdown filter ("All Priorities").
  * Owner filter dropdown ("All Tickets", "Unassigned", "Assigned to Me").
  * Results count: e.g. "Showing 1 to 10 of 42 tickets".
* **Desktop Table View (`>= 992px`)**:
  * Columns:
    1. `Ticket No.` (clickable link to Ticket Detail)
    2. `Created Date` (formatted timestamp)
    3. `Summary` (truncated with tooltip)
    4. `Category`
    5. `Req. Priority` (Requested Priority badge)
    6. `IT Priority` (IT Priority badge)
    7. `Status` (Status badge)
    8. `Owner` (Owner display name or "Unassigned" muted text)
  * Row hover state: `#EAF6EF` highlight.
* **Mobile Card View (`< 768px`)**:
  * Stacked cards displaying Ticket Number header, Status pill, IT Priority badge, Summary, Category, and "Open Ticket" full-width button.
* **Pagination Bar**:
  * `< Previous`, numbered page buttons (`1`, `2`, `3`), `Next >`.

### 3.5 IT Staff Ticket Detail Screen
* **Operational Control Strip** (`Lab_3_sheet.pdf`, Section 8.4, wireframe page 10):
  * Back link: `← Back to Queue`.
  * Ticket Number and Created Date (read-only shaded).
  * Requester Name and Requested Priority (read-only shaded).
  * **Ticket Owner Control**: Dropdown showing active IT Staff/Admins, with immediate "Claim Ticket" action if unassigned.
  * **IT Priority Control**: Dropdown to select `Low`, `Medium`, `High`, or `Urgent`.
  * **Current Status Control**: Dropdown or status transition button group showing permitted next states based on current state.
  * **Resolution Summary Input**: Multiline textarea enabled when transitioning to `Resolved`.
* **Public Comments Section**:
  * Styled in pale green theme with textarea and "Post Comment" button.
* **Internal Notes Section**:
  * Styled with distinct amber callout frame and lock icon header.
  * Textarea: "Add private internal note..." with "Post Internal Note" amber button.
  * Chronological list of internal operational entries with author and timestamp.
* **Attachments Section**:
  * Download and soft-removal features preserved from Lab 2.

### 3.6 Administrator User Management Screen
* **User List Toolbar** (`Lab_3_sheet.pdf`, Section 8.5, wireframe page 12):
  * Header: "Users".
  * Search input: "Search users...".
  * Role filter dropdown ("All Roles", "Requester", "IT Staff", "Administrator").
  * "+ Create User" primary action button.
* **User List Table**:
  * Columns: `Name`, `Email`, `Role` (pill), `Status` (Active green badge or Inactive gray badge), `Actions` ("Edit" link).
* **Create User Panel / Modal** (`Lab_3_sheet.pdf`, wireframe page 12):
  * Fields:
    * "Full Name *" input.
    * "Email Address *" input.
    * "Role *" dropdown (`Requester`, `IT Staff`, `Administrator`).
    * "Active" toggle switch (default: `Yes`).
    * "Initial Password *" input with generated helper button.
    * Information Note: *"User will be required to change password on first login."*
  * Actions: "Save User" primary button, "Cancel" secondary button.
* **Edit User Modal**:
  * Allows updating Name, Email, Role, and Active toggle.
  * "Reset Initial Password" action button opening temporary password reset dialog.
  * "Deactivate User" destructive button with confirmation warning.
  * Safety guards: Button disabled or prompt blocked if user attempts to deactivate their own account or the sole remaining Administrator (`Lab_3_sheet.pdf`, Section 4.4).

---

## 4. Screen Modes and User Feedback

Per `Lab_3_sheet.pdf`, Section 8.6, the UI defines explicit handling for standard operational and error states:

1. **Loading State**: Shimmer or spinner overlay with disabled interactive controls during fetch requests.
2. **Saving State**: Button text updates to busy label (e.g. "Saving...", "Updating...") with spinning indicator; form controls disabled.
3. **Success Feedback**: Inline green toast or alert banner confirming creation or update (e.g. "User created successfully", "Status updated").
4. **Validation Feedback**: Dark red text (`#B3261E`) rendered directly beneath invalid fields with clear corrective guidance.
5. **Empty State**: Friendly graphic and prompt when no tickets or users exist (e.g. "No tickets in queue").
6. **No-Results State**: Filter box showing "No matching tickets found" with a "Clear Filters" action button.
7. **Forbidden Feedback (`403`)**: Clean access denied screen with message: *"You do not have permission to access this screen. Please contact an Administrator."*
8. **Not-Found Feedback (`404`)**: Clean resource not found card: *"The requested ticket could not be found."*
9. **Conflict Feedback (`409`)**: Specific message on collision (e.g. "A user with this email address already exists").
10. **Safe API Failure Feedback (`500`)**: Generic safe alert: *"An unexpected error occurred. Please try again later."* (Internal database errors or stack traces are never exposed).

---

## 5. Responsive and Accessibility Checklist

Per `Lab_3_sheet.pdf`, Section 8.7 and Section 14 (Part 9):

- [x] **Desktop Viewport (`>= 992px`)**:
  - Top navbar with full horizontal menu and user display.
  - Multi-column ticket queue table with clear column alignment.
  - Ticket detail layout with two-column split: operational metadata on left, comments/notes feed on right.
- [x] **Tablet Viewport (`768px - 991px`)**:
  - Two-column metadata grouping.
  - Responsive table container with preserved cell readability.
  - Form fields span full width of their grid column.
- [x] **Mobile Viewport (`< 768px`)**:
  - Navbar collapses to hamburger menu or compact header.
  - Ticket queue table transforms into stacked cards.
  - Zero horizontal page scrolling (`overflow-x: hidden`).
  - Touch targets meet minimum size ($\ge 44 \times 44\text{px}$).
- [x] **Accessibility (WCAG 2.2 AA)**:
  - Color contrast ratio $\ge 4.5:1$ for normal text against background.
  - Visible focus outlines (`#0B7A46`) on all interactive inputs and buttons.
  - `aria-label` attributes on icon-only buttons.
  - Error messages linked to inputs via `aria-describedby`.
