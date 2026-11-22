# Roadmap

Where the project stands and what comes next. Last updated: November 2026.
Older long-term ideas (microservices, machine learning, integrations) are kept in
[docs/roadmap/strategic-roadmap-2025.md](docs/roadmap/strategic-roadmap-2025.md); the working task list is
[docs/roadmap/TODO.md](docs/roadmap/TODO.md).

## Done

- **Login with roles** - login is required; staff roles manage students and drivers, finance roles see reports, charts and the dashboard, admins manage CSV sync. The guest login was removed.
- **Run it on a phone** - `bash scripts/termux-setup.sh` once, then `pnpm dev` starts backend and frontend together (SQLite, no Docker).
- **Demo data** - while the database is empty the dashboard shows 75 students, 5 drivers and a fee of 500 per student.
- **Dashboard fixes** - authenticated API requests, dashboard navigation and the sidebar on small screens.
- **Documentation cleanup** - one README, one documentation index, duplicate and generated files removed, old material moved to `docs/archive/`.

## Now

- **Fix the stylesheet build.** `frontend/styles.css` is a committed, out-of-date compiled file, and the SCSS in `frontend/src/scss` does not compile cleanly, so new styles do not reach the app. Make `styles.css` build from the SCSS and stop committing the output.
- **Clean up generated frontend files.** Remove the generated `.js` and `.map` files from the `ts` folders and let `tsc` produce them.
- **Real data instead of demo data.** Make adding students and drivers and importing CSV files simple enough that a school can replace the demo data on day one.
- **Tests that match the code.** Update the existing tests after the login and guest changes; add a test for the location bar HTTPS changes and one that checks the payload sent to the server.
- **One request/response model.** Make the frontend and backend request and response shapes the same.

## Next

- **Basic CI.** The CI workflows were removed. Add one small workflow that installs dependencies, runs the backend tests and the frontend tests on every pull request.
- **Backups and validation.** Database backup and restore, input validation on API requests, and connection pooling for PostgreSQL.
- **Per-role screens.** Give drivers, parents and students screens that show only their own routes, students and fees.
- **Fees and payments.** Track which students have paid each month, not only the amount due.
- **Reports export.** Download reports as CSV or PDF.

## Later (ideas, not commitments)

- Notifications to parents (route changes, delays).
- Route planning help and a map view.
- Offline use and installable PWA polish.
- Translations and accessibility review.
- Analytics over several months.

## How this roadmap is kept

Move an item up when work starts, and into **Done** (with a line in the
[changelog](CHANGELOG.md)) when it ships. Keep it short; put detail in `docs/roadmap/`.
