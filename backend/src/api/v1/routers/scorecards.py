"""
Student scorecards (Phase 2, issue #34).

Endpoints (all under /api, for the admin and teachers):
- GET /scorecards/classes: the classes the user may view
- GET /scorecards/classes/{class_section_id}/students: the students of one class
- GET /scorecards/students/{student_id}: the scorecard of one student

A teacher can view the classes where they are class teacher or teach a subject; the admin all.
The scorecard shows the marks of every subject in every exam, totals, percent, position in the
class and the attendance rate. Absent (AB) and not-yet-entered marks are left out of totals and
percentages, never counted as zero. No pass or fail is shown: the pass mark is not decided yet.
"""

from typing import Dict, List, Optional, Set, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (
    DBAcademicYear,
    DBAssessmentScore,
    DBAttendance,
    DBClassSection,
    DBClassSubject,
    DBExam,
    DBSubject,
    DBTeacher,
)
from src.services.marks_rules import parts_for
from src.services.scorecard_rules import attendance_rate, competition_rank, percent, tally
from src.utils.auth_utils import require_teacher_or_admin

router = APIRouter()


def _class_name(section: DBClassSection) -> str:
    return f"{section.grade}-{section.section}"


async def _may_view_class(db: AsyncSession, user: User, section: DBClassSection) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    teacher_id = await db.scalar(select(DBTeacher.id).where(DBTeacher.user_id == user.id)) \
        if user.role == UserRole.TEACHER else None
    if teacher_id is None:
        return False
    if section.class_teacher_id == teacher_id:
        return True
    return bool(await db.scalar(select(DBClassSubject.id).where(
        DBClassSubject.class_section_id == section.id, DBClassSubject.teacher_id == teacher_id).limit(1)))


async def _class_students(db: AsyncSession, class_section_id: int) -> List[DBStudent]:
    return list(await db.scalars(
        select(DBStudent)
        .where(DBStudent.class_section_id == class_section_id, DBStudent.status == "active")
        .order_by(DBStudent.roll_no.is_(None), DBStudent.roll_no, DBStudent.name, DBStudent.id)))


@router.get("/scorecards/classes")
async def list_classes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    """Classes of the current session that the user may view."""
    sections = list(await db.scalars(
        select(DBClassSection).join(DBAcademicYear, DBAcademicYear.id == DBClassSection.academic_year_id)
        .where(DBAcademicYear.is_current.is_(True))))
    early = {"P.G": 0, "P.G.": 0, "L.K.G.": 1, "U.K.G.": 2}

    def order(s: DBClassSection):
        if s.grade in early:
            return (early[s.grade], 0, s.section)
        return (3, int(s.grade), s.section) if s.grade.isdigit() else (4, 0, s.grade + s.section)

    result = []
    for section in sorted(sections, key=order):
        if await _may_view_class(db, user, section):
            count = await db.scalar(select(func.count()).select_from(DBStudent).where(
                DBStudent.class_section_id == section.id, DBStudent.status == "active"))
            result.append({"id": section.id, "name": _class_name(section), "student_count": count or 0})
    return result


@router.get("/scorecards/classes/{class_section_id}/students")
async def class_students(
    class_section_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    section = await db.get(DBClassSection, class_section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="Class not found")
    if not await _may_view_class(db, user, section):
        raise HTTPException(status_code=403, detail="You can only view the classes you teach")
    return [{"student_id": s.id, "name": s.name, "roll_no": s.roll_no}
            for s in await _class_students(db, class_section_id)]


@router.get("/scorecards/students/{student_id}")
async def student_scorecard(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    student = await db.get(DBStudent, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.class_section_id is None:
        raise HTTPException(status_code=404, detail="This student is not in a class yet")
    section = await db.get(DBClassSection, student.class_section_id)
    if not await _may_view_class(db, user, section):
        raise HTTPException(status_code=403, detail="You can only view the classes you teach")

    exams = list(await db.scalars(
        select(DBExam).where(DBExam.academic_year_id == section.academic_year_id).order_by(DBExam.ordinal)))
    year = await db.get(DBAcademicYear, section.academic_year_id)
    subjects = list((await db.execute(
        select(DBSubject).join(DBClassSubject, DBClassSubject.subject_id == DBSubject.id)
        .where(DBClassSubject.class_section_id == section.id).order_by(DBClassSubject.id))).scalars())

    classmates = await _class_students(db, section.id)
    class_ids = {s.id for s in classmates} | {student.id}
    exam_ids = [e.id for e in exams]
    score_rows = list((await db.execute(
        select(DBAssessmentScore.student_id, DBAssessmentScore.exam_id, DBAssessmentScore.subject_id,
               DBAssessmentScore.part, DBAssessmentScore.marks, DBAssessmentScore.max_marks,
               DBAssessmentScore.is_absent)
        .where(DBAssessmentScore.student_id.in_(class_ids), DBAssessmentScore.exam_id.in_(exam_ids))
    )).all()) if exam_ids else []

    # --- the scorecard of this student, subject by subject and exam by exam ---------------------
    mine: Dict[Tuple[int, int], List[dict]] = {}
    totals: Dict[Tuple[int, int], List[float]] = {}   # (student, exam) -> [marks, max]
    for sid, eid, subj, part, marks, mx, absent in score_rows:
        entry = {"part": part, "marks": None if marks is None else float(marks), "is_absent": bool(absent),
                 "max_marks": mx}
        if sid == student.id:
            mine.setdefault((eid, subj), []).append(entry)
        if not absent and marks is not None:
            bucket = totals.setdefault((sid, eid), [0.0, 0])
            bucket[0] += float(marks)
            bucket[1] += mx

    subject_rows = []
    for subject in subjects:
        cells = {}
        subject_marks, subject_max = 0.0, 0
        for exam in exams:
            expected = len(parts_for(exam.name, exam.max_marks, section.grade, subject.name))
            parts = sorted(mine.get((exam.id, subject.id), []), key=lambda p: p["part"])
            cell = tally(parts, expected)
            cell["parts"] = parts
            cells[str(exam.id)] = cell
            if cell["marks"] is not None:
                subject_marks += cell["marks"]
                subject_max += cell["max"]
        subject_rows.append({"subject_id": subject.id, "name": subject.name, "exams": cells,
                             "total": round(subject_marks, 2) if subject_max else None, "max": subject_max,
                             "percent": percent(subject_marks, subject_max)})

    # --- totals, percent and position of this student in the class ------------------------------------
    def standing(exam_filter: Optional[Set[int]]) -> dict:
        per_student: Dict[int, Tuple[float, int]] = {}
        for (sid, eid), (marks, mx) in totals.items():
            if exam_filter is None or eid in exam_filter:
                old = per_student.get(sid, (0.0, 0))
                per_student[sid] = (old[0] + marks, old[1] + mx)
        percents = {sid: percent(m, mx) for sid, (m, mx) in per_student.items() if sid in class_ids}
        total, maximum = per_student.get(student.id, (0.0, 0))
        return {"total": round(total, 2) if maximum else None, "max": maximum,
                "percent": percents.get(student.id),
                "position": competition_rank(percents, student.id),
                "of": sum(1 for v in percents.values() if v is not None)}

    exam_rows = [{"exam_id": e.id, "name": e.name, "max_marks": e.max_marks, **standing({e.id})} for e in exams]
    overall = standing(None)

    # --- attendance of the session -------------------------------------------------------------------------
    counts = {"present": 0, "absent": 0, "late": 0, "leave": 0}
    if year is not None:
        for status, n in (await db.execute(
            select(DBAttendance.status, func.count()).where(
                DBAttendance.student_id == student.id, DBAttendance.date >= year.start_date,
                DBAttendance.date <= year.end_date).group_by(DBAttendance.status))).all():
            counts[status] = n
    attendance = {**counts, "recorded": sum(counts.values()),
                  "rate": attendance_rate(counts["present"], counts["late"], counts["absent"], counts["leave"])}

    return {
        "student": {"student_id": student.id, "name": student.name, "roll_no": student.roll_no,
                    "admission_no": student.admission_no, "father_name": student.father_name,
                    "mother_name": student.mother_name,
                    "dob": student.dob.isoformat() if student.dob else None,
                    "class_name": _class_name(section), "session": year.name if year else None},
        "exams": [{"exam_id": e.id, "name": e.name, "max_marks": e.max_marks} for e in exams],
        "subjects": subject_rows,
        "exam_totals": exam_rows,
        "overall": overall,
        "attendance": attendance,
    }
