"""CSV exports (Phase 4, issue #39).

Endpoints (all under /api, each returns a .csv file that opens in Excel or Google Sheets):
- GET /exports/students.csv?class_section_id=: students (admin and office clerk: all or one class;
  a teacher must name a class they teach)
- GET /exports/marks.csv?exam_id=&class_section_id=: one row per mark entered (admin, or the class's teacher)
- GET /exports/attendance.csv?class_section_id=&date_from=&date_to=: one row per attendance record (same)
- GET /exports/fees.csv?period=&fee_type=: one row per invoice with paid and balance (admin and office clerk)

The numbers come from the same rules as the screens: absent (AB) is written as AB and never as zero,
fees are whole rupees, a reversed payment is not counted as paid, and the invoice status is derived.
Text that a spreadsheet could run as a formula is made harmless (src/services/csv_rules.py).
"""

from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.routers.scorecards import _class_name, _may_view_class
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (
    FEE_TYPES,
    DBAcademicYear,
    DBAssessmentScore,
    DBAttendance,
    DBClassSection,
    DBExam,
    DBFeeInvoice,
    DBFeePayment,
    DBRoute,
    DBSubject,
)
from src.services.csv_rules import file_name, marks_cell, to_csv
from src.services.fee_rules import balance, invoice_status
from src.utils.auth_utils import check_permissions, get_current_active_user_from_any_source

router = APIRouter()

require_fee_staff = check_permissions([UserRole.ADMIN, UserRole.ACCOUNTANT])
require_class_staff = check_permissions([UserRole.ADMIN, UserRole.TEACHER])


def today() -> date:
    """Today's date. A function so tests can replace it."""
    return date.today()


def _csv_response(text: str, name: str) -> Response:
    return Response(content=text, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}"', "Cache-Control": "no-store"})


async def _current_year(db: AsyncSession) -> DBAcademicYear:
    year = await db.scalar(select(DBAcademicYear).where(DBAcademicYear.is_current.is_(True)))
    if year is None:
        raise HTTPException(status_code=404, detail="There is no current session")
    return year


async def _class_for(db: AsyncSession, user: User, class_section_id: int) -> DBClassSection:
    section = await db.get(DBClassSection, class_section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="Class not found")
    if not await _may_view_class(db, user, section):
        raise HTTPException(status_code=403, detail="You do not teach this class")
    return section


async def _sections(db: AsyncSession) -> Dict[int, str]:
    return {s.id: _class_name(s) for s in await db.scalars(select(DBClassSection))}


@router.get("/exports/students.csv")
async def students_csv(
    class_section_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user_from_any_source),
):
    if user.role in (UserRole.ADMIN, UserRole.ACCOUNTANT):
        if class_section_id is not None and await db.get(DBClassSection, class_section_id) is None:
            raise HTTPException(status_code=404, detail="Class not found")
    elif user.role == UserRole.TEACHER:
        if class_section_id is None:
            raise HTTPException(status_code=403, detail="Choose one of your classes")
        await _class_for(db, user, class_section_id)
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    names = await _sections(db)
    routes = {r.id: r.name for r in await db.scalars(select(DBRoute))}
    query = select(DBStudent).order_by(DBStudent.class_section_id.is_(None), DBStudent.class_section_id,
                                       DBStudent.roll_no.is_(None), DBStudent.roll_no, DBStudent.name, DBStudent.id)
    if class_section_id is not None:
        query = query.where(DBStudent.class_section_id == class_section_id)
    students = list(await db.scalars(query))
    rows = [[s.admission_no, s.name, names.get(s.class_section_id, ""), s.roll_no, s.father_name, s.mother_name,
             s.mobile, routes.get(s.route_id, ""), s.status] for s in students]
    header = ["Admission no", "Name", "Class", "Roll", "Father", "Mother", "Mobile", "Route", "Status"]
    return _csv_response(to_csv(header, rows), file_name("students", names.get(class_section_id, "")))


@router.get("/exports/marks.csv")
async def marks_csv(
    exam_id: int,
    class_section_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_class_staff),
):
    section = await _class_for(db, user, class_section_id)
    exam = await db.get(DBExam, exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    result = await db.execute(
        select(DBStudent.roll_no, DBStudent.name, DBStudent.admission_no, DBSubject.name,
               DBAssessmentScore.part, DBAssessmentScore.marks, DBAssessmentScore.max_marks,
               DBAssessmentScore.is_absent)
        .join(DBStudent, DBStudent.id == DBAssessmentScore.student_id)
        .join(DBSubject, DBSubject.id == DBAssessmentScore.subject_id)
        .where(DBAssessmentScore.exam_id == exam_id, DBStudent.class_section_id == class_section_id)
        .order_by(DBStudent.roll_no.is_(None), DBStudent.roll_no, DBStudent.name, DBStudent.id,
                  DBSubject.name, DBAssessmentScore.part))
    rows = [[_class_name(section), r[0], r[1], r[2], r[3], r[4], marks_cell(r[5], r[7]), r[6]] for r in result.all()]
    header = ["Class", "Roll", "Name", "Admission no", "Subject", "Part", "Marks", "Out of"]
    return _csv_response(to_csv(header, rows), file_name("marks", _class_name(section), exam.name))


@router.get("/exports/attendance.csv")
async def attendance_csv(
    class_section_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_class_staff),
):
    section = await _class_for(db, user, class_section_id)
    if date_from and date_to and date_to < date_from:
        raise HTTPException(status_code=422, detail="The end date is before the start date")
    conditions = [DBAttendance.class_section_id == class_section_id]
    if date_from:
        conditions.append(DBAttendance.date >= date_from)
    if date_to:
        conditions.append(DBAttendance.date <= date_to)
    result = await db.execute(
        select(DBAttendance.date, DBStudent.roll_no, DBStudent.name, DBStudent.admission_no,
               DBAttendance.status, DBAttendance.remark)
        .join(DBStudent, DBStudent.id == DBAttendance.student_id)
        .where(*conditions)
        .order_by(DBAttendance.date, DBStudent.roll_no.is_(None), DBStudent.roll_no, DBStudent.name, DBStudent.id))
    rows = [[r[0].isoformat(), _class_name(section), r[1], r[2], r[3], r[4], r[5]] for r in result.all()]
    header = ["Date", "Class", "Roll", "Name", "Admission no", "Status", "Remark"]
    return _csv_response(to_csv(header, rows), file_name(
        "attendance", _class_name(section), date_from.isoformat() if date_from else "", date_to.isoformat() if date_to else ""))


@router.get("/exports/fees.csv")
async def fees_csv(
    period: Optional[str] = None,
    fee_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_fee_staff),
):
    if fee_type is not None and fee_type not in FEE_TYPES:
        raise HTTPException(status_code=422, detail=f"Fee type must be one of: {', '.join(FEE_TYPES)}")
    if period is not None and (len(period) != 7 or period[4] != "-" or not (period[:4] + period[5:]).isdigit()):
        raise HTTPException(status_code=422, detail="Period must look like 2026-10")
    year = await _current_year(db)
    conditions = [DBFeeInvoice.academic_year_id == year.id]
    if period:
        conditions.append(DBFeeInvoice.period == period)
    if fee_type:
        conditions.append(DBFeeInvoice.fee_type == fee_type)
    paid = {i: int(t) for i, t in (await db.execute(
        select(DBFeePayment.invoice_id, func.coalesce(func.sum(DBFeePayment.amount), 0))
        .join(DBFeeInvoice, DBFeeInvoice.id == DBFeePayment.invoice_id)
        .where(*conditions).group_by(DBFeePayment.invoice_id))).all()}
    names = await _sections(db)
    result = await db.execute(
        select(DBFeeInvoice.id, DBStudent.admission_no, DBStudent.name, DBStudent.class_section_id,
               DBFeeInvoice.fee_type, DBFeeInvoice.period, DBFeeInvoice.amount, DBFeeInvoice.discount,
               DBFeeInvoice.due_date)
        .outerjoin(DBStudent, DBStudent.id == DBFeeInvoice.student_id)
        .where(*conditions)
        .order_by(DBFeeInvoice.period, DBStudent.name, DBFeeInvoice.fee_type, DBFeeInvoice.id))
    now = today()
    rows: List[list] = []
    for inv_id, adm, name, section_id, kind, per, amount, discount, due in result.all():
        got = paid.get(inv_id, 0)
        rows.append([adm, name, names.get(section_id, ""), kind, per, amount, discount, got,
                     balance(amount, discount, got), due.isoformat(), invoice_status(amount, discount, got, due, now)])
    header = ["Admission no", "Student", "Class", "Fee type", "Period", "Amount (Rs)", "Discount (Rs)",
              "Paid (Rs)", "Balance (Rs)", "Due date", "Status"]
    return _csv_response(to_csv(header, rows), file_name("fees", period or "", fee_type or ""))
