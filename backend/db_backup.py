#!/usr/bin/env python3
"""SQLite backup and restore for the school database (roadmap issue #31).

Run from backend/ (or use the pnpm shortcuts from the repo root):

    python db_backup.py backup              make a backup now
    python db_backup.py list                show the backups
    python db_backup.py verify FILE         check a backup file
    python db_backup.py restore FILE [--yes]  put a backup back (stop the app first!)

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
from datetime import datetime
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


# --- command line ---------------------------------------------------------------------
def _database_path() -> Path:
    os.chdir(BACKEND_DIR)
    sys.path.insert(0, str(BACKEND_DIR))
    from src.core.config.config import config

    url = config.DATABASE_URL
    if not url.startswith("sqlite:///"):
        raise BackupError("this tool backs up SQLite databases only")
    return (BACKEND_DIR / url[len("sqlite:///"):]).resolve()


def main(argv) -> int:
    logs = BACKEND_DIR / "logs"
    logs.mkdir(exist_ok=True)
    logging.basicConfig(filename=logs / "backup.log", level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    args = [a for a in argv[1:] if not a.startswith("--")]
    command = args[0] if args else ""
    try:
        db_path = _database_path()
        if command == "backup":
            path = backup(db_path)
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
        else:
            print(__doc__)
            return 2
    except BackupError as exc:
        log.error("%s failed: %s", command or "command", exc)
        print(f"Failed: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
