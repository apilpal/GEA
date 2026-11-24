"""Fee statements and payments (issue #34): rules and API.

Run from backend/:   python -m pytest tests_school/test_fees_api.py -q --noconftest
"""
from datetime import date

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from src.api.v1.routers import fees
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import DBClassSection, DBFeeInvoice
from src.services.fee_rules import (balance, invoice_status, next_receipt_number, payment_problem,
                                    reversal_receipt_number)
from src.utils.auth_utils import get_current_active_user_from_any_source

from .helpers import async_url, migrate

TODAY = date(2026, 11, 18)
ADMIN = User(id=1, username="admin", email="a@example.test", role=UserRole.ADMIN)
CLERK = User(id=4, username="clerk", email="c@example.test", role=UserRole.ACCOUNTANT)
TEACHER = User(id=2, username="ta", email="ta@example.test", role=UserRole.TEACHER)


# ---- the rules on their own ----------------------------------------------------------------

@pytest.mark.parametrize("amount, discount, paid, due, expected", [
    (500, 0, 200, date(2026, 11, 25), "partial"),     # invoice 500, payment 200 -> partial
    (500, 100, 400, date(2026, 11, 25), "paid"),      # invoice 500, discount 100, payment 400 -> paid
    (500, 0, 0, date(2026, 11, 10), "overdue"),       # due on the 10th, unpaid on the 18th
    (500, 0, 200, date(2026, 11, 10), "overdue"),     # partly paid but past due is still overdue
    (500, 0, 0, date(2026, 11, 25), "unpaid"),
    (500, 0, 0, date(2026, 11, 18), "unpaid"),        # due today is not yet overdue
    (500, 500, 0, date(2026, 11, 1), "paid"),         # free tuition (three-children rule): nothing to pay
    (500, 0, 500, date(2026, 11, 1), "paid"),
])
def test_invoice_status(amount, discount, paid, due, expected):
    assert invoice_status(amount, discount, paid, due, TODAY) == expected


def test_balance_counts_reversals_as_negative_payments():
    assert balance(500, 0, 500 + (-500)) == 500
    assert balance(500, 100, 0) == 400


def test_payment_problem():
    assert payment_problem(600, 500) == "The amount 600 is more than the balance 500"
    assert payment_problem(500, 500) is None
    assert payment_problem(0, 500) and payment_problem(-5, 500) and payment_problem(10, 0)


def test_receipt_numbers():
    assert next_receipt_number(None) == "R-000001"
    assert next_receipt_number("R-000009") == "R-000010"
    assert next_receipt_number("garbage") == "R-000001"
    assert reversal_receipt_number("R-000009") == "R-000009-X"


# ---- the API ---------------------------------------------------------------------------------

@pytest.fixture
def env(tmp_path, monkeypatch):
    db_file = tmp_path / "school.db"
    migrate(db_file)
    monkeypatch.setattr(fees, "today", lambda: TODAY)
    sync_engine = sa.create_engine(f"sqlite:///{db_file}")
    with Session(sync_engine) as s:
        year_id = s.scalar(sa.text("SELECT id FROM academic_years WHERE is_current = 1"))
        section = DBClassSection(academic_year_id=year_id, grade="5", section="A")
        s.add(section)
        s.flush()
        asha = DBStudent(name="Asha", class_section_id=section.id, roll_no=1, status="active",
                         admission_no="A-1", mobile="9000000001", created_at=0, updated_at=0)
        bina = DBStudent(name="Bina", class_section_id=section.id, roll_no=2, status="active",
                         admission_no="A-2", mobile="9000000002", created_at=0, updated_at=0)
        s.add_all([asha, bina])
        s.flush()

        def invoice(student, fee_type, period, amount, discount, due):
            inv = DBFeeInvoice(student_id=student.id, academic_year_id=year_id, fee_type=fee_type, period=period,
                               amount=amount, discount=discount, due_date=due)
            s.add(inv)
            s.flush()
            return inv.id

        inv = {
            "open": invoice(asha, "tuition", "2026-11", 500, 0, date(2026, 11, 25)),       # not yet due
            "discounted": invoice(asha, "tuition", "2026-12", 500, 100, date(2026, 12, 15)),
            "overdue": invoice(asha, "van", "2026-10", 500, 0, date(2026, 10, 15)),        # past due
            "free": invoice(asha, "tuition", "2026-09", 600, 600, date(2026, 9, 15)),      # fully discounted
            "bina": invoice(bina, "tuition", "2026-11", 600, 0, date(2026, 11, 25)),
        }
        s.commit()
        sid = {"Asha": asha.id, "Bina": bina.id}
        section_id = section.id

    async_engine = create_async_engine(async_url(db_file), poolclass=NullPool)
    maker = async_sessionmaker(async_engine)  # same defaults as the real app (objects expire on commit)

    async def override_db():
        async with maker() as session:
            yield session

    app = FastAPI()
    app.include_router(fees.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db

    class Env:
        pass

    e = Env()
    e.app, e.inv, e.sid, e.section_id, e.engine = app, inv, sid, section_id, sync_engine
    e.as_user = lambda user: app.dependency_overrides.__setitem__(get_current_active_user_from_any_source, lambda: user)

    def payments():
        with sync_engine.connect() as conn:
            return conn.execute(sa.text(
                "SELECT receipt_no, invoice_id, amount, reversal_of_id FROM fee_payments ORDER BY id")).all()

    e.payments = payments
    e.client = TestClient(app, raise_server_exceptions=False)
    e.as_user(CLERK)
    yield e
    e.client.close()
    sync_engine.dispose()


def pay(env, invoice, amount, **extra):
    return env.client.post("/api/fees/payments", json={"invoice_id": env.inv[invoice], "amount": amount, **extra})


def statement(env, student="Asha"):
    return env.client.get(f"/api/fees/students/{env.sid[student]}").json()


def invoice_of(env, name, student="Asha"):
    return next(i for i in statement(env, student)["invoices"] if i["invoice_id"] == env.inv[name])


def test_statement_shows_derived_status_and_balance_without_payments(env):
    body = statement(env)
    status = {i["invoice_id"]: (i["status"], i["balance"]) for i in body["invoices"]}
    assert status[env.inv["open"]] == ("unpaid", 500)
    assert status[env.inv["discounted"]] == ("unpaid", 400)
    assert status[env.inv["overdue"]] == ("overdue", 500)
    assert status[env.inv["free"]] == ("paid", 0)          # three-children free tuition
    assert body["totals"] == {"billed": 2100, "discount": 700, "paid": 0, "balance": 1400, "overdue": 500}
    assert body["student"]["name"] == "Asha" and body["student"]["class_name"] == "5-A"


def test_partial_payment_then_full(env):
    r = pay(env, "open", 200)
    assert r.status_code == 200 and r.json()["balance"] == 300 and r.json()["receipt_no"] == "R-000001"
    assert invoice_of(env, "open")["status"] == "partial"
    assert invoice_of(env, "open")["balance"] == 300
    assert pay(env, "open", 300).json()["receipt_no"] == "R-000002"   # each payment has its own receipt
    assert invoice_of(env, "open")["status"] == "paid"


def test_discounted_invoice_is_paid_with_the_net_amount(env):
    assert pay(env, "discounted", 400).status_code == 200
    assert invoice_of(env, "discounted")["status"] == "paid"


def test_overpayment_is_rejected_and_nothing_is_written(env):
    r = pay(env, "open", 600)
    assert r.status_code == 422 and "more than the balance 500" in r.json()["detail"]
    assert env.payments() == []
    pay(env, "open", 500)
    assert pay(env, "open", 1).status_code == 422            # already fully paid
    assert pay(env, "free", 1).status_code == 422            # nothing to pay on a free invoice


@pytest.mark.parametrize("amount", [0, -50, 12.5, "abc"])
def test_amount_must_be_a_positive_whole_number(env, amount):
    assert pay(env, "open", amount).status_code == 422
    assert env.payments() == []


def test_future_date_and_unknown_invoice_are_rejected(env):
    assert pay(env, "open", 100, paid_on="2026-11-19").status_code == 422
    assert pay(env, "open", 100, paid_on="2026-11-10").status_code == 200       # a past date is fine
    assert env.client.post("/api/fees/payments", json={"invoice_id": 99999, "amount": 10}).status_code == 404


def test_receipts_are_unique_and_never_reused(env):
    first = pay(env, "open", 100).json()["receipt_no"]
    second = pay(env, "bina", 200).json()["receipt_no"]
    assert first == "R-000001" and second == "R-000002"
    env.as_user(ADMIN)
    pid = invoice_of(env, "open")["payments"][0]["payment_id"]
    assert env.client.post(f"/api/fees/payments/{pid}/reverse", json={"reason": "wrong amount"}).status_code == 200
    assert pay(env, "bina", 100).json()["receipt_no"] == "R-000003"   # the reversed receipt number is not reused


def test_a_taken_receipt_number_is_skipped(env, monkeypatch):
    pay(env, "open", 100)                                             # R-000001 exists
    calls = iter(["R-000001", "R-000002"])                            # first guess clashes, second is free
    monkeypatch.setattr(fees, "next_receipt_number", lambda latest: next(calls))
    r = pay(env, "bina", 100)
    assert r.status_code == 200 and r.json()["receipt_no"] == "R-000002"
    assert [p[0] for p in env.payments()] == ["R-000001", "R-000002"]


def test_reversal_restores_balance_and_keeps_both_rows_visible(env):
    pay(env, "open", 200)
    env.as_user(ADMIN)
    original = invoice_of(env, "open")["payments"][0]
    r = env.client.post(f"/api/fees/payments/{original['payment_id']}/reverse", json={"reason": "entered by mistake"})
    assert r.status_code == 200 and r.json() == {"receipt_no": "R-000001-X", "reverses": "R-000001",
                                                  "invoice_id": env.inv["open"], "amount": -200}
    after = invoice_of(env, "open")
    assert after["balance"] == 500 and after["status"] == "unpaid" and after["paid"] == 0
    rows = after["payments"]
    assert [(p["amount"], p["is_reversal"], p["is_reversed"]) for p in rows] == [(200, False, True), (-200, True, False)]
    assert rows[1]["reason"] == "entered by mistake"
    assert env.payments() == [("R-000001", env.inv["open"], 200, None),
                              ("R-000001-X", env.inv["open"], -200, original["payment_id"])]


def test_reversal_rules(env):
    pay(env, "open", 200)
    pid = invoice_of(env, "open")["payments"][0]["payment_id"]
    env.as_user(CLERK)
    assert env.client.post(f"/api/fees/payments/{pid}/reverse", json={"reason": "mistake"}).status_code == 403
    env.as_user(ADMIN)
    assert env.client.post(f"/api/fees/payments/{pid}/reverse", json={"reason": "no"}).status_code == 422   # reason too short
    assert env.client.post(f"/api/fees/payments/{pid}/reverse", json={}).status_code == 422
    assert env.client.post("/api/fees/payments/99999/reverse", json={"reason": "mistake"}).status_code == 404
    assert env.client.post(f"/api/fees/payments/{pid}/reverse", json={"reason": "mistake"}).status_code == 200
    assert env.client.post(f"/api/fees/payments/{pid}/reverse", json={"reason": "again"}).status_code == 422    # only once
    reversal_id = invoice_of(env, "open")["payments"][1]["payment_id"]
    assert env.client.post(f"/api/fees/payments/{reversal_id}/reverse", json={"reason": "undo"}).status_code == 422
    assert len(env.payments()) == 2


def test_a_reversed_payment_can_be_paid_again(env):
    pay(env, "open", 500)
    env.as_user(ADMIN)
    pid = invoice_of(env, "open")["payments"][0]["payment_id"]
    env.client.post(f"/api/fees/payments/{pid}/reverse", json={"reason": "wrong student"})
    assert pay(env, "open", 500).status_code == 200
    assert invoice_of(env, "open")["status"] == "paid"


def test_failed_save_writes_nothing(env, monkeypatch):
    async def boom(self):
        raise RuntimeError("disk full")
    monkeypatch.setattr(AsyncSession, "commit", boom)
    assert pay(env, "open", 100).status_code == 500
    assert env.payments() == []


def test_class_list_for_the_filter(env):
    assert env.client.get("/api/fees/classes").json() == [{"id": env.section_id, "name": "5-A"}]


def test_find_students(env):
    assert env.client.get("/api/fees/students").json() == []                 # no search, no class: nothing
    by_name = env.client.get("/api/fees/students", params={"q": "asha"}).json()
    assert [(s["name"], s["balance"], s["overdue"], s["class_name"]) for s in by_name] == [("Asha", 1400, 500, "5-A")]
    by_class = env.client.get("/api/fees/students", params={"class_section_id": env.section_id}).json()
    assert [(s["name"], s["balance"]) for s in by_class] == [("Asha", 1400), ("Bina", 600)]
    assert [s["name"] for s in env.client.get("/api/fees/students", params={"q": "A-2"}).json()] == ["Bina"]  # admission no.
    pay(env, "bina", 600)
    assert env.client.get("/api/fees/students", params={"q": "Bina"}).json()[0]["balance"] == 0


def test_clerk_and_admin_may_use_fees_teachers_and_anonymous_may_not(env):
    env.as_user(ADMIN)
    assert pay(env, "open", 100).status_code == 200
    env.as_user(TEACHER)
    assert pay(env, "open", 100).status_code == 403
    assert env.client.get(f"/api/fees/students/{env.sid['Asha']}").status_code == 403
    assert env.client.get("/api/fees/students", params={"q": "a"}).status_code == 403
    assert len(env.payments()) == 1
    del env.app.dependency_overrides[get_current_active_user_from_any_source]
    assert pay(env, "open", 100).status_code in (401, 403)
    assert len(env.payments()) == 1
    env.as_user(CLERK)
    assert env.client.get("/api/fees/students/99999").status_code == 404
