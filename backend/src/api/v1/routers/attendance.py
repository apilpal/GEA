"""
Attendance entry endpoints (Phase 2, issue #32).

A teacher opens a class for a date, sees the roster with everyone marked
``present``, changes the few exceptions and saves the whole class in one request.

Endpoints (all under /api):
- GET /attendance/classes: the classes the user may mark
- GET /attendance/roster?class_section_id=&date=: the roster for one class and date
- PUT /attendance/roster: save the whole class for one date (one transaction)

Rules:
- Admin may mark any class; a teacher only the classes they are class teacher of.
- Dates in the future, Sundays and holidays cannot be marked.
- A teacher can mark today and the 2 days before; an admin any date of the session.
- Saving again for the same class and date replaces the earlier entries
  (``updated_by`` and ``updated_at`` record who changed them).
- One row per student per date; the unique constraint backs this up.
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (
    DBAcademicYear,
    DBAttendance,
    DBClassSection,
    DBHoliday,
    DBTeacher,
)
from src.utils.auth_utils import require_teacher_or_admin

router = APIRouter()

Status = Literal["present", "absent", "late", "leave"]
TEACHER_BACKDATE_DAYS = 2
SUNDAY = 6


def today() -> date:
    """Today's date. A function so tests can replace it."""
    return date.today()


class RosterEntry(BaseModel):
    student_id: int
    status: Status = "present"
    remark: Optional[str] = Field(default=None, max_length=200)


class SaveRosterRequest(BaseModel):
    class_section_id: int
    date: date
    entries: List[RosterEntry]


def _class_name(section: DBClassSection) -> str:
    return f"{section.grade}-{section.section}"


async def _teacher_id(db: AsyncSession, user: User) -> Optional[int]:
    return await db.scalar(select(DBTeacher.id).where(DBTeacher.user_id == user.id))


async def _get_section(db: AsyncSession, class_section_id: int) -> DBClassSection:
    section = await db.get(DBClassSection, class_section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="Class not found")
    return section


async def _check_may_mark(db: AsyncSession, user: User, section: DBClassSection) -> None:
    """Admin: any class. Teacher: only their own. Anything else: 403."""
    if user.role == UserRole.ADMIN:
        return
    teacher_id = await _teacher_id(db, user) if user.role == UserRole.TEACHER else None
    if teacher_id is None or section.class_teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="You can only mark attendance for your own class")


async def _date_problem(db: AsyncSession, user: User, section: DBClassSection, day: date) -> Optional[str]:
    """Why this date cannot be saved for this user, or None if it can."""
    now = today()
    if day > now:
        return "Attendance cannot be marked for a future date"
    if day.weekday() == SUNDAY:
        return "Sunday is not a school day"
    holiday = await db.scalar(select(DBHoliday.name).where(DBHoliday.date == day))
    if holiday:
        return f"Holiday: {holiday}"
    year = await db.get(DBAcademicYear, section.academic_year_id)
    if year is not None and not (year.start_date <= day <= year.end_date):
        return f"Date is outside the session {year.name}"
    if user.role != UserRole.ADMIN and day < now - timedelta(days=TEACHER_BACKDATE_DAYS):
        return f"Teachers can mark today and the last {TEACHER_BACKDATE_DAYS} days only; ask the admin to change older dates"
    return None


async def _class_students(db: AsyncSession, class_section_id: int) -> List[DBStudent]:
    rows = await db.scalars(
        select(DBStudent)
        .where(DBStudent.class_section_id == class_section_id, DBStudent.status == "active")
        .order_by(DBStudent.roll_no.is_(None), DBStudent.roll_no, DBStudent.name, DBStudent.id)
    )
    return list(rows)


@router.get("/attendance/classes")
async def list_classes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    """Classes of the current session that the user may mark."""
    query = (
        select(DBClassSection)
        .join(DBAcademicYear, DBAcademicYear.id == DBClassSection.academic_year_id)
        .where(DBAcademicYear.is_current.is_(True))
    )
    if user.role != UserRole.ADMIN:
        teacher_id = await _teacher_id(db, user)
        if teacher_id is None:
            return []
        query = query.where(DBClassSection.class_teacher_id == teacher_id)
    sections = list(await db.scalars(query))

    early = {"P.G": 0, "P.G.": 0, "L.K.G.": 1, "U.K.G.": 2}

    def order(s: DBClassSection):
        """P.G., L.K.G., U.K.G. first, then class 1, 2, ... 10 (numeric, not text, order)."""
        if s.grade in early:
            return (early[s.grade], 0, s.section)
        return (3, int(s.grade), s.section) if s.grade.isdigit() else (4, 0, s.grade + s.section)

    result = []
    for section in sorted(sections, key=order):
        count = len(await _class_students(db, section.id))
        result.append({"id": section.id, "name": _class_name(section), "grade": section.grade,
                       "section": section.section, "student_count": count})
    return result


@router.get("/attendance/roster")
async def get_roster(
    class_section_id: int,
    date: date,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    """Roster for one class and date. Students without a saved entry show as present."""
    section = await _get_section(db, class_section_id)
    await _check_may_mark(db, user, section)

    students = await _class_students(db, class_section_id)
    saved = {
        row.student_id: row
        for row in await db.scalars(
            select(DBAttendance).where(DBAttendance.class_section_id == class_section_id,
                                       DBAttendance.date == date)
        )
    }
    problem = await _date_problem(db, user, section, date)
    return {
        "class_section_id": class_section_id,
        "class_name": _class_name(section),
        "date": date.isoformat(),
        "already_saved": bool(saved),
        "can_save": problem is None,
        "reason": problem,
        "students": [
            {
                "student_id": s.id,
                "name": s.name,
                "roll_no": s.roll_no,
                "status": saved[s.id].status if s.id in saved else "present",
                "remark": saved[s.id].remark if s.id in saved else None,
            }
            for s in students
        ],
    }


@router.put("/attendance/roster")
async def save_roster(
    payload: SaveRosterRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    """Save the whole class for one date in a single transaction.

    Students missing from ``entries`` are saved as present. A student who does not
    belong to the class, or who appears twice, rejects the whole request.
    """
    section = await _get_section(db, payload.class_section_id)
    await _check_may_mark(db, user, section)

    problem = await _date_problem(db, user, section, payload.date)
    if problem:
        raise HTTPException(status_code=422, detail=problem)

    students = await _class_students(db, section.id)
    roster_ids = {s.id for s in students}

    chosen: Dict[int, RosterEntry] = {}
    for entry in payload.entries:
        if entry.student_id in chosen:
            raise HTTPException(status_code=422, detail=f"Student {entry.student_id} appears twice")
        if entry.student_id not in roster_ids:
            raise HTTPException(status_code=422, detail=f"Student {entry.student_id} is not in this class")
        chosen[entry.student_id] = entry

    existing = {
        row.student_id: row
        for row in await db.scalars(
            select(DBAttendance).where(DBAttendance.student_id.in_(roster_ids), DBAttendance.date == payload.date)
        )
    } if roster_ids else {}

    now = datetime.utcnow()
    created = updated = 0
    counts = {"present": 0, "absent": 0, "late": 0, "leave": 0}
    try:
        for student in students:
            entry = chosen.get(student.id) or RosterEntry(student_id=student.id)
            counts[entry.status] += 1
            row = existing.get(student.id)
            if row is None:
                db.add(DBAttendance(student_id=student.id, class_section_id=section.id, date=payload.date,
                                    status=entry.status, remark=entry.remark, marked_by=user.id,
                                    created_at=now))
                created += 1
            else:
                if (row.status, row.remark) != (entry.status, entry.remark):
                    row.status, row.remark = entry.status, entry.remark
                    row.updated_by, row.updated_at = user.id, now
                    updated += 1
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Attendance could not be saved; nothing was changed")

    # Use plain values here: after commit the ORM objects are expired, and touching
    # an attribute (section.id) would start a database read the async session forbids.
    return {"class_section_id": payload.class_section_id, "date": payload.date.isoformat(),
            "created": created, "updated": updated, "counts": counts, "total": len(students)}
