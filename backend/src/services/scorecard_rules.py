"""Rules for student scorecards (issue #34). Pure functions, no database.

- An absent exam mark ("AB") and a mark not entered yet are both left out of totals and
  percentages. They are never counted as zero.
- Percent = marks obtained / maximum marks of the parts that have a mark.
- Position = rank among the students of the class who have a percent. Students with the same
  percent share a position (1, 2, 2, 4).
- Attendance rate = (present + late) / (recorded days - leave days). Leave is left out.
- No pass or fail is shown: the school's pass mark is not decided yet.
"""
from typing import Dict, Iterable, Optional


def percent(total: float, maximum: float) -> Optional[float]:
    """Percent to 2 decimals, or None when no marks are counted."""
    if not maximum:
        return None
    return round(total / maximum * 100, 2)


def competition_rank(percents: Dict[int, Optional[float]], student_id: int) -> Optional[int]:
    """Position of ``student_id`` (1 is best), or None if the student has no percent."""
    mine = percents.get(student_id)
    if mine is None:
        return None
    return 1 + sum(1 for value in percents.values() if value is not None and value > mine)


def attendance_rate(present: int, late: int, absent: int, leave: int) -> Optional[float]:
    """Attendance rate in percent, or None when no days count."""
    counted = present + late + absent
    if counted <= 0:
        return None
    return round((present + late) / counted * 100, 1)


def tally(parts: Iterable[dict], expected_parts: int = 1) -> dict:
    """Combine the saved parts of one subject in one exam.

    Each part is ``{"marks": float | None, "is_absent": bool, "max_marks": int}``;
    ``expected_parts`` is how many parts the subject has in this exam (1 or 2).
    Returns the marks and maximum of the parts that have marks, and a status:
    ``entered`` (every expected part has marks), ``partial`` (some do), ``absent``
    (no marks and at least one part absent) or ``missing`` (nothing saved).
    """
    parts = list(parts)
    entered = [p for p in parts if not p["is_absent"] and p["marks"] is not None]
    if entered:
        return {"marks": round(sum(p["marks"] for p in entered), 2),
                "max": sum(p["max_marks"] for p in entered),
                "status": "entered" if len(entered) >= expected_parts else "partial"}
    if any(p["is_absent"] for p in parts):
        return {"marks": None, "max": 0, "status": "absent"}
    return {"marks": None, "max": 0, "status": "missing"}
