"""Exam marks entry API and rules (issue #33).

Run from backend/:   python -m pytest tests_school/test_marks_api.py -q --noconftest
"""
from decimal import Decimal

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from src.api.v1.routers import marks
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import DBClassSection, DBClassSubject, DBSubject, DBTeacher
from src.services.marks_rules import mark_problem, parts_for
from src.utils.auth_utils import get_current_active_user_from_any_source

from .helpers import async_url, migrate

ADMIN = User(id=1, username="admin", email="a@example.test", role=UserRole.ADMIN)
TEACHER_A = User(id=2, username="ta", email="ta@example.test", role=UserRole.TEACHER)   # teaches Mathematics in 5-A
TEACHER_B = User(id=3, username="tb", email="tb@example.test", role=UserRole.TEACHER)   # teaches Hindi in 5-A
CLERK = User(id=4, username="clerk", email="c@example.test", role=UserRole.ACCOUNTANT)


# ---- the rules on their own ------------------------------------------------------------

@pytest.mark.parametrize("exam, exam_max, grade, subject, expected", [
    ("Terminal", 40, "5", "Hindi", [(1, 40)]),
    ("Terminal", 40, "6", "Hindi", [(1, 20), (2, 20)]),
    ("Terminal", 40, "8", "Mathematics", [(1, 20), (2, 20)]),
    ("Terminal", 40, "7", "Science", [(1, 40)]),
    ("Half-yearly", 60, "7", "English", [(1, 30), (2, 30)]),
    ("Half-yearly", 60, "3", "English", [(1, 60)]),
    ("Annual", 100, "8", "Hindi", [(1, 100)]),
    ("Terminal", 40, "P.G", "Hindi", [(1, 40)]),
])
def test_parts_for(exam, exam_max, grade, subject, expected):
    assert parts_for(exam, exam_max, grade, subject) == expected


@pytest.mark.parametrize("value, maximum, ok", [
    (0, 40, True), (40, 40, True), ("17.5", 40, True), ("17.25", 40, True),
    (-1, 40, False), ("40.01", 40, False), (41, 40, False), ("17.555", 40, False),
    ("abc", 40, False), ("NaN", 40, False), ("Infinity", 40, False),
])
def test_mark_problem(value, maximum, ok):
    assert (mark_problem(value, maximum) is None) is ok


# ---- the API ---------------------------------------------------------------------------

@pytest.fixture
def env(tmp_path):
    db_file = tmp_path / "school.db"
    migrate(db_file)
    sync_engine = sa.create_engine(f"sqlite:///{db_file}")
    with Session(sync_engine) as s:
        year_id = s.scalar(sa.text("SELECT id FROM academic_years WHERE is_current = 1"))
        exams = {name: id_ for id_, name in s.execute(sa.text("SELECT id, name FROM exams"))}
        teacher_a = DBTeacher(user_id=TEACHER_A.id, name="Teacher A")
        teacher_b = DBTeacher(user_id=TEACHER_B.id, name="Teacher B")
        s.add_all([teacher_a, teacher_b])
        subjects = {}
        for name in ("Mathematics", "Hindi", "Drawing"):
            subject = s.scalar(sa.select(DBSubject).where(DBSubject.name == name))
            if subject is None:
                subject = DBSubject(name=name)
                s.add(subject)
            subjects[name] = subject
        s.flush()
        sections = {}
        for grade in ("5", "7"):
            section = DBClassSection(academic_year_id=year_id, grade=grade, section="A")
            s.add(section)
            s.flush()
            sections[f"{grade}-A"] = section
        s.add_all([
            DBClassSubject(class_section_id=sections["5-A"].id, subject_id=subjects["Mathematics"].id, teacher_id=teacher_a.id),
            DBClassSubject(class_section_id=sections["5-A"].id, subject_id=subjects["Hindi"].id, teacher_id=teacher_b.id),
            DBClassSubject(class_section_id=sections["7-A"].id, subject_id=subjects["Hindi"].id, teacher_id=teacher_a.id),
            DBClassSubject(class_section_id=sections["7-A"].id, subject_id=subjects["Drawing"].id, teacher_id=teacher_a.id),
        ])
        for roll, name in enumerate(["Asha", "Bina", "Chitra"], start=1):
            s.add(DBStudent(name=name, class_section_id=sections["5-A"].id, roll_no=roll, status="active",
                            created_at=0, updated_at=0))
            s.add(DBStudent(name=name + " Seven", class_section_id=sections["7-A"].id, roll_no=roll,
                            status="active", created_at=0, updated_at=0))
        s.add(DBStudent(name="Left School", class_section_id=sections["5-A"].id, roll_no=9, status="inactive",
                        created_at=0, updated_at=0))
        s.commit()
        ids = {name: id_ for id_, name in s.query(DBStudent.id, DBStudent.name)}
        section_ids = {k: v.id for k, v in sections.items()}
        subject_ids = {k: v.id for k, v in subjects.items()}

    async_engine = create_async_engine(async_url(db_file), poolclass=NullPool)
    maker = async_sessionmaker(async_engine)  # same defaults as the real app (objects expire on commit)

    async def override_db():
        async with maker() as session:
            yield session

    app = FastAPI()
    app.include_router(marks.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db

    class Env:
        pass

    e = Env()
    e.app, e.ids, e.exams, e.sections, e.subjects, e.engine = app, ids, exams, section_ids, subject_ids, sync_engine
    e.as_user = lambda user: app.dependency_overrides.__setitem__(get_current_active_user_from_any_source, lambda: user)

    def rows():
        with sync_engine.connect() as conn:
            return conn.execute(sa.text(
                "SELECT student_id, part, marks, is_absent, max_marks FROM assessment_scores "
                "ORDER BY student_id, part")).all()

    e.rows = rows
    e.client = TestClient(app, raise_server_exceptions=False)
    e.as_user(ADMIN)
    yield e
    e.client.close()
    sync_engine.dispose()


def sheet(env, cls="5-A", exam="Terminal", subject="Mathematics"):
    return env.client.get("/api/marks/sheet", params={
        "class_section_id": env.sections[cls], "exam_id": env.exams[exam], "subject_id": env.subjects[subject]})


def save(env, entries, cls="5-A", exam="Terminal", subject="Mathematics"):
    return env.client.put("/api/marks/sheet", json={
        "class_section_id": env.sections[cls], "exam_id": env.exams[exam],
        "subject_id": env.subjects[subject], "entries": entries})


def entry(env, name, marks=None, part=1, absent=False):
    return {"student_id": env.ids[name], "part": part, "marks": marks, "is_absent": absent}


def stored(env):
    return {(r[0], r[1]): (None if r[2] is None else float(r[2]), bool(r[3])) for r in env.rows()}


def test_sheet_is_blank_in_roll_order_and_writes_nothing(env):
    body = sheet(env).json()
    assert [s["name"] for s in body["students"]] == ["Asha", "Bina", "Chitra"]  # no inactive student
    assert body["parts"] == [{"part": 1, "max_marks": 40}]
    assert all(s["scores"][0] == {"part": 1, "marks": None, "is_absent": False, "saved": False}
               for s in body["students"])
    assert env.rows() == []


def test_save_and_reopen_with_decimals_and_ab(env):
    r = save(env, [entry(env, "Asha", 38.5), entry(env, "Bina", absent=True), entry(env, "Chitra", "17.25")])
    assert r.status_code == 200 and r.json()["created"] == 3
    assert stored(env) == {(env.ids["Asha"], 1): (38.5, False), (env.ids["Bina"], 1): (None, True),
                           (env.ids["Chitra"], 1): (17.25, False)}  # absent is NOT zero
    by_name = {s["name"]: s["scores"][0] for s in sheet(env).json()["students"]}
    assert by_name["Asha"]["marks"] == 38.5 and by_name["Asha"]["saved"] is True
    assert by_name["Bina"]["marks"] is None and by_name["Bina"]["is_absent"] is True


@pytest.mark.parametrize("bad", [41, -1, "40.01", "17.555"])
def test_invalid_marks_reject_the_whole_sheet(env, bad):
    r = save(env, [entry(env, "Asha", 30), entry(env, "Bina", bad)])
    assert r.status_code == 422
    assert "Nothing saved" in r.json()["detail"] and "Bina" in r.json()["detail"]
    assert env.rows() == []  # Asha's valid mark was not saved either


def test_text_instead_of_a_number_is_rejected(env):
    assert save(env, [entry(env, "Asha", "abc")]).status_code == 422
    assert env.rows() == []


def test_absent_with_marks_is_rejected(env):
    assert save(env, [entry(env, "Asha", 10, absent=True)]).status_code == 422
    assert env.rows() == []


def test_zero_is_a_real_mark_and_different_from_ab(env):
    save(env, [entry(env, "Asha", 0)])
    assert stored(env) == {(env.ids["Asha"], 1): (0.0, False)}


def test_marks_entered_twice_keep_one_row_and_record_the_change(env):
    save(env, [entry(env, "Asha", 30), entry(env, "Bina", 20)])
    r = save(env, [entry(env, "Asha", 35), entry(env, "Bina", 20)])
    assert r.json()["updated"] == 1 and r.json()["unchanged"] == 1 and r.json()["created"] == 0
    assert stored(env)[(env.ids["Asha"], 1)] == (35.0, False)
    assert len(env.rows()) == 2
    with env.engine.connect() as c:
        assert c.execute(sa.text("SELECT COUNT(*) FROM assessment_scores WHERE updated_by = 1")).scalar() == 1


def test_ab_can_be_corrected_to_marks_and_back(env):
    save(env, [entry(env, "Asha", absent=True)])
    save(env, [entry(env, "Asha", 22)])
    assert stored(env) == {(env.ids["Asha"], 1): (22.0, False)}
    save(env, [entry(env, "Asha", absent=True)])
    assert stored(env) == {(env.ids["Asha"], 1): (None, True)}


def test_partial_entry_leaves_the_rest_alone_and_blank_is_not_saved(env):
    save(env, [entry(env, "Asha", 30)])
    r = save(env, [entry(env, "Bina", 25), entry(env, "Chitra")])  # Chitra: not entered yet
    assert r.status_code == 200 and r.json()["created"] == 1
    assert set(stored(env)) == {(env.ids["Asha"], 1), (env.ids["Bina"], 1)}


def test_saved_mark_cannot_be_blanked(env):
    save(env, [entry(env, "Asha", 30)])
    r = save(env, [entry(env, "Asha")])
    assert r.status_code == 422 and "cannot be left blank" in r.json()["detail"]
    assert stored(env) == {(env.ids["Asha"], 1): (30.0, False)}


def test_wrong_students_parts_and_duplicates_are_rejected(env):
    for bad in ([entry(env, "Asha Seven", 10)],                     # a student of another class
                [{"student_id": 99999, "part": 1, "marks": 10}],
                [entry(env, "Asha", 10, part=2)],                     # this subject has only part 1
                [entry(env, "Asha", 10), entry(env, "Asha", 12)]):    # same student and part twice
        assert save(env, bad).status_code == 422
    assert env.rows() == []


def test_error_message_lists_a_few_problems(env):
    r = save(env, [entry(env, "Asha", 99), entry(env, "Bina", 98), entry(env, "Chitra", 97)])
    assert r.status_code == 422 and r.json()["detail"].count("above the maximum") == 3


def test_failed_save_writes_nothing(env, monkeypatch):
    async def boom(self):
        raise RuntimeError("disk full")
    monkeypatch.setattr(AsyncSession, "commit", boom)
    assert save(env, [entry(env, "Asha", 30)]).status_code == 500
    assert env.rows() == []


def test_two_paper_subject_in_upper_class(env):
    body = sheet(env, "7-A", "Terminal", "Hindi").json()
    assert body["parts"] == [{"part": 1, "max_marks": 20}, {"part": 2, "max_marks": 20}]
    assert len(body["students"][0]["scores"]) == 2

    assert save(env, [entry(env, "Asha Seven", 21, part=1)], "7-A", subject="Hindi").status_code == 422
    r = save(env, [entry(env, "Asha Seven", 20, part=1), entry(env, "Asha Seven", 11.5, part=2)], "7-A", subject="Hindi")
    assert r.status_code == 200
    assert stored(env) == {(env.ids["Asha Seven"], 1): (20.0, False), (env.ids["Asha Seven"], 2): (11.5, False)}
    assert {r[4] for r in env.rows()} == {20}  # the maximum is stored with each mark

    assert sheet(env, "7-A", "Half-yearly", "Hindi").json()["parts"] == [
        {"part": 1, "max_marks": 30}, {"part": 2, "max_marks": 30}]
    assert sheet(env, "7-A", "Annual", "Hindi").json()["parts"] == [{"part": 1, "max_marks": 100}]
    assert sheet(env, "7-A", "Terminal", "Drawing").json()["parts"] == [{"part": 1, "max_marks": 40}]


def test_options_for_admin_and_teachers(env):
    admin = env.client.get("/api/marks/options").json()
    assert [e["name"] for e in admin["exams"]] == ["Terminal", "Half-yearly", "Annual"]
    assert [c["name"] for c in admin["classes"]] == ["5-A", "7-A"]  # numeric order
    assert [s["name"] for s in admin["classes"][0]["subjects"]] == ["Hindi", "Mathematics"]

    env.as_user(TEACHER_A)
    mine = env.client.get("/api/marks/options").json()["classes"]
    assert {c["name"]: [s["name"] for s in c["subjects"]] for c in mine} == {
        "5-A": ["Mathematics"], "7-A": ["Drawing", "Hindi"]}


def test_teacher_is_limited_to_their_own_subject(env):
    env.as_user(TEACHER_A)
    assert save(env, [entry(env, "Asha", 30)]).status_code == 200            # their subject
    before = env.rows()
    assert sheet(env, "5-A", subject="Hindi").status_code == 403            # same class, another teacher's subject
    assert save(env, [entry(env, "Asha", 5)], subject="Hindi").status_code == 403

    env.as_user(TEACHER_B)
    assert sheet(env).status_code == 403                                     # Mathematics belongs to teacher A
    assert save(env, [entry(env, "Asha", 5)]).status_code == 403
    assert env.rows() == before


def test_unknown_or_untaught_subject_is_404(env):
    assert env.client.get("/api/marks/sheet", params={"class_section_id": 99999, "exam_id": 1, "subject_id": 1}).status_code == 404
    assert sheet(env, "5-A", subject="Drawing").status_code == 404           # not taught in 5-A


def test_other_roles_and_anonymous_users_are_refused(env):
    env.as_user(CLERK)
    assert sheet(env).status_code == 403 and save(env, []).status_code == 403
    assert env.client.get("/api/marks/options").status_code == 403
    del env.app.dependency_overrides[get_current_active_user_from_any_source]
    assert sheet(env).status_code in (401, 403)
    assert env.rows() == []
