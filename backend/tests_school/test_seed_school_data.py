"""The realistic school seed (issue #30): scale, repeatability, safety and sample reports.

Run from backend/:   python -m pytest tests_school -q --noconftest
"""
from collections import Counter
from datetime import date

import pytest
import sqlalchemy as sa
from sqlalchemy.orm import Session

import seed_school_data as seed_module

from .helpers import migrate


@pytest.fixture
def engine(tmp_path):
    path = tmp_path / "school.db"
    migrate(path)
    eng = sa.create_engine(f"sqlite:///{path}")
    yield eng
    eng.dispose()


def run_seed(engine):
    with Session(engine) as session:
        return seed_module.seed(session)


def q(engine, sql, **params):
    with engine.connect() as conn:
        return conn.execute(sa.text(sql), params).fetchall()


def test_seed_has_the_planned_scale(engine):
    result = run_seed(engine)
    assert result["students"] == 521 == seed_module.TOTAL_STUDENTS
    assert result["teachers"] == 30
    assert result["routes"] == 5
    assert result["riders"] == 100
    for grade, section, size in seed_module.CLASS_SIZES:
        n = q(engine, "SELECT COUNT(*) FROM students s JOIN class_sections c ON c.id = s.class_section_id "
                      "WHERE c.grade = :g AND c.section = :s AND s.admission_no LIKE 'DEMO-%'",
              g=grade, s=section)[0][0]
        assert n == size, f"class {grade}-{section}"
    assert q(engine, "SELECT COUNT(*) FROM students WHERE admission_no LIKE 'DEMO-%' "
                     "AND class_ IN ('P.G','L.K.G.','U.K.G.')")[0][0] == 161
    assert q(engine, "SELECT COUNT(*) FROM students WHERE admission_no LIKE 'DEMO-%' "
                     "AND class_ NOT IN ('P.G','L.K.G.','U.K.G.')")[0][0] == 360


def test_running_the_seed_twice_changes_nothing(engine):
    first = run_seed(engine)
    tables = ["students", "attendance", "assessment_scores", "fee_invoices", "fee_payments",
              "class_sections", "class_subjects", "teachers", "routes", "drivers", "subjects"]
    before = {t: q(engine, f"SELECT COUNT(*) FROM {t}")[0][0] for t in tables}
    second = run_seed(engine)
    after = {t: q(engine, f"SELECT COUNT(*) FROM {t}")[0][0] for t in tables}
    assert first == second
    assert before == after


def test_real_records_are_never_touched(engine):
    with engine.begin() as conn:
        conn.execute(sa.text(
            "INSERT INTO students (name, mobile, class_, status, created_at, updated_at, admission_no) "
            "VALUES ('Real Student', '9876500000', '3', 'active', 1, 1, 'ADM-REAL-1')"))
    run_seed(engine)
    assert q(engine, "SELECT COUNT(*) FROM students WHERE name = 'Real Student'")[0][0] == 1
    with Session(engine) as session:
        removed = seed_module.reset_demo(session)
    assert removed["students_removed"] == 521
    assert q(engine, "SELECT COUNT(*) FROM students")[0][0] == 1
    assert q(engine, "SELECT name FROM students")[0][0] == "Real Student"
    assert q(engine, "SELECT COUNT(*) FROM fee_invoices")[0][0] == 0


def test_demo_data_can_be_reseeded_after_reset(engine):
    run_seed(engine)
    with Session(engine) as session:
        seed_module.reset_demo(session)
    assert run_seed(engine)["students"] == 521


def test_reports_would_not_be_empty(engine):
    result = run_seed(engine)
    for key in ("attendance", "scores", "invoices", "payments"):
        assert result[key] > 0, key
    statuses = {r[0] for r in q(engine, "SELECT DISTINCT status FROM attendance")}
    assert statuses == {"present", "absent", "late", "leave"}
    assert q(engine, "SELECT COUNT(*) FROM assessment_scores WHERE is_absent = 1")[0][0] > 0
    overdue = q(engine, "SELECT COUNT(*) FROM fee_invoices i WHERE i.due_date <= '2026-11-15' AND "
                        "i.amount - i.discount > COALESCE((SELECT SUM(amount) FROM fee_payments p "
                        "WHERE p.invoice_id = i.id), 0)")[0][0]
    assert overdue > 0


def test_attendance_follows_the_working_week(engine):
    run_seed(engine)
    for (day,) in q(engine, "SELECT DISTINCT date FROM attendance"):
        d = date.fromisoformat(day)
        assert d.weekday() != 6, "no attendance on Sundays"
        assert str(d) != "2026-10-02", "no attendance on a listed holiday"
    saturdays = [r for r in q(engine, "SELECT DISTINCT date FROM attendance")
                 if date.fromisoformat(r[0]).weekday() == 5]
    assert saturdays, "Saturday is a working day"


def test_fee_totals_match_independent_calculation(engine):
    run_seed(engine)
    expected_tuition = sum(size * seed_module.TUITION[grade] * len(seed_module.FEE_MONTHS)
                           for grade, _, size in seed_module.CLASS_SIZES)
    billed = q(engine, "SELECT SUM(amount) FROM fee_invoices WHERE fee_type = 'tuition'")[0][0]
    assert billed == expected_tuition
    # no payment is bigger than what is owed on its invoice
    over = q(engine, "SELECT COUNT(*) FROM fee_invoices i WHERE "
                     "COALESCE((SELECT SUM(amount) FROM fee_payments p WHERE p.invoice_id = i.id), 0) "
                     "> i.amount - i.discount")[0][0]
    assert over == 0
    receipts = [r[0] for r in q(engine, "SELECT receipt_no FROM fee_payments")]
    assert len(receipts) == len(set(receipts))


def test_three_children_rule_gives_the_last_admitted_child_free_tuition(engine):
    run_seed(engine)
    by_mobile = {}
    for mobile, admission in q(engine, "SELECT mobile, admission_no FROM students WHERE admission_no LIKE 'DEMO-%'"):
        by_mobile.setdefault(mobile, []).append(admission)
    triples = {m: sorted(a) for m, a in by_mobile.items() if len(a) == 3}
    pairs = [m for m, a in by_mobile.items() if len(a) == 2]
    assert len(triples) == seed_module.THREE_CHILD_FAMILIES
    assert len(pairs) == seed_module.TWO_CHILD_FAMILIES
    free = {r[0] for r in q(engine, "SELECT s.admission_no FROM fee_invoices i JOIN students s ON s.id = i.student_id "
                                    "WHERE i.fee_type = 'tuition' AND i.discount = i.amount AND i.amount > 0")}
    assert free == {admissions[-1] for admissions in triples.values()}


def test_upper_classes_have_two_papers_for_hindi(engine):
    run_seed(engine)
    parts = Counter(r[0] for r in q(
        engine, "SELECT sc.part FROM assessment_scores sc JOIN students s ON s.id = sc.student_id "
                "JOIN subjects su ON su.id = sc.subject_id WHERE su.name = 'Hindi' AND s.class_ = '7'"))
    assert set(parts) == {1, 2}
    parts_lower = {r[0] for r in q(
        engine, "SELECT sc.part FROM assessment_scores sc JOIN students s ON s.id = sc.student_id "
                "JOIN subjects su ON su.id = sc.subject_id WHERE su.name = 'Hindi' AND s.class_ = '2'")}
    assert parts_lower == {1}
