"""
Exam marks entry endpoints (Phase 2, issue #33).

A teacher picks a class, an exam and one of their subjects, enters the marks of the whole
class and saves them in one request. A student who was absent is saved as ``AB``
(no mark, absent flag), never as zero.

Endpoints (all under /api):
- GET /marks/options: exams, and the classes and subjects the user may enter marks for
- GET /marks/sheet?class_section_id=&exam_id=&subject_id=: the sheet for one class, exam and subject
- PUT /marks/sheet: save the sheet (one transaction; any invalid mark rejects everything)

Rules (docs/planning/02-data-rules-and-roles.md and src/services/marks_rules.py):
- Admin may enter any subject of any class. A teacher only the subjects assigned to them in a class.
- A mark is from 0 to the maximum of its part, with at most 2 decimals.
- Saving a student again replaces the earlier mark (``updated_by`` and ``updated_at`` record it).
- Students or parts left out of the request are left as they were.
- A mark that was entered cannot be saved as blank; enter the corrected mark or AB.
"""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (
    DBAcademicYear,
    DBAssessmentScore,
    DBClassSection,
    DBClassSubject,
    DBExam,
    DBSubject,
    DBTeacher,
)
from src.services.marks_rules import mark_problem, parts_for
from src.utils.auth_utils import require_teacher_or_admin

router = APIRouter()

MAX_ERRORS_SHOWN = 5
ROMAN = {1: "I", 2: "II"}


class ScoreEntry(BaseModel):
    student_id: int
    part: int = 1
    marks: Optional[Decimal] = None
    is_absent: bool = False


class SaveSheetRequest(BaseModel):
    class_section_id: int
    exam_id: int
    subject_id: int
    entries: List[ScoreEntry]


def _class_name(section: DBClassSection) -> str:
    return f"{section.grade}-{section.section}"


async def _teacher_id(db: AsyncSession, user: User) -> Optional[int]:
    if user.role != UserRole.TEACHER:
        return None
    return await db.scalar(select(DBTeacher.id).where(DBTeacher.user_id == user.id))


async def _load_context(db: AsyncSession, user: User, class_section_id: int, exam_id: int, subject_id: int):
    """Find the class, exam and subject and check the user may enter these marks."""
    section = await db.get(DBClassSection, class_section_id)
    exam = await db.get(DBExam, exam_id)
    subject = await db.get(DBSubject, subject_id)
    if section is None or exam is None or subject is None:
        raise HTTPException(status_code=404, detail="Class, exam or subject not found")
    if exam.academic_year_id != section.academic_year_id:
        raise HTTPException(status_code=404, detail="This exam belongs to another session")

    assignment = await db.scalar(
        select(DBClassSubject).where(DBClassSubject.class_section_id == class_section_id,
                                     DBClassSubject.subject_id == subject_id)
    )
    if assignment is None:
        raise HTTPException(status_code=404, detail="This subject is not taught in this class")

    if user.role != UserRole.ADMIN:
        teacher_id = await _teacher_id(db, user)
        if teacher_id is None or assignment.teacher_id != teacher_id:
            raise HTTPException(status_code=403, detail="You can only enter marks for your own subjects")

    # Plain values only: ORM objects must not be read after a commit.
    return {
        "section_id": section.id,
        "class_name": _class_name(section),
        "grade": section.grade,
        "exam_id": exam.id,
        "exam_name": exam.name,
        "exam_max": exam.max_marks,
        "subject_id": subject.id,
        "subject_name": subject.name,
    }


async def _class_students(db: AsyncSession, class_section_id: int) -> List[DBStudent]:
    rows = await db.scalars(
        select(DBStudent)
        .where(DBStudent.class_section_id == class_section_id, DBStudent.status == "active")
        .order_by(DBStudent.roll_no.is_(None), DBStudent.roll_no, DBStudent.name, DBStudent.id)
    )
    return list(rows)


def _number(value) -> Optional[float]:
    return None if value is None else float(value)


@router.get("/marks/options")
async def marks_options(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    """Exams of the current session and the class/subject pairs the user may enter."""
    year_id = await db.scalar(select(DBAcademicYear.id).where(DBAcademicYear.is_current.is_(True)))
    if year_id is None:
        return {"exams": [], "classes": []}

    exams = [
        {"id": e.id, "name": e.name, "max_marks": e.max_marks}
        for e in await db.scalars(select(DBExam).where(DBExam.academic_year_id == year_id).order_by(DBExam.ordinal))
    ]

    query = (
        select(DBClassSection, DBSubject)
        .join(DBClassSubject, DBClassSubject.class_section_id == DBClassSection.id)
        .join(DBSubject, DBSubject.id == DBClassSubject.subject_id)
        .where(DBClassSection.academic_year_id == year_id)
    )
    if user.role != UserRole.ADMIN:
        teacher_id = await _teacher_id(db, user)
        if teacher_id is None:
            return {"exams": exams, "classes": []}
        query = query.where(DBClassSubject.teacher_id == teacher_id)

    classes: Dict[int, dict] = {}
    for section, subject in (await db.execute(query)).all():
        entry = classes.setdefault(section.id, {"id": section.id, "name": _class_name(section),
                                                "grade": section.grade, "section": section.section,
                                                "subjects": []})
        entry["subjects"].append({"id": subject.id, "name": subject.name})

    early = {"P.G": 0, "P.G.": 0, "L.K.G.": 1, "U.K.G.": 2}

    def order(c: dict):
        if c["grade"] in early:
            return (early[c["grade"]], 0, c["section"])
        return (3, int(c["grade"]), c["section"]) if c["grade"].isdigit() else (4, 0, c["grade"] + c["section"])

    ordered = sorted(classes.values(), key=order)
    for c in ordered:
        c["subjects"].sort(key=lambda s: s["name"])
    return {"exams": exams, "classes": ordered}


@router.get("/marks/sheet")
async def get_sheet(
    class_section_id: int,
    exam_id: int,
    subject_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    """The marks sheet for one class, exam and subject. Nothing is written."""
    ctx = await _load_context(db, user, class_section_id, exam_id, subject_id)
    parts = parts_for(ctx["exam_name"], ctx["exam_max"], ctx["grade"], ctx["subject_name"])
    students = await _class_students(db, class_section_id)
    ids = [s.id for s in students]

    saved: Dict[Tuple[int, int], DBAssessmentScore] = {}
    if ids:
        for row in await db.scalars(
            select(DBAssessmentScore).where(DBAssessmentScore.exam_id == exam_id,
                                            DBAssessmentScore.subject_id == subject_id,
                                            DBAssessmentScore.student_id.in_(ids))
        ):
            saved[(row.student_id, row.part)] = row

    return {
        "class_section_id": ctx["section_id"],
        "class_name": ctx["class_name"],
        "exam_id": ctx["exam_id"],
        "exam_name": ctx["exam_name"],
        "subject_id": ctx["subject_id"],
        "subject_name": ctx["subject_name"],
        "parts": [{"part": p, "max_marks": m} for p, m in parts],
        "students": [
            {
                "student_id": s.id,
                "name": s.name,
                "roll_no": s.roll_no,
                "scores": [
                    {
                        "part": p,
                        "marks": _number(saved[(s.id, p)].marks) if (s.id, p) in saved else None,
                        "is_absent": bool(saved[(s.id, p)].is_absent) if (s.id, p) in saved else False,
                        "saved": (s.id, p) in saved,
                    }
                    for p, _ in parts
                ],
            }
            for s in students
        ],
    }


@router.put("/marks/sheet")
async def save_sheet(
    payload: SaveSheetRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    """Save marks for one class, exam and subject in a single transaction."""
    ctx = await _load_context(db, user, payload.class_section_id, payload.exam_id, payload.subject_id)
    max_by_part = dict(parts_for(ctx["exam_name"], ctx["exam_max"], ctx["grade"], ctx["subject_name"]))
    students = await _class_students(db, payload.class_section_id)
    names = {s.id: s.name for s in students}

    existing: Dict[Tuple[int, int], DBAssessmentScore] = {}
    if names:
        for row in await db.scalars(
            select(DBAssessmentScore).where(DBAssessmentScore.exam_id == payload.exam_id,
                                            DBAssessmentScore.subject_id == payload.subject_id,
                                            DBAssessmentScore.student_id.in_(list(names)))
        ):
            existing[(row.student_id, row.part)] = row

    # Check every entry first; if anything is wrong nothing is written.
    errors: List[str] = []
    seen = set()
    for entry in payload.entries:
        who = names.get(entry.student_id)
        if who is None:
            errors.append(f"Student {entry.student_id} is not in this class")
            continue
        label = f"{who} (part {ROMAN.get(entry.part, entry.part)})" if len(max_by_part) > 1 else who
        if entry.part not in max_by_part:
            errors.append(f"{who}: this subject has no part {entry.part}")
            continue
        key = (entry.student_id, entry.part)
        if key in seen:
            errors.append(f"{label} appears twice")
            continue
        seen.add(key)
        if entry.is_absent and entry.marks is not None:
            errors.append(f"{label}: absent (AB) cannot have marks")
        elif entry.marks is not None:
            problem = mark_problem(entry.marks, max_by_part[entry.part])
            if problem:
                errors.append(f"{label}: {entry.marks} {problem}")
        elif not entry.is_absent and key in existing:
            errors.append(f"{label}: a saved mark cannot be left blank; enter the corrected mark or AB")
    if errors:
        shown = "; ".join(errors[:MAX_ERRORS_SHOWN])
        more = f" (and {len(errors) - MAX_ERRORS_SHOWN} more)" if len(errors) > MAX_ERRORS_SHOWN else ""
        raise HTTPException(status_code=422, detail=f"Nothing saved. {shown}{more}")

    now = datetime.utcnow()
    created = updated = unchanged = 0
    try:
        for entry in payload.entries:
            marks = None if entry.is_absent else entry.marks
            if marks is None and not entry.is_absent:
                continue  # not entered yet: nothing to save
            if marks is not None:
                marks = marks.quantize(Decimal("0.01"))
            key = (entry.student_id, entry.part)
            row = existing.get(key)
            if row is None:
                db.add(DBAssessmentScore(
                    exam_id=payload.exam_id, student_id=entry.student_id, subject_id=payload.subject_id,
                    part=entry.part, marks=marks, max_marks=max_by_part[entry.part],
                    is_absent=entry.is_absent, entered_by=user.id, created_at=now))
                created += 1
            elif (row.marks is None and marks is None or
                  row.marks is not None and marks is not None and Decimal(str(row.marks)) == marks) \
                    and bool(row.is_absent) == entry.is_absent and row.max_marks == max_by_part[entry.part]:
                unchanged += 1
            else:
                row.marks, row.is_absent = marks, entry.is_absent
                row.max_marks = max_by_part[entry.part]
                row.updated_by, row.updated_at = user.id, now
                updated += 1
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Marks could not be saved; nothing was changed")

    # Plain values only: ORM objects are expired after the commit.
    return {"class_section_id": payload.class_section_id, "exam_id": payload.exam_id,
            "subject_id": payload.subject_id, "created": created, "updated": updated,
            "unchanged": unchanged}
