"""CSV exports (issue #39): rules and API.

Run from backend/:   python -m pytest tests_school/test_exports_api.py -q --noconftest
"""
import csv
import io
from datetime import date

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from src.api.v1.routers import exports
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (DBAssessmentScore, DBAttendance, DBClassSection, DBExam, DBFeeInvoice,
                                           DBFeePayment, DBRoute, DBSubject, DBTeacher)
from src.services.csv_rules import BOM, file_name, marks_cell, safe_cell, to_csv
from src.utils.auth_utils import get_current_active_user_from_any_source

from .helpers import async_url, migrate

TODAY = date(2026, 11, 26)
ADMIN = User(id=1, username="admin", email="a@example.test", role=UserRole.ADMIN)
TEACHER = User(id=2, username="ta", email="ta@example.test", role=UserRole.TEACHER)
OTHER_TEACHER = User(id=3, username="tb", email="tb@example.test", role=UserRole.TEACHER)
CLERK = User(id=4, username="clerk", email="c@example.test", role=UserRole.ACCOUNTANT)
DRIVER = User(id=6, username="drv", email="d@example.test", role=UserRole.DRIVER)


# ---- the rules on their own ----------------------------------------------------------------

def test_safe_cell_blocks_formulas_but_keeps_numbers():
    assert safe_cell("=1+1") == "'=1+1"
    assert safe_cell("+91 90000") == "'+91 90000"
    assert safe_cell("-x") == "'-x"
    assert safe_cell("@SUM(A1)") == "'@SUM(A1)"
    assert safe_cell("Asha") == "Asha"
    assert safe_cell(-400) == -400                  # a reversed amount is a number, not text
    assert safe_cell(None) == ""
    assert safe_cell(True) == "Yes"


def test_marks_cell_never_writes_zero_for_absent_or_missing():
    assert marks_cell(None, True) == "AB"
    assert marks_cell(0, True) == "AB"
    assert marks_cell(None, False) == ""
    assert marks_cell(18.5, False) == 18.5
    assert marks_cell(20.0, False) == 20
    assert marks_cell(0, False) == 0                # a real zero stays a zero


def test_to_csv_has_bom_header_and_quotes_commas():
    text = to_csv(["A", "B"], [["x, y", 3]])
    assert text.startswith(BOM)
    assert text[1:].split("\r\n")[0] == "A,B"
    assert list(csv.reader(io.StringIO(text[1:])))[1] == ["x, y", "3"]


def test_file_name_is_plain():
    assert file_name("marks", "5-A", "Half-yearly") == "gea-marks-5-A-Half-yearly.csv"
    assert file_name("fees", "", "") == "gea-fees.csv"
    assert "/" not in file_name("students", "../x y") and " " not in file_name("students", "../x y")


# ---- the API --------------------------------------------------------------------------------

@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setattr(exports, "today", lambda: TODAY)
    db_file = tmp_path / "school.db"
    migrate(db_file)
    engine = sa.create_engine(f"sqlite:///{db_file}")
    with Session(engine) as s:
        year_id = s.scalar(sa.text("SELECT id FROM academic_years WHERE is_current = 1"))
        t_a = DBTeacher(user_id=TEACHER.id, name="Teacher A")
        t_b = DBTeacher(user_id=OTHER_TEACHER.id, name="Teacher B")
        s.add_all([t_a, t_b])
        s.flush()
        sec5 = DBClassSection(academic_year_id=year_id, grade="5", section="A", class_teacher_id=t_a.id)
        sec6 = DBClassSection(academic_year_id=year_id, grade="6", section="A", class_teacher_id=t_b.id)
        north = DBRoute(name="North Route", monthly_fee=400)
        # The migration already seeds the subjects and the exams: use them, as the scorecard tests do.
        maths = s.scalar(sa.select(DBSubject).where(DBSubject.name == "Mathematics")) or DBSubject(name="Mathematics")
        exam = s.scalar(sa.select(DBExam).where(DBExam.academic_year_id == year_id, DBExam.name == "Terminal"))
        s.add_all([sec5, sec6, north, maths])
        s.flush()
        assert exam is not None

        def person(name, section, roll, **kw):
            st = DBStudent(name=name, class_section_id=section.id, roll_no=roll, father_name=f"Father of {name}",
                           admission_no=f"S-{roll}-{section.grade}", created_at=0, updated_at=0, **kw)
            s.add(st)
            s.flush()
            return st

        asha = person("Asha", sec5, 1, route_id=north.id, mobile="9000000001")
        bina = person("=Bina", sec5, 2)               # a name that looks like a formula
        dev = person("Dev", sec6, 1)

        for student, marks, absent in ((asha, 32, False), (bina, None, True), (dev, 22, False)):
            s.add(DBAssessmentScore(exam_id=exam.id, student_id=student.id, subject_id=maths.id, part=1, marks=marks,
                                    max_marks=40, is_absent=absent))
        for student, status in ((asha, "present"), (bina, "absent"), (dev, "late")):
            s.add(DBAttendance(student_id=student.id, class_section_id=student.class_section_id,
                               date=date(2026, 11, 10), status=status))
        s.add(DBAttendance(student_id=asha.id, class_section_id=sec5.id, date=date(2026, 11, 11), status="present"))

        def invoice(student, kind, period, amount, discount=0):
            row = DBFeeInvoice(student_id=student.id, academic_year_id=year_id, fee_type=kind, period=period,
                               amount=amount, discount=discount, due_date=date(2026, int(period[5:]), 15))
            s.add(row)
            s.flush()
            return row

        paid_inv = invoice(asha, "tuition", "2026-10", 600)
        s.add(DBFeePayment(invoice_id=paid_inv.id, receipt_no="R-000001", amount=600, paid_on=date(2026, 10, 10)))
        part_inv = invoice(asha, "tuition", "2026-11", 600)
        s.add(DBFeePayment(invoice_id=part_inv.id, receipt_no="R-000002", amount=200, paid_on=date(2026, 11, 20)))
        invoice(bina, "tuition", "2026-10", 600, discount=100)
        van = invoice(dev, "van", "2026-10", 400)
        s.flush()
        first = DBFeePayment(invoice_id=van.id, receipt_no="R-000003", amount=400, paid_on=date(2026, 10, 12))
        s.add(first)
        s.flush()
        s.add(DBFeePayment(invoice_id=van.id, receipt_no="R-000003-X", amount=-400, paid_on=date(2026, 10, 20),
                           reversal_of_id=first.id, reason="wrong entry"))
        s.commit()
        ids = {"5-A": sec5.id, "6-A": sec6.id, "exam": exam.id}

    async_engine = create_async_engine(async_url(db_file), poolclass=NullPool)
    maker = async_sessionmaker(async_engine)

    async def override_db():
        async with maker() as session:
            yield session

    app = FastAPI()
    app.include_router(exports.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db

    class Env:
        pass

    e = Env()
    e.ids = ids
    e.as_user = lambda user: app.dependency_overrides.__setitem__(get_current_active_user_from_any_source, lambda: user)
    e.client = TestClient(app, raise_server_exceptions=False)
    yield e
    e.client.close()


def table(response):
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    return list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))


def test_students_export_for_admin_and_clerk(env):
    for user in (ADMIN, CLERK):
        env.as_user(user)
        rows = table(env.client.get("/api/exports/students.csv"))
        assert rows[0][:3] == ["Admission no", "Name", "Class"]
        assert [r[1] for r in rows[1:]] == ["Asha", "'=Bina", "Dev"]        # class then roll; formula made harmless
        assert rows[1][2] == "5-A" and rows[1][7] == "North Route"
    one = table(env.client.get("/api/exports/students.csv", params={"class_section_id": env.ids["6-A"]}))
    assert [r[1] for r in one[1:]] == ["Dev"]


def test_students_export_for_teacher_needs_own_class(env):
    env.as_user(TEACHER)
    assert env.client.get("/api/exports/students.csv").status_code == 403
    assert env.client.get("/api/exports/students.csv", params={"class_section_id": env.ids["6-A"]}).status_code == 403
    rows = table(env.client.get("/api/exports/students.csv", params={"class_section_id": env.ids["5-A"]}))
    assert len(rows) == 3


def test_marks_export_writes_ab_and_matches_the_total(env):
    env.as_user(ADMIN)
    rows = table(env.client.get("/api/exports/marks.csv", params={"exam_id": env.ids["exam"], "class_section_id": env.ids["5-A"]}))
    assert rows[0] == ["Class", "Roll", "Name", "Admission no", "Subject", "Part", "Marks", "Out of"]
    assert [(r[2], r[6]) for r in rows[1:]] == [("Asha", "32"), ("'=Bina", "AB")]
    assert sum(float(r[6]) for r in rows[1:] if r[6] != "AB") == 32.0


def test_marks_and_attendance_exports_are_limited_to_the_teachers_class(env):
    env.as_user(OTHER_TEACHER)
    params = {"exam_id": env.ids["exam"], "class_section_id": env.ids["5-A"]}
    assert env.client.get("/api/exports/marks.csv", params=params).status_code == 403
    assert env.client.get("/api/exports/attendance.csv", params={"class_section_id": env.ids["5-A"]}).status_code == 403
    env.as_user(TEACHER)
    assert env.client.get("/api/exports/marks.csv", params=params).status_code == 200
    env.as_user(CLERK)
    assert env.client.get("/api/exports/marks.csv", params=params).status_code == 403
    env.as_user(DRIVER)
    assert env.client.get("/api/exports/students.csv").status_code == 403


def test_attendance_export_filters_dates_and_reconciles(env):
    env.as_user(TEACHER)
    base = {"class_section_id": env.ids["5-A"]}
    everything = table(env.client.get("/api/exports/attendance.csv", params=base))
    assert len(everything) == 1 + 3
    assert [r[5] for r in everything[1:]] == ["present", "absent", "present"]
    one_day = table(env.client.get("/api/exports/attendance.csv", params={**base, "date_from": "2026-11-11", "date_to": "2026-11-11"}))
    assert [r[0] for r in one_day[1:]] == ["2026-11-11"]
    assert env.client.get("/api/exports/attendance.csv", params={**base, "date_from": "2026-11-12", "date_to": "2026-11-01"}).status_code == 422


def test_fees_export_reconciles_with_the_fee_analytics_numbers(env):
    env.as_user(CLERK)
    rows = table(env.client.get("/api/exports/fees.csv"))
    head = rows[0]
    amount, discount, paid, bal, status = (head.index(n) for n in
                                           ("Amount (Rs)", "Discount (Rs)", "Paid (Rs)", "Balance (Rs)", "Status"))
    body = rows[1:]
    assert len(body) == 4
    assert sum(int(r[amount]) for r in body) == 2200
    assert sum(int(r[discount]) for r in body) == 100
    assert sum(int(r[paid]) for r in body) == 800                          # the reversed 400 is not counted
    assert sum(int(r[bal]) for r in body) == 2200 - 100 - 800
    for r in body:
        assert int(r[amount]) - int(r[discount]) - int(r[paid]) == int(r[bal])
    by = {(r[1], r[4]): r[status] for r in body}
    assert by[("Asha", "2026-10")] == "paid"
    assert by[("Asha", "2026-11")] == "overdue"                            # due 15 Nov, today 26 Nov
    assert by[("Dev", "2026-10")] == "overdue"                             # reversed, owes again


def test_fees_export_filters_and_refuses_teachers(env):
    env.as_user(ADMIN)
    assert len(table(env.client.get("/api/exports/fees.csv", params={"fee_type": "van"}))) == 2
    assert len(table(env.client.get("/api/exports/fees.csv", params={"period": "2026-11"}))) == 2
    assert env.client.get("/api/exports/fees.csv", params={"fee_type": "bad"}).status_code == 422
    assert env.client.get("/api/exports/fees.csv", params={"period": "Nov"}).status_code == 422
    env.as_user(TEACHER)
    assert env.client.get("/api/exports/fees.csv").status_code == 403


def test_unknown_class_or_exam_is_404(env):
    env.as_user(ADMIN)
    assert env.client.get("/api/exports/students.csv", params={"class_section_id": 9999}).status_code == 404
    assert env.client.get("/api/exports/marks.csv", params={"exam_id": 9999, "class_section_id": env.ids["5-A"]}).status_code == 404
    assert env.client.get("/api/exports/marks.csv", params={"exam_id": env.ids["exam"], "class_section_id": 9999}).status_code == 404
