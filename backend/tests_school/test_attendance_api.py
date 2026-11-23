"""Attendance entry API (issue #32).

Run from backend/:   python -m pytest tests_school/test_attendance_api.py -q --noconftest
"""
from datetime import date

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from src.api.v1.routers import attendance
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import DBAttendance, DBClassSection, DBHoliday, DBTeacher
from src.utils.auth_utils import get_current_active_user_from_any_source

from .helpers import async_url, migrate

TODAY = date(2026, 11, 18)        # a Wednesday
SUNDAY = date(2026, 11, 15)
HOLIDAY = date(2026, 11, 17)      # a Tuesday, added as a holiday below

ADMIN = User(id=1, username="admin", email="a@example.test", role=UserRole.ADMIN)
TEACHER_A = User(id=2, username="ta", email="ta@example.test", role=UserRole.TEACHER)
TEACHER_B = User(id=3, username="tb", email="tb@example.test", role=UserRole.TEACHER)
CLERK = User(id=4, username="clerk", email="c@example.test", role=UserRole.ACCOUNTANT)


@pytest.fixture
def env(tmp_path, monkeypatch):
    db_file = tmp_path / "school.db"
    migrate(db_file)
    monkeypatch.setattr(attendance, "today", lambda: TODAY)

    sync_engine = sa.create_engine(f"sqlite:///{db_file}")
    with Session(sync_engine) as s:
        year_id = s.scalar(sa.text("SELECT id FROM academic_years WHERE is_current = 1"))
        teacher_a = DBTeacher(user_id=TEACHER_A.id, name="Teacher A")
        teacher_b = DBTeacher(user_id=TEACHER_B.id, name="Teacher B")
        s.add_all([teacher_a, teacher_b])
        s.flush()
        s.add_all([
            DBClassSection(academic_year_id=year_id, grade="5", section="A", class_teacher_id=teacher_a.id),
            DBClassSection(academic_year_id=year_id, grade="5", section="B", class_teacher_id=teacher_b.id),
            DBClassSection(academic_year_id=year_id, grade="10", section="A"),
        ])
        s.flush()
        sections = {f"{c.grade}-{c.section}": c.id for c in s.query(DBClassSection)}
        for roll, name in enumerate(["Asha", "Bina", "Chitra", "Dev"], start=1):
            s.add(DBStudent(name=name, class_section_id=sections["5-A"], roll_no=roll, status="active",
                            created_at=0, updated_at=0))
        s.add(DBStudent(name="Left School", class_section_id=sections["5-A"], roll_no=9, status="inactive",
                        created_at=0, updated_at=0))
        s.add(DBStudent(name="Other Class", class_section_id=sections["5-B"], roll_no=1, status="active",
                        created_at=0, updated_at=0))
        s.add(DBHoliday(date=HOLIDAY, name="Test Holiday"))
        s.commit()
        ids = {n: i for i, n in s.query(DBStudent.id, DBStudent.name)}

    async_engine = create_async_engine(async_url(db_file), poolclass=NullPool)
    maker = async_sessionmaker(async_engine)  # same defaults as the real app (objects expire on commit)

    async def override_db():
        async with maker() as session:
            yield session

    app = FastAPI()
    app.include_router(attendance.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db

    class Env:
        pass

    e = Env()
    e.app, e.sections, e.ids, e.engine = app, sections, ids, sync_engine
    e.as_user = lambda user: app.dependency_overrides.__setitem__(
        get_current_active_user_from_any_source, lambda: user)

    def rows():
        with sync_engine.connect() as conn:
            return conn.execute(
                sa.text("SELECT student_id, date, status FROM attendance ORDER BY student_id, date")).all()

    e.rows = rows
    e.client = TestClient(app, raise_server_exceptions=False)
    e.as_user(ADMIN)
    yield e
    e.client.close()
    sync_engine.dispose()


def roster(env, section="5-A", day=TODAY):
    return env.client.get("/api/attendance/roster",
                          params={"class_section_id": env.sections[section], "date": day.isoformat()})


def save(env, entries, section="5-A", day=TODAY):
    return env.client.put("/api/attendance/roster", json={
        "class_section_id": env.sections[section], "date": day.isoformat(), "entries": entries})


def test_roster_defaults_to_everyone_present_in_roll_order(env):
    body = roster(env).json()
    assert [s["name"] for s in body["students"]] == ["Asha", "Bina", "Chitra", "Dev"]  # no inactive student
    assert {s["status"] for s in body["students"]} == {"present"}
    assert body["already_saved"] is False and body["can_save"] is True
    assert env.rows() == []  # opening a roster writes nothing


def test_save_and_reopen(env):
    r = save(env, [{"student_id": env.ids["Bina"], "status": "absent"},
                   {"student_id": env.ids["Dev"], "status": "late", "remark": "bus"},
                   {"student_id": env.ids["Chitra"], "status": "leave"}])
    assert r.status_code == 200
    assert r.json()["counts"] == {"present": 1, "absent": 1, "late": 1, "leave": 1}
    assert r.json()["created"] == 4

    body = roster(env).json()
    status = {s["name"]: s["status"] for s in body["students"]}
    assert status == {"Asha": "present", "Bina": "absent", "Chitra": "leave", "Dev": "late"}
    assert body["already_saved"] is True
    assert {s["name"]: s["remark"] for s in body["students"]}["Dev"] == "bus"


def test_saving_again_replaces_and_never_duplicates(env):
    save(env, [{"student_id": env.ids["Bina"], "status": "absent"}])
    r = save(env, [{"student_id": env.ids["Bina"], "status": "present"},
                   {"student_id": env.ids["Asha"], "status": "absent"}])
    assert r.status_code == 200
    assert r.json()["created"] == 0 and r.json()["updated"] == 2
    rows = env.rows()
    assert len(rows) == 4  # still one row per student
    assert {env.ids["Asha"]: "absent", env.ids["Bina"]: "present"}.items() <= {r[0]: r[2] for r in rows}.items()
    with env.engine.connect() as c:
        assert c.execute(sa.text("SELECT COUNT(*) FROM attendance WHERE updated_by = 1")).scalar() == 2


def test_students_left_out_are_saved_as_present(env):
    save(env, [])
    assert [r[2] for r in env.rows()] == ["present"] * 4


def test_unknown_duplicate_or_other_class_student_rejects_everything(env):
    with env.engine.connect() as c:
        other_id = c.execute(sa.text("SELECT id FROM students WHERE name = 'Other Class'")).scalar()
        left_id = c.execute(sa.text("SELECT id FROM students WHERE name = 'Left School'")).scalar()
    for bad in ([{"student_id": other_id, "status": "absent"}],
                [{"student_id": left_id, "status": "absent"}],
                [{"student_id": 99999, "status": "absent"}],
                [{"student_id": env.ids["Asha"], "status": "absent"},
                 {"student_id": env.ids["Asha"], "status": "late"}]):
        assert save(env, bad).status_code == 422
    assert env.rows() == []


def test_invalid_status_is_rejected(env):
    assert save(env, [{"student_id": env.ids["Asha"], "status": "sleeping"}]).status_code == 422
    assert env.rows() == []


def test_failed_save_writes_nothing(env, monkeypatch):
    async def boom(self):
        raise RuntimeError("disk full")
    monkeypatch.setattr(AsyncSession, "commit", boom)
    assert save(env, [{"student_id": env.ids["Asha"], "status": "absent"}]).status_code == 500
    assert env.rows() == []


def test_teacher_can_mark_own_class_only(env):
    env.as_user(TEACHER_A)
    assert roster(env, "5-A").status_code == 200
    assert save(env, [{"student_id": env.ids["Asha"], "status": "absent"}]).status_code == 200

    before = env.rows()
    assert roster(env, "5-B").status_code == 403
    assert save(env, [], section="5-B").status_code == 403
    assert save(env, [], section="10-A").status_code == 403   # class without a class teacher
    assert env.rows() == before

    env.as_user(TEACHER_B)
    assert roster(env, "5-A").status_code == 403
    assert save(env, []).status_code == 403
    assert env.rows() == before


def test_other_roles_and_anonymous_users_are_refused(env):
    env.as_user(CLERK)
    assert roster(env).status_code == 403
    assert save(env, []).status_code == 403
    assert env.client.get("/api/attendance/classes").status_code == 403
    assert env.rows() == []

    del env.app.dependency_overrides[get_current_active_user_from_any_source]
    assert roster(env).status_code in (401, 403)
    assert save(env, []).status_code in (401, 403)


def test_class_list_depends_on_role(env):
    names = [c["name"] for c in env.client.get("/api/attendance/classes").json()]
    assert names == ["5-A", "5-B", "10-A"]  # numeric order, not text order
    counts = {c["name"]: c["student_count"] for c in env.client.get("/api/attendance/classes").json()}
    assert counts["5-A"] == 4

    env.as_user(TEACHER_A)
    assert [c["name"] for c in env.client.get("/api/attendance/classes").json()] == ["5-A"]


@pytest.mark.parametrize("day, why", [
    (date(2026, 11, 19), "future"),
    (SUNDAY, "Sunday"),
    (HOLIDAY, "Holiday"),
    (date(2026, 3, 30), "outside the session"),
])
def test_dates_nobody_can_mark(env, day, why):
    r = save(env, [], day=day)
    assert r.status_code == 422
    assert why.lower() in r.json()["detail"].lower() or "session" in r.json()["detail"].lower()
    assert env.rows() == []
    body = roster(env, day=day).json()
    assert body["can_save"] is False and body["reason"]


def test_teacher_can_go_back_two_days_but_not_three(env):
    env.as_user(TEACHER_A)
    assert save(env, [], day=date(2026, 11, 16)).status_code == 200            # Monday, 2 days back
    r = save(env, [], day=date(2026, 11, 14))                                    # Saturday, 4 days back
    assert r.status_code == 422 and "admin" in r.json()["detail"]
    assert roster(env, day=date(2026, 11, 14)).json()["can_save"] is False
    assert {row[1] for row in env.rows()} == {"2026-11-16"}


def test_admin_can_correct_older_dates(env):
    assert save(env, [{"student_id": env.ids["Asha"], "status": "absent"}], day=date(2026, 10, 5)).status_code == 200
    assert len(env.rows()) == 4
