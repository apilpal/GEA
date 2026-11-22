"""Backup and restore of the SQLite database (issue #31)."""
import sqlite3
from datetime import datetime
from pathlib import Path

import pytest

import db_backup
from db_backup import BackupError

from .helpers import migrate


@pytest.fixture
def db(tmp_path):
    path = tmp_path / "data" / "students.db"
    path.parent.mkdir()
    migrate(path)
    conn = sqlite3.connect(path)
    for i in range(3):
        conn.execute("INSERT INTO students (name, mobile, status, created_at, updated_at) "
                     "VALUES (?, ?, 'active', 1, 1)", (f"Secret Student {i}", f"900000000{i}"))
    conn.execute("INSERT INTO users (username, email, hashed_password, role, is_active, is_bypass_user, "
                 "created_at, updated_at) VALUES ('admin', 'a@example.com', 'hash', 'admin', 1, 0, '2026-01-01', '2026-01-01')")
    conn.commit()
    conn.close()
    return path


def count(path, table="students"):
    conn = sqlite3.connect(path)
    try:
        return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    finally:
        conn.close()


def test_backup_is_a_verified_copy(db):
    target = db_backup.backup(db)
    assert target.parent == db.parent / "backups"
    assert target.name.startswith("students-") and target.suffix == ".db"
    assert db_backup.verify(target)["students"] == 3
    assert count(target) == 3 and count(target, "users") == 1
    assert not list(target.parent.glob("*.partial"))


def test_backup_ignores_uncommitted_changes_of_a_running_app(db):
    writer = sqlite3.connect(db)
    writer.execute("BEGIN IMMEDIATE")
    writer.execute("INSERT INTO students (name, status, created_at, updated_at) VALUES ('Half written', 'active', 1, 1)")
    try:
        target = db_backup.backup(db)
    finally:
        writer.rollback()
        writer.close()
    assert count(target) == 3  # only committed rows, never a half-written state


def test_missing_database_is_reported(tmp_path):
    with pytest.raises(BackupError):
        db_backup.backup(tmp_path / "nothing.db")


def test_old_regular_backups_are_pruned_but_safety_copies_are_kept(db):
    made = [db_backup.backup(db, keep=3, now=datetime(2026, 11, 23, 1, 0, i)) for i in range(5)]
    safety = db_backup.backup(db, suffix="before-upgrade", now=datetime(2026, 11, 23, 1, 0, 0))
    names = {p.name for p in db_backup.list_backups(db)}
    assert {made[2].name, made[3].name, made[4].name} <= names
    assert made[0].name not in names and made[1].name not in names
    assert safety.name in names


def test_restore_brings_back_the_backed_up_data_and_keeps_a_safety_copy(db):
    good = db_backup.backup(db)
    conn = sqlite3.connect(db)
    conn.execute("DELETE FROM students")
    conn.commit()
    conn.close()
    assert count(db) == 0
    result = db_backup.restore(good, db)
    assert count(db) == 3
    assert result["rows"]["students"] == 3
    safety = db.parent / "backups" / result["safety_copy"]
    assert "before-restore" in safety.name and count(safety) == 0  # the state just before the restore
    assert not Path(str(db) + ".restoring").exists()


def test_restore_removes_a_stale_journal_file(db):
    good = db_backup.backup(db)
    stale = Path(str(db) + "-wal")
    stale.write_bytes(b"left over from the old database")
    db_backup.restore(good, db)
    assert not stale.exists()
    assert count(db) == 3


def test_a_damaged_backup_is_rejected_and_the_database_is_untouched(db):
    good = db_backup.backup(db)
    damaged = good.with_name("students-damaged.db")
    damaged.write_bytes(good.read_bytes()[:3000])  # cut short
    with pytest.raises(BackupError) as error:
        db_backup.restore(damaged, db)
    assert count(db) == 3
    assert "Secret Student" not in str(error.value)  # messages never carry student details
    garbage = good.with_name("students-garbage.db")
    garbage.write_text("this is not a database")
    with pytest.raises(BackupError):
        db_backup.verify(garbage)
    with pytest.raises(BackupError):
        db_backup.verify(good.with_name("does-not-exist.db"))


def test_logs_contain_no_student_details(db, caplog):
    import logging
    with caplog.at_level(logging.INFO, logger="backup"):
        target = db_backup.backup(db)
        db_backup.restore(target, db)
    text = " ".join(r.getMessage() for r in caplog.records)
    assert "students-" in text
    assert "Secret Student" not in text and "9000000000" not in text and "hash" not in text
