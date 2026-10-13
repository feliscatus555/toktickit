# Lab 4 — AI Use and Reflection

**LLM/agent used:** <Gemini 3.8 Flash(High)>

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | "In actions taken, the column name attachment notes and actions overlap each other" | Inspected table layout in `ActionsTaken.tsx`, added responsive column widths, min-width rules, and text overflow styling to eliminate visual collisions. |
| 2 | "Actions taken is not properly formatted for mobile" | Refactored `ActionsTaken.tsx` to implement responsive dual-mode layout: full table on desktop/tablet (>=768px) and stacked touch-friendly card layout on mobile (<768px) with zero horizontal overflow. |
| 3 | "Should actions taken have a status column?" | Evaluated relational schema and specification requirements; confirmed status belongs to parent `Ticket` while `ActionTaken` tracks chronological work log with `result` and `followUpNote`. |
| 4 | "Implement Feature 14 Ticket Status Workflow, Resolution Gate & Concurrency Protection according to Lab 4 specifications and create relevant tests including failure cases" | Implemented strict status state machine, backend Resolution Gate (requiring owner + >=1 action), optimistic locking with `version` checks returning `409 Conflict`, advisory resolution flag, and 30+ comprehensive unit/integration/UI tests. |
| 5 | "What to do on the website to test the changes you just made" | Produced an interactive, role-based manual verification walkthrough covering Sarah (IT Staff) and Somchai (Requester) test cases, resolution gate blocking banners, and concurrency handling. |
| 6 | "Implement Feature 15 staff dashboard according to lab4 specifications and create relevant tests that also account for failure cases" | Implemented IT Staff operational dashboard with 5 metric summary cards, recent tickets list, quick actions panel, role authorization (`403 Forbidden` for requesters), and filtered queue navigation. |
| 7 | "Implement Feature 16 requester-dashboard according to lab4 specifications and create relevant tests accounting for failure cases" | Built Requester dashboard with 4 personalized metric cards, owned ticket list, quick action shortcuts, role-isolated endpoints, and end-to-end integration tests. |
| 8 | "Update the README file with Lab 4 architecture, features, and test results" | Updated root `README.md` with complete Sprint 4 architectural summary, API contracts, UI component hierarchy, and verified 373/373 test passing metrics. |

## Reflection
Two or three sentences: what made your prompts better, and one place you had to
correct or reject what the agent produced.

