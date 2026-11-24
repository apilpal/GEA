"""School and class analytics (issue #35): rules and API.

Run from backend/:   python -m pytest tests_school/test_analytics_api.py -q --noconftest
"""
from datetime import date

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from src.api.v1.routers import analytics
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import DBAssessmentScore, DBAttendance, DBClassSection, DBSubject, DBTeacher
from src.services.analytics_rules import bucket_for, bucket_rules, group_attendance_rate, student_percents, summarize
from src.utils.auth_utils import get_current_active_user_from_any_source

from .helpers import async_url, migrate

ADMIN = User(id=1, username="admin", email="a@example.test", role=UserRole.ADMIN)
TEACHER_5A = User(id=2, username="ta", email="ta@example.test", role=UserRole.TEACHER)   # class teacher of 5-A
TEACHER_6A = User(id=3, username="tb", email="tb@example.test", role=UserRole.TEACHER)   # class teacher of 6-A
CLERK = User(id=4, username="clerk", email="c@example.test", role=UserRole.ACCOUNTANT)


# ---- the rules on their own ----------------------------------------------------------------

def test_bucket_limits_are_inclusive_at_the_bottom_of_each_bucket():
    assert [bucket_for(p) for p in (100, 75, 74.99, 50, 49.99, 33, 32.99, 0)] == [
        "distinction", "distinction", "steady", "steady", "borderline", "borderline", "at_risk", "at_risk"]
    assert bucket_for(None) is None


def test_bucket_rules_explain_every_label():
    rules = bucket_rules()
    assert [r["key"] for r in rules] == ["distinction", "steady", "borderline", "at_risk"]
    assert all(r["label"] and r["rule"] for r in rules)


def test_student_percents_leave_out_ab_and_missing_marks_but_keep_real_zeros():
    rows = [(1, 30.0, 40, False), (1, None, 40, True),       # 30 of 40: the AB part is not counted
            (2, None, 40, True),                              # only AB: no percent
            (3, 0.0, 40, False),                              # a real zero is a real percent
            (4, None, 40, False)]                             # saved with no marks and not absent: not counted
    assert student_percents(rows) == {1: 75.0, 2: None, 3: 0.0, 4: None}


def test_summarize_counts_students_without_marks_but_does_not_average_them():
    result = summarize([80, 60, None, 10, 0], students=6)
    assert result == {"students": 6, "with_marks": 4, "average_percent": 37.5,
                      "buckets": {"distinction": 1, "steady": 1, "borderline": 0, "at_risk": 2}}
    empty = summarize([None, None], students=2)
    assert empty["with_marks"] == 0 and empty["average_percent"] is None
    assert sum(empty["buckets"].values()) == 0
    assert summarize([], students=0)["average_percent"] is None


def test_group_attendance_rate():
    assert group_attendance_rate(27, 5, 5) == 86.5           # 32 of 37
    assert group_attendance_rate(25, 2, 5) == 84.4           # 27 of 32, late counts as present
    assert group_attendance_rate(0, 0, 0) is None


# ---- the API ---------------------------------------------------------------------------------

@pytest.fixture
def env(tmp_path):
    db_file = tmp_path / "school.db"
    migrate(db_file)
    sync_engine = sa.create_engine(f"sqlite:///{db_file}")
    with Session(sync_engine) as s:
        year_id = s.scalar(sa.text("SELECT id FROM academic_years WHERE is_current = 1"))
        exams = {name: id_ for id_, name in s.execute(sa.text("SELECT id, name FROM exams"))}
        t_a = DBTeacher(user_id=TEACHER_5A.id, name="Teacher A")
        t_b = DBTeacher(user_id=TEACHER_6A.id, name="Teacher B")
        s.add_all([t_a, t_b])
        s.flush()
        sec5 = DBClassSection(academic_year_id=year_id, grade="5", section="A", class_teacher_id=t_a.id)
        sec6 = DBClassSection(academic_year_id=year_id, grade="6", section="A", class_teacher_id=t_b.id)
        s.add_all([sec5, sec6])
        subjects = {}
        for name in ("Mathematics", "Hindi"):
            subject = s.scalar(sa.select(DBSubject).where(DBSubject.name == name)) or DBSubject(name=name)
            s.add(subject)
            subjects[name] = subject
        s.flush()

        people = {}
        for section, roll, name in [(sec5, 1, "Asha"), (sec5, 2, "Bina"), (sec5, 3, "Chitra"), (sec5, 4, "Fatima"),
                                    (sec5, 5, "Dev"), (sec6, 1, "Esha")]:
            person = DBStudent(name=name, class_section_id=section.id, roll_no=roll, status="active",
                               admission_no=f"S-{name}", created_at=0, updated_at=0)
            s.add(person)
            people[name] = person
        s.add_all([DBStudent(name="Left", class_section_id=sec5.id, roll_no=9, status="inactive", created_at=0, updated_at=0),
                   DBStudent(name="NoClass", status="active", created_at=0, updated_at=0)])
        s.flush()

        def score(student, exam, subject, marks, max_marks, absent=False):
            s.add(DBAssessmentScore(exam_id=exams[exam], student_id=people[student].id, subject_id=subjects[subject].id,
                                    part=1, marks=marks, max_marks=max_marks, is_absent=absent))

        # Terminal (40 per subject). Percents: Asha 62.5, Bina 75, Chitra 62.5, Fatima 33.75, Esha 0, Dev none.
        score("Asha", "Terminal", "Mathematics", 30, 40)
        score("Asha", "Terminal", "Hindi", 20, 40)
        score("Asha", "Half-yearly", "Mathematics", 45, 60)          # all exams together: 95 of 140 = 67.86
        score("Bina", "Terminal", "Mathematics", None, 40, absent=True)   # AB: not a zero
        score("Bina", "Terminal", "Hindi", 30, 40)
        score("Chitra", "Terminal", "Mathematics", 30, 40)
        score("Chitra", "Terminal", "Hindi", 20, 40)
        score("Fatima", "Terminal", "Mathematics", 15, 40)
        score("Fatima", "Terminal", "Hindi", 12, 40)
        score("Esha", "Terminal", "Mathematics", 0, 40)               # a real zero
        score("Esha", "Terminal", "Hindi", 0, 40)

        def attend(student, section, first_day, statuses):
            for offset, status in enumerate(statuses):
                s.add(DBAttendance(student_id=people[student].id, class_section_id=section.id,
                                   date=date(2026, 10, first_day + offset), status=status))
        attend("Asha", sec5, 1, ["present"] * 15 + ["absent"] * 2 + ["leave"] * 3)      # 15 of 17 = 88.2
        attend("Bina", sec5, 1, ["present"] * 10 + ["late"] * 2 + ["absent"] * 3)       # 12 of 15 = 80.0
        attend("Esha", sec6, 1, ["present"] * 10)                                       # 100.0
        s.commit()
        ids = {name: p.id for name, p in people.items()}
        sections = {"5-A": sec5.id, "6-A": sec6.id}

    async_engine = create_async_engine(async_url(db_file), poolclass=NullPool)
    maker = async_sessionmaker(async_engine)      # the app's default settings

    async def override_db():
        async with maker() as session:
            yield session

    app = FastAPI()
    app.include_router(analytics.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db

    class Env:
        pass

    e = Env()
    e.app, e.ids, e.sections, e.exams, e.db_file = app, ids, sections, exams, db_file
    e.as_user = lambda user: app.dependency_overrides.__setitem__(get_current_active_user_from_any_source, lambda: user)
    e.client = TestClient(app, raise_server_exceptions=False)
    e.as_user(ADMIN)
    e.overview = lambda exam=None: e.client.get("/api/analytics/overview" + (f"?exam_id={exams[exam]}" if exam else ""))
    e.klass = lambda name, exam=None: e.client.get(
        f"/api/analytics/classes/{sections[name]}" + (f"?exam_id={exams[exam]}" if exam else ""))
    yield e
    e.client.close()
    sync_engine.dispose()


def by_name(rows, key="name"):
    return {row[key]: row for row in rows}


def test_overview_school_grades_and_classes_for_one_exam(env):
    data = env.overview("Terminal").json()
    assert data["exam"]["name"] == "Terminal"
    assert [e["name"] for e in data["exams"]] == ["Terminal", "Half-yearly", "Annual"]

    school = data["school"]
    assert (school["students"], school["with_marks"], school["average_percent"]) == (6, 5, 46.75)   # Dev has no marks
    assert school["buckets"] == {"distinction": 1, "steady": 2, "borderline": 1, "at_risk": 1}
    assert (school["attendance_rate"], school["attendance_days"]) == (88.1, 42)
    assert data["unassigned_students"] == 1                                                      # NoClass; Left is inactive

    classes = by_name(data["classes"])
    five, six = classes["5-A"], classes["6-A"]
    assert [c["name"] for c in data["classes"]] == ["5-A", "6-A"]
    assert (five["students"], five["with_marks"], five["average_percent"]) == (5, 4, 58.44)
    assert five["buckets"] == {"distinction": 1, "steady": 2, "borderline": 1, "at_risk": 0}
    assert (five["attendance_rate"], five["attendance_days"], five["class_teacher"]) == (84.4, 32, "Teacher A")
    assert (six["students"], six["with_marks"], six["average_percent"]) == (1, 1, 0.0)             # a real zero counts
    assert six["buckets"]["at_risk"] == 1 and six["attendance_rate"] == 100.0

    grades = by_name(data["grades"], "grade")
    assert list(grades) == ["5", "6"] and grades["5"]["sections"] == 1
    assert grades["5"]["average_percent"] == 58.44 and grades["6"]["average_percent"] == 0.0
    assert [r["key"] for r in data["bucket_rules"]] == ["distinction", "steady", "borderline", "at_risk"]


def test_overview_without_an_exam_combines_all_exams(env):
    school = env.overview().json()["school"]
    assert env.overview().json()["exam"] is None
    assert school["with_marks"] == 5 and school["buckets"]["steady"] == 2      # Asha 67.86 stays steady
    half = env.overview("Half-yearly").json()
    assert (half["school"]["with_marks"], half["school"]["average_percent"]) == (1, 75.0)   # only Asha has Half-yearly marks
    annual = env.overview("Annual").json()
    assert annual["school"]["with_marks"] == 0 and annual["school"]["average_percent"] is None
    assert sum(annual["school"]["buckets"].values()) == 0                       # nothing entered: not "all at risk"
    assert annual["school"]["students"] == 6


def test_class_detail_lists_every_student_with_position_and_bucket(env):
    data = env.klass("5-A", "Terminal").json()
    assert data["class"]["name"] == "5-A" and data["summary"]["with_marks"] == 4
    students = by_name(data["students"])
    assert [s["name"] for s in data["students"]] == ["Asha", "Bina", "Chitra", "Fatima", "Dev"]   # roll order, no inactive
    assert (students["Bina"]["percent"], students["Bina"]["bucket"], students["Bina"]["position"]) == (75.0, "distinction", 1)
    assert (students["Asha"]["percent"], students["Asha"]["position"]) == (62.5, 2)
    assert students["Chitra"]["position"] == 2                                   # same percent, same position
    assert (students["Fatima"]["bucket"], students["Fatima"]["position"]) == ("borderline", 4)
    dev = students["Dev"]
    assert (dev["percent"], dev["bucket"], dev["position"], dev["attendance_rate"]) == (None, None, None, None)
    assert students["Asha"]["attendance_rate"] == 88.2
    assert students["Asha"]["attendance"] == {"present": 15, "absent": 2, "late": 0, "leave": 3, "recorded": 20}
    assert students["Bina"]["attendance_rate"] == 80.0                          # late counts as present


def test_class_detail_all_exams_uses_the_combined_percent(env):
    asha = by_name(env.klass("5-A").json()["students"])["Asha"]
    assert (asha["percent"], asha["bucket"]) == (67.86, "steady")


def test_overview_is_for_the_admin_only(env):
    for user in (TEACHER_5A, CLERK):
        env.as_user(user)
        assert env.overview().status_code == 403
    del env.app.dependency_overrides[get_current_active_user_from_any_source]
    assert env.overview().status_code in (401, 403)


def test_teachers_see_only_their_own_class_detail(env):
    env.as_user(TEACHER_5A)
    assert env.klass("5-A").status_code == 200
    assert env.klass("6-A").status_code == 403
    env.as_user(TEACHER_6A)
    assert env.klass("6-A").status_code == 200
    assert env.klass("5-A").status_code == 403


def test_other_roles_and_anonymous_users_cannot_see_class_detail(env):
    env.as_user(CLERK)
    assert env.klass("5-A").status_code == 403
    del env.app.dependency_overrides[get_current_active_user_from_any_source]
    assert env.klass("5-A").status_code in (401, 403)


def test_unknown_class_or_exam_is_404(env):
    assert env.client.get("/api/analytics/classes/99999").status_code == 404
    assert env.client.get("/api/analytics/overview?exam_id=99999").status_code == 404
    assert env.client.get(f"/api/analytics/classes/{env.sections['5-A']}?exam_id=99999").status_code == 404


def test_no_current_session_is_a_clear_404(env):
    engine = sa.create_engine(f"sqlite:///{env.db_file}")
    with engine.begin() as conn:
        conn.execute(sa.text("UPDATE academic_years SET is_current = 0"))
    engine.dispose()
    response = env.overview()
    assert response.status_code == 404 and "session" in response.json()["detail"]
