"""Fee collection analytics (issue #37): rules and API.

Run from backend/:   python -m pytest tests_school/test_fee_analytics_api.py -q --noconftest
"""
from datetime import date

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from src.api.v1.routers import fee_analytics
from src.core.models import DBStudent, User, UserRole, get_db
from src.core.models.school_models import DBClassSection, DBFeeInvoice, DBFeePayment, DBRoute
from src.services.fee_analytics_rules import (collection_rate, days_overdue, follow_up_order, is_in_list,
                                              student_dues, summarize_invoices)
from src.utils.auth_utils import get_current_active_user_from_any_source

from .helpers import async_url, migrate

TODAY = date(2026, 11, 26)
ADMIN = User(id=1, username="admin", email="a@example.test", role=UserRole.ADMIN)
CLERK = User(id=4, username="clerk", email="c@example.test", role=UserRole.ACCOUNTANT)
TEACHER = User(id=2, username="ta", email="ta@example.test", role=UserRole.TEACHER)
DRIVER = User(id=6, username="drv", email="d@example.test", role=UserRole.DRIVER)


# ---- the rules on their own ----------------------------------------------------------------

def test_collection_rate_is_none_when_nothing_is_due():
    assert collection_rate(1400, 5600) == 25.0
    assert collection_rate(1, 3) == 33.3
    assert collection_rate(0, 600) == 0.0
    assert collection_rate(0, 0) is None             # free tuition only: not 0% and not 100%


def test_days_overdue():
    assert days_overdue(date(2026, 11, 25), TODAY) == 1
    assert days_overdue(TODAY, TODAY) == 0           # due today is not overdue yet
    assert days_overdue(date(2026, 12, 15), TODAY) == 0


def test_summarize_invoices():
    rows = [(600, 0, 600, date(2026, 4, 15)),        # paid
            (600, 0, 0, date(2026, 10, 15)),         # overdue 600
            (600, 600, 0, date(2026, 10, 15)),       # free: nothing due
            (500, 0, 250, date(2026, 12, 15)),       # half paid, not yet due
            (400, 0, 0, TODAY)]                      # due today: not overdue
    totals = summarize_invoices(rows, TODAY)
    assert totals == {"invoices": 5, "billed": 2700, "discount": 600, "net_due": 2100, "collected": 850,
                      "outstanding": 1250, "overdue": 600, "overdue_invoices": 1, "collection_rate": 40.5}


def test_summarize_edge_cases():
    nothing = summarize_invoices([], TODAY)
    assert nothing["invoices"] == 0 and nothing["collection_rate"] is None and nothing["outstanding"] == 0
    free = summarize_invoices([(600, 600, 0, date(2026, 4, 1))], TODAY)
    assert free["net_due"] == 0 and free["outstanding"] == 0 and free["collection_rate"] is None
    over = summarize_invoices([(600, 0, 700, date(2026, 4, 1))], TODAY)           # overpaid: never a negative balance
    assert over["outstanding"] == 0 and over["overdue"] == 0 and over["collected"] == 700


def test_student_dues_and_list_membership():
    rows = [(600, 0, 200, date(2026, 11, 15)), (400, 0, 0, date(2026, 10, 15)), (600, 0, 0, date(2026, 12, 15)),
            (600, 600, 0, date(2026, 4, 15))]
    dues = student_dues(rows, TODAY)
    assert (dues["balance"], dues["overdue"], dues["pending"]) == (1400, 800, 600)
    assert (dues["overdue_invoices"], dues["pending_invoices"]) == (2, 1)
    assert (dues["oldest_due_date"], dues["days_overdue"]) == (date(2026, 10, 15), 42)
    assert is_in_list("overdue", dues) and not is_in_list("pending", dues)       # overdue students are not "pending"
    only_pending = student_dues([(600, 0, 0, date(2026, 12, 15))], TODAY)
    assert is_in_list("pending", only_pending) and not is_in_list("overdue", only_pending)
    clear = student_dues([(600, 0, 600, date(2026, 4, 15))], TODAY)
    assert not is_in_list("pending", clear) and not is_in_list("overdue", clear) and clear["days_overdue"] == 0


def test_follow_up_order_biggest_then_oldest_then_name():
    def row(name, overdue, oldest, pending=0):
        return {"name": name, "overdue": overdue, "oldest_due_date": oldest, "pending": pending}
    rows = [row("Gita", 600, date(2026, 11, 15)), row("Esha", 600, date(2026, 10, 15)), row("Bina", 600, date(2026, 10, 15)),
            row("Asha", 800, date(2026, 11, 15)), row("Dev", 400, date(2026, 10, 15))]
    assert [r["name"] for r in sorted(rows, key=lambda r: follow_up_order("overdue", r))] == ["Asha", "Bina", "Esha", "Gita", "Dev"]
    pending = [row("B", 0, None, 300), row("A", 0, None, 300), row("C", 0, None, 900)]
    assert [r["name"] for r in sorted(pending, key=lambda r: follow_up_order("pending", r))] == ["C", "A", "B"]


# ---- the API ---------------------------------------------------------------------------------

@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setattr(fee_analytics, "today", lambda: TODAY)
    db_file = tmp_path / "school.db"
    migrate(db_file)
    sync_engine = sa.create_engine(f"sqlite:///{db_file}")
    with Session(sync_engine) as s:
        year_id = s.scalar(sa.text("SELECT id FROM academic_years WHERE is_current = 1"))
        sec5 = DBClassSection(academic_year_id=year_id, grade="5", section="A")
        sec6 = DBClassSection(academic_year_id=year_id, grade="6", section="A")
        north = DBRoute(name="North Route", monthly_fee=400)
        east = DBRoute(name="East Route", monthly_fee=450)
        s.add_all([sec5, sec6, north, east])
        s.flush()

        def person(name, section=None, route=None, status="active", mobile=None):
            student = DBStudent(name=name, class_section_id=section.id if section else None, route_id=route.id if route else None,
                                status=status, mobile=mobile, father_name=f"Father of {name}", admission_no=f"S-{name}",
                                created_at=0, updated_at=0)
            s.add(student)
            s.flush()
            return student

        asha = person("Asha", sec5, north, mobile="9000000001")
        bina = person("Bina", sec5)
        chitra = person("Chitra", sec5)
        dev = person("Dev", sec6, north)
        esha = person("Esha", sec6, status="inactive")          # left the school but still owes
        gita = person("Gita")                                    # no class yet
        person("Hari", sec6, east)                               # rides the East route, has no invoices

        def invoice(student, fee_type, period, amount, discount=0):
            month = int(period[5:])
            row = DBFeeInvoice(student_id=student.id, academic_year_id=year_id, fee_type=fee_type, period=period,
                               amount=amount, discount=discount, due_date=date(2026, month, 15))
            s.add(row)
            s.flush()
            return row

        counter = {"n": 0}

        def pay(inv, amount, paid_on, method="cash", reversal_of=None, reason=None):
            counter["n"] += 1
            row = DBFeePayment(invoice_id=inv.id, receipt_no=f"R-{counter['n']:06d}" + ("-X" if reversal_of else ""),
                               amount=amount, paid_on=paid_on, method=method,
                               reversal_of_id=reversal_of.id if reversal_of else None, reason=reason)
            s.add(row)
            s.flush()
            return row

        pay(invoice(asha, "tuition", "2026-10", 600), 600, date(2026, 10, 10))                 # paid
        pay(invoice(asha, "tuition", "2026-11", 600), 200, date(2026, 11, 20), "upi")          # 400 overdue
        invoice(asha, "van", "2026-11", 400)                                                   # 400 overdue
        invoice(asha, "tuition", "2026-12", 600)                                               # not yet due
        invoice(bina, "tuition", "2026-10", 600)                                               # 600 overdue (oldest)
        pay(invoice(bina, "tuition", "2026-11", 600), 600, date(2026, 11, 5))                  # paid
        invoice(chitra, "tuition", "2026-10", 600, discount=600)                               # free tuition: nothing due
        invoice(chitra, "tuition", "2026-12", 600)                                             # not yet due
        van_dev = invoice(dev, "van", "2026-10", 400)
        original = pay(van_dev, 400, date(2026, 10, 12))
        pay(van_dev, -400, date(2026, 10, 20), reversal_of=original, reason="wrong entry")     # reversed: owes again
        invoice(esha, "tuition", "2026-10", 600)
        invoice(gita, "tuition", "2026-11", 600)
        s.commit()
        ids = {"5-A": sec5.id, "6-A": sec6.id, "north": north.id, "east": east.id}

    async_engine = create_async_engine(async_url(db_file), poolclass=NullPool)
    maker = async_sessionmaker(async_engine)      # the app's default settings

    async def override_db():
        async with maker() as session:
            yield session

    app = FastAPI()
    app.include_router(fee_analytics.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db

    class Env:
        pass

    e = Env()
    e.app, e.ids, e.db_file = app, ids, db_file
    e.as_user = lambda user: app.dependency_overrides.__setitem__(get_current_active_user_from_any_source, lambda: user)
    e.client = TestClient(app, raise_server_exceptions=False)
    e.as_user(ADMIN)
    e.overview = lambda q="": e.client.get("/api/fee-analytics/overview" + (f"?{q}" if q else ""))
    e.follow = lambda q="": e.client.get("/api/fee-analytics/follow-up" + (f"?{q}" if q else ""))
    yield e
    e.client.close()
    sync_engine.dispose()


def by_key(rows, key):
    return {row[key]: row for row in rows}


def test_overview_totals(env):
    data = env.overview().json()
    assert data["as_of"] == "2026-11-26" and data["periods"] == ["2026-10", "2026-11", "2026-12"]
    assert data["totals"] == {"invoices": 11, "billed": 6200, "discount": 600, "net_due": 5600, "collected": 1400,
                              "outstanding": 4200, "overdue": 3000, "overdue_invoices": 6, "collection_rate": 25.0}
    assert data["reversals"] == {"count": 1, "amount": 400}                  # the reversed 400 is not collected


def test_overview_by_fee_type(env):
    types = by_key(env.overview().json()["by_fee_type"], "fee_type")
    assert list(types) == ["tuition", "van"]                                    # no exam or other invoices
    assert (types["tuition"]["net_due"], types["tuition"]["collected"], types["tuition"]["outstanding"]) == (4800, 1400, 3400)
    assert (types["van"]["net_due"], types["van"]["collected"], types["van"]["overdue"]) == (800, 0, 800)


def test_overview_by_class_includes_students_without_a_class(env):
    classes = env.overview().json()["by_class"]
    assert [c["name"] for c in classes] == ["5-A", "6-A", "No class"]
    five, six, none = classes
    assert (five["billed"], five["discount"], five["net_due"], five["collected"], five["outstanding"], five["overdue"]) == \
        (4600, 600, 4000, 1400, 2600, 1400)
    assert (five["collection_rate"], five["students_with_overdue"]) == (35.0, 2)
    assert (six["net_due"], six["collected"], six["overdue"], six["collection_rate"], six["students_with_overdue"]) == \
        (1000, 0, 1000, 0.0, 2)                                                 # Dev and the inactive Esha
    assert (none["class_section_id"], none["outstanding"], none["students_with_overdue"]) == (None, 600, 1)


def test_overview_by_route_uses_van_invoices_only(env):
    routes = by_key(env.overview().json()["by_route"], "name")
    north, east = routes["North Route"], routes["East Route"]
    assert (north["riders"], north["monthly_fee"], north["net_due"], north["collected"], north["overdue"]) == (2, 400, 800, 0, 800)
    assert north["collection_rate"] == 0.0
    assert (east["riders"], east["invoices"], east["net_due"], east["collection_rate"]) == (1, 0, 0, None)   # nothing billed: no rate


def test_overview_payments_by_month_and_method_net_of_reversals(env):
    data = env.overview().json()
    assert data["payments_by_month"] == [{"month": "2026-10", "collected": 600}, {"month": "2026-11", "collected": 800}]
    assert data["payments_by_method"] == [{"method": "cash", "collected": 1200}, {"method": "upi", "collected": 200}]


def test_overview_filters(env):
    october = env.overview("period=2026-10").json()
    assert october["filter"] == {"period": "2026-10", "fee_type": None}
    assert october["totals"] == {"invoices": 5, "billed": 2800, "discount": 600, "net_due": 2200, "collected": 600,
                                 "outstanding": 1600, "overdue": 1600, "overdue_invoices": 3, "collection_rate": 27.3}
    assert october["payments_by_month"] == [{"month": "2026-10", "collected": 600}]
    assert october["periods"] == ["2026-10", "2026-11", "2026-12"]            # the picker still lists every month
    van = env.overview("fee_type=van").json()["totals"]
    assert (van["billed"], van["collected"], van["outstanding"]) == (800, 0, 800)
    assert env.overview("period=2027-01").json()["totals"]["invoices"] == 0
    assert env.overview("period=2027-01").json()["totals"]["collection_rate"] is None


def test_bad_filters_are_refused(env):
    for query in ("fee_type=cheese", "period=2026-1", "period=abcd-ef", "period=2026/10"):
        assert env.overview(query).status_code == 422, query
    assert env.follow("period=oct").status_code == 422


def test_follow_up_overdue_list(env):
    data = env.follow().json()
    assert (data["kind"], data["total_students"], data["total_amount"], data["shown"]) == ("overdue", 5, 3000, 5)
    assert [s["name"] for s in data["students"]] == ["Asha", "Bina", "Esha", "Gita", "Dev"]
    asha = data["students"][0]
    assert (asha["overdue"], asha["pending"], asha["balance"], asha["class_name"]) == (800, 600, 1400, "5-A")
    assert (asha["oldest_due_date"], asha["days_overdue"], asha["mobile"], asha["father_name"]) == \
        ("2026-11-15", 11, "9000000001", "Father of Asha")
    bina = data["students"][1]
    assert (bina["oldest_due_date"], bina["days_overdue"]) == ("2026-10-15", 42)
    assert by_key(data["students"], "name")["Esha"]["status"] == "inactive"        # still owes, so still listed
    assert "Chitra" not in [s["name"] for s in data["students"]]                  # free tuition + not yet due: not overdue


def test_follow_up_pending_list_has_only_students_with_nothing_overdue(env):
    data = env.follow("kind=pending").json()
    assert [s["name"] for s in data["students"]] == ["Chitra"]
    assert (data["total_students"], data["total_amount"], data["students"][0]["pending"], data["students"][0]["overdue"]) == (1, 600, 600, 0)


def test_follow_up_filters_and_limit(env):
    assert [s["name"] for s in env.follow(f"class_section_id={env.ids['5-A']}").json()["students"]] == ["Asha", "Bina"]
    assert [s["name"] for s in env.follow(f"route_id={env.ids['north']}").json()["students"]] == ["Asha", "Dev"]
    assert env.follow(f"route_id={env.ids['east']}").json()["students"] == []
    october = env.follow("period=2026-10").json()
    assert [s["name"] for s in october["students"]] == ["Bina", "Esha", "Dev"] and october["total_amount"] == 1600
    limited = env.follow("limit=2").json()
    assert (limited["shown"], limited["total_students"], limited["total_amount"]) == (2, 5, 3000)   # totals cover the whole list
    for bad in ("limit=0", "limit=201", "kind=everything"):
        assert env.follow(bad).status_code == 422, bad


def test_only_the_admin_and_the_office_clerk_can_see_fee_analytics(env):
    env.as_user(CLERK)
    assert env.overview().status_code == 200 and env.follow().status_code == 200
    for user in (TEACHER, DRIVER):
        env.as_user(user)
        assert env.overview().status_code == 403, user.role
        assert env.follow().status_code == 403, user.role
    del env.app.dependency_overrides[get_current_active_user_from_any_source]
    assert env.overview().status_code in (401, 403) and env.follow().status_code in (401, 403)


def test_no_current_session_is_a_clear_404(env):
    engine = sa.create_engine(f"sqlite:///{env.db_file}")
    with engine.begin() as conn:
        conn.execute(sa.text("UPDATE academic_years SET is_current = 0"))
    engine.dispose()
    for response in (env.overview(), env.follow()):
        assert response.status_code == 404 and "session" in response.json()["detail"]
