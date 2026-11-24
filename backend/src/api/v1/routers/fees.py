"""
Fee statements and payments (Phase 2, issue #34).

Endpoints (all under /api, for the admin and the office clerk):
- GET  /fees/classes: the classes of the current session (for the class filter)
- GET  /fees/students?q=&class_section_id=: find students and see what each owes
- GET  /fees/students/{student_id}: the fee statement of one student (invoices and payments)
- POST /fees/payments: record a payment against an invoice (a unique receipt number is issued)
- POST /fees/payments/{payment_id}/reverse: reverse a wrong payment (admin only)

Rules:
- Whole rupees. Invoice status is derived (paid, overdue, partial, unpaid), never typed.
- A payment cannot be more than the balance, and cannot be dated in the future.
- Receipt numbers are unique and never reused.
- A payment is never edited or deleted. A wrong one is reversed by a new negative row linked to
  the original, with a reason; the original stays visible and the balance is restored.
"""

from datetime import date, datetime
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import DBAcademicYear, DBClassSection, DBFeeInvoice, DBFeePayment
from src.services.fee_rules import (
    RECEIPT_DIGITS,
    RECEIPT_PREFIX,
    balance,
    invoice_status,
    next_receipt_number,
    payment_problem,
    reversal_receipt_number,
)
from src.utils.auth_utils import check_permissions

router = APIRouter()

require_fee_staff = check_permissions([UserRole.ADMIN, UserRole.ACCOUNTANT])
require_admin_only = check_permissions([UserRole.ADMIN])

SEARCH_LIMIT = 30
RECEIPT_RETRIES = 3
Method = Literal["cash", "upi", "bank", "other"]


def today() -> date:
    """Today's date. A function so tests can replace it."""
    return date.today()


class PaymentRequest(BaseModel):
    invoice_id: int
    amount: int = Field(description="Whole rupees")
    paid_on: Optional[date] = None
    method: Method = "cash"


class ReverseRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=200)


def _class_name(section: Optional[DBClassSection]) -> Optional[str]:
    return f"{section.grade}-{section.section}" if section else None


async def _paid_by_invoice(db: AsyncSession, invoice_ids: List[int]) -> Dict[int, int]:
    """Sum of payments (reversals are negative) for each invoice."""
    if not invoice_ids:
        return {}
    rows = await db.execute(
        select(DBFeePayment.invoice_id, func.coalesce(func.sum(DBFeePayment.amount), 0))
        .where(DBFeePayment.invoice_id.in_(invoice_ids)).group_by(DBFeePayment.invoice_id)
    )
    return {invoice_id: int(total) for invoice_id, total in rows.all()}


@router.get("/fees/classes")
async def list_classes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_fee_staff),
):
    """Classes of the current session, for the class filter."""
    sections = list(await db.scalars(
        select(DBClassSection).join(DBAcademicYear, DBAcademicYear.id == DBClassSection.academic_year_id)
        .where(DBAcademicYear.is_current.is_(True))))
    early = {"P.G": 0, "P.G.": 0, "L.K.G.": 1, "U.K.G.": 2}

    def order(s: DBClassSection):
        if s.grade in early:
            return (early[s.grade], 0, s.section)
        return (3, int(s.grade), s.section) if s.grade.isdigit() else (4, 0, s.grade + s.section)

    return [{"id": s.id, "name": _class_name(s)} for s in sorted(sections, key=order)]


@router.get("/fees/students")
async def find_students(
    q: str = "",
    class_section_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_fee_staff),
):
    """Students matching the name or admission number and/or a class, with what each owes.
    Without a search text or a class nothing is listed (the school has hundreds of students)."""
    text = q.strip()
    if not text and class_section_id is None:
        return []
    query = select(DBStudent).where(DBStudent.status == "active")
    if text:
        like = f"%{text}%"
        query = query.where(or_(DBStudent.name.ilike(like), DBStudent.admission_no.ilike(like),
                                DBStudent.mobile.like(like)))
    if class_section_id is not None:
        query = query.where(DBStudent.class_section_id == class_section_id)
    students = list(await db.scalars(query.order_by(DBStudent.name, DBStudent.id).limit(SEARCH_LIMIT)))
    ids = [s.id for s in students]

    sections = {s.id: s for s in await db.scalars(select(DBClassSection))} if ids else {}
    invoices_by_student: Dict[int, list] = {i: [] for i in ids}
    paid: Dict[int, int] = {}
    if ids:
        invoices = list(await db.scalars(select(DBFeeInvoice).where(DBFeeInvoice.student_id.in_(ids))))
        paid = await _paid_by_invoice(db, [i.id for i in invoices])
        for invoice in invoices:
            invoices_by_student[invoice.student_id].append(invoice)

    now = today()
    result = []
    for student in students:
        owed = overdue = 0
        for invoice in invoices_by_student[student.id]:
            left = balance(invoice.amount, invoice.discount, paid.get(invoice.id, 0))
            if left > 0:
                owed += left
                if now > invoice.due_date:
                    overdue += left
        result.append({"student_id": student.id, "name": student.name, "roll_no": student.roll_no,
                       "admission_no": student.admission_no, "mobile": student.mobile,
                       "class_name": _class_name(sections.get(student.class_section_id)),
                       "balance": owed, "overdue": overdue})
    return result


@router.get("/fees/students/{student_id}")
async def student_statement(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_fee_staff),
):
    """Invoices and payments of one student, with the derived status and balance of each invoice."""
    student = await db.get(DBStudent, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    section = await db.get(DBClassSection, student.class_section_id) if student.class_section_id else None

    invoices = list(await db.scalars(
        select(DBFeeInvoice).where(DBFeeInvoice.student_id == student_id)
        .order_by(DBFeeInvoice.period, DBFeeInvoice.fee_type)))
    payments_by_invoice: Dict[int, List[DBFeePayment]] = {i.id: [] for i in invoices}
    if invoices:
        for payment in await db.scalars(
            select(DBFeePayment).where(DBFeePayment.invoice_id.in_(list(payments_by_invoice)))
            .order_by(DBFeePayment.id)
        ):
            payments_by_invoice[payment.invoice_id].append(payment)

    now = today()
    totals = {"billed": 0, "discount": 0, "paid": 0, "balance": 0, "overdue": 0}
    rows = []
    for invoice in invoices:
        payments = payments_by_invoice[invoice.id]
        paid = sum(p.amount for p in payments)
        left = balance(invoice.amount, invoice.discount, paid)
        status = invoice_status(invoice.amount, invoice.discount, paid, invoice.due_date, now)
        reversed_ids = {p.reversal_of_id for p in payments if p.reversal_of_id is not None}
        totals["billed"] += invoice.amount
        totals["discount"] += invoice.discount
        totals["paid"] += paid
        if left > 0:
            totals["balance"] += left
            if status == "overdue":
                totals["overdue"] += left
        rows.append({
            "invoice_id": invoice.id, "fee_type": invoice.fee_type, "period": invoice.period,
            "amount": invoice.amount, "discount": invoice.discount, "discount_reason": invoice.discount_reason,
            "due_date": invoice.due_date.isoformat(), "paid": paid, "balance": max(left, 0), "status": status,
            "payments": [
                {"payment_id": p.id, "receipt_no": p.receipt_no, "amount": p.amount,
                 "paid_on": p.paid_on.isoformat(), "method": p.method,
                 "is_reversal": p.reversal_of_id is not None, "is_reversed": p.id in reversed_ids,
                 "reason": p.reason}
                for p in payments
            ],
        })
    return {
        "student": {"student_id": student.id, "name": student.name, "roll_no": student.roll_no,
                    "admission_no": student.admission_no, "mobile": student.mobile,
                    "father_name": student.father_name, "class_name": _class_name(section)},
        "totals": totals,
        "invoices": rows,
    }


def _latest_regular_receipt_query():
    pattern = RECEIPT_PREFIX + "_" * RECEIPT_DIGITS  # R- plus exactly 6 characters: not reversal rows
    return select(DBFeePayment.receipt_no).where(DBFeePayment.receipt_no.like(pattern)) \
        .order_by(DBFeePayment.receipt_no.desc()).limit(1)


@router.post("/fees/payments")
async def record_payment(
    payload: PaymentRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_fee_staff),
):
    """Record a payment against one invoice and issue the next receipt number."""
    paid_on = payload.paid_on or today()
    if paid_on > today():
        raise HTTPException(status_code=422, detail="The payment date cannot be in the future")

    for attempt in range(RECEIPT_RETRIES):
        invoice = await db.get(DBFeeInvoice, payload.invoice_id)
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        invoice_id, student_id = invoice.id, invoice.student_id
        paid = (await _paid_by_invoice(db, [invoice_id])).get(invoice_id, 0)
        left = balance(invoice.amount, invoice.discount, paid)
        problem = payment_problem(payload.amount, left)
        if problem:
            raise HTTPException(status_code=422, detail=problem)

        receipt = next_receipt_number(await db.scalar(_latest_regular_receipt_query()))
        db.add(DBFeePayment(invoice_id=invoice_id, receipt_no=receipt, amount=payload.amount, paid_on=paid_on,
                            method=payload.method, recorded_by=user.id, created_at=datetime.utcnow()))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()  # another receipt took this number a moment ago: try the next one
            continue
        except Exception:
            await db.rollback()
            raise HTTPException(status_code=500, detail="The payment could not be saved; nothing was changed")
        # Plain values only: ORM objects are expired after the commit.
        return {"receipt_no": receipt, "invoice_id": invoice_id, "student_id": student_id,
                "amount": payload.amount, "paid_on": paid_on.isoformat(), "method": payload.method,
                "balance": left - payload.amount}
    raise HTTPException(status_code=409, detail="Could not issue a receipt number; please try again")


@router.post("/fees/payments/{payment_id}/reverse")
async def reverse_payment(
    payment_id: int,
    payload: ReverseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_only),
):
    """Reverse a payment with a new negative row linked to it. Only the admin can do this."""
    original = await db.get(DBFeePayment, payment_id)
    if original is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if original.reversal_of_id is not None or original.amount <= 0:
        raise HTTPException(status_code=422, detail="A reversal cannot be reversed")
    if await db.scalar(select(DBFeePayment.id).where(DBFeePayment.reversal_of_id == payment_id)):
        raise HTTPException(status_code=422, detail="This payment is already reversed")

    invoice_id, amount, receipt, method = original.invoice_id, original.amount, original.receipt_no, original.method
    reversal_receipt = reversal_receipt_number(receipt)
    try:
        db.add(DBFeePayment(invoice_id=invoice_id, receipt_no=reversal_receipt, amount=-amount, paid_on=today(),
                            method=method, reversal_of_id=payment_id, reason=payload.reason.strip(),
                            recorded_by=user.id, created_at=datetime.utcnow()))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=422, detail="This payment is already reversed")
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="The reversal could not be saved; nothing was changed")
    return {"receipt_no": reversal_receipt, "reverses": receipt, "invoice_id": invoice_id, "amount": -amount}
