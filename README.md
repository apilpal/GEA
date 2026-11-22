# Student Profiles PWA

A school transport management app: keep track of students, drivers and bus routes, see
fees and reports on a dashboard, and ask an AI assistant for help. It is a Progressive Web
App (installable, mobile-first) with a FastAPI backend and a TypeScript frontend.

## Features

- **Students, drivers and routes** - add and edit records, assign students to a driver's route.
- **Dashboard and reports** - totals, students per driver, and fees by route and by grade, with charts.
- **Login with roles** - JWT authentication using HttpOnly cookies. Roles are admin, teacher, accountant, driver, student and parent; staff roles manage students and drivers, finance roles see reports and charts, and only admins can use CSV sync.
- **AI chat assistant** - a chat page backed by the `/api/chat` endpoints.
- **CSV sync** - bulk-load driver and student data from CSV files.
- **Demo data** - while the database is empty the dashboard shows sample data (75 students, 5 drivers, fee 500 each) so every page has something to display. `pnpm seed` puts the same sample data into the database, so every phone shows the same thing; students and drivers you added yourself are kept.
- **Runs on a phone** - one-command setup for Termux, no Docker or PostgreSQL required (SQLite by default).

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
More options (ports, auto-reload, opening the app from another device) are in
[Running the app](docs/getting-started/running-on-termux.md).

## Project layout

```
backend/        FastAPI app (src/api/v1/routers, src/services, src/core), Alembic migrations, SQLite data
frontend/       TypeScript + Vite PWA (src/ts, src/scss), Jest tests, mock API server
scripts/        termux-setup.sh (one-time setup) and dev.mjs (runs both servers)
tests/          Backend API/unit/integration tests and test runner scripts
e2e_tests/      End-to-end browser tests
mcp-server/     Basic MCP server
vscode-extension/  Basic VS Code extension (commands for the MCP server and backend API)
docs/           All documentation - start at docs/README.md
```

## Useful commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start backend (port 8000) and frontend (port 5173) |
| `RELOAD=1 pnpm dev` | Same, and restart the backend when you change Python code |
| `pnpm create-admin` | Run the database/admin setup again (existing users are kept) |
| `pnpm seed` | Add or refresh the 75 sample students and 5 sample drivers (fee 500 each). Your own records and logins are kept, and it is safe to run again |
| `./test.sh` | Run backend, frontend and end-to-end tests |

Test tools (pytest, Jest, Puppeteer) are separate from the runtime packages; see
[Testing](docs/testing/README.md) for how to set them up.

## Documentation

- [Documentation index](docs/README.md) - guides, architecture, API, deployment, testing, troubleshooting
- [Roadmap](ROADMAP.md) - what is done, what is in progress and what comes next
- [Changelog](CHANGELOG.md)

## Contributing

1. Fork the repository (or create a branch if you have push access).
2. Make your change on a branch: `git checkout -b my-change`.
3. Run the tests that apply to your change.
4. Open a pull request describing what you changed and why.

There are no automatic CI checks at the moment (see the roadmap), so please run tests yourself before opening a pull request.

## License

ISC (see `frontend/package.json`).
