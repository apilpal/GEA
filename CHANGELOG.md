# Changelog

Short history of what changed. Older entries were removed because they described the earlier transport app; they stay in git history.

## Unreleased

### Added
- Phase 0: data rules and roles, migrations and recovery plan.
- Phase 1: school data model (years, classes, subjects, attendance, exams, marks, invoices, payments), demo data (`pnpm seed-school`, 521 fake students), backup and restore (`pnpm backup`, `pnpm restore`).
- Phase 2: attendance entry, marks entry (with AB for absent), fee payments with receipts and admin-only reversals, student scorecards.
- Phase 3 (#35): Analytics page. School summary, grade and class comparison, follow-up labels (distinction, steady, borderline, at risk) and a student list per class, all computed on the server. Label limits are assumed until the school decides its pass mark.
- `pnpm dev` runs backend and frontend together; `scripts/termux-setup.sh` sets up Termux.
- `CLAUDE.md` and `CONTRIBUTING.md` for contributors.

### Changed
- Removed the old `docs/` folder, unused tools (MCP server, VS Code extension, old end-to-end and root tests, build scripts) and stale reports. New documentation will be written after Phase 5.
