"""Rules for exam marks (issue #33). Pure functions, no database.

The school's rules (docs/planning/02-data-rules-and-roles.md):
- Maximum marks: Terminal 40, Half-yearly 60, Annual 100.
- In classes 6 to 8, Hindi, English and Mathematics have two papers (part I and part II)
  in the Terminal and Half-yearly exams. The split is assumed even until the school says
  otherwise (Terminal 20 + 20, Half-yearly 30 + 30). Everything else is one part.
- A mark is between 0 and the maximum of its part, with at most 2 decimals.
- Absent is stored as no mark plus an absent flag (shown as "AB"), never as zero.

If the school decides a different split or subject list, change the constants below.
"""
from decimal import Decimal, InvalidOperation
from typing import List, Optional, Tuple

TWO_PAPER_SUBJECTS = {"Hindi", "English", "Mathematics"}
SPLIT_EXAMS = {"Terminal", "Half-yearly"}
FIRST_TWO_PAPER_GRADE = 6
MAX_DECIMALS = 2


def parts_for(exam_name: str, exam_max: int, grade: str, subject_name: str) -> List[Tuple[int, int]]:
    """The (part number, maximum marks) pairs for one subject in one exam and class."""
    two_papers = (
        exam_name in SPLIT_EXAMS
        and subject_name in TWO_PAPER_SUBJECTS
        and grade.isdigit()
        and int(grade) >= FIRST_TWO_PAPER_GRADE
    )
    if two_papers:
        first = exam_max // 2
        return [(1, first), (2, exam_max - first)]
    return [(1, exam_max)]


def mark_problem(marks, max_marks: int) -> Optional[str]:
    """Why ``marks`` cannot be stored for a part with this maximum, or None if it is fine."""
    try:
        value = marks if isinstance(marks, Decimal) else Decimal(str(marks))
    except (InvalidOperation, ValueError):
        return "is not a number"
    if not value.is_finite():
        return "is not a number"
    if value < 0:
        return "cannot be below 0"
    if value > max_marks:
        return f"is above the maximum of {max_marks}"
    if value.as_tuple().exponent < -MAX_DECIMALS:
        return f"can have at most {MAX_DECIMALS} decimal places"
    return None
