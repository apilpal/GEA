"""Rules for school and class analytics (issue #35). Pure functions, no database.

- A student's percent is the marks obtained divided by the maximum of the parts that have a mark.
  Absent (AB) and not-yet-entered marks are left out. They are never counted as zero.
- A student with no counted marks has no percent. They are shown as "no marks yet" and are left
  out of the averages and of the buckets.
- Buckets group students by percent. The limits below are ASSUMED until the school decides
  its pass mark. They are labels for follow-up, not pass or fail.
- The average of a class is the average of its students' percents (each student counts once).
"""
from typing import Dict, Iterable, List, Optional, Tuple

# Lowest percent of each bucket (a percent equal to the limit is in that bucket).
DISTINCTION_MIN = 75.0
STEADY_MIN = 50.0
BORDERLINE_MIN = 33.0

BUCKETS = ("distinction", "steady", "borderline", "at_risk")


def bucket_rules() -> List[dict]:
    """The bucket limits in plain words, so the screen can explain every label."""
    return [
        {"key": "distinction", "label": "Distinction", "rule": f"{DISTINCTION_MIN:g}% or more"},
        {"key": "steady", "label": "Steady", "rule": f"{STEADY_MIN:g}% to below {DISTINCTION_MIN:g}%"},
        {"key": "borderline", "label": "Borderline", "rule": f"{BORDERLINE_MIN:g}% to below {STEADY_MIN:g}%"},
        {"key": "at_risk", "label": "At risk", "rule": f"below {BORDERLINE_MIN:g}%"},
    ]


def bucket_for(percent: Optional[float]) -> Optional[str]:
    """Bucket of a percent, or None when the student has no percent."""
    if percent is None:
        return None
    if percent >= DISTINCTION_MIN:
        return "distinction"
    if percent >= STEADY_MIN:
        return "steady"
    if percent >= BORDERLINE_MIN:
        return "borderline"
    return "at_risk"


def student_percents(rows: Iterable[Tuple[int, Optional[float], int, bool]]) -> Dict[int, Optional[float]]:
    """Percent of each student from score rows ``(student_id, marks, max_marks, is_absent)``.

    Rows that are absent or have no marks are not counted. A student whose rows are all
    uncounted gets ``None``.
    """
    totals: Dict[int, List[float]] = {}
    for student_id, marks, max_marks, absent in rows:
        bucket = totals.setdefault(student_id, [0.0, 0.0])
        if absent or marks is None:
            continue
        bucket[0] += float(marks)
        bucket[1] += max_marks
    return {sid: (round(got / mx * 100, 2) if mx else None) for sid, (got, mx) in totals.items()}


def summarize(percents: Iterable[Optional[float]], students: int) -> dict:
    """Average and bucket counts for a group of ``students`` students.

    ``percents`` holds the percent of each student who has one (``None`` entries are ignored).
    """
    values = [p for p in percents if p is not None]
    counts = {name: 0 for name in BUCKETS}
    for value in values:
        counts[bucket_for(value)] += 1
    return {
        "students": students,
        "with_marks": len(values),
        "average_percent": round(sum(values) / len(values), 2) if values else None,
        "buckets": counts,
    }


def group_attendance_rate(present: int, late: int, absent: int) -> Optional[float]:
    """Attendance rate of a group, in percent. Leave days are not passed in: they are left out."""
    counted = present + late + absent
    if counted <= 0:
        return None
    return round((present + late) / counted * 100, 1)
