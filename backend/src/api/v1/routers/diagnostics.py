"""
Subject comparison and diagnostics (Phase 3, issue #36).

Endpoints (all under /api):
- GET /analytics/subjects?exam_id=&grade=: subject comparison for the whole school: a school average
  per subject, a class-by-subject table and a list of bottlenecks (admin only)
- GET /analytics/classes/{class_section_id}/diagnostics?exam_id=: notes that explain why a class or a
  student may need follow-up (the admin, or a teacher of that class)

Everything is computed here on the server (src/services/diagnostic_rules.py). AB and marks not entered
yet are left out of percents, never counted as zero. The notes (tags) give a plain reason with the
numbers behind them; they are for follow-up and are not pass or fail.
"""

from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.routers.analytics import _attendance, _empty_counts, _exam_info, _exams_of, section_order
from src.api.v1.routers.scorecards import _class_name, _class_students, _may_view_class
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (
    DBAcademicYear,
    DBAssessmentScore,
    DBAttendance,
    DBClassSection,
    DBClassSubject,
    DBSubject,
)
from src.services.analytics_rules import bucket_for, group_attendance_rate, student_percents, summarize
from src.services.diagnostic_rules import (
    class_tags,
    mean,
    std_dev,
    student_tags,
    subject_percents,
    tag_rules,
    weak_subjects,
)
from src.services.scorecard_rules import attendance_rate
from src.utils.auth_utils import check_permissions, require_teacher_or_admin

router = APIRouter()

require_admin_only = check_permissions([UserRole.ADMIN])
BOTTLENECK_LIMIT = 10


async def _score_rows(db: AsyncSession, student_ids: List[int], exam_ids: List[int]) -> list:
    """(student_id, subject_id, marks, max_marks, is_absent) of every saved score."""
    if not student_ids or not exam_ids:
        return []
    rows = (await db.execute(
        select(DBAssessmentScore.student_id, DBAssessmentScore.subject_id, DBAssessmentScore.marks,
               DBAssessmentScore.max_marks, DBAssessmentScore.is_absent)
        .where(DBAssessmentScore.student_id.in_(student_ids), DBAssessmentScore.exam_id.in_(exam_ids))
    )).all()
    return [(sid, subj, None if marks is None else float(marks), mx, bool(absent)) for sid, subj, marks, mx, absent in rows]


def _overall_percents(rows: list) -> Dict[int, Optional[float]]:
    return student_percents((sid, marks, mx, absent) for sid, _subj, marks, mx, absent in rows)


@router.get("/analytics/subjects")
async def subject_comparison(
    exam_id: Optional[int] = None,
    grade: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_only),
):
    """Subject averages for the school and for each class, and the biggest bottlenecks."""
    year = await db.scalar(select(DBAcademicYear).where(DBAcademicYear.is_current.is_(True)))
    if year is None:
        raise HTTPException(status_code=404, detail="There is no current session")
    exams, exam_ids, chosen = await _exams_of(db, year.id, exam_id)

    sections = sorted(await db.scalars(
        select(DBClassSection).where(DBClassSection.academic_year_id == year.id)), key=section_order)
    if grade is not None:
        sections = [s for s in sections if s.grade == grade]
    section_ids = [s.id for s in sections]
    students = list(await db.scalars(
        select(DBStudent).where(DBStudent.status == "active", DBStudent.class_section_id.in_(section_ids))
    )) if section_ids else []
    by_section: Dict[int, List[int]] = defaultdict(list)
    for student in students:
        by_section[student.class_section_id].append(student.id)
    section_of = {sid: sec for sec, ids in by_section.items() for sid in ids}

    taught: Set[Tuple[int, int]] = set()
    if section_ids:
        taught = {(sec, subj) for sec, subj in (await db.execute(
            select(DBClassSubject.class_section_id, DBClassSubject.subject_id)
            .where(DBClassSubject.class_section_id.in_(section_ids)))).all()}
    subject_names = {s.id: s.name for s in await db.scalars(select(DBSubject).order_by(DBSubject.id))}

    rows = await _score_rows(db, list(section_of), exam_ids)
    overall = _overall_percents(rows)
    per_student_subject = subject_percents(rows)
    by_subject: Dict[int, List[Optional[float]]] = defaultdict(list)
    by_class_subject: Dict[Tuple[int, int], List[Optional[float]]] = defaultdict(list)
    for (sid, subj), percent in per_student_subject.items():
        by_subject[subj].append(percent)
        by_class_subject[(section_of[sid], subj)].append(percent)

    subject_ids = sorted({subj for _sec, subj in taught} & set(subject_names))
    subjects = []
    for subj in subject_ids:
        learners = sum(len(by_section.get(sec, [])) for sec, s in taught if s == subj)
        row = summarize(by_subject.get(subj, []), learners)
        subjects.append({"subject_id": subj, "name": subject_names[subj], **row})
    subjects.sort(key=lambda r: (r["average_percent"] is None, r["average_percent"] or 0, r["name"]))

    classes, bottlenecks = [], []
    for section in sections:
        class_average = mean(overall.get(sid) for sid in by_section.get(section.id, []))
        cells = {}
        named_averages: Dict[str, Optional[float]] = {}
        for subj in subject_ids:
            if (section.id, subj) not in taught:
                cells[str(subj)] = {"taught": False, "average_percent": None, "with_marks": 0}
                continue
            values = by_class_subject.get((section.id, subj), [])
            average = mean(values)
            cells[str(subj)] = {"taught": True, "average_percent": average, "with_marks": sum(1 for v in values if v is not None)}
            named_averages[subject_names[subj]] = average
        classes.append({"class_section_id": section.id, "name": _class_name(section), "grade": section.grade,
                        "section": section.section, "average_percent": class_average, "subjects": cells})
        name_to_id = {subject_names[s]: s for s in subject_ids}
        for name, average, gap in weak_subjects(class_average, named_averages):
            bottlenecks.append({"class_section_id": section.id, "class": _class_name(section), "subject_id": name_to_id[name],
                                "subject": name, "average_percent": average, "class_average": class_average, "gap": gap})
    bottlenecks.sort(key=lambda b: (-b["gap"], b["class"], b["subject"]))

    return {
        "session": year.name,
        **_exam_info(exams, chosen),
        "grade": grade,
        "subjects": subjects,
        "classes": classes,
        "bottlenecks": bottlenecks[:BOTTLENECK_LIMIT],
        "tag_rules": tag_rules(),
    }


@router.get("/analytics/classes/{class_section_id}/diagnostics")
async def class_diagnostics(
    class_section_id: int,
    exam_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    """Notes for one class and for each of its students, each with a plain reason."""
    section = await db.get(DBClassSection, class_section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="Class not found")
    if not await _may_view_class(db, user, section):
        raise HTTPException(status_code=403, detail="You can only view the classes you teach")
    year = await db.get(DBAcademicYear, section.academic_year_id)
    exams, exam_ids, chosen = await _exams_of(db, section.academic_year_id, exam_id)

    students = await _class_students(db, section.id)
    ids = [s.id for s in students]
    rows = await _score_rows(db, ids, exam_ids)
    overall = _overall_percents(rows)
    per_student_subject = subject_percents(rows)
    attendance = await _attendance(db, ids, year) if year else {sid: _empty_counts() for sid in ids}

    subject_rows = list((await db.execute(
        select(DBSubject.id, DBSubject.name).join(DBClassSubject, DBClassSubject.subject_id == DBSubject.id)
        .where(DBClassSubject.class_section_id == section.id).order_by(DBClassSubject.id))).all())

    # class-level numbers
    class_average = mean(overall.get(sid) for sid in ids)
    spread = std_dev(overall.get(sid) for sid in ids)
    subject_summary, named_averages = [], {}
    for subj_id, name in subject_rows:
        values = [per_student_subject.get((sid, subj_id)) for sid in ids]
        average = mean(values)
        named_averages[name] = average
        subject_summary.append({"subject_id": subj_id, "name": name, "average_percent": average,
                                "with_marks": sum(1 for v in values if v is not None)})
    totals = _empty_counts()
    for counts in attendance.values():
        for key, value in counts.items():
            totals[key] += value
    class_days = totals["present"] + totals["late"] + totals["absent"]
    class_rate = group_attendance_rate(totals["present"], totals["late"], totals["absent"])

    school_rate = None
    if year is not None:
        school = {s: n for s, n in (await db.execute(
            select(DBAttendance.status, func.count())
            .join(DBClassSection, DBClassSection.id == DBAttendance.class_section_id)
            .where(DBClassSection.academic_year_id == year.id, DBAttendance.date >= year.start_date,
                   DBAttendance.date <= year.end_date).group_by(DBAttendance.status))).all()}
        school_rate = group_attendance_rate(school.get("present", 0), school.get("late", 0), school.get("absent", 0))

    student_rows = []
    for student in students:
        counts = attendance[student.id]
        days = counts["present"] + counts["late"] + counts["absent"]
        rate = attendance_rate(counts["present"], counts["late"], counts["absent"], counts["leave"])
        percent = overall.get(student.id)
        by_name = {name: per_student_subject.get((student.id, subj_id)) for subj_id, name in subject_rows}
        tags = student_tags(percent, by_name, rate, days)
        bucket = bucket_for(percent)
        student_rows.append({
            "student_id": student.id, "name": student.name, "roll_no": student.roll_no, "percent": percent,
            "bucket": bucket, "attendance_rate": rate, "attendance_days": days,
            "subjects": [{"subject_id": subj_id, "name": name, "percent": by_name[name]} for subj_id, name in subject_rows],
            "tags": tags, "needs_follow_up": bool(tags) or bucket in ("borderline", "at_risk"),
        })

    return {
        "class": {"class_section_id": section.id, "name": _class_name(section)},
        **_exam_info(exams, chosen),
        "summary": {"average_percent": class_average, "spread": spread, "attendance_rate": class_rate,
                    "attendance_days": class_days, "school_attendance_rate": school_rate,
                    "follow_up_students": sum(1 for r in student_rows if r["needs_follow_up"])},
        "tags": class_tags((overall.get(sid) for sid in ids), class_average, named_averages, class_rate, class_days, school_rate),
        "subjects": subject_summary,
        "students": student_rows,
        "tag_rules": tag_rules(),
    }
