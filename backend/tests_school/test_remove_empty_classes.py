"""The empty-class cleanup tool: it removes only classes nobody uses.

Run from backend/:   python -m pytest tests_school/test_remove_empty_classes.py -q --noconftest
"""
import sqlite3
from datetime import date

import sqlalchemy as sa
from sqlalchemy.orm import Session

import remove_empty_classes as tool
from src.core.models import DBStudent
from src.core.models.school_models import DBAttendance, DBClassSection, DBClassSubject, DBSubject

from .helpers import migrate


def build(tmp_path):
    db_file = tmp_path / "school.db"
    migrate(db_file)
    engine = sa.create_engine(f"sqlite:///{db_file}")
    with Session(engine) as s:
        year_id = s.scalar(sa.text("SELECT id FROM academic_years WHERE is_current = 1"))
        subject = s.scalar(sa.select(DBSubject).limit(1)) or DBSubject(name="Hindi")
        s.add(subject)
        s.flush()
        sections = {}
        for grade in ("5", "6", "9", "10", "11"):
            sections[grade] = DBClassSection(academic_year_id=year_id, grade=grade, section="A")
            s.add(sections[grade])
        s.flush()
        s.add(DBStudent(name="In Five", class_section_id=sections["5"].id, status="active", created_at=0, updated_at=0))
        s.add(DBStudent(name="Left Six", class_section_id=sections["6"].id, status="inactive", created_at=0, updated_at=0))
        kid = DBStudent(name="Moved", status="active", created_at=0, updated_at=0)
        s.add(kid)
        s.flush()
        s.add(DBAttendance(student_id=kid.id, class_section_id=sections["10"].id, date=date(2026, 10, 1), status="present"))
        for grade in ("9", "11"):
            s.add(DBClassSubject(class_section_id=sections[grade].id, subject_id=subject.id))
        s.commit()
        ids = {g: sec.id for g, sec in sections.items()}
    engine.dispose()
    return db_file, ids


def test_only_classes_nobody_uses_are_found(tmp_path):
    db_file, ids = build(tmp_path)
    conn = sqlite3.connect(db_file)
    try:
        found = tool.find_empty_sections(conn)
        grades = {grade for _, grade, _ in found}
        assert grades == {"9", "11"}      # 5 has a student, 6 an inactive student, 10 has attendance
    finally:
        conn.close()


def test_removing_deletes_the_classes_and_their_subject_lines_only(tmp_path):
    db_file, ids = build(tmp_path)
    conn = sqlite3.connect(db_file)
    try:
        assert tool.remove_sections(conn, tool.find_empty_sections(conn)) == 2
        left = {row[0] for row in conn.execute("SELECT grade FROM class_sections")}
        assert {"5", "6", "10"} <= left and not ({"9", "11"} & left)
        assert conn.execute("SELECT COUNT(*) FROM class_subjects").fetchone()[0] == 0
        assert conn.execute("SELECT COUNT(*) FROM students").fetchone()[0] == 3      # no student was touched
        assert tool.find_empty_sections(conn) == []
        assert tool.remove_sections(conn, []) == 0
    finally:
        conn.close()
