"""Rules for fee collection analytics (issue #37). Pure functions, no database.

- Money is whole rupees. What is owed on an invoice is amount - discount (``fee_rules.balance``).
- ``paid`` is the sum of the payments including reversals (negative rows), so a reversed payment
  is not counted as collected.
- Outstanding counts only invoices that still have a balance (never a negative balance).
- Overdue is the part of the outstanding balance whose due date has passed.
- Collection rate = collected / net due, in percent to 1 decimal. It is None when nothing is due
  (for example only free-tuition invoices), never 0% or 100%.
"""
from datetime import date
from typing import Dict, Iterable, List, Optional, Tuple

from src.services.fee_rules import balance

# (amount, discount, paid, due_date)
InvoiceRow = Tuple[int, int, int, date]


def collection_rate(collected: int, net_due: int) -> Optional[float]:
    """Percent collected to 1 decimal, or None when nothing is due."""
    if net_due <= 0:
        return None
    return round(collected / net_due * 100, 1)


def days_overdue(due_date: date, today: date) -> int:
    """Whole days past the due date (0 when not yet due or due today)."""
    return max((today - due_date).days, 0)


def summarize_invoices(rows: Iterable[InvoiceRow], today: date) -> Dict[str, Optional[float]]:
    """Totals of a group of invoices."""
    totals = {"invoices": 0, "billed": 0, "discount": 0, "net_due": 0, "collected": 0,
              "outstanding": 0, "overdue": 0, "overdue_invoices": 0}
    for amount, discount, paid, due_date in rows:
        left = balance(amount, discount, paid)
        totals["invoices"] += 1
        totals["billed"] += amount
        totals["discount"] += discount
        totals["net_due"] += amount - discount
        totals["collected"] += paid
        if left > 0:
            totals["outstanding"] += left
            if today > due_date:
                totals["overdue"] += left
                totals["overdue_invoices"] += 1
    totals["collection_rate"] = collection_rate(totals["collected"], totals["net_due"])
    return totals


def student_dues(rows: Iterable[InvoiceRow], today: date) -> Dict[str, object]:
    """What one student owes: total balance, the overdue part, the oldest overdue due date and its age."""
    owed = overdue = overdue_invoices = pending_invoices = 0
    oldest: Optional[date] = None
    for amount, discount, paid, due_date in rows:
        left = balance(amount, discount, paid)
        if left <= 0:
            continue
        owed += left
        if today > due_date:
            overdue += left
            overdue_invoices += 1
            oldest = due_date if oldest is None or due_date < oldest else oldest
        else:
            pending_invoices += 1
    return {"balance": owed, "overdue": overdue, "pending": owed - overdue,
            "overdue_invoices": overdue_invoices, "pending_invoices": pending_invoices,
            "oldest_due_date": oldest, "days_overdue": days_overdue(oldest, today) if oldest else 0}


def follow_up_order(kind: str, student: Dict[str, object]) -> Tuple:
    """Sort key for the follow-up list: the biggest amount first, then the oldest debt."""
    if kind == "overdue":
        return (-int(student["overdue"]), student["oldest_due_date"] or date.max, str(student["name"]))
    return (-int(student["pending"]), str(student["name"]))


def is_in_list(kind: str, dues: Dict[str, object]) -> bool:
    """overdue: something is past its due date. pending: a balance exists and none of it is overdue."""
    if kind == "overdue":
        return int(dues["overdue"]) > 0
    return int(dues["pending"]) > 0 and int(dues["overdue"]) == 0
