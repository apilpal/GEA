"""Academic and finance tables for the school (roadmap Phase 1, issue #29).

All tables share the application's ``Base`` so ``alembic`` and ``create_all`` see
them. Money is stored as whole rupees (INR) in integer columns. Dates are real
``Date`` columns. Rules these tables encode are documented in
``docs/planning/02-data-rules-and-roles.md``.
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from datetime import datetime

from .models import Base

ATTENDANCE_STATUSES = ("present", "absent", "late", "leave")
EXAM_NAMES = ("Terminal", "Half-yearly", "Annual")
FEE_TYPES = ("tuition", "van", "exam", "other")


class DBAcademicYear(Base):
    """One school session, e.g. ``2026-27`` (April to March)."""

    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True)
    name = Column(String(9), nullable=False, unique=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, nullable=False, default=False)

    __table_args__ = (CheckConstraint("end_date > start_date", name="ck_academic_year_dates"),)


class DBTeacher(Base):
    """A teacher profile, optionally linked to a login."""

    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)
    name = Column(String(100), nullable=False, index=True)
    mobile = Column(String(15), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


class DBRoute(Base):
    """A transport route with its monthly van fee."""

    __tablename__ = "routes"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True, index=True)
    monthly_fee = Column(Integer, nullable=False, default=0)

    __table_args__ = (CheckConstraint("monthly_fee >= 0", name="ck_route_fee"),)


class DBClassSection(Base):
    """A grade plus section within one academic year (e.g. ``5`` / ``A``)."""

    __tablename__ = "class_sections"

    id = Column(Integer, primary_key=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    grade = Column(String(10), nullable=False)
    section = Column(String(5), nullable=False, default="A")
    class_teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("academic_year_id", "grade", "section", name="uq_class_section"),
    )


class DBSubject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)


class DBClassSubject(Base):
    """A subject taught in a class-section, with its teacher."""

    __tablename__ = "class_subjects"

    id = Column(Integer, primary_key=True)
    class_section_id = Column(Integer, ForeignKey("class_sections.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("class_section_id", "subject_id", name="uq_class_subject"),
    )


class DBHoliday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, unique=True)
    name = Column(String(100), nullable=False)


class DBAttendance(Base):
    """One attendance entry per student per date."""

    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_section_id = Column(Integer, ForeignKey("class_sections.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(10), nullable=False)
    remark = Column(String(200), nullable=True)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),
        CheckConstraint("status IN ('present','absent','late','leave')", name="ck_attendance_status"),
        Index("ix_attendance_class_date", "class_section_id", "date"),
    )


class DBExam(Base):
    """Terminal, Half-yearly or Annual exam of an academic year."""

    __tablename__ = "exams"

    id = Column(Integer, primary_key=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    name = Column(String(20), nullable=False)
    ordinal = Column(Integer, nullable=False)
    max_marks = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("academic_year_id", "name", name="uq_exam_year_name"),
        CheckConstraint("name IN ('Terminal','Half-yearly','Annual')", name="ck_exam_name"),
        CheckConstraint("max_marks > 0", name="ck_exam_max"),
    )


class DBAssessmentScore(Base):
    """Marks of one student in one subject for one exam part (I or II)."""

    __tablename__ = "assessment_scores"

    id = Column(Integer, primary_key=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    part = Column(Integer, nullable=False, default=1)
    marks = Column(Numeric(6, 2), nullable=True)
    max_marks = Column(Integer, nullable=False)
    is_absent = Column(Boolean, nullable=False, default=False)
    entered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "subject_id", "part", name="uq_score_entry"),
        CheckConstraint("part IN (1, 2)", name="ck_score_part"),
        CheckConstraint("max_marks > 0", name="ck_score_max"),
        CheckConstraint("marks IS NULL OR (marks >= 0 AND marks <= max_marks)", name="ck_score_bounds"),
        CheckConstraint("NOT (is_absent AND marks IS NOT NULL)", name="ck_score_absent_no_marks"),
        Index("ix_score_student", "student_id"),
        Index("ix_score_subject_exam", "subject_id", "exam_id"),
    )


class DBFeeInvoice(Base):
    """An amount owed by a student for one fee type and period (``YYYY-MM``)."""

    __tablename__ = "fee_invoices"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    fee_type = Column(String(10), nullable=False)
    period = Column(String(7), nullable=False)
    amount = Column(Integer, nullable=False)
    discount = Column(Integer, nullable=False, default=0)
    discount_reason = Column(String(200), nullable=True)
    due_date = Column(Date, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "fee_type", "period", name="uq_invoice_student_type_period"),
        CheckConstraint("fee_type IN ('tuition','van','exam','other')", name="ck_invoice_type"),
        CheckConstraint("amount >= 0", name="ck_invoice_amount"),
        CheckConstraint("discount >= 0 AND discount <= amount", name="ck_invoice_discount"),
        Index("ix_invoice_due", "due_date"),
    )


class DBFeePayment(Base):
    """Money received against an invoice. Never edited; reversed by a negative row."""

    __tablename__ = "fee_payments"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("fee_invoices.id"), nullable=False, index=True)
    receipt_no = Column(String(20), nullable=False, unique=True)
    amount = Column(Integer, nullable=False)
    paid_on = Column(Date, nullable=False)
    method = Column(String(10), nullable=False, default="cash")
    reversal_of_id = Column(Integer, ForeignKey("fee_payments.id"), nullable=True, unique=True)
    reason = Column(String(200), nullable=True)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "(reversal_of_id IS NULL AND amount > 0) OR (reversal_of_id IS NOT NULL AND amount < 0)",
            name="ck_payment_sign",
        ),
        CheckConstraint("method IN ('cash','upi','bank','other')", name="ck_payment_method"),
    )
