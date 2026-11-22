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
- `0003_auth_tables` - `token_blacklist`, `auth_audit_log` and `refresh_tokens`, which the JWT service uses for token revocation, rotation and the audit trail. Tables that already exist (databases from the old setup) are left as they are.

## Backups and restore (issue #31)

`backend/db_backup.py` makes and restores backups of the SQLite database. From the repo root you can use the shortcuts `pnpm backup` and `pnpm restore -- <file>`; from `backend/` run `python db_backup.py <command>`.

| Task | Command |
|---|---|
| Back up now | `python db_backup.py backup` |
| List backups | `python db_backup.py list` |
| Check a backup file | `python db_backup.py verify <file>` |
| Restore a backup | stop the app, then `python db_backup.py restore <file>` |

**How it works.** Backups use SQLite's backup API, so the copy is consistent even while the app is running, and only committed data is copied. Each backup is written under a temporary name, checked with `PRAGMA integrity_check`, and only then kept. Files are named `students-YYYYMMDD-HHMMSS.db` and stored in `backend/data/backups/` (ignored by git).

**Frequency and retention.**
- Back up at the end of every school day, and before any bulk import, seed or upgrade. `python setup_local.py` already makes a `-before-upgrade` copy automatically.
- The newest 14 regular backups are kept; older ones are deleted. `-before-upgrade` and `-before-restore` copies are never deleted automatically.

**Restore steps.**
1. Stop the app (Ctrl+C on `pnpm dev`).
2. Run `python db_backup.py list`, pick a file, then `python db_backup.py restore backend/data/backups/<file>` and type `yes`.
3. The backup is verified first. The database as it was just before the restore is saved as `...-before-restore.db`, so a restore can itself be undone.
4. Start the app and check the dashboard counts.

If the backup is damaged the restore stops and the current database is left unchanged.

**Errors and privacy.** Failures print a short message and are logged to `backend/logs/backup.log` with file names, sizes and error types only. Logs and messages never contain passwords, tokens or student details.

**Limitations.**
- Backups stay on the same phone. Copy the newest file to another place (for example your Downloads folder, or another device) regularly; a lost phone loses the backups too.
- Backups are not encrypted. They contain real student data once real data is entered, so keep them private.
- There is no automatic schedule yet (planned for Phase 5). Run `pnpm backup` yourself, or add it to a Termux scheduled job.
- SQLite only. A PostgreSQL deployment needs `pg_dump` instead.

**Rolling back a migration.** Revision 0002 cannot be downgraded. Stop the app and restore the `-before-upgrade` backup made by `setup_local.py`.

## Notes

- SQLite does not enforce foreign keys unless `PRAGMA foreign_keys = ON` is set on each connection. The tests turn it on; enabling it in the application is a later task.
- Money columns are whole rupees (integers).
