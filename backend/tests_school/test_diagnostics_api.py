"""Subject comparison and diagnostics (issue #36): rules and API.

Run from backend/:   python -m pytest tests_school/test_diagnostics_api.py -q --noconftest
"""
from datetime import date

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from src.api.v1.routers import diagnostics
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (DBAssessmentScore, DBAttendance, DBClassSection, DBClassSubject,
                                           DBSubject, DBTeacher)
from src.services.diagnostic_rules import (class_tags, mean, std_dev, student_tags, subject_percents, tag_rules,
                                           weak_subjects)
from src.utils.auth_utils import get_current_active_user_from_any_source

from .helpers import async_url, migrate

ADMIN = User(id=1, username="admin", email="a@example.test", role=UserRole.ADMIN)
TEACHER_5A = User(id=2, username="ta", email="ta@example.test", role=UserRole.TEACHER)
TEACHER_6A = User(id=3, username="tb", email="tb@example.test", role=UserRole.TEACHER)
CLERK = User(id=4, username="clerk", email="c@example.test", role=UserRole.ACCOUNTANT)


# ---- the rules on their own ----------------------------------------------------------------

def test_subject_percents_leave_out_ab_and_missing_but_keep_real_zeros():
    rows = [(1, 1, 30.0, 40, False), (1, 1, None, 40, True),     # 30 of 40, the AB part is not counted
            (1, 2, 10.0, 40, False),
            (2, 1, None, 40, True),                              # only AB: no percent
            (3, 1, 0.0, 40, False)]                              # a real zero
    assert subject_percents(rows) == {(1, 1): 75.0, (1, 2): 25.0, (2, 1): None, (3, 1): 0.0}


def test_mean_and_std_dev_ignore_missing_values():
    assert mean([10, None, 20]) == 15.0 and mean([None]) is None and mean([]) is None
    assert std_dev([10, 30]) == 10.0 and std_dev([50]) == 0.0 and std_dev([None]) is None


def test_weak_subject_limit_is_inclusive_and_worst_comes_first():
    averages = {"Maths": 50.0, "Hindi": 49.99, "English": 40.0, "Science": None}
    assert weak_subjects(60.0, averages) == [("English", 40.0, 20.0), ("Hindi", 49.99, 10.01), ("Maths", 50.0, 10.0)]
    assert weak_subjects(None, averages) == []
    assert weak_subjects(60.0, {"Maths": 50.01}) == []


def test_student_attendance_tag_needs_enough_days_and_a_low_rate():
    assert [t["key"] for t in student_tags(None, {}, 62.5, 16)] == ["low_attendance"]
    assert student_tags(None, {}, 74.9, 10)[0]["reason"] == "Attendance is 74.9% over 10 days (limit 75%)"
    assert student_tags(None, {}, 75.0, 40) == []          # exactly the limit is not low
    assert student_tags(None, {}, 40.0, 9) == []           # too few days to say anything
    assert student_tags(None, {}, None, 0) == []


def test_student_subject_gap_needs_two_subjects_and_a_20_point_gap():
    tags = student_tags(65.0, {"Maths": 10.0, "Hindi": 90.0, "Science": 95.0}, None, 0)
    assert [t["key"] for t in tags] == ["subject_gap"]
    assert tags[0]["reason"] == "Maths 10% is 55 points below overall 65%"
    assert student_tags(60.0, {"Maths": 40.0, "Hindi": 80.0}, None, 0)[0]["key"] == "subject_gap"    # exactly 20 points
    assert student_tags(60.0, {"Maths": 40.01, "Hindi": 80.0}, None, 0) == []
    assert student_tags(60.0, {"Maths": 10.0, "Hindi": None}, None, 0) == []     # only one subject has marks
    assert student_tags(None, {"Maths": 10.0, "Hindi": 90.0}, None, 0) == []     # no overall percent
    two = student_tags(60.0, {"A": 10.0, "B": 20.0, "C": 30.0}, None, 0)[0]["reason"]
    assert two.count(";") == 1                                                   # at most the two worst are named


def test_class_spread_needs_five_students_and_a_wide_range():
    wide = [10, 90, 20, 80, 50]
    assert "high_spread" in [t["key"] for t in class_tags(wide, 50.0, {}, None, 0, None)]
    assert class_tags(wide[:4], 50.0, {}, None, 0, None) == []                    # only four students
    assert class_tags([48, 52, 50, 49, 51], 50.0, {}, None, 0, None) == []        # all close together
    assert "high_spread" in [t["key"] for t in class_tags(wide + [None, None], 50.0, {}, None, 0, None)]


def test_class_attendance_gap_rule():
    assert [t["key"] for t in class_tags([], None, {}, 80.0, 40, 90.0)] == ["attendance_gap"]
    assert class_tags([], None, {}, 85.0, 40, 90.0)[0]["key"] == "attendance_gap"          # exactly 5 points
    assert class_tags([], None, {}, 85.1, 40, 90.0) == []
    assert class_tags([], None, {}, 70.0, 5, 90.0) == []                                  # too few days
    assert class_tags([], None, {}, None, 0, 90.0) == []


def test_every_tag_has_a_rule_in_words():
    rules = tag_rules()
    assert {r["key"] for r in rules} == {"low_attendance", "subject_gap", "weak_subject", "high_spread", "attendance_gap"}
    assert all(r["label"] and r["rule"] and r["scope"] in ("student", "class") for r in rules)


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
        for name in ("Mathematics", "Hindi", "Science"):
            subject = s.scalar(sa.select(DBSubject).where(DBSubject.name == name)) or DBSubject(name=name)
            s.add(subject)
            subjects[name] = subject
        s.flush()
        for name in ("Mathematics", "Hindi", "Science"):          # 5-A teaches all three, 6-A only two
            s.add(DBClassSubject(class_section_id=sec5.id, subject_id=subjects[name].id))
        for name in ("Mathematics", "Hindi"):
            s.add(DBClassSubject(class_section_id=sec6.id, subject_id=subjects[name].id))

        people = {}
        for section, roll, name in [(sec5, 1, "Asha"), (sec5, 2, "Bina"), (sec5, 3, "Chitra"), (sec5, 4, "Dev"),
                                    (sec5, 5, "Esha"), (sec5, 6, "Farah"), (sec5, 7, "Gita"), (sec6, 1, "Giri")]:
            person = DBStudent(name=name, class_section_id=section.id, roll_no=roll, status="active",
                               admission_no=f"S-{name}", created_at=0, updated_at=0)
            s.add(person)
            people[name] = person
        s.flush()

        # Terminal, 40 per subject: (Mathematics, Hindi, Science)
        marks = {"Asha": (30, 38, 36),     # 104 of 120 = 86.67
                 "Bina": (28, 36, 34),     # 98 of 120 = 81.67
                 "Chitra": (2, 8, 8),      # 18 of 120 = 15.0
                 "Dev": (4, 6, 8),         # 18 of 120 = 15.0
                 "Esha": (12, 22, 22),     # 56 of 120 = 46.67
                 "Farah": (4, 36, 38)}     # 78 of 120 = 65.0, but Mathematics is only 10%
        for name, (maths, hindi, science) in marks.items():
            for subject, value in (("Mathematics", maths), ("Hindi", hindi), ("Science", science)):
                s.add(DBAssessmentScore(exam_id=exams["Terminal"], student_id=people[name].id, subject_id=subjects[subject].id,
                                        part=1, marks=value, max_marks=40, is_absent=False))
        # Gita has no marks at all. Giri (class 6): Mathematics 20, Hindi AB.
        s.add(DBAssessmentScore(exam_id=exams["Terminal"], student_id=people["Giri"].id, subject_id=subjects["Mathematics"].id,
                                part=1, marks=20, max_marks=40, is_absent=False))
        s.add(DBAssessmentScore(exam_id=exams["Terminal"], student_id=people["Giri"].id, subject_id=subjects["Hindi"].id,
                                part=1, marks=None, max_marks=40, is_absent=True))

        def attend(student, section, present, absent):
            statuses = ["present"] * present + ["absent"] * absent
            for day, status in enumerate(statuses, start=1):
                s.add(DBAttendance(student_id=people[student].id, class_section_id=section.id,
                                   date=date(2026, 10, day), status=status))
        attend("Asha", sec5, 12, 0)
        attend("Chitra", sec5, 8, 4)       # 8 of 12 = 66.7: low
        attend("Esha", sec5, 11, 1)        # 11 of 12 = 91.7
        attend("Giri", sec6, 28, 0)        # class 5-A: 31 of 36 = 86.1; school: 59 of 64 = 92.2
        s.commit()
        ids = {name: p.id for name, p in people.items()}
        sections = {"5-A": sec5.id, "6-A": sec6.id}
        subject_ids = {name: subj.id for name, subj in subjects.items()}

    async_engine = create_async_engine(async_url(db_file), poolclass=NullPool)
    maker = async_sessionmaker(async_engine)      # the app's default settings

    async def override_db():
        async with maker() as session:
            yield session

    app = FastAPI()
    app.include_router(diagnostics.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db

    class Env:
        pass

    e = Env()
    e.app, e.ids, e.sections, e.exams, e.subjects, e.db_file = app, ids, sections, exams, subject_ids, db_file
    e.as_user = lambda user: app.dependency_overrides.__setitem__(get_current_active_user_from_any_source, lambda: user)
    e.client = TestClient(app, raise_server_exceptions=False)
    e.as_user(ADMIN)

    def query(exam, extra=""):
        parts = ([f"exam_id={exams[exam]}"] if exam else []) + ([extra] if extra else [])
        return ("?" + "&".join(parts)) if parts else ""

    e.compare = lambda exam=None, extra="": e.client.get("/api/analytics/subjects" + query(exam, extra))
    e.diag = lambda name, exam=None: e.client.get(f"/api/analytics/classes/{sections[name]}/diagnostics" + query(exam))
    yield e
    e.client.close()
    sync_engine.dispose()


def by_key(rows, key):
    return {row[key]: row for row in rows}


def test_subject_comparison_school_classes_and_bottleneck(env):
    data = env.compare("Terminal").json()
    assert data["exam"]["name"] == "Terminal" and data["grade"] is None
    subjects = by_key(data["subjects"], "name")
    assert [s["name"] for s in data["subjects"]] == ["Mathematics", "Hindi", "Science"]      # weakest first
    maths = subjects["Mathematics"]
    assert (maths["students"], maths["with_marks"], maths["average_percent"]) == (8, 7, 35.71)   # Gita has none: not a zero
    assert maths["buckets"] == {"distinction": 1, "steady": 2, "borderline": 0, "at_risk": 4}
    hindi = subjects["Hindi"]
    assert (hindi["students"], hindi["with_marks"], hindi["average_percent"]) == (8, 6, 60.83)   # Giri's AB is not counted
    science = subjects["Science"]
    assert (science["students"], science["with_marks"], science["average_percent"]) == (7, 6, 60.83)

    classes = by_key(data["classes"], "name")
    assert list(classes) == ["5-A", "6-A"]
    five = classes["5-A"]
    assert five["average_percent"] == 51.67
    cell = five["subjects"][str(env.subjects["Mathematics"])]
    assert cell == {"taught": True, "average_percent": 33.33, "with_marks": 6}
    six = classes["6-A"]
    assert six["subjects"][str(env.subjects["Science"])] == {"taught": False, "average_percent": None, "with_marks": 0}
    giri_hindi = six["subjects"][str(env.subjects["Hindi"])]
    assert giri_hindi == {"taught": True, "average_percent": None, "with_marks": 0}      # only AB: nothing to average

    assert data["bottlenecks"] == [{"class_section_id": env.sections["5-A"], "class": "5-A",
                                    "subject_id": env.subjects["Mathematics"], "subject": "Mathematics",
                                    "average_percent": 33.33, "class_average": 51.67, "gap": 18.34}]
    assert {r["key"] for r in data["tag_rules"]} >= {"weak_subject", "high_spread"}


def test_subject_comparison_for_a_grade_and_with_all_exams(env):
    six = env.compare("Terminal", "grade=6").json()
    assert [c["name"] for c in six["classes"]] == ["6-A"] and six["grade"] == "6"
    assert [s["name"] for s in six["subjects"]] == ["Mathematics", "Hindi"]              # only what class 6 teaches
    assert six["bottlenecks"] == []
    none = env.compare("Terminal", "grade=12").json()
    assert none["classes"] == [] and none["subjects"] == [] and none["bottlenecks"] == []
    combined = env.compare().json()
    assert combined["exam"] is None and combined["subjects"][0]["name"] == "Mathematics"


def test_exam_without_marks_gives_no_averages_and_no_bottlenecks(env):
    data = env.compare("Annual").json()
    assert all(s["average_percent"] is None and s["with_marks"] == 0 for s in data["subjects"])
    assert all(sum(s["buckets"].values()) == 0 for s in data["subjects"])          # nothing entered: not "all at risk"
    assert data["bottlenecks"] == [] and all(c["average_percent"] is None for c in data["classes"])


def test_class_diagnostics_class_summary_and_tags(env):
    data = env.diag("5-A", "Terminal").json()
    summary = data["summary"]
    assert summary["average_percent"] == 51.67 and 28.8 <= summary["spread"] <= 29.0
    assert (summary["attendance_rate"], summary["attendance_days"], summary["school_attendance_rate"]) == (86.1, 36, 92.2)
    assert summary["follow_up_students"] == 4
    tags = by_key(data["tags"], "key")
    assert set(tags) == {"weak_subject", "high_spread", "attendance_gap"}
    assert tags["weak_subject"]["label"] == "Weak subject: Mathematics"
    assert tags["weak_subject"]["reason"] == "Mathematics average 33.33% is 18.34 points below the class average 51.67%"
    assert tags["attendance_gap"]["reason"] == "Class attendance 86.1% is 6.1 points below the school rate 92.2%"
    subjects = by_key(data["subjects"], "name")
    assert (subjects["Mathematics"]["average_percent"], subjects["Mathematics"]["with_marks"]) == (33.33, 6)


def test_class_diagnostics_students(env):
    students = by_key(env.diag("5-A", "Terminal").json()["students"], "name")
    assert [s["name"] for s in env.diag("5-A", "Terminal").json()["students"]] == [
        "Asha", "Bina", "Chitra", "Dev", "Esha", "Farah", "Gita"]

    chitra = students["Chitra"]
    assert [t["key"] for t in chitra["tags"]] == ["low_attendance"]
    assert chitra["tags"][0]["reason"] == "Attendance is 66.7% over 12 days (limit 75%)"
    assert chitra["bucket"] == "at_risk" and chitra["needs_follow_up"] is True

    farah = students["Farah"]
    assert [t["key"] for t in farah["tags"]] == ["subject_gap"]
    assert farah["tags"][0]["reason"] == "Mathematics 10% is 55 points below overall 65%"
    assert {s["name"]: s["percent"] for s in farah["subjects"]} == {"Mathematics": 10.0, "Hindi": 90.0, "Science": 95.0}

    dev = students["Dev"]
    assert dev["tags"] == [] and dev["bucket"] == "at_risk" and dev["needs_follow_up"] is True   # follow-up without a tag
    assert students["Esha"]["bucket"] == "borderline" and students["Esha"]["needs_follow_up"] is True
    for name in ("Asha", "Bina"):
        assert students[name]["tags"] == [] and students[name]["needs_follow_up"] is False

    gita = students["Gita"]       # no marks and no attendance: nothing to say, and not a zero
    assert (gita["percent"], gita["bucket"], gita["tags"], gita["needs_follow_up"]) == (None, None, [], False)
    assert all(s["percent"] is None for s in gita["subjects"])


def test_attendance_tags_do_not_depend_on_the_exam(env):
    data = env.diag("5-A", "Annual").json()                        # no marks entered for this exam
    assert data["summary"]["average_percent"] is None
    assert [t["key"] for t in data["tags"]] == ["attendance_gap"]        # no weak subject or spread without marks
    chitra = by_key(data["students"], "name")["Chitra"]
    assert [t["key"] for t in chitra["tags"]] == ["low_attendance"] and chitra["bucket"] is None


def test_small_class_gets_no_spread_or_attendance_gap_tag(env):
    data = env.diag("6-A", "Terminal").json()
    assert data["tags"] == []                                       # one student, school rate above the class rate by 0
    assert by_key(data["students"], "name")["Giri"]["percent"] == 50.0


def test_subject_comparison_is_for_the_admin_only(env):
    for user in (TEACHER_5A, CLERK):
        env.as_user(user)
        assert env.compare().status_code == 403
    del env.app.dependency_overrides[get_current_active_user_from_any_source]
    assert env.compare().status_code in (401, 403)


def test_teachers_see_diagnostics_of_their_own_class_only(env):
    env.as_user(TEACHER_5A)
    assert env.diag("5-A").status_code == 200 and env.diag("6-A").status_code == 403
    env.as_user(TEACHER_6A)
    assert env.diag("6-A").status_code == 200 and env.diag("5-A").status_code == 403
    env.as_user(CLERK)
    assert env.diag("5-A").status_code == 403
    del env.app.dependency_overrides[get_current_active_user_from_any_source]
    assert env.diag("5-A").status_code in (401, 403)


def test_unknown_class_exam_or_session_is_404(env):
    assert env.client.get("/api/analytics/classes/99999/diagnostics").status_code == 404
    assert env.client.get("/api/analytics/subjects?exam_id=99999").status_code == 404
    assert env.client.get(f"/api/analytics/classes/{env.sections['5-A']}/diagnostics?exam_id=99999").status_code == 404
    engine = sa.create_engine(f"sqlite:///{env.db_file}")
    with engine.begin() as conn:
        conn.execute(sa.text("UPDATE academic_years SET is_current = 0"))
    engine.dispose()
    assert env.compare().status_code == 404
