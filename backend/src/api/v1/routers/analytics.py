"""
School and class analytics (Phase 3, issue #35).

Endpoints (all under /api):
- GET /analytics/overview?exam_id=: school summary, grade summaries and a class-by-class comparison
  (admin only: management view)
- GET /analytics/classes/{class_section_id}?exam_id=: every student of one class with percent,
  bucket, position and attendance (the admin, or a teacher of that class)

Everything is computed here on the server from saved marks and attendance. Without ``exam_id`` all
exams of the session are combined. Rules (src/services/analytics_rules.py): AB and marks not entered
yet are left out of percents, never counted as zero; students with no marks are listed as "no marks
yet" and are left out of averages and buckets; buckets are labels for follow-up, not pass or fail.
"""

from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.routers.scorecards import _class_name, _class_students, _may_view_class
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (
    DBAcademicYear,
    DBAssessmentScore,
    DBAttendance,
    DBClassSection,
    DBExam,
    DBTeacher,
)
from src.services.analytics_rules import (
    bucket_for,
    bucket_rules,
    group_attendance_rate,
    student_percents,
    summarize,
)
from src.services.scorecard_rules import attendance_rate, competition_rank
from src.utils.auth_utils import check_permissions, require_teacher_or_admin

router = APIRouter()

require_admin_only = check_permissions([UserRole.ADMIN])

EARLY_GRADES = {"P.G": 0, "P.G.": 0, "L.K.G.": 1, "U.K.G.": 2}
Counts = Dict[str, int]


def section_order(section: DBClassSection):
    """Playgroup, LKG, UKG, then 1 to 12, then anything else."""
    if section.grade in EARLY_GRADES:
        return (EARLY_GRADES[section.grade], 0, section.section)
    if section.grade.isdigit():
        return (3, int(section.grade), section.section)
    return (4, 0, section.grade + section.section)


def _empty_counts() -> Counts:
    return {"present": 0, "absent": 0, "late": 0, "leave": 0}


async def _exams_of(db: AsyncSession, year_id: int, exam_id: Optional[int]) -> Tuple[List[DBExam], List[int], Optional[DBExam]]:
    """All exams of the session, the exam ids to count, and the chosen exam (None = all exams)."""
    exams = list(await db.scalars(
        select(DBExam).where(DBExam.academic_year_id == year_id).order_by(DBExam.ordinal)))
    if exam_id is None:
        return exams, [e.id for e in exams], None
    chosen = next((e for e in exams if e.id == exam_id), None)
    if chosen is None:
        raise HTTPException(status_code=404, detail="Exam not found in this session")
    return exams, [chosen.id], chosen


async def _percents(db: AsyncSession, student_ids: List[int], exam_ids: List[int]) -> Dict[int, Optional[float]]:
    if not student_ids or not exam_ids:
        return {}
    rows = (await db.execute(
        select(DBAssessmentScore.student_id, DBAssessmentScore.marks, DBAssessmentScore.max_marks,
               DBAssessmentScore.is_absent)
        .where(DBAssessmentScore.student_id.in_(student_ids), DBAssessmentScore.exam_id.in_(exam_ids))
    )).all()
    return student_percents((sid, None if marks is None else float(marks), mx, bool(absent))
                            for sid, marks, mx, absent in rows)


async def _attendance(db: AsyncSession, student_ids: List[int], year: DBAcademicYear) -> Dict[int, Counts]:
    counts: Dict[int, Counts] = {sid: _empty_counts() for sid in student_ids}
    if not student_ids:
        return counts
    rows = (await db.execute(
        select(DBAttendance.student_id, DBAttendance.status, func.count())
        .where(DBAttendance.student_id.in_(student_ids), DBAttendance.date >= year.start_date,
               DBAttendance.date <= year.end_date)
        .group_by(DBAttendance.student_id, DBAttendance.status)
    )).all()
    for sid, status, n in rows:
        counts[sid][status] = n
    return counts


def _exam_info(exams: List[DBExam], chosen: Optional[DBExam]) -> dict:
    return {
        "exam": None if chosen is None else {"exam_id": chosen.id, "name": chosen.name},
        "exams": [{"exam_id": e.id, "name": e.name} for e in exams],
    }


def _group_row(student_ids: List[int], percents: Dict[int, Optional[float]], attendance: Dict[int, Counts]) -> dict:
    """Students, average, buckets and attendance rate of any group of students."""
    totals = _empty_counts()
    for sid in student_ids:
        for key, value in attendance.get(sid, {}).items():
            totals[key] += value
    row = summarize((percents.get(sid) for sid in student_ids), len(student_ids))
    row["attendance_rate"] = group_attendance_rate(totals["present"], totals["late"], totals["absent"])
    row["attendance_days"] = totals["present"] + totals["late"] + totals["absent"]
    return row


@router.get("/analytics/overview")
async def overview(
    exam_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_only),
):
    """School summary, grade summaries and the class-by-class comparison for the current session."""
    year = await db.scalar(select(DBAcademicYear).where(DBAcademicYear.is_current.is_(True)))
    if year is None:
        raise HTTPException(status_code=404, detail="There is no current session")
    exams, exam_ids, chosen = await _exams_of(db, year.id, exam_id)

    sections = sorted(await db.scalars(
        select(DBClassSection).where(DBClassSection.academic_year_id == year.id)), key=section_order)
    section_ids = [s.id for s in sections]
    students = list(await db.scalars(
        select(DBStudent).where(DBStudent.status == "active", DBStudent.class_section_id.in_(section_ids))
    )) if section_ids else []
    unassigned_filter = DBStudent.class_section_id.is_(None)
    if section_ids:
        unassigned_filter = or_(unassigned_filter, DBStudent.class_section_id.not_in(section_ids))
    unassigned = await db.scalar(
        select(func.count()).select_from(DBStudent).where(DBStudent.status == "active", unassigned_filter))

    by_section: Dict[int, List[int]] = defaultdict(list)
    for student in students:
        by_section[student.class_section_id].append(student.id)
    all_ids = [s.id for s in students]
    percents = await _percents(db, all_ids, exam_ids)
    attendance = await _attendance(db, all_ids, year)
    teachers = {t.id: t.name for t in await db.scalars(select(DBTeacher))}

    classes = []
    grade_ids: Dict[str, List[int]] = defaultdict(list)
    grade_sections: Dict[str, int] = defaultdict(int)
    for section in sections:
        ids = by_section.get(section.id, [])
        grade_ids[section.grade].extend(ids)
        grade_sections[section.grade] += 1
        classes.append({"class_section_id": section.id, "name": _class_name(section), "grade": section.grade,
                        "section": section.section, "class_teacher": teachers.get(section.class_teacher_id),
                        **_group_row(ids, percents, attendance)})
    grades = [{"grade": grade, "sections": grade_sections[grade], **_group_row(ids, percents, attendance)}
              for grade, ids in grade_ids.items()]   # dict keeps the class order

    return {
        "session": year.name,
        **_exam_info(exams, chosen),
        "school": _group_row(all_ids, percents, attendance),
        "grades": grades,
        "classes": classes,
        "unassigned_students": unassigned or 0,
        "bucket_rules": bucket_rules(),
    }


@router.get("/analytics/classes/{class_section_id}")
async def class_detail(
    class_section_id: int,
    exam_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    """Every student of one class with percent, bucket, position and attendance."""
    section = await db.get(DBClassSection, class_section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="Class not found")
    if not await _may_view_class(db, user, section):
        raise HTTPException(status_code=403, detail="You can only view the classes you teach")
    year = await db.get(DBAcademicYear, section.academic_year_id)
    exams, exam_ids, chosen = await _exams_of(db, section.academic_year_id, exam_id)

    students = await _class_students(db, section.id)
    ids = [s.id for s in students]
    percents = await _percents(db, ids, exam_ids)
    attendance = await _attendance(db, ids, year) if year else {sid: _empty_counts() for sid in ids}
    ranked = {sid: p for sid, p in percents.items() if sid in set(ids)}

    rows = []
    for student in students:
        counts = attendance[student.id]
        percent = percents.get(student.id)
        rows.append({
            "student_id": student.id, "name": student.name, "roll_no": student.roll_no,
            "percent": percent, "bucket": bucket_for(percent),
            "position": competition_rank(ranked, student.id),
            "attendance_rate": attendance_rate(counts["present"], counts["late"], counts["absent"], counts["leave"]),
            "attendance": {**counts, "recorded": sum(counts.values())},
        })
    return {
        "class": {"class_section_id": section.id, "name": _class_name(section), "session": year.name if year else None},
        **_exam_info(exams, chosen),
        "summary": _group_row(ids, percents, attendance),
        "students": rows,
        "bucket_rules": bucket_rules(),
    }
