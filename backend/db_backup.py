#!/usr/bin/env python3
"""SQLite backup and restore for the school database (roadmap issue #31).

Run from backend/ (or use the pnpm shortcuts from the repo root):

    python db_backup.py backup              make a backup now
    python db_backup.py list                show the backups
    python db_backup.py status              show database and latest-backup health
    python db_backup.py verify FILE         check a backup file
    python db_backup.py restore FILE [--yes]  put a backup back (stop the app first!)
    python db_backup.py drill [FILE]        practise a restore on a temporary copy (live data is never touched)
    python db_backup.py status              how old the newest backup is and what went wrong lately

Backups live in ``backend/data/backups/`` (ignored by git) and are named
``students-YYYYMMDD-HHMMSS.db``. They are made with SQLite's own backup API, so the copy
is consistent even while the app is running, and each one is checked before it is kept.
Only the newest ``KEEP`` regular backups are kept; ``-before-upgrade`` and
``-before-restore`` safety copies are never deleted automatically.

Messages and logs name files, sizes and table row counts only. They never contain
passwords, tokens or student details.
"""
import logging
import os
import re
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
KEEP = 14
REGULAR = re.compile(r"^(?P<stem>.+)-\d{8}-\d{6}(?:-\d+)?\.db$")  # excludes -before-... copies
log = logging.getLogger("backup")


class BackupError(Exception):
    """A backup or restore could not be completed. The message is safe to show or log."""


def backup_dir_for(db_path: Path) -> Path:
    return Path(db_path).parent / "backups"


def _ro_uri(path: Path) -> str:
    return Path(path).resolve().as_uri() + "?mode=ro"  # as_uri() quotes odd characters safely


def _integrity_problem(path: Path):
    """Return None if the file is a healthy SQLite database, else a short reason."""
    try:
        conn = sqlite3.connect(_ro_uri(path), uri=True)
        try:
            result = conn.execute("PRAGMA integrity_check").fetchone()
            if not result or result[0] != "ok":
                return "integrity check failed"
            conn.execute("SELECT COUNT(*) FROM sqlite_master").fetchone()
        finally:
            conn.close()
    except sqlite3.Error as exc:
        return f"not a readable SQLite database ({type(exc).__name__})"
    return None


def _copy(source_path: Path, dest_path: Path) -> None:
    """Consistent copy of one SQLite file into another using the backup API."""
    src = sqlite3.connect(_ro_uri(source_path), uri=True)
    dst = sqlite3.connect(dest_path)
    try:
        src.backup(dst)
        dst.commit()
    finally:
        dst.close()
        src.close()


def backup(db_path, suffix: str = "", keep: int = KEEP, now: datetime = None) -> Path:
    """Back up ``db_path`` into ``backups/`` next to it and return the new file's path."""
    db_path = Path(db_path)
    if not db_path.exists() or db_path.stat().st_size == 0:
        raise BackupError(f"database not found: {db_path.name}")
    folder = backup_dir_for(db_path)
    folder.mkdir(parents=True, exist_ok=True)
    stamp = f"{now or datetime.now():%Y%m%d-%H%M%S}"
    tail = f"-{suffix}" if suffix else ""
    target = folder / f"{db_path.stem}-{stamp}{tail}.db"
    n = 1
    while target.exists():  # two backups in the same second
        target = folder / f"{db_path.stem}-{stamp}-{n}{tail}.db"
        n += 1
    partial = target.with_name(target.name + ".partial")
    try:
        _copy(db_path, partial)
        problem = _integrity_problem(partial)
        if problem:
            raise BackupError(f"backup was not saved: {problem}")
        os.replace(partial, target)
    except (sqlite3.Error, OSError) as exc:
        raise BackupError(f"backup failed ({type(exc).__name__})") from None
    finally:
        if partial.exists():
            partial.unlink()
    log.info("backup created %s (%d bytes)", target.name, target.stat().st_size)
    if not suffix:
        prune(folder, db_path.stem, keep)
    return target


def list_backups(db_path):
    folder = backup_dir_for(Path(db_path))
    return sorted(folder.glob("*.db"), key=lambda p: p.name) if folder.exists() else []


def prune(folder: Path, stem: str, keep: int = KEEP) -> list:
    """Delete the oldest regular backups, keeping the newest ``keep``. Returns what was deleted."""
    regular = sorted(
        (p for p in folder.glob("*.db")
         if (m := REGULAR.match(p.name)) and m.group("stem") == stem),
        key=lambda p: p.name,
    )
    removed = regular[:-keep] if keep > 0 and len(regular) > keep else []
    for p in removed:
        p.unlink()
        log.info("old backup removed %s", p.name)
    return removed


def verify(backup_file) -> dict:
    """Check a backup file and return row counts for the main tables."""
    path = Path(backup_file)
    if not path.exists():
        raise BackupError(f"file not found: {path.name}")
    problem = _integrity_problem(path)
    if problem:
        raise BackupError(f"{path.name}: {problem}")
    conn = sqlite3.connect(_ro_uri(path), uri=True)
    try:
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        counts = {t: conn.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
                  for t in ("students", "drivers", "users", "attendance", "fee_payments") if t in tables}
    finally:
        conn.close()
    return counts


def restore(backup_file, db_path, safety_copy: bool = True) -> dict:
    """Replace ``db_path`` with ``backup_file``. Stop the app before calling this.

    The backup is verified first. The current database is saved as
    ``...-before-restore.db`` so the restore itself can be undone.
    """
    backup_file, db_path = Path(backup_file), Path(db_path)
    counts = verify(backup_file)  # raises BackupError for a bad file; nothing has changed yet
    saved = None
    if safety_copy and db_path.exists() and db_path.stat().st_size > 0:
        saved = backup(db_path, suffix="before-restore")
    staging = db_path.with_name(db_path.name + ".restoring")
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _copy(backup_file, staging)
        problem = _integrity_problem(staging)
        if problem:
            raise BackupError(f"restore stopped, current database unchanged: {problem}")
        for sidecar in (db_path.with_name(db_path.name + "-wal"), db_path.with_name(db_path.name + "-shm")):
            if sidecar.exists():
                sidecar.unlink()  # a stale journal must not be applied to the restored file
        os.replace(staging, db_path)
    except (sqlite3.Error, OSError) as exc:
        raise BackupError(f"restore failed, current database unchanged ({type(exc).__name__})") from None
    finally:
        if staging.exists():
            staging.unlink()
    log.info("restored from %s", backup_file.name)
    return {"restored_from": backup_file.name, "rows": counts, "safety_copy": saved.name if saved else None}


def _ops(kind: str, **fields) -> None:
    """Write to the operations log when it is available. Never fails the backup."""
    try:
        sys.path.insert(0, str(BACKEND_DIR))
        from src.core import ops_log

        ops_log.record(kind, **fields)
    except Exception:  # noqa: BLE001
        pass


def _table_counts(path: Path) -> dict:
    conn = sqlite3.connect(_ro_uri(path), uri=True)
    try:
        names = sorted(r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"))
        return {t: conn.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0] for t in names}
    finally:
        conn.close()


def drill(db_path, backup_file=None, work_dir=None) -> dict:
    """Practise a restore. Restores a backup into a temporary copy and checks it table by table.

    Uses the newest backup unless ``backup_file`` is given. The live database is only read, to show how
    many rows were added since the backup. Raises BackupError when the backup cannot be restored or the
    restored copy differs from the backup.
    """
    import tempfile

    db_path = Path(db_path)
    if backup_file is None:
        files = [f for f in list_backups(db_path) if REGULAR.match(f.name)]
        if not files:
            raise BackupError("there is no backup to practise with")
        backup_file = max(files, key=lambda f: f.stat().st_mtime)
    backup_file = Path(backup_file)
    verify(backup_file)
    with tempfile.TemporaryDirectory(dir=work_dir) as tmp:
        copy = Path(tmp) / "restored.db"
        restore(backup_file, copy, safety_copy=False)
        before, after = _table_counts(backup_file), _table_counts(copy)
        if before != after:
            differing = sorted(t for t in set(before) | set(after) if before.get(t) != after.get(t))
            raise BackupError(f"restored copy differs from the backup in: {', '.join(differing)}")
        if "alembic_version" not in after:
            raise BackupError("restored copy has no migration version, the app would not start")
    live = _table_counts(db_path) if db_path.exists() else {}
    since = {t: live[t] - after[t] for t in after if t in live and live[t] != after[t]}
    return {"backup": backup_file.name, "tables": len(after), "rows": sum(after.values()),
            "changed_since_backup": since}


def status(db_path, now: datetime = None) -> dict:
    """Age of the newest backup and the recent operations events, for ``status`` and the admin API."""
    now = now or datetime.now()
    files = [f for f in list_backups(db_path) if REGULAR.match(f.name)]   # safety copies do not count
    newest = max(files, key=lambda f: f.stat().st_mtime) if files else None   # by time: names can tie in one second
    age = (now - datetime.fromtimestamp(newest.stat().st_mtime)).total_seconds() / 3600 if newest else None
    return {"backups": len(files), "newest": newest.name if newest else None,
            "age_hours": round(age, 1) if age is not None else None}


# --- command line ---------------------------------------------------------------------
def _database_path() -> Path:
    os.chdir(BACKEND_DIR)
    sys.path.insert(0, str(BACKEND_DIR))
    from src.core.config.config import config

    url = config.DATABASE_URL
    if not url.startswith("sqlite:///"):
        raise BackupError("this tool backs up SQLite databases only")
    return (BACKEND_DIR / url[len("sqlite:///"):]).resolve()


def status(db_path) -> dict:
    """Return a safe operational snapshot without exposing database contents."""
    db_path = Path(db_path)
    backups = list_backups(db_path)
    latest = backups[-1] if backups else None
    result = {
        "database": db_path.name,
        "database_exists": db_path.is_file(),
        "backup_count": len(backups),
        "latest_backup": latest.name if latest else None,
        "latest_backup_verified": None,
        "latest_backup_rows": {},
        "latest_backup_error": None,
    }
    if latest:
        try:
            result["latest_backup_rows"] = verify(latest)
            result["latest_backup_verified"] = True
        except BackupError as exc:
            result["latest_backup_verified"] = False
            result["latest_backup_error"] = str(exc)
    return result


def main(argv) -> int:
    logs = BACKEND_DIR / "logs"
    logs.mkdir(exist_ok=True)
    logging.basicConfig(filename=logs / "backup.log", level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    args = [a for a in argv[1:] if not a.startswith("--")]
    command = args[0] if args else ""
    try:
        db_path = _database_path()
        if command == "status":
            snapshot = status(db_path)
            print(f"Database: {snapshot['database']} "
                  f"({'present' if snapshot['database_exists'] else 'missing'})")
            print(f"Backups: {snapshot['backup_count']}")
            if snapshot["latest_backup"]:
                state = "verified" if snapshot["latest_backup_verified"] else "FAILED verification"
                print(f"Latest: {snapshot['latest_backup']} ({state})")
                if snapshot["latest_backup_verified"]:
                    print(f"Rows: {snapshot['latest_backup_rows']}")
                else:
                    print(f"Reason: {snapshot['latest_backup_error']}")
            else:
                print("Latest: none")
            log.info("status checked: %d backups; latest verified=%s",
                     snapshot["backup_count"], snapshot["latest_backup_verified"])
        elif command == "backup":
            path = backup(db_path)
            _ops("backup_ok", reason="manual", count=len(list_backups(db_path)))
            print(f"Backup saved: {path}\nRows: {verify(path)}")
        elif command == "list":
            files = list_backups(db_path)
            print("\n".join(f"{p.name}  {p.stat().st_size // 1024} KB" for p in files) or "No backups yet.")
        elif command == "verify" and len(args) == 2:
            print("OK", verify(args[1]))
        elif command == "restore" and len(args) == 2:
            print(f"This replaces {db_path.name} with {Path(args[1]).name}. Stop the app first.")
            if "--yes" not in argv and input("Type yes to continue: ").strip() != "yes":
                print("Cancelled. Nothing was changed.")
                return 1
            print(restore(args[1], db_path))
        elif command == "drill" and len(args) <= 2:
            result = drill(db_path, args[1] if len(args) == 2 else None)
            _ops("backup_ok", reason="restore drill passed", count=result["tables"])
            print(f"Restore drill passed. {result['backup']} restored to a temporary copy: "
                  f"{result['tables']} tables, {result['rows']} rows, all matching.")
            if result["changed_since_backup"]:
                print("Changed since this backup (these rows are not in it): "
                      + ", ".join(f"{t} {d:+d}" for t, d in result["changed_since_backup"].items()))
            print("Your live data was not touched.")
        elif command == "status":
            sys.path.insert(0, str(BACKEND_DIR))
            from src.core import ops_log
            from src.services.ops_rules import backup_state, count_by_kind, needs_attention

            info = status(db_path)
            events = ops_log.recent(limit=200, since=datetime.now() - timedelta(days=1))
            state = backup_state(info["age_hours"])
            print(f"Backups: {info['backups']}, newest {info['newest'] or 'none'}"
                  + (f" ({info['age_hours']} hours old, {state})" if info["newest"] else ""))
            print("Last 24 hours:", ", ".join(f"{k} {v}" for k, v in count_by_kind(events).items() if v) or "nothing to report")
            for note in needs_attention(state, count_by_kind(events)):
                print("Look at:", note)
        else:
            print(__doc__)
            return 2
    except BackupError as exc:
        _ops("backup_failure", reason=f"{command or 'command'}: {exc}")
        log.error("%s failed: %s", command or "command", exc)
        print(f"Failed: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
