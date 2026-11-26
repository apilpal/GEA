"""
Fee collection analytics (Phase 3, issue #37).

Endpoints (all under /api, for the admin and the office clerk, like the Fees page):
- GET /fee-analytics/overview?period=&fee_type=: totals, by fee type, by class, by transport route,
  and payments by month and by method
- GET /fee-analytics/follow-up?kind=&class_section_id=&route_id=&limit=: students to follow up,
  either with overdue fees or with pending fees that are not yet due

Teachers and every other role are refused: fee data is not for them. Everything is computed here on
the server from invoices and payments (src/services/fee_analytics_rules.py). Money is whole rupees,
a reversed payment is not counted as collected, and the status of an invoice is derived, never typed.
"""

from collections import defaultdict
from datetime import date
from typing import Dict, List, Literal, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.routers.analytics import section_order
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import (
    FEE_TYPES,
    DBAcademicYear,
    DBClassSection,
    DBFeeInvoice,
    DBFeePayment,
    DBRoute,
)
from src.services.fee_analytics_rules import (
    follow_up_order,
    is_in_list,
    student_dues,
    summarize_invoices,
)
from src.utils.auth_utils import check_permissions

router = APIRouter()

require_fee_staff = check_permissions([UserRole.ADMIN, UserRole.ACCOUNTANT])

DEFAULT_LIMIT = 50
NO_CLASS = "No class"
NO_ROUTE = "No route"


def today() -> date:
    """Today's date. A function so tests can replace it."""
    return date.today()


async def _current_year(db: AsyncSession) -> DBAcademicYear:
    year = await db.scalar(select(DBAcademicYear).where(DBAcademicYear.is_current.is_(True)))
    if year is None:
        raise HTTPException(status_code=404, detail="There is no current session")
    return year


def _invoice_filter(year: DBAcademicYear, period: Optional[str], fee_type: Optional[str]) -> list:
    conditions = [DBFeeInvoice.academic_year_id == year.id]
    if period:
        conditions.append(DBFeeInvoice.period == period)
    if fee_type:
        conditions.append(DBFeeInvoice.fee_type == fee_type)
    return conditions


def _check_filters(period: Optional[str], fee_type: Optional[str]) -> None:
    if fee_type is not None and fee_type not in FEE_TYPES:
        raise HTTPException(status_code=422, detail=f"Fee type must be one of: {', '.join(FEE_TYPES)}")
    if period is not None and (len(period) != 7 or period[4] != "-" or not (period[:4] + period[5:]).isdigit()):
        raise HTTPException(status_code=422, detail="Period must look like 2026-10")


async def _load(db: AsyncSession, conditions: list):
    """Invoices with their student's class and route and what has been paid on each."""
    paid = {invoice_id: int(total) for invoice_id, total in (await db.execute(
        select(DBFeePayment.invoice_id, func.coalesce(func.sum(DBFeePayment.amount), 0))
        .join(DBFeeInvoice, DBFeeInvoice.id == DBFeePayment.invoice_id)
        .where(*conditions).group_by(DBFeePayment.invoice_id))).all()}
    rows = (await db.execute(
        select(DBFeeInvoice.id, DBFeeInvoice.student_id, DBFeeInvoice.fee_type, DBFeeInvoice.period,
               DBFeeInvoice.amount, DBFeeInvoice.discount, DBFeeInvoice.due_date,
               DBStudent.class_section_id, DBStudent.route_id)
        .outerjoin(DBStudent, DBStudent.id == DBFeeInvoice.student_id)
        .where(*conditions))).all()
    return [{"id": r[0], "student_id": r[1], "fee_type": r[2], "period": r[3], "amount": r[4], "discount": r[5],
             "due_date": r[6], "class_section_id": r[7], "route_id": r[8], "paid": paid.get(r[0], 0)} for r in rows]


def _tuple(invoice: dict) -> Tuple[int, int, int, date]:
    return (invoice["amount"], invoice["discount"], invoice["paid"], invoice["due_date"])


def _group(invoices: List[dict], now: date) -> dict:
    return summarize_invoices((_tuple(i) for i in invoices), now)


def _students_with_overdue(invoices: List[dict], now: date) -> int:
    return len({i["student_id"] for i in invoices if i["amount"] - i["discount"] - i["paid"] > 0 and now > i["due_date"]})


@router.get("/fee-analytics/overview")
async def overview(
    period: Optional[str] = None,
    fee_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_fee_staff),
):
    """Totals and the breakdown by fee type, class, transport route, month and payment method."""
    _check_filters(period, fee_type)
    year = await _current_year(db)
    now = today()
    conditions = _invoice_filter(year, period, fee_type)
    invoices = await _load(db, conditions)

    periods = sorted(p for (p,) in (await db.execute(
        select(DBFeeInvoice.period).where(DBFeeInvoice.academic_year_id == year.id).distinct())).all())

    by_type: Dict[str, List[dict]] = defaultdict(list)
    by_class: Dict[Optional[int], List[dict]] = defaultdict(list)
    by_route: Dict[Optional[int], List[dict]] = defaultdict(list)
    for invoice in invoices:
        by_type[invoice["fee_type"]].append(invoice)
        by_class[invoice["class_section_id"]].append(invoice)
        if invoice["fee_type"] == "van":
            by_route[invoice["route_id"]].append(invoice)

    sections = sorted(await db.scalars(
        select(DBClassSection).where(DBClassSection.academic_year_id == year.id)), key=section_order)
    classes = [{"class_section_id": s.id, "name": f"{s.grade}-{s.section}", **_group(by_class[s.id], now),
                "students_with_overdue": _students_with_overdue(by_class[s.id], now)}
               for s in sections if by_class.get(s.id)]
    unplaced = [i for key, items in by_class.items() if key not in {s.id for s in sections} for i in items]
    if unplaced:
        classes.append({"class_section_id": None, "name": NO_CLASS, **_group(unplaced, now),
                        "students_with_overdue": _students_with_overdue(unplaced, now)})

    routes = {r.id: r for r in await db.scalars(select(DBRoute).order_by(DBRoute.id))}
    riders: Dict[int, int] = {rid: n for rid, n in (await db.execute(
        select(DBStudent.route_id, func.count()).where(DBStudent.status == "active", DBStudent.route_id.is_not(None))
        .group_by(DBStudent.route_id))).all()}
    route_rows = []
    for rid, route in routes.items():
        if by_route.get(rid) or riders.get(rid):
            route_rows.append({"route_id": rid, "name": route.name, "monthly_fee": route.monthly_fee,
                               "riders": riders.get(rid, 0), **_group(by_route.get(rid, []), now)})
    stray = [i for key, items in by_route.items() if key not in routes for i in items]
    if stray:
        route_rows.append({"route_id": None, "name": NO_ROUTE, "monthly_fee": None, "riders": 0, **_group(stray, now)})

    payments = (await db.execute(
        select(DBFeePayment.paid_on, DBFeePayment.method, DBFeePayment.amount, DBFeePayment.reversal_of_id)
        .join(DBFeeInvoice, DBFeeInvoice.id == DBFeePayment.invoice_id).where(*conditions))).all()
    by_month: Dict[str, int] = defaultdict(int)
    by_method: Dict[str, int] = defaultdict(int)
    reversed_total = reversed_count = 0
    for paid_on, method, amount, reversal_of in payments:
        by_month[paid_on.strftime("%Y-%m")] += amount
        by_method[method] += amount
        if reversal_of is not None:
            reversed_total += -amount
            reversed_count += 1

    return {
        "session": year.name,
        "as_of": now.isoformat(),
        "filter": {"period": period, "fee_type": fee_type},
        "periods": periods,
        "fee_types": list(FEE_TYPES),
        "totals": _group(invoices, now),
        "by_fee_type": [{"fee_type": t, **_group(by_type[t], now)} for t in FEE_TYPES if by_type.get(t)],
        "by_class": classes,
        "by_route": route_rows,
        "payments_by_month": [{"month": m, "collected": by_month[m]} for m in sorted(by_month)],
        "payments_by_method": [{"method": m, "collected": by_method[m]} for m in sorted(by_method)],
        "reversals": {"count": reversed_count, "amount": reversed_total},
    }


@router.get("/fee-analytics/follow-up")
async def follow_up(
    kind: Literal["overdue", "pending"] = "overdue",
    class_section_id: Optional[int] = None,
    route_id: Optional[int] = None,
    period: Optional[str] = None,
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_fee_staff),
):
    """Students with fees to follow up. ``overdue``: something is past its due date, biggest amount first.
    ``pending``: a balance that is not yet due and nothing overdue."""
    _check_filters(period, None)
    year = await _current_year(db)
    now = today()
    invoices = await _load(db, _invoice_filter(year, period, None))
    if class_section_id is not None:
        invoices = [i for i in invoices if i["class_section_id"] == class_section_id]
    if route_id is not None:
        invoices = [i for i in invoices if i["route_id"] == route_id]

    per_student: Dict[int, List[dict]] = defaultdict(list)
    for invoice in invoices:
        per_student[invoice["student_id"]].append(invoice)
    people = {s.id: s for s in await db.scalars(select(DBStudent))}
    sections = {s.id: f"{s.grade}-{s.section}" for s in await db.scalars(select(DBClassSection))}

    listed = []
    for student_id, items in per_student.items():
        dues = student_dues((_tuple(i) for i in items), now)
        if not is_in_list(kind, dues):
            continue
        student = people.get(student_id)
        listed.append({
            "student_id": student_id, "name": student.name if student else f"Student {student_id}",
            "admission_no": student.admission_no if student else None, "mobile": student.mobile if student else None,
            "father_name": student.father_name if student else None,
            "status": student.status if student else None,
            "class_name": sections.get(student.class_section_id) if student else None,
            **dues,
        })
    listed.sort(key=lambda s: follow_up_order(kind, s))
    shown = listed[:limit]
    for row in shown:
        row["oldest_due_date"] = row["oldest_due_date"].isoformat() if row["oldest_due_date"] else None
    key = "overdue" if kind == "overdue" else "pending"
    return {"kind": kind, "as_of": now.isoformat(), "total_students": len(listed),
            "total_amount": sum(int(r[key]) for r in listed), "shown": len(shown), "students": shown}
