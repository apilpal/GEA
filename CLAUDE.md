# CLAUDE.md

Guidance for Claude (and anyone working with Claude) on this repository.

## What this project is
A school management PWA for Gurukul Educational Academy (Kaist, Jaswant Nagar, Etawah): students, attendance, exam marks, fees, scorecards, transport. Long-term goal: fees, attendance, exams, staff, parents, SMS/WhatsApp, Hindi/English.
Backend: FastAPI + SQLAlchemy 2 (async) + SQLite + Alembic. Frontend: TypeScript + Vite (no framework) + SCSS. Python 3.13.

**The repo is public on purpose, with fake data only.** Never commit real student data, phone numbers, passwords, tokens or `.env` files. Demo data is clearly fictional (admission numbers start `DEMO-`).

## Where the plan is
- **`ROADMAP.md` and the GitHub issues #21 to #41 in apilpal/GEA are the plan and are accurate** (roadmap phases #21 to #26, tasks under them).
- **The whole `docs/` folder was removed** because it was out of date (it stays in git history). Do not recreate it, and do not trust old copies or `README.md` text about features; the README still describes the old transport app. Fresh docs and a new README are written after Phase 5.
- If the code, the tests or the owner disagree with the roadmap text, ask the owner; do not guess.
- The business rules are summarised in "Rules that must not be broken" below and are enforced by the pure functions in `backend/src/services/` and their tests in `backend/tests_school/`. Read those.
- Done: Phases 0 to 2 (data rules, schema, demo data, backup/restore, attendance entry, marks entry, fee payments, scorecards).
- Phase 3 analytics: #35 management and class analytics is built (`routers/analytics.py`, `services/analytics_rules.py`, Analytics page). Next: #36 subject comparison and diagnostics, #37 fee collection, Phase 4 mobile polish and print/CSV (#38, #39), Phase 5 operations and pilot (#40, #41).

## How we work
- **One issue, one branch, one PR**, named like `phase2-marks-33`, with `Closes #N` in the PR description. Keep PRs small and squash noisy commits before pushing.
- The owner and a friend both work **from phones in Termux** and often get changes as `.patch` files (`git am`). Give Termux commands in small copy-paste blocks, one task per block, and say what output to expect.
- Say plainly what was and was not run. If tests could not be run, say so and ask for the result before calling something done.
- Plain, short language. Money is shown in rupees (₹), whole numbers.

## Commands (run from the repo root unless noted)
```
bash scripts/termux-setup.sh        # first time only
pnpm dev                            # backend (8000) and frontend (5173) together
pnpm seed-school                    # demo school data (521 students). Never run `pnpm seed` after it: it adds 75 old sample students
pnpm backup / pnpm restore          # SQLite backup and restore
cd backend && source .venv/bin/activate
python -m pytest tests_school -q --noconftest --ignore=tests_school/test_token_refresh.py   # the real test suite, about 1 to 2 minutes
```
Only `backend/tests_school/` is maintained. Other older tests under `backend/` are not used. Always pass `--noconftest`.
Database changes go through Alembic (`backend/alembic/versions`, current head `0003_auth_tables`). Never edit an old revision; add a new one. SQLite needs batch mode (already configured).

## Code map
- `backend/src/main.py` creates the app and registers routers. A new router must be added in **both** `main.py` and `src/api/v1/routers/__init__.py`.
- `backend/src/api/v1/routers/` thin endpoints (attendance, marks, fees, scorecards, students, ...). `backend/src/services/` holds rules as **pure functions** with no database (`marks_rules.py`, `fee_rules.py`, `scorecard_rules.py`) so they are easy to test and to change.
- Models: `backend/src/core/models/models.py` (students, users, drivers) and `school_models.py` (years, classes, subjects, attendance, exams, scores, invoices, payments). Shared `Base`.
- Roles: `UserRole` (admin, teacher, accountant = "Office Clerk", driver, student, parent). Use `check_permissions([...])`, `require_admin`, `require_teacher_or_admin`. **Authorization must be enforced in the backend**; hiding a button is not enough.
- Frontend: each screen is a page manager in `frontend/src/ts/page-managers/*-manager.ts`. **A new page needs four edits**: the menu item and `<div id="x-page" class="page">` in `frontend/index.html`, the entry in `navigationConfig` in `src/ts/router.ts`, the title in `PAGE_TITLES` in `src/ts/demo-data.ts` (a page missing there silently falls back to the dashboard), and an export in `page-managers/index.ts`.
- `frontend/styles.css` is **compiled from SCSS and committed**. If you change `src/scss`, rebuild it. The newer pages keep their small styles in a `<style>` block in `index.html` instead.
- Put server text on the page with `textContent`, never `innerHTML`.

## Rules that must not be broken
- Money is a whole-rupee integer. Payments are never edited or deleted: a wrong one is reversed by a new negative row linked to the original (admin only, with a reason). Receipt numbers are unique and never reused. Invoice status is derived, never stored.
- Marks: 0 up to the maximum of the part, at most 2 decimals. Absent is "AB" (no mark plus an absent flag), **never zero**, and AB and not-yet-entered marks are left out of totals and percentages. Maximums: Terminal 40, Half-yearly 60, Annual 100; classes 6 to 8 have two papers for Hindi, English and Maths.
- Attendance: one row per student per date, present/absent/late/leave, no Sundays or holidays, late counts as present, leave is left out of the rate. A teacher can mark only their own class, today and 2 days back.
- Bulk saves are atomic: any invalid row rejects the whole request and nothing is written.
- No pass or fail is shown anywhere until the school decides the pass mark.

## Pitfalls we already hit
- **Never read ORM attributes after `await db.commit()`.** The app's session expires objects on commit, and touching one triggers a lazy load that fails with `MissingGreenlet` (it looked like a random "Failed to fetch"). Copy the values you need into plain variables before committing. Tests must use the app's default session settings (`async_sessionmaker(engine)` without `expire_on_commit=False`) so this is caught.
- SQLite foreign keys are not enforced by the app (`PRAGMA foreign_keys` is off); do not rely on them to reject bad data.
- Running Alembic (as the tests do) switches off existing loggers; re-enable a logger inside a test if you assert on its log lines.
- On Termux there is no network for package installs inside tool sessions, and some packages (`httpx2` for `test_token_refresh.py`) may be missing. Do not add heavy dependencies.
- `demo-data.ts` still shows built-in sample data while the database is empty.

## Tests: what a new endpoint needs
Follow `tests_school/test_marks_api.py`: a temp SQLite file migrated with Alembic, the router mounted on a small FastAPI app, `get_current_active_user_from_any_source` overridden per role. Cover: the happy path, every rule above that applies, each role (allowed and 403), anonymous access, invalid input leaving nothing written, a failed commit leaving nothing written, and the edge cases the rules above imply.

## Open decisions (ask the owner, do not guess)
Pass mark and whether every subject must be passed (the Analytics bucket limits 75, 50 and 33 percent in `analytics_rules.py` are assumed until then); the holiday list; advance payment for the whole year; the exact subject list per class group and whether oral/activity papers carry marks; section and teacher assignments (class teacher, subject teachers, linking teachers to logins); whether to remove the old `/public/*` endpoints; the real split of the 40 and 60 marks between part I and II (assumed even).

## Known issues to pick up later
Students page shows only 100 students (needs paging and search); "Class: N/A" on old sample students; Reports page uses `$` instead of `₹`; Reports, Charts and Dashboard still allow teachers although the role table says teachers must not see fee data; page headings are faint on the dark theme; the monthly invoice generator does not exist yet (the demo data has invoices).
