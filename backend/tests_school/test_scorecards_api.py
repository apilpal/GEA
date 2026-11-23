"""Student scorecards (issue #34): rules and API.

Run from backend/:   python -m pytest tests_school/test_scorecards_api.py -q --noconftest
"""
from datetime import date

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from src.api.v1.routers import scorecards
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (DBAssessmentScore, DBAttendance, DBClassSection, DBClassSubject,
                                           DBSubject, DBTeacher)
from src.services.scorecard_rules import attendance_rate, competition_rank, percent, tally
from src.utils.auth_utils import get_current_active_user_from_any_source

from .helpers import async_url, migrate

ADMIN = User(id=1, username="admin", email="a@example.test", role=UserRole.ADMIN)
CLASS_TEACHER = User(id=2, username="ta", email="ta@example.test", role=UserRole.TEACHER)    # class teacher of 5-A
SUBJECT_TEACHER = User(id=3, username="tb", email="tb@example.test", role=UserRole.TEACHER)  # teaches Hindi in 5-A
OTHER_TEACHER = User(id=5, username="tc", email="tc@example.test", role=UserRole.TEACHER)    # teaches nothing in 5-A
CLERK = User(id=4, username="clerk", email="c@example.test", role=UserRole.ACCOUNTANT)


# ---- the rules on their own ----------------------------------------------------------------

def test_percent():
    assert percent(50, 80) == 62.5
    assert percent(95, 140) == 67.86
    assert percent(0, 40) == 0.0          # a real zero is a real percent
    assert percent(0, 0) is None          # nothing counted


def test_competition_rank_shares_positions_for_ties():
    percents = {1: 75.0, 2: 62.5, 3: 62.5, 4: 50.0, 5: None}
    assert [competition_rank(percents, i) for i in (1, 2, 3, 4, 5)] == [1, 2, 2, 4, None]
    assert competition_rank(percents, 99) is None


def test_attendance_rate():
    assert attendance_rate(15, 0, 2, 3) == 88.2          # 15 / (20 - 3 leave)
    assert attendance_rate(10, 2, 3, 1) == 80.0          # late counts as present, leave is left out
    assert attendance_rate(0, 0, 0, 4) is None          # only leave: nothing to count


def test_tally():
    one = {"marks": 18.5, "is_absent": False, "max_marks": 20}
    two = {"marks": 11.0, "is_absent": False, "max_marks": 20}
    ab = {"marks": None, "is_absent": True, "max_marks": 20}
    assert tally([one, two], 2) == {"marks": 29.5, "max": 40, "status": "entered"}
    assert tally([one], 2) == {"marks": 18.5, "max": 20, "status": "partial"}        # the other paper is missing
    assert tally([one, ab], 2) == {"marks": 18.5, "max": 20, "status": "partial"}
    assert tally([ab, ab], 2) == {"marks": None, "max": 0, "status": "absent"}
    assert tally([], 1) == {"marks": None, "max": 0, "status": "missing"}
    assert tally([{"marks": 0.0, "is_absent": False, "max_marks": 40}], 1) == {"marks": 0.0, "max": 40, "status": "entered"}


# ---- the API ---------------------------------------------------------------------------------

@pytest.fixture
def env(tmp_path):
    db_file = tmp_path / "school.db"
    migrate(db_file)
    sync_engine = sa.create_engine(f"sqlite:///{db_file}")
    with Session(sync_engine) as s:
        year_id = s.scalar(sa.text("SELECT id FROM academic_years WHERE is_current = 1"))
        exams = {name: id_ for id_, name in s.execute(sa.text("SELECT id, name FROM exams"))}
        t_a = DBTeacher(user_id=CLASS_TEACHER.id, name="Teacher A")
        t_b = DBTeacher(user_id=SUBJECT_TEACHER.id, name="Teacher B")
        t_c = DBTeacher(user_id=OTHER_TEACHER.id, name="Teacher C")
        s.add_all([t_a, t_b, t_c])
        s.flush()
        sec5 = DBClassSection(academic_year_id=year_id, grade="5", section="A", class_teacher_id=t_a.id)
        sec6 = DBClassSection(academic_year_id=year_id, grade="6", section="A", class_teacher_id=t_c.id)
        s.add_all([sec5, sec6])
        subjects = {}
        for name in ("Mathematics", "Hindi"):
            subject = s.scalar(sa.select(DBSubject).where(DBSubject.name == name)) or DBSubject(name=name)
            s.add(subject)
            subjects[name] = subject
        s.flush()
        s.add_all([DBClassSubject(class_section_id=sec5.id, subject_id=subjects["Mathematics"].id, teacher_id=t_a.id),
                   DBClassSubject(class_section_id=sec5.id, subject_id=subjects["Hindi"].id, teacher_id=t_b.id)])
        people = {}
        for roll, name in enumerate(["Asha", "Bina", "Chitra"], start=1):
            person = DBStudent(name=name, class_section_id=sec5.id, roll_no=roll, status="active",
                               admission_no=f"S-{roll}", created_at=0, updated_at=0)
            s.add(person)
            people[name] = person
        left = DBStudent(name="Left", class_section_id=sec5.id, roll_no=9, status="inactive", created_at=0, updated_at=0)
        no_class = DBStudent(name="NoClass", status="active", created_at=0, updated_at=0)
        s.add_all([left, no_class])
        s.flush()

        def score(student, exam, subject, marks, max_marks, absent=False, part=1):
            s.add(DBAssessmentScore(exam_id=exams[exam], student_id=people[student].id,
                                    subject_id=subjects[subject].id, part=part, marks=marks,
                                    max_marks=max_marks, is_absent=absent))

        score("Asha", "Terminal", "Mathematics", 30, 40)
        score("Asha", "Terminal", "Hindi", 20, 40)
        score("Asha", "Half-yearly", "Mathematics", 45, 60)
        score("Bina", "Terminal", "Mathematics", None, 40, absent=True)       # absent: not a zero
        score("Bina", "Terminal", "Hindi", 30, 40)
        score("Chitra", "Terminal", "Mathematics", 30, 40)
        score("Chitra", "Terminal", "Hindi", 20, 40)
        # Asha: 15 present, 2 absent, 3 approved leave in 20 school days
        statuses = ["present"] * 15 + ["absent"] * 2 + ["leave"] * 3
        for day, status in enumerate(statuses, start=1):
            s.add(DBAttendance(student_id=people["Asha"].id, class_section_id=sec5.id,
                               date=date(2026, 10, day), status=status))
        s.commit()
        ids = {name: p.id for name, p in people.items()}
        ids["NoClass"] = no_class.id
        sections = {"5-A": sec5.id, "6-A": sec6.id}

    async_engine = create_async_engine(async_url(db_file), poolclass=NullPool)
    maker = async_sessionmaker(async_engine)

    async def override_db():
        async with maker() as session:
            yield session

    app = FastAPI()
    app.include_router(scorecards.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db

    class Env:
        pass

    e = Env()
    e.app, e.ids, e.sections, e.exams = app, ids, sections, exams
    e.as_user = lambda user: app.dependency_overrides.__setitem__(get_current_active_user_from_any_source, lambda: user)
    e.client = TestClient(app, raise_server_exceptions=False)
    e.as_user(ADMIN)
    e.card = lambda name: e.client.get(f"/api/scorecards/students/{e.ids[name]}")
    yield e
    e.client.close()
    sync_engine.dispose()


def cell(card, subject, exam, env):
    row = next(r for r in card["subjects"] if r["name"] == subject)
    return row["exams"][str(env.exams[exam])]


def exam_total(card, exam, env):
    return next(t for t in card["exam_totals"] if t["exam_id"] == env.exams[exam])


def test_scorecard_marks_totals_position_and_attendance(env):
    card = env.card("Asha").json()
    assert card["student"]["name"] == "Asha" and card["student"]["class_name"] == "5-A"
    assert [e["name"] for e in card["exams"]] == ["Terminal", "Half-yearly", "Annual"]
    assert [s["name"] for s in card["subjects"]] == ["Mathematics", "Hindi"]

    maths = cell(card, "Mathematics", "Terminal", env)
    assert (maths["marks"], maths["max"], maths["status"]) == (30.0, 40, "entered")
    assert cell(card, "Mathematics", "Annual", env)["status"] == "missing"
    assert cell(card, "Hindi", "Half-yearly", env)["status"] == "missing"
    row = card["subjects"][0]
    assert (row["total"], row["max"], row["percent"]) == (75.0, 100, 75.0)    # Terminal 30/40 + Half-yearly 45/60

    terminal = exam_total(card, "Terminal", env)
    assert (terminal["total"], terminal["max"], terminal["percent"]) == (50.0, 80, 62.5)
    assert (terminal["position"], terminal["of"]) == (2, 3)
    half = exam_total(card, "Half-yearly", env)
    assert (half["total"], half["max"], half["percent"], half["position"], half["of"]) == (45.0, 60, 75.0, 1, 1)
    annual = exam_total(card, "Annual", env)
    assert (annual["total"], annual["percent"], annual["position"]) == (None, None, None)

    overall = card["overall"]
    assert (overall["total"], overall["max"], overall["percent"]) == (95.0, 140, 67.86)
    assert (overall["position"], overall["of"]) == (2, 3)

    assert card["attendance"] == {"present": 15, "absent": 2, "late": 0, "leave": 3, "recorded": 20, "rate": 88.2}


def test_absent_exam_is_ab_and_left_out_of_the_average(env):
    card = env.card("Bina").json()
    maths = cell(card, "Mathematics", "Terminal", env)
    assert maths["status"] == "absent" and maths["marks"] is None       # not zero
    terminal = exam_total(card, "Terminal", env)
    assert (terminal["total"], terminal["max"], terminal["percent"]) == (30.0, 40, 75.0)   # Hindi only
    assert terminal["position"] == 1
    assert card["overall"]["percent"] == 75.0 and card["overall"]["position"] == 1
    assert card["attendance"]["rate"] is None and card["attendance"]["recorded"] == 0


def test_students_with_the_same_percent_share_a_position(env):
    positions = {n: exam_total(env.card(n).json(), "Terminal", env)["position"] for n in ("Asha", "Bina", "Chitra")}
    assert positions == {"Asha": 2, "Bina": 1, "Chitra": 2}


def test_no_marks_means_no_position_not_last_place(env):
    card = env.card("Chitra").json()
    half = exam_total(card, "Half-yearly", env)
    assert (half["total"], half["percent"], half["position"]) == (None, None, None)
    assert cell(card, "Mathematics", "Half-yearly", env)["status"] == "missing"
    assert card["overall"]["position"] == 3


def test_classes_and_students_lists(env):
    classes = env.client.get("/api/scorecards/classes").json()
    assert [(c["name"], c["student_count"]) for c in classes] == [("5-A", 3), ("6-A", 0)]
    listed = env.client.get(f"/api/scorecards/classes/{env.sections['5-A']}/students").json()
    assert [s["name"] for s in listed] == ["Asha", "Bina", "Chitra"]          # no inactive student
    assert env.client.get("/api/scorecards/classes/99999/students").status_code == 404


def test_teachers_see_only_the_classes_they_teach(env):
    env.as_user(CLASS_TEACHER)
    assert [c["name"] for c in env.client.get("/api/scorecards/classes").json()] == ["5-A"]
    assert env.card("Asha").status_code == 200
    env.as_user(SUBJECT_TEACHER)                                            # teaches Hindi in 5-A
    assert [c["name"] for c in env.client.get("/api/scorecards/classes").json()] == ["5-A"]
    assert env.card("Asha").status_code == 200
    env.as_user(OTHER_TEACHER)                                              # class teacher of 6-A only
    assert [c["name"] for c in env.client.get("/api/scorecards/classes").json()] == ["6-A"]
    assert env.card("Asha").status_code == 403
    assert env.client.get(f"/api/scorecards/classes/{env.sections['5-A']}/students").status_code == 403


def test_other_roles_and_anonymous_users_are_refused(env):
    env.as_user(CLERK)
    assert env.card("Asha").status_code == 403
    assert env.client.get("/api/scorecards/classes").status_code == 403
    del env.app.dependency_overrides[get_current_active_user_from_any_source]
    assert env.card("Asha").status_code in (401, 403)


def test_unknown_student_or_student_without_class_is_404(env):
    assert env.client.get("/api/scorecards/students/99999").status_code == 404
    assert env.card("NoClass").status_code == 404
