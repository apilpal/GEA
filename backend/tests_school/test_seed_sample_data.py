"""The sample-data seed: 75 students, 5 drivers, fee 500, safe to run repeatedly.

Run from backend/:   python -m pytest tests_school -q
"""
import hashlib

import pytest
from sqlalchemy import select

import seed_sample_data as seed_module
from src.core.models.models import DBDriver, DBStudent

from .helpers import migrate, run_with_session


@pytest.fixture
def db_path(tmp_path):
    path = tmp_path / "seed.db"
    migrate(path)
    return path


def seed(db_path, reset=False):
    return run_with_session(db_path, lambda s: seed_module.seed(s, reset=reset))


def snapshot(db_path):
    async def read(s):
        students = (await s.execute(select(DBStudent.name, DBStudent.mobile, DBStudent.class_,
                                           DBStudent.fees, DBStudent.route).order_by(DBStudent.mobile))).all()
        drivers = (await s.execute(select(DBDriver.name, DBDriver.route, DBDriver.license_number)
                                   .order_by(DBDriver.name))).all()
        return students, drivers
    return run_with_session(db_path, read)


def add_row(db_path, model, **values):
    async def add(s):
        s.add(model(created_at=1, updated_at=1, **values))
        await s.commit()
    run_with_session(db_path, add)


def test_seeds_75_students_and_5_drivers_with_fee_500(db_path):
    result = seed(db_path)
    students, drivers = snapshot(db_path)

    assert (len(students), len(drivers)) == (75, 5)
    assert result["created_students"] == 75 and result["created_drivers"] == 5
    assert {s.fees for s in students} == {500.0}
    assert sum(s.fees for s in students) == 37500
    assert len({s.mobile for s in students}) == 75
    assert {str(s.class_) for s in students} <= {"6", "7", "8", "9", "10", "11", "12"}
    assert {s.route for s in students} == {d.route for d in drivers}


def test_running_twice_gives_exactly_the_same_data(db_path):
    seed(db_path)
    first = snapshot(db_path)
    seed(db_path)
    second = snapshot(db_path)

    assert first == second
    assert hashlib.md5(repr(first).encode()).hexdigest() == hashlib.md5(repr(second).encode()).hexdigest()


def test_keeps_students_and_drivers_the_user_added(db_path):
    # two siblings share a mobile number; neither is sample data
    add_row(db_path, DBStudent, name="Real Kid One", mobile="7777777777", class_="5", fees=300, route="Route X", status="active")
    add_row(db_path, DBStudent, name="Real Kid Two", mobile="7777777777", class_="6", fees=300, route="Route X", status="active")
    add_row(db_path, DBDriver, name="Real Driver", route="Route X", status="active",
            vehicle_number="TRK-9", contact_number="6666666666", license_number="REAL-1")

    result = seed(db_path)
    seed(db_path)  # again: still nothing of theirs lost or duplicated
    students, drivers = snapshot(db_path)

    assert result["other_students"] == 2 and result["other_drivers"] == 1
    assert len(students) == 77 and len(drivers) == 6
    assert {s.name for s in students} >= {"Real Kid One", "Real Kid Two"}
    assert "Real Driver" in {d.name for d in drivers}


def test_removes_sample_rows_made_by_older_versions(db_path):
    add_row(db_path, DBStudent, name="Alice Johnson", mobile="1234567890", class_="5", fees=100, route="Route 1", status="active")
    add_row(db_path, DBDriver, name="Driver Alex", route="Route 1", status="active",
            vehicle_number="ABC-1234", contact_number="6789012345", license_number="DL123456789")

    result = seed(db_path)
    students, drivers = snapshot(db_path)

    assert (result["removed_students"], result["removed_drivers"]) == (1, 1)
    assert (len(students), len(drivers)) == (75, 5)
    assert "Alice Johnson" not in {s.name for s in students}


def test_same_name_with_a_different_mobile_is_not_treated_as_sample_data(db_path):
    add_row(db_path, DBStudent, name="Avery Johnson", mobile="5550001111", class_="5", fees=100, route="Route 1", status="active")

    seed(db_path)
    students, _ = snapshot(db_path)

    assert len(students) == 76  # the real Avery Johnson is kept next to the sample one


def test_reset_deletes_everything_first(db_path):
    add_row(db_path, DBStudent, name="Real Kid", mobile="7777777777", class_="5", fees=300, route="Route X", status="active")

    result = seed(db_path, reset=True)
    students, drivers = snapshot(db_path)

    assert result["removed_students"] == 1
    assert (len(students), len(drivers)) == (75, 5)
    assert "Real Kid" not in {s.name for s in students}
