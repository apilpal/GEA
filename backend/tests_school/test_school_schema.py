"""Schema tests for the school tables (issue #29).

Run from backend/:   python -m pytest tests_school -q
Each test builds a throw-away SQLite file, so no real data is touched.
"""
import sqlite3
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config

BACKEND = Path(__file__).resolve().parent.parent

NEW_TABLES = {
    "academic_years", "teachers", "routes", "class_sections", "subjects", "class_subjects",
    "holidays", "exams", "attendance", "assessment_scores", "fee_invoices", "fee_payments",
}


def alembic_config(db_path: Path) -> Config:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
    return cfg


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")  # SQLite ignores foreign keys unless asked
    return conn


@pytest.fixture
def fresh_db(tmp_path):
    path = tmp_path / "fresh.db"
    command.upgrade(alembic_config(path), "head")
    return path


@pytest.fixture
def old_db(tmp_path):
    """A database in the shape the old create_all setup produced, with real-looking rows."""
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE students (
            id INTEGER PRIMARY KEY, route VARCHAR(50), name VARCHAR(100) NOT NULL,
            father_name VARCHAR(100), mobile VARCHAR(15), class_ VARCHAR(20),
            address VARCHAR(200), fees FLOAT, status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE (mobile));
        CREATE TABLE drivers (
            id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, route VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'active', vehicle_number VARCHAR(20) UNIQUE,
            contact_number VARCHAR(15) UNIQUE, license_number VARCHAR(20) UNIQUE,
            experience_years INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
        CREATE TABLE users (
            id INTEGER PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE, hashed_password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL, is_active BOOLEAN NOT NULL, is_bypass_user BOOLEAN NOT NULL,
            created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL);
        INSERT INTO students VALUES (1,'Route 1','Test Student A','Test Parent','9000000001','4th','Test Village',500,'active',1,1);
        INSERT INTO students VALUES (2,'Route 1','Test Student B','Test Parent','9000000002','5','Test Village',500,'active',1,1);
        INSERT INTO students VALUES (3,NULL,'Test Student C',NULL,NULL,NULL,NULL,0,'active',1,1);
        INSERT INTO drivers VALUES (1,'Test Driver','Route 1','active','UP00 0000',NULL,NULL,3,1,1);
        INSERT INTO users VALUES (1,'admin','admin@example.com','x','admin',1,0,'2026-01-01','2026-01-01');
        """
    )
    conn.commit()
    conn.close()
    command.upgrade(alembic_config(path), "head")
    return path


def test_fresh_database_has_all_tables(fresh_db):
    tables = set(sa.inspect(sa.create_engine(f"sqlite:///{fresh_db}")).get_table_names())
    assert NEW_TABLES <= tables
    assert {"students", "drivers", "users", "chat_messages"} <= tables


def test_students_has_school_columns(fresh_db):
    cols = {c["name"] for c in sa.inspect(sa.create_engine(f"sqlite:///{fresh_db}")).get_columns("students")}
    assert {"class_section_id", "route_id", "admission_no", "sr_no", "roll_no",
            "mother_name", "dob", "house", "village"} <= cols


def test_upgrade_is_repeatable(fresh_db):
    command.upgrade(alembic_config(fresh_db), "head")  # second run does nothing and does not fail


def test_existing_records_survive_and_are_mapped(old_db):
    conn = connect(old_db)
    assert conn.execute("SELECT COUNT(*) FROM students").fetchone()[0] == 3
    assert conn.execute("SELECT COUNT(*) FROM drivers").fetchone()[0] == 1
    assert conn.execute("SELECT username FROM users").fetchone()[0] == "admin"
    # '4th' is normalised to grade '4'; routes and sections are created from the old text
    grades = {r[0] for r in conn.execute("SELECT grade FROM class_sections")}
    assert grades == {"4", "5"}
    route = conn.execute("SELECT id, driver_id FROM routes WHERE name = 'Route 1'").fetchone()
    assert route is not None and route[1] == 1
    assert conn.execute("SELECT route_id FROM students WHERE id = 1").fetchone()[0] == route[0]
    assert conn.execute("SELECT route_id, class_section_id FROM students WHERE id = 3").fetchone() == (None, None)
    assert conn.execute("SELECT COUNT(*) FROM exams").fetchone()[0] == 3
    assert conn.execute("SELECT mother_name FROM students WHERE id = 1").fetchone()[0] is None


def test_siblings_can_share_a_mobile_number(old_db):
    conn = connect(old_db)
    conn.execute("UPDATE students SET mobile = '9000000001' WHERE id = 2")  # was UNIQUE before
    conn.commit()


def test_admission_number_is_unique(fresh_db):
    conn = connect(fresh_db)
    ins = "INSERT INTO students (name, status, created_at, updated_at, admission_no) VALUES (?, 'active', 1, 1, ?)"
    conn.execute(ins, ("A", "ADM-1"))
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(ins, ("B", "ADM-1"))


def _student(conn) -> int:
    return conn.execute(
        "INSERT INTO students (name, status, created_at, updated_at) VALUES ('S', 'active', 1, 1)"
    ).lastrowid


def _section(conn) -> int:
    year = conn.execute("INSERT INTO academic_years (name, start_date, end_date, is_current) "
                        "VALUES ('2030-31','2030-04-01','2031-03-31',0)").lastrowid
    return conn.execute("INSERT INTO class_sections (academic_year_id, grade, section) "
                        "VALUES (?, '5', 'A')", (year,)).lastrowid


def test_attendance_one_row_per_student_per_day(fresh_db):
    conn = connect(fresh_db)
    sid, cid = _student(conn), _section(conn)
    ins = "INSERT INTO attendance (student_id, class_section_id, date, status, created_at) VALUES (?, ?, '2026-11-23', ?, '2026-11-23')"
    conn.execute(ins, (sid, cid, "present"))
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(ins, (sid, cid, "absent"))
    with pytest.raises(sqlite3.IntegrityError):  # status must be one of the four values
        conn.execute("INSERT INTO attendance (student_id, class_section_id, date, status, created_at) "
                     "VALUES (?, ?, '2026-11-24', 'sick', '2026-11-24')", (sid, cid))


def test_foreign_keys_are_enforced(fresh_db):
    conn = connect(fresh_db)
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO attendance (student_id, class_section_id, date, status, created_at) "
                     "VALUES (9999, 9999, '2026-11-23', 'present', '2026-11-23')")


def test_class_section_is_unique_per_year(fresh_db):
    conn = connect(fresh_db)
    year = conn.execute("INSERT INTO academic_years (name, start_date, end_date, is_current) "
                        "VALUES ('2031-32','2031-04-01','2032-03-31',0)").lastrowid
    ins = "INSERT INTO class_sections (academic_year_id, grade, section) VALUES (?, '3', 'A')"
    conn.execute(ins, (year,))
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(ins, (year,))


def test_marks_rules(fresh_db):
    conn = connect(fresh_db)
    sid = _student(conn)
    exam = conn.execute("SELECT id FROM exams WHERE name = 'Terminal'").fetchone()[0]
    subject = conn.execute("SELECT id FROM subjects WHERE name = 'Hindi'").fetchone()[0]
    ins = ("INSERT INTO assessment_scores (exam_id, student_id, subject_id, part, marks, max_marks, is_absent, created_at) "
           "VALUES (?, ?, ?, ?, ?, 40, ?, '2026-11-23')")
    conn.execute(ins, (exam, sid, subject, 1, 35.5, 0))
    with pytest.raises(sqlite3.IntegrityError):  # same student, subject, exam, part again
        conn.execute(ins, (exam, sid, subject, 1, 30, 0))
    with pytest.raises(sqlite3.IntegrityError):  # mark above maximum
        conn.execute(ins, (exam, sid, subject, 2, 41, 0))
    with pytest.raises(sqlite3.IntegrityError):  # negative mark
        conn.execute(ins, (exam, sid, subject, 2, -1, 0))
    with pytest.raises(sqlite3.IntegrityError):  # absent candidates carry no marks
        conn.execute(ins, (exam, sid, subject, 2, 10, 1))
    conn.execute(ins, (exam, sid, subject, 2, None, 1))  # absent with no mark is allowed


def test_invoice_and_payment_rules(fresh_db):
    conn = connect(fresh_db)
    sid = _student(conn)
    year = conn.execute("SELECT id FROM academic_years").fetchone()[0]  # seeded by the migration
    inv = ("INSERT INTO fee_invoices (student_id, academic_year_id, fee_type, period, amount, discount, due_date, created_at) "
           "VALUES (?, ?, 'tuition', ?, ?, ?, '2026-12-15', '2026-12-01')")
    iid = conn.execute(inv, (sid, year, "2026-12", 600, 100)).lastrowid
    with pytest.raises(sqlite3.IntegrityError):  # one tuition invoice per student per month
        conn.execute(inv, (sid, year, "2026-12", 600, 0))
    with pytest.raises(sqlite3.IntegrityError):  # discount cannot exceed the amount
        conn.execute(inv, (sid, year, "2027-01", 600, 700))

    pay = ("INSERT INTO fee_payments (invoice_id, receipt_no, amount, paid_on, reversal_of_id, created_at) "
           "VALUES (?, ?, ?, '2026-12-10', ?, '2026-12-10')")
    pid = conn.execute(pay, (iid, "GEA-2026-000001", 400, None)).lastrowid
    with pytest.raises(sqlite3.IntegrityError):  # receipt numbers are unique
        conn.execute(pay, (iid, "GEA-2026-000001", 50, None))
    with pytest.raises(sqlite3.IntegrityError):  # a normal payment must be positive
        conn.execute(pay, (iid, "GEA-2026-000002", -50, None))
    conn.execute(pay, (iid, "GEA-2026-000003", -400, pid))  # reversal is negative and linked
    with pytest.raises(sqlite3.IntegrityError):  # a payment can be reversed only once
        conn.execute(pay, (iid, "GEA-2026-000004", -400, pid))


def test_models_match_migrations(fresh_db):
    """Every table and column in the SQLAlchemy models exists after migrating (catches drift)."""
    from src.core.models import Base, chat_models  # noqa: F401

    inspector = sa.inspect(sa.create_engine(f"sqlite:///{fresh_db}"))
    for name, table in Base.metadata.tables.items():
        assert inspector.has_table(name), f"table {name} is missing from the migrations"
        have = {c["name"] for c in inspector.get_columns(name)}
        want = {c.name for c in table.columns}
        assert want <= have, f"{name}: columns missing from migrations: {want - have}"
