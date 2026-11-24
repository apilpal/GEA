"""Rules for fee invoices and payments (issue #34). Pure functions, no database.

The school rules (see ROADMAP.md and the GitHub issues):
- Amounts are whole rupees.
- Invoice status is derived, never typed: paid, overdue, partial or unpaid.
- A payment cannot be more than the balance. Receipts are unique and never reused.
- A wrong payment is reversed by a new negative row, never edited or deleted.
"""
from datetime import date
from typing import Optional

RECEIPT_PREFIX = "R-"
RECEIPT_DIGITS = 6
REVERSAL_SUFFIX = "-X"


def balance(amount: int, discount: int, paid: int) -> int:
    """What is still owed. ``paid`` is the sum of the payments including reversals (negative rows)."""
    return amount - discount - paid


def invoice_status(amount: int, discount: int, paid: int, due_date: date, today: date) -> str:
    """paid: nothing left to pay. overdue: balance left after the due date.
    partial: something paid, balance left, not yet due. unpaid: nothing paid, not yet due."""
    left = balance(amount, discount, paid)
    if left <= 0:
        return "paid"
    if today > due_date:
        return "overdue"
    return "partial" if paid > 0 else "unpaid"


def next_receipt_number(latest: Optional[str]) -> str:
    """The receipt number after ``latest`` (the highest regular receipt so far, or None)."""
    number = 0
    if latest and latest.startswith(RECEIPT_PREFIX) and latest[len(RECEIPT_PREFIX):].isdigit():
        number = int(latest[len(RECEIPT_PREFIX):])
    return f"{RECEIPT_PREFIX}{number + 1:0{RECEIPT_DIGITS}d}"


def reversal_receipt_number(original: str) -> str:
    """Receipt number of the row that reverses ``original``."""
    return f"{original}{REVERSAL_SUFFIX}"


def payment_problem(amount: int, left: int) -> Optional[str]:
    """Why a payment of ``amount`` cannot be taken when ``left`` is owed, or None."""
    if amount <= 0:
        return "The amount must be more than 0"
    if left <= 0:
        return "This invoice is already fully paid"
    if amount > left:
        return f"The amount {amount} is more than the balance {left}"
    return None
