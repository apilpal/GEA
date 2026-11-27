# Changelog

Short history of what changed. Older entries were removed because they described the earlier transport app; they stay in git history.

## Unreleased

### Added
- Phase 0: data rules and roles, migrations and recovery plan.
- Phase 1: school data model (years, classes, subjects, attendance, exams, marks, invoices, payments), demo data (`pnpm seed-school`, 521 fake students), backup and restore (`pnpm backup`, `pnpm restore`).
- Phase 2: attendance entry, marks entry (with AB for absent), fee payments with receipts and admin-only reversals, student scorecards.
- Phase 3 (#35): Analytics page. School summary, grade and class comparison, follow-up labels (distinction, steady, borderline, at risk) and a student list per class, all computed on the server. Label limits are assumed until the school decides its pass mark.
- Phase 3 (#36): subject comparison (school average per subject, class-by-subject table, biggest bottlenecks) and notes that explain follow-up with a plain reason: low attendance, subject gap, weak subject, high spread, attendance gap. Limits are assumed until the school decides.
- Phase 3 (#37): Fee collection page for the admin and the office clerk. Due, collected, outstanding and overdue by fee type, class, transport route and month, payments by method, and follow-up lists of students with overdue or pending fees. Reversed payments are not counted as collected.
- Phase 4 (#38): mobile and accessibility polish. ₹ with Indian grouping everywhere (Reports, Dashboard demo data, students table) through one helper; page headings and notes readable on the dark theme; scorecard and fee statement readable on the dark theme; sticky first column on wide tables; 44px touch targets; stronger focus ring; table captions and column scopes; focus moves to the opened class; reduced-motion respected.
- `pnpm dev` runs backend and frontend together; `scripts/termux-setup.sh` sets up Termux.
- `CLAUDE.md` and `CONTRIBUTING.md` for contributors.

### Changed
- Removed the old `docs/` folder, unused tools (MCP server, VS Code extension, old end-to-end and root tests, build scripts) and stale reports. New documentation will be written after Phase 5.
