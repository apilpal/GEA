"""Operations: log, daily backup, restore drill and status (issue #40).

Run from backend/:   python -m pytest tests_school/test_ops.py -q --noconftest
"""
import json
import os
import sqlite3
from datetime import datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import db_backup
from db_backup import BackupError
from src.api.v1.routers import ops
from src.core import ops_log
from src.core.models import User, UserRole
from src.core.ops_middleware import ops_middleware
from src.services import backup_service
from src.services.ops_rules import (backup_due, backup_state, classify, count_by_kind, needs_attention)
from src.utils.auth_utils import get_current_active_user_from_any_source

from .helpers import migrate

NOW = datetime(2026, 11, 28, 10, 0, 0)
ADMIN = User(id=1, username="admin", email="a@example.test", role=UserRole.ADMIN)
TEACHER = User(id=2, username="ta", email="ta@example.test", role=UserRole.TEACHER)


@pytest.fixture
def log_file(tmp_path, monkeypatch):
    path = tmp_path / "logs" / "ops.log"
    monkeypatch.setattr(ops_log, "LOG_PATH", path)
    return path


@pytest.fixture
def db(tmp_path):
    path = tmp_path / "data" / "students.db"
    path.parent.mkdir()
    migrate(path)
    conn = sqlite3.connect(path)
    for i in range(3):
        conn.execute("INSERT INTO students (name, mobile, status, created_at, updated_at) "
                     "VALUES (?, ?, 'active', 1, 1)", (f"Secret Student {i}", f"900000000{i}"))
    conn.commit()
    conn.close()
    return path


def students(path):
    conn = sqlite3.connect(path)
    try:
        return conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    finally:
        conn.close()


# ---- rules ---------------------------------------------------------------------------------

def test_classify():
    assert classify("GET", "/api/students", 403) == "auth_failure"
    assert classify("GET", "/api/students", 401) == "auth_failure"
    assert classify("PUT", "/api/marks/sheet", 422) == "bulk_save_failure"
    assert classify("PUT", "/api/attendance/roster", 409) == "bulk_save_failure"
    assert classify("POST", "/api/fees/payments", 422) == "bulk_save_failure"
    assert classify("POST", "/api/fees/payments/7/reverse", 409) == "bulk_save_failure"
    assert classify("GET", "/api/marks/sheet", 422) is None          # a read is not a save
    assert classify("GET", "/api/students", 404) is None             # an ordinary not-found is not news
    assert classify("PUT", "/api/marks/sheet", 200) is None
    assert classify("GET", "/api/anything", 500) == "server_error"
    assert classify("PUT", "/api/marks/sheet", 500) == "server_error"


def test_backup_state_and_due():
    assert backup_state(None) == "none"
    assert backup_state(26) == "ok"
    assert backup_state(26.1) == "late"
    assert backup_state(72) == "late"
    assert backup_state(73) == "stale"
    yesterday_2am = datetime(2026, 11, 27, 2, 0)
    assert backup_due(datetime(2026, 11, 28, 1, 0), None, 2) is True           # the very first backup is at once
    assert backup_due(datetime(2026, 11, 28, 1, 0), yesterday_2am, 2) is False  # not yet 2 o'clock
    assert backup_due(datetime(2026, 11, 28, 2, 5), yesterday_2am, 2) is True
    assert backup_due(datetime(2026, 11, 28, 5, 0), datetime(2026, 11, 28, 2, 0), 2) is False  # done today
    assert backup_due(datetime(2026, 11, 28, 14, 0), datetime(2026, 11, 27, 2, 0), 2) is True  # phone was off at 2


def test_needs_attention_lists_plain_problems():
    ok = count_by_kind([])
    assert needs_attention("ok", ok) == []
    assert "no backup" in needs_attention("none", ok)[0].lower()
    assert "old" in needs_attention("late", ok)[0]
    bad = count_by_kind([{"kind": "backup_failure"}, {"kind": "bulk_save_failure"}, {"kind": "bulk_save_failure"},
                         {"kind": "server_error"}, {"kind": "unknown"}] + [{"kind": "auth_failure"}] * 20)
    text = " ".join(needs_attention("ok", bad))
    assert "1 backup(s) failed" in text and "2 attendance, marks or payment" in text
    assert "1 server error" in text and "20 refused" in text


# ---- the log -------------------------------------------------------------------------------

def test_log_writes_only_allowed_fields_on_one_line(log_file):
    ops_log.record("auth_failure", now=NOW, method="GET", path="/api/x", status=403,
                   student_name="Secret Student", password="hunter2", reason="line one\nline two")
    lines = log_file.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1
    event = json.loads(lines[0])
    assert event == {"time": "2026-11-28T10:00:00", "kind": "auth_failure", "method": "GET", "path": "/api/x",
                     "status": 403, "reason": "line one line two"}
    assert "Secret" not in lines[0] and "hunter2" not in lines[0]


def test_log_recent_is_newest_first_and_respects_since(log_file):
    for hours_ago in (30, 5, 1):
        ops_log.record("server_error", now=NOW - timedelta(hours=hours_ago), status=500)
    assert len(ops_log.recent(limit=10)) == 3
    assert [e["time"] for e in ops_log.recent(limit=10)][0] == "2026-11-28T09:00:00"
    assert len(ops_log.recent(limit=10, since=NOW - timedelta(days=1))) == 2
    assert len(ops_log.recent(limit=1)) == 1
    log_file.write_text(log_file.read_text() + "not json\n", encoding="utf-8")
    assert len(ops_log.recent(limit=10)) == 3                  # a damaged line is skipped, not fatal


def test_log_survives_alembic_switching_loggers_off(log_file):
    import logging
    logging.getLogger("ops").disabled = True          # what alembic's fileConfig does to existing loggers
    ops_log.record("server_error", now=NOW, status=500)
    assert len(ops_log.recent()) == 1


def test_recent_with_no_log_is_empty(log_file):
    assert ops_log.recent() == []


# ---- the middleware ------------------------------------------------------------------------

def test_middleware_records_failures_but_not_normal_traffic(log_file):
    app = FastAPI()
    app.middleware("http")(ops_middleware)

    @app.get("/api/ok")
    async def fine():
        return {"ok": True}

    @app.get("/api/secret")
    async def refused():
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Student Asha owes 500")

    @app.put("/api/marks/sheet")
    async def bad_sheet():
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Marks of Asha are wrong")

    @app.get("/api/boom")
    async def boom():
        raise RuntimeError("database exploded for Asha")

    client = TestClient(app, raise_server_exceptions=False)
    assert client.get("/api/ok").status_code == 200
    assert client.get("/api/secret").status_code == 403
    assert client.put("/api/marks/sheet", json={"marks": [{"student": "Asha", "marks": 3}]}).status_code == 422
    assert client.get("/api/boom").status_code == 500
    events = [json.loads(line) for line in log_file.read_text(encoding="utf-8").splitlines()]
    assert [(e["kind"], e["status"], e["path"]) for e in events] == [
        ("auth_failure", 403, "/api/secret"), ("bulk_save_failure", 422, "/api/marks/sheet"),
        ("server_error", 500, "/api/boom")]
    assert "Asha" not in log_file.read_text(encoding="utf-8")   # no names, marks or messages in the log


# ---- backup, drill and status --------------------------------------------------------------

def test_drill_restores_into_a_temporary_copy_and_leaves_live_data_alone(db):
    backup = db_backup.backup(db)
    conn = sqlite3.connect(db)
    conn.execute("INSERT INTO students (name, status, created_at, updated_at) VALUES ('New', 'active', 1, 1)")
    conn.commit()
    conn.close()
    before = db.stat().st_mtime_ns
    result = db_backup.drill(db)
    assert result["backup"] == backup.name
    assert result["tables"] > 5 and result["rows"] >= 3
    assert result["changed_since_backup"] == {"students": 1}          # the new student is not in the backup
    assert students(db) == 4 and db.stat().st_mtime_ns == before      # the live database was only read


def test_drill_refuses_without_a_backup_and_with_a_broken_one(db, tmp_path):
    with pytest.raises(BackupError):
        db_backup.drill(db)
    broken = tmp_path / "broken.db"
    broken.write_bytes(b"this is not a database" * 100)
    with pytest.raises(BackupError):
        db_backup.drill(db, broken)


def test_backup_age_ignores_safety_copies(db):
    assert db_backup.backup_age(db, NOW) == {"backups": 0, "newest": None, "age_hours": None}
    db_backup.backup(db, suffix="before-upgrade")
    assert db_backup.backup_age(db, NOW)["newest"] is None
    regular = db_backup.backup(db)
    info = db_backup.backup_age(db, datetime.now() + timedelta(hours=3))
    assert info["newest"] == regular.name and 2.9 <= info["age_hours"] <= 3.1


def test_daily_backup_runs_once_a_day_and_logs_it(db, log_file):
    assert backup_service.run_once(db, hour=2, now=datetime.now()) == "made"       # none yet: at once
    assert backup_service.run_once(db, hour=0, now=datetime.now()) is None         # done: not again
    newest = db_backup.list_backups(db)[-1]
    old = (datetime.now() - timedelta(hours=30)).timestamp()
    os.utime(newest, (old, old))
    assert backup_service.run_once(db, hour=0, now=datetime.now()) == "made"       # a day later
    kinds = [e["kind"] for e in ops_log.recent(limit=10)]
    assert kinds == ["backup_ok", "backup_ok"]


def test_daily_backup_failure_is_logged_and_does_not_raise(tmp_path, log_file):
    missing = tmp_path / "data" / "students.db"
    assert backup_service.run_once(missing, hour=0, now=datetime.now()) == "failed"
    events = ops_log.recent(limit=5)
    assert events[0]["kind"] == "backup_failure" and "database not found" in events[0]["reason"]


# ---- the status endpoint -------------------------------------------------------------------

@pytest.fixture
def api(db, log_file, monkeypatch):
    monkeypatch.setattr(ops, "now", lambda: NOW)
    monkeypatch.setattr(ops, "database_path", lambda: db)
    app = FastAPI()
    app.include_router(ops.router, prefix="/api")

    class Env:
        pass

    e = Env()
    e.db = db
    e.as_user = lambda user: app.dependency_overrides.__setitem__(get_current_active_user_from_any_source, lambda: user)
    e.client = TestClient(app, raise_server_exceptions=False)
    return e


def test_status_for_admin_only(api):
    api.as_user(TEACHER)
    assert api.client.get("/api/ops/status").status_code == 403
    api.as_user(ADMIN)
    assert api.client.get("/api/ops/status").status_code == 200


def test_status_with_no_backup_and_a_problem(api):
    api.as_user(ADMIN)
    ops_log.record("server_error", now=NOW - timedelta(hours=50), status=500)      # older than a day: not counted
    ops_log.record("bulk_save_failure", now=NOW - timedelta(hours=2), method="PUT", path="/api/marks/sheet", status=422)
    body = api.client.get("/api/ops/status").json()
    assert body["backup"] == {"backups": 0, "newest": None, "age_hours": None, "state": "none"}
    assert body["last_24_hours"]["bulk_save_failure"] == 1 and body["last_24_hours"]["server_error"] == 0
    assert len(body["recent_events"]) == 1
    assert any("no backup" in note.lower() for note in body["needs_attention"])
    assert any("1 attendance, marks or payment" in note for note in body["needs_attention"])


def test_status_with_a_fresh_backup_is_calm(api):
    api.as_user(ADMIN)
    backup = db_backup.backup(api.db, now=NOW)
    os.utime(backup, ((NOW - timedelta(hours=3)).timestamp(),) * 2)
    body = api.client.get("/api/ops/status").json()
    assert body["backup"]["state"] == "ok" and body["backup"]["newest"] == backup.name
    assert body["needs_attention"] == []
