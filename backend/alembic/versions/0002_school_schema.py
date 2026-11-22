"""School schema: academic years, classes, subjects, attendance, exams, scores, fees.

Also extends ``students`` (class-section, route, admission/SR/roll numbers, mother's
name, date of birth, house, village) and removes the unique constraint on
``students.mobile``, because siblings share the parent's number and the
three-children discount groups students by it.

Existing students, drivers and users are kept. Existing free-text values are mapped:
``students.route`` becomes a ``routes`` row, ``students.class_`` becomes a
class-section (section ``A`` until real sections are entered; ``4th``/``7th`` are
normalised to ``4``/``7``). ``students.fees`` and the old text columns are kept.

Revision ID: 0002_school_schema
Revises: 0001_baseline
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_school_schema"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None

SUBJECTS = [
    "Hindi", "English", "Mathematics", "Science", "S.S.T.", "E.V.S.",
    "G.K.", "Computer", "Drawing", "Physical",
]
GRADE_FIX = {"4th": "4", "7th": "7"}


def upgrade() -> None:
    bind = op.get_bind()

    op.create_table(
        "academic_years",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(9), nullable=False, unique=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("is_current", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.CheckConstraint("end_date > start_date", name="ck_academic_year_dates"),
    )
    op.create_table(
        "teachers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("mobile", sa.String(15)),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_teachers_name", "teachers", ["name"])
    op.create_table(
        "routes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
        sa.Column("driver_id", sa.Integer, sa.ForeignKey("drivers.id")),
        sa.Column("monthly_fee", sa.Integer, nullable=False, server_default="0"),
        sa.CheckConstraint("monthly_fee >= 0", name="ck_route_fee"),
    )
    op.create_index("ix_routes_driver_id", "routes", ["driver_id"])
    op.create_table(
        "class_sections",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("grade", sa.String(10), nullable=False),
        sa.Column("section", sa.String(5), nullable=False, server_default="A"),
        sa.Column("class_teacher_id", sa.Integer, sa.ForeignKey("teachers.id")),
        sa.UniqueConstraint("academic_year_id", "grade", "section", name="uq_class_section"),
    )
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
    )
    op.create_table(
        "class_subjects",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("class_section_id", sa.Integer, sa.ForeignKey("class_sections.id"), nullable=False),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("teacher_id", sa.Integer, sa.ForeignKey("teachers.id")),
        sa.UniqueConstraint("class_section_id", "subject_id", name="uq_class_subject"),
    )
    op.create_index("ix_class_subjects_class_section_id", "class_subjects", ["class_section_id"])
    op.create_index("ix_class_subjects_teacher_id", "class_subjects", ["teacher_id"])
    op.create_table(
        "holidays",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("date", sa.Date, nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
    )
    op.create_table(
        "exams",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("name", sa.String(20), nullable=False),
        sa.Column("ordinal", sa.Integer, nullable=False),
        sa.Column("max_marks", sa.Integer, nullable=False),
        sa.UniqueConstraint("academic_year_id", "name", name="uq_exam_year_name"),
        sa.CheckConstraint("name IN ('Terminal','Half-yearly','Annual')", name="ck_exam_name"),
        sa.CheckConstraint("max_marks > 0", name="ck_exam_max"),
    )

    # --- rebuild students: new columns, no unique constraint on mobile ---------------
    op.create_table(
        "students_new",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("route", sa.String(50)),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("father_name", sa.String(100)),
        sa.Column("mobile", sa.String(15)),
        sa.Column("class_", sa.String(20)),
        sa.Column("address", sa.String(200)),
        sa.Column("fees", sa.Float),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.Integer, nullable=False),
        sa.Column("updated_at", sa.Integer, nullable=False),
        sa.Column("class_section_id", sa.Integer, sa.ForeignKey("class_sections.id")),
        sa.Column("route_id", sa.Integer, sa.ForeignKey("routes.id")),
        sa.Column("admission_no", sa.String(20), unique=True),
        sa.Column("sr_no", sa.String(20)),
        sa.Column("roll_no", sa.Integer),
        sa.Column("mother_name", sa.String(100)),
        sa.Column("dob", sa.Date),
        sa.Column("house", sa.String(30)),
        sa.Column("village", sa.String(100)),
    )
    op.execute(
        "INSERT INTO students_new (id, route, name, father_name, mobile, class_, address, fees, "
        "status, created_at, updated_at) "
        "SELECT id, route, name, father_name, mobile, class_, address, fees, status, "
        "created_at, updated_at FROM students"
    )
    op.drop_table("students")
    op.rename_table("students_new", "students")
    for col in ("route", "name", "father_name", "mobile", "class_", "status", "created_at",
                "updated_at", "class_section_id", "route_id", "village"):
        op.create_index(f"ix_students_{col}", "students", [col])

    # --- tables that point at students ------------------------------------------------
    op.create_table(
        "attendance",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("class_section_id", sa.Integer, sa.ForeignKey("class_sections.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("remark", sa.String(200)),
        sa.Column("marked_by", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_by", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("updated_at", sa.DateTime),
        sa.UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),
        sa.CheckConstraint("status IN ('present','absent','late','leave')", name="ck_attendance_status"),
    )
    op.create_index("ix_attendance_class_date", "attendance", ["class_section_id", "date"])
    op.create_table(
        "assessment_scores",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("exam_id", sa.Integer, sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("part", sa.Integer, nullable=False, server_default="1"),
        sa.Column("marks", sa.Numeric(6, 2)),
        sa.Column("max_marks", sa.Integer, nullable=False),
        sa.Column("is_absent", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("entered_by", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_by", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("updated_at", sa.DateTime),
        sa.UniqueConstraint("exam_id", "student_id", "subject_id", "part", name="uq_score_entry"),
        sa.CheckConstraint("part IN (1, 2)", name="ck_score_part"),
        sa.CheckConstraint("max_marks > 0", name="ck_score_max"),
        sa.CheckConstraint("marks IS NULL OR (marks >= 0 AND marks <= max_marks)", name="ck_score_bounds"),
        sa.CheckConstraint("NOT (is_absent AND marks IS NOT NULL)", name="ck_score_absent_no_marks"),
    )
    op.create_index("ix_score_student", "assessment_scores", ["student_id"])
    op.create_index("ix_score_subject_exam", "assessment_scores", ["subject_id", "exam_id"])
    op.create_table(
        "fee_invoices",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id"), nullable=False),
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("fee_type", sa.String(10), nullable=False),
        sa.Column("period", sa.String(7), nullable=False),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("discount", sa.Integer, nullable=False, server_default="0"),
        sa.Column("discount_reason", sa.String(200)),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("student_id", "fee_type", "period", name="uq_invoice_student_type_period"),
        sa.CheckConstraint("fee_type IN ('tuition','van','exam','other')", name="ck_invoice_type"),
        sa.CheckConstraint("amount >= 0", name="ck_invoice_amount"),
        sa.CheckConstraint("discount >= 0 AND discount <= amount", name="ck_invoice_discount"),
    )
    op.create_index("ix_fee_invoices_student_id", "fee_invoices", ["student_id"])
    op.create_index("ix_invoice_due", "fee_invoices", ["due_date"])
    op.create_table(
        "fee_payments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("invoice_id", sa.Integer, sa.ForeignKey("fee_invoices.id"), nullable=False),
        sa.Column("receipt_no", sa.String(20), nullable=False, unique=True),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("paid_on", sa.Date, nullable=False),
        sa.Column("method", sa.String(10), nullable=False, server_default="cash"),
        sa.Column("reversal_of_id", sa.Integer, sa.ForeignKey("fee_payments.id"), unique=True),
        sa.Column("reason", sa.String(200)),
        sa.Column("recorded_by", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.CheckConstraint(
            "(reversal_of_id IS NULL AND amount > 0) OR (reversal_of_id IS NOT NULL AND amount < 0)",
            name="ck_payment_sign",
        ),
        sa.CheckConstraint("method IN ('cash','upi','bank','other')", name="ck_payment_method"),
    )
    op.create_index("ix_fee_payments_invoice_id", "fee_payments", ["invoice_id"])

    # --- reference data and mapping of existing records ------------------------------
    year_id = bind.execute(sa.text(
        "INSERT INTO academic_years (name, start_date, end_date, is_current) "
        "VALUES ('2026-27', :s, :e, 1)"), {"s": "2026-04-01", "e": "2027-03-31"}).lastrowid
    for ordinal, (name, mx) in enumerate([("Terminal", 40), ("Half-yearly", 60), ("Annual", 100)], 1):
        bind.execute(sa.text(
            "INSERT INTO exams (academic_year_id, name, ordinal, max_marks) VALUES (:y, :n, :o, :m)"),
            {"y": year_id, "n": name, "o": ordinal, "m": mx})
    for name in SUBJECTS:
        bind.execute(sa.text("INSERT INTO subjects (name) VALUES (:n)"), {"n": name})

    rows = bind.execute(sa.text("SELECT id, class_, route FROM students")).fetchall()
    route_ids, section_ids = {}, {}
    for _sid, class_, route in rows:
        route = (route or "").strip()
        if route and route not in route_ids:
            driver = bind.execute(sa.text(
                "SELECT id FROM drivers WHERE route = :r ORDER BY id LIMIT 1"), {"r": route}).fetchone()
            route_ids[route] = bind.execute(sa.text(
                "INSERT INTO routes (name, driver_id, monthly_fee) VALUES (:n, :d, 0)"),
                {"n": route, "d": driver[0] if driver else None}).lastrowid
        grade = (class_ or "").strip()
        grade = GRADE_FIX.get(grade, grade)
        if grade and grade not in section_ids:
            section_ids[grade] = bind.execute(sa.text(
                "INSERT INTO class_sections (academic_year_id, grade, section) VALUES (:y, :g, 'A')"),
                {"y": year_id, "g": grade}).lastrowid
    for sid, class_, route in rows:
        route = (route or "").strip()
        grade = GRADE_FIX.get((class_ or "").strip(), (class_ or "").strip())
        bind.execute(sa.text(
            "UPDATE students SET route_id = :r, class_section_id = :c WHERE id = :i"),
            {"r": route_ids.get(route), "c": section_ids.get(grade), "i": sid})


def downgrade() -> None:
    raise NotImplementedError(
        "This revision rebuilds the students table. Roll back by restoring the backup "
        "taken before the upgrade (see docs/planning/03-migrations-and-recovery.md)."
    )
