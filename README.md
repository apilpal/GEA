# Gurukul Educational Academy: school management app

A mobile-first Progressive Web App for Gurukul Educational Academy (Kaist, Jaswant Nagar, Etawah), built with a FastAPI backend and a TypeScript frontend. It runs on a phone in Termux with SQLite, no Docker needed.

**Status:** under active development, phase by phase (see [Roadmap](ROADMAP.md)). Done so far: school data model and demo data, backup and restore, attendance entry, marks entry, fee payments and receipts, and student scorecards. Next: analytics, mobile polish, print and CSV exports, then a pilot at the school.

This repository is public and contains **fake demo data only**.

## Quick start

Works on Termux (Android) and on any Linux shell. You need `git` installed.

```bash
git clone https://github.com/apilpal/GEA.git
cd GEA
bash scripts/termux-setup.sh   # first time only: installs everything, asks for an admin login
pnpm dev                       # every time: starts backend and frontend together
```

Open **http://127.0.0.1:5173** and sign in with the admin account you created.
The API documentation is at **http://127.0.0.1:8000/docs**.

The first setup can take 10-30 minutes on a phone because two Python packages are compiled.
`RELOAD=1 pnpm dev` restarts the backend when you change Python code.

## Project layout

```
backend/        FastAPI app (src/api/v1/routers, src/services, src/core), Alembic migrations, SQLite data
frontend/       TypeScript + Vite PWA (src/ts, src/scss)
scripts/        termux-setup.sh (one-time setup) and dev.mjs (runs both servers)
```

## Useful commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start backend (port 8000) and frontend (port 5173) |
| `RELOAD=1 pnpm dev` | Same, and restart the backend when you change Python code |
| `pnpm create-admin` | Run the database/admin setup again (existing users are kept) |
| `pnpm seed` | Add or refresh the 75 sample students and 5 sample drivers (fee 500 each). Your own records and logins are kept, and it is safe to run again |
| `pnpm seed-school` | Load the fake demo school (521 students). Do not run `pnpm seed` after it |
| `pnpm backup` / `pnpm restore` | Back up or restore the SQLite database |

The maintained
backend tests are in `backend/tests_school/` (see `CLAUDE.md` for the command).

## Documentation

- The old `docs/` folder was removed because it was out of date. New documentation will be written after Phase 5. Until then, `CLAUDE.md`, `ROADMAP.md` and the GitHub issues are the reference.
- [Roadmap](ROADMAP.md) - what is done, what is in progress and what comes next
- [Changelog](CHANGELOG.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow. In short:

1. Fork the repository (or create a branch if you have push access).
2. Make your change on a branch: `git checkout -b my-change`.
3. Run the tests that apply to your change.
4. Open a pull request describing what you changed and why.

There are no automatic CI checks at the moment (see the roadmap), so please run tests yourself before opening a pull request.

## License

ISC (see `frontend/package.json`).
