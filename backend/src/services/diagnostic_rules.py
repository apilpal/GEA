"""Rules for subject comparison and diagnostics (issue #36). Pure functions, no database.

- A student's subject percent is the marks obtained divided by the maximum of the parts that have a
  mark, over the exams counted. AB (absent) and marks not entered yet are left out, never zero.
- Tags explain WHY a student or class may need follow-up. They are facts with a plain reason, not
  pass or fail and not a diagnosis of the child. Every limit below is ASSUMED until the school
  decides; they are constants so they are easy to change.
"""
from typing import Dict, Iterable, List, Optional, Tuple

ATTENDANCE_LOW = 75.0            # a student below this attendance rate gets "Low attendance"
MIN_ATTENDANCE_DAYS = 10         # ... but only after this many counted days (too few days prove nothing)
SUBJECT_GAP_POINTS = 20.0        # a subject this many points below the student's own overall percent
MIN_SUBJECTS = 2                 # ... needs at least this many subjects with marks
CLASS_SUBJECT_GAP = 10.0         # a subject this many points below the class average is "weak"
HIGH_SPREAD_SD = 20.0            # standard deviation of the class percents that counts as a wide spread
MIN_STUDENTS_FOR_SPREAD = 5      # ... needs at least this many students with a percent
CLASS_ATTENDANCE_GAP = 5.0       # a class this many points below the school attendance rate


def tag_rules() -> List[dict]:
    """The tag limits in plain words, so the screen can explain every note."""
    return [
        {"key": "low_attendance", "label": "Low attendance", "scope": "student",
         "rule": f"attendance below {ATTENDANCE_LOW:g}% after at least {MIN_ATTENDANCE_DAYS} counted days"},
        {"key": "subject_gap", "label": "Subject gap", "scope": "student",
         "rule": f"a subject {SUBJECT_GAP_POINTS:g} or more points below the student's own overall percent "
                 f"(needs marks in {MIN_SUBJECTS} or more subjects)"},
        {"key": "weak_subject", "label": "Weak subject", "scope": "class",
         "rule": f"a subject whose class average is {CLASS_SUBJECT_GAP:g} or more points below the class average"},
        {"key": "high_spread", "label": "High spread", "scope": "class",
         "rule": f"student percents far apart (standard deviation {HIGH_SPREAD_SD:g} or more, "
                 f"at least {MIN_STUDENTS_FOR_SPREAD} students with marks): strong and weak students together"},
        {"key": "attendance_gap", "label": "Attendance gap", "scope": "class",
         "rule": f"class attendance {CLASS_ATTENDANCE_GAP:g} or more points below the school rate"},
    ]


def subject_percents(rows: Iterable[Tuple[int, int, Optional[float], int, bool]]) -> Dict[Tuple[int, int], Optional[float]]:
    """Percent of each (student, subject) from score rows ``(student_id, subject_id, marks, max_marks, is_absent)``."""
    totals: Dict[Tuple[int, int], List[float]] = {}
    for student_id, subject_id, marks, max_marks, absent in rows:
        bucket = totals.setdefault((student_id, subject_id), [0.0, 0.0])
        if absent or marks is None:
            continue
        bucket[0] += float(marks)
        bucket[1] += max_marks
    return {key: (round(got / mx * 100, 2) if mx else None) for key, (got, mx) in totals.items()}


def mean(values: Iterable[Optional[float]]) -> Optional[float]:
    """Average to 2 decimals of the values that are not None, or None when there are none."""
    found = [v for v in values if v is not None]
    return round(sum(found) / len(found), 2) if found else None


def std_dev(values: Iterable[Optional[float]]) -> Optional[float]:
    """Population standard deviation to 2 decimals of the values that are not None."""
    found = [v for v in values if v is not None]
    if not found:
        return None
    avg = sum(found) / len(found)
    return round((sum((v - avg) ** 2 for v in found) / len(found)) ** 0.5, 2)


def weak_subjects(class_average: Optional[float], subject_averages: Dict[str, Optional[float]]) -> List[Tuple[str, float, float]]:
    """Subjects at least CLASS_SUBJECT_GAP points below the class average, worst first.

    Returns ``(subject name, subject average, gap)``.
    """
    if class_average is None:
        return []
    found = [(name, avg, round(class_average - avg, 2)) for name, avg in subject_averages.items()
             if avg is not None and class_average - avg >= CLASS_SUBJECT_GAP]
    return sorted(found, key=lambda item: (-item[2], item[0]))


def student_tags(overall: Optional[float], subjects: Dict[str, Optional[float]],
                 attendance_rate: Optional[float], attendance_days: int) -> List[dict]:
    """Tags of one student: low attendance and subject gap, each with a plain reason."""
    tags: List[dict] = []
    if attendance_rate is not None and attendance_days >= MIN_ATTENDANCE_DAYS and attendance_rate < ATTENDANCE_LOW:
        tags.append({"key": "low_attendance", "label": "Low attendance",
                     "reason": f"Attendance is {attendance_rate:g}% over {attendance_days} days (limit {ATTENDANCE_LOW:g}%)"})
    counted = {name: p for name, p in subjects.items() if p is not None}
    if overall is not None and len(counted) >= MIN_SUBJECTS:
        gaps = sorted(((round(overall - p, 2), name, p) for name, p in counted.items()
                       if overall - p >= SUBJECT_GAP_POINTS), key=lambda item: (-item[0], item[1]))
        if gaps:
            reason = "; ".join(f"{name} {p:g}% is {gap:g} points below overall {overall:g}%" for gap, name, p in gaps[:2])
            tags.append({"key": "subject_gap", "label": "Subject gap", "reason": reason})
    return tags


def class_tags(percents: Iterable[Optional[float]], class_average: Optional[float],
               subject_averages: Dict[str, Optional[float]], attendance_rate: Optional[float],
               attendance_days: int, school_attendance_rate: Optional[float]) -> List[dict]:
    """Tags of one class: weak subjects, high spread and an attendance gap, each with a plain reason."""
    tags: List[dict] = []
    for name, avg, gap in weak_subjects(class_average, subject_averages):
        tags.append({"key": "weak_subject", "label": f"Weak subject: {name}",
                     "reason": f"{name} average {avg:g}% is {gap:g} points below the class average {class_average:g}%"})
    found = [p for p in percents if p is not None]
    spread = std_dev(found)
    if spread is not None and len(found) >= MIN_STUDENTS_FOR_SPREAD and spread >= HIGH_SPREAD_SD:
        tags.append({"key": "high_spread", "label": "High spread",
                     "reason": f"Percents range from {min(found):g}% to {max(found):g}% (standard deviation {spread:g})"})
    if (attendance_rate is not None and school_attendance_rate is not None and attendance_days >= MIN_ATTENDANCE_DAYS
            and school_attendance_rate - attendance_rate >= CLASS_ATTENDANCE_GAP):
        tags.append({"key": "attendance_gap", "label": "Attendance gap",
                     "reason": f"Class attendance {attendance_rate:g}% is {round(school_attendance_rate - attendance_rate, 2):g} "
                               f"points below the school rate {school_attendance_rate:g}%"})
    return tags
