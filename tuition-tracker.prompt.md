---
name: "Build Tuition Calendar Tracker"
description: "Build or improve a mobile-first calendar app for tracking tuition attendance, monthly lesson cycles, earnings, and history."
argument-hint: "Optional constraints, preferred stack, or feature changes"
agent: "agent"
---

Build a complete, working tuition tracker in the current workspace, following the app's existing framework, conventions, and design system. If the workspace is empty, choose a suitable lightweight stack and create the app structure needed to run it. Treat the requirements below as the product specification; use sensible defaults for details not specified, and ask a concise clarifying question only when an unresolved detail would change financial calculations or data loss behavior.

## Product

Create a mobile-first tuition attendance and earnings tracker. The primary screen is a calendar. Users can create multiple tuitions, each with a tuition name, subject, required lesson days per cycle/month, monthly fee in taka (BDT), and an identifying color.

## Calendar and attendance

- Show a usable month calendar with clear month navigation and a selected-tuition control.
- Tapping a date marks attendance for the selected tuition; tapping it again unmarks that tuition for that date. Make the interaction easy to use on touchscreens and visually clear through the tuition color and an accessible selected state.
- Prevent duplicate attendance for the same tuition on the same date. Attendance for different tuitions on the same date must remain independent.
- Display each tuition's current cycle number, completed lesson count, lesson quota, and earned amount. Calculate earned amount proportionally: monthly fee / cycle quota \* lessons marked in that cycle. For example, a BDT 4,000 tuition with a 16-lesson quota earns BDT 3,000 at 12/16.
- When a cycle reaches its quota, mark it completed, preserve it in history, and create the next cycle at 0/quota. For example: Siam01 16/16 completed, followed by Siam02 0/16 = BDT 0/4,000.
- Keep attendance and cycle totals consistent when marks are removed or tuition details are edited. Editing a tuition's monthly fee or lesson quota recalculates its current and historical cycle totals using the new settings, while preserving recorded attendance dates. Do not silently lose historical records; use a clear confirmation for destructive actions and preserve report accuracy.

## Tuition list and management

- Show all created tuitions below the calendar, with active/in-progress tuitions above completed cycles/tuitions and completed items lower in the list.
- Provide create, edit, and delete actions. Include appropriate edit/delete actions for tuition records shown in report/history as well. Confirm destructive deletion and preserve historical attendance and earned totals where possible.
- Make tuition color, subject, lesson quota, and monthly fee easy to scan without making the list visually heavy.

## Reports and history

- Add a distinct report/history screen reachable from the home screen.
- Show past and completed tuition cycles with dates, attendance counts, cycle progress/completion, and calculated earnings. Keep current and historical records distinguishable.
- Ensure edits and deletions made from history follow the same data-consistency and confirmation rules as the main screen.

## Quality bar

- Make the calendar the first and primary experience. Optimize for narrow mobile screens first, then adapt cleanly to larger screens.
- Build real interactions and persistent data using the existing backend if present; otherwise use a suitable local persistence mechanism so data survives reloads.
- Use accessible labels, adequate touch targets, keyboard support where appropriate, and clear empty, loading, and error states.
- Keep calculations in reusable domain logic, not duplicated in UI components. Validate quota and fee inputs and format money as BDT.
- Follow the existing project's conventions. Avoid unnecessary dependencies and unrelated refactors.
- Run the relevant checks and start the app if the environment supports it. Report what was implemented, how to run it, and any known limitations.
