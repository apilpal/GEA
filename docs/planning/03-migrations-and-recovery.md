# Database migrations and recovery (issue #29)

The schema is managed by Alembic (`backend/alembic/`). The old revisions are kept in
`backend/alembic/legacy_versions/` for history only.

## Commands (run from `backend/`, venv active)

| Task | Command |
|---|---|
| Set up or upgrade a database (backs it up first, then migrates) | `python setup_local.py` (or `pnpm create-admin` from the repo root) |
| Migrate only | `python -m alembic upgrade head` |
| Show the current revision | `python -m alembic current` |
| Run the schema tests | `python -m pytest tests_school -q` |

`ALEMBIC_DATABASE_URL` overrides the database for a single run. The default is
`sqlite:///./data/students.db`.

## Revisions

- `0001_baseline` - the tables as they were before the school work (students, drivers, users, chat). Only creates what is missing, so databases from the old setup are adopted without changes.
- `0002_school_schema` - academic years, class sections, teachers, subjects, class-subject links, routes, holidays, exams, attendance, assessment scores, fee invoices and payments. Rebuilds `students` to add the school columns and to drop the unique constraint on `mobile`. It also maps existing data:
  - one `routes` row per distinct `students.route` (linked to the driver with the same route text; monthly fee starts at 0 and must be set by the admin);
  - one class-section (section `A`) per distinct `students.class_` value, with `4th` and `7th` normalised to `4` and `7`; real sections are entered later;
  - the 2026-27 academic year, the three exams (Terminal 40, Half-yearly 60, Annual 100) and the standard subject names.
  - `students.fees`, `students.class_`, `students.route` and `students.address` are kept unchanged.

## Backups and rollback

`setup_local.py` copies the database to `backend/data/backups/students-<time>-before-upgrade.db` using SQLite's backup API before any migration. These files are ignored by git.

Revision 0002 cannot be downgraded. To roll back, stop the app and restore the backup:

```
cp backend/data/backups/<file>.db backend/data/students.db
```

## Notes

- SQLite does not enforce foreign keys unless `PRAGMA foreign_keys = ON` is set on each connection. The tests turn it on; enabling it in the application is a later task.
- Money columns are whole rupees (integers).
