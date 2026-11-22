#!/usr/bin/env python3
"""Realistic fictional school data for development and demos (roadmap issue #30).

Creates, for the 2026-27 session, a school the size of Gurukul Educational Academy:
521 students in the real class sections, 30 teachers, 5 transport routes with 100 van
riders, three exams, daily attendance, Terminal exam marks, and monthly fee invoices
with payments (some partial, some overdue). Families include sibling groups that share
a parent mobile number, so the three-children discount can be tried.

EVERYTHING HERE IS FICTIONAL. Demo students have admission numbers starting ``DEMO-``,
mobile numbers 91xxxxxxxx, demo teachers 92xxxxxxxx and demo drivers 93xxxxxxxx.

Safe by default: running it again changes nothing, and it never deletes or edits rows
it did not create. Run from backend/ after ``python setup_local.py``:

    python seed_school_data.py [--reset-demo [--yes]] [--verbose]

    --reset-demo   delete only the demo rows created by this script (asks first)
    --yes          skip the confirmation for --reset-demo
"""
import os
import random
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from src.core.models import school_models as sm  # noqa: E402
from src.core.models.models import DBDriver, DBStudent  # noqa: E402

DEMO_PREFIX = "DEMO-"
SEED = 2026

# (grade, section, number of students) - the real class list of session 2025-26 (521 students)
CLASS_SIZES = [
    ("P.G", "A", 35),
    ("L.K.G.", "A", 38), ("L.K.G.", "B", 19),
    ("U.K.G.", "A", 33), ("U.K.G.", "B", 36),
    ("1", "A", 30), ("1", "B", 37),
    ("2", "A", 30), ("2", "B", 31),
    ("3", "A", 33), ("3", "B", 27),
    ("4", "A", 26), ("4", "B", 22),
    ("5", "A", 23), ("5", "B", 26),
    ("6", "A", 30), ("7", "A", 27), ("8", "A", 18),
]
TOTAL_STUDENTS = sum(n for _, _, n in CLASS_SIZES)  # 521
TEACHERS = 30
ROUTES = 5
RIDERS = 100
TWO_CHILD_FAMILIES = 40
THREE_CHILD_FAMILIES = 8

GRADE_AGE = {"P.G": 3, "L.K.G.": 4, "U.K.G.": 5, **{str(g): g + 5 for g in range(1, 9)}}
TUITION = {"P.G": 550, "L.K.G.": 550, "U.K.G.": 550, "1": 600, "2": 600, "3": 600, "4": 600,
           "5": 650, "6": 650, "7": 650, "8": 650}
SUBJECTS_LOWER = ["Hindi", "English", "Mathematics", "G.K.", "Drawing", "Physical"]
SUBJECTS_PRIMARY = ["Hindi", "English", "Mathematics", "E.V.S.", "G.K.", "Computer", "Drawing", "Physical"]
SUBJECTS_UPPER = ["Hindi", "English", "Mathematics", "Science", "S.S.T.", "G.K.", "Computer",
                  "Drawing", "Physical"]
TWO_PAPER_SUBJECTS = {"Hindi", "English", "Mathematics"}  # parts I and II in classes 6-8

BOYS = ["Aarav", "Vivaan", "Aditya", "Arjun", "Krish", "Ishaan", "Rohan", "Kabir", "Yash", "Dev",
        "Ayush", "Harsh", "Naman", "Pranav", "Shivam", "Tanmay", "Lakshya", "Veer", "Om", "Rudra"]
GIRLS = ["Aanya", "Diya", "Ishita", "Kavya", "Myra", "Nisha", "Pari", "Riya", "Saanvi", "Tanvi",
         "Anika", "Bhavya", "Divya", "Khushi", "Muskan", "Naina", "Palak", "Radhika", "Sneha", "Vani"]
SURNAMES = ["Sharma", "Verma", "Yadav", "Pal", "Gupta", "Singh", "Chauhan", "Mishra", "Tiwari",
            "Dubey", "Kushwaha", "Rathore", "Shakya", "Baghel", "Jaiswal"]
MEN = ["Ramesh", "Suresh", "Mahesh", "Dinesh", "Rajesh", "Mukesh", "Anil", "Sunil", "Vinod", "Ajay"]
WOMEN = ["Sunita", "Geeta", "Meena", "Kavita", "Anita", "Rekha", "Savita", "Poonam", "Neelam", "Rani"]
VILLAGES = ["Demo Kheda", "Demo Nagla", "Demo Pur", "Demo Garhi", "Demo Mau", "Demo Rampur"]
HOUSES = ["Red", "Blue", "Green", "Yellow"]
HOLIDAYS = [(date(2026, 10, 2), "Gandhi Jayanti"), (date(2026, 11, 9), "Demo festival holiday"),
            (date(2026, 12, 25), "Christmas")]
ATTENDANCE_START, ATTENDANCE_END = date(2026, 9, 1), date(2026, 11, 21)
FEE_MONTHS = [(2026, m) for m in range(4, 12)]  # April to November 2026


def _subjects_for(grade: str) -> list:
    if grade in ("P.G", "L.K.G.", "U.K.G."):
        return SUBJECTS_LOWER
    return SUBJECTS_PRIMARY if int(grade) <= 5 else SUBJECTS_UPPER


def _get_or_create(session, model, defaults=None, **keys):
    row = session.scalar(select(model).filter_by(**keys))
    if row is None:
        row = model(**keys, **(defaults or {}))
        session.add(row)
        session.flush()
    return row


def _working_days():
    holidays = {d for d, _ in HOLIDAYS}
    day = ATTENDANCE_START
    while day <= ATTENDANCE_END:
        if day.weekday() != 6 and day not in holidays:  # Monday to Saturday
            yield day
        day += timedelta(days=1)


def _clip(value, low, high):
    return max(low, min(high, value))


def clear_orphans(session: Session) -> int:
    """Delete attendance, marks and fee rows whose student no longer exists.

    Such rows are left behind when students are deleted directly (for example by
    ``seed_sample_data.py --reset``). They would clash with the ids of new students.
    """
    gone = ~sm.DBAttendance.student_id.in_(select(DBStudent.id))
    removed = 0
    orphan_invoices = select(sm.DBFeeInvoice.id).where(~sm.DBFeeInvoice.student_id.in_(select(DBStudent.id)))
    removed += session.execute(delete(sm.DBFeePayment).where(sm.DBFeePayment.invoice_id.in_(orphan_invoices))).rowcount or 0
    removed += session.execute(delete(sm.DBFeeInvoice).where(~sm.DBFeeInvoice.student_id.in_(select(DBStudent.id)))).rowcount or 0
    removed += session.execute(delete(sm.DBAssessmentScore).where(~sm.DBAssessmentScore.student_id.in_(select(DBStudent.id)))).rowcount or 0
    removed += session.execute(delete(sm.DBAttendance).where(gone)).rowcount or 0
    return removed


def seed(session: Session, verbose: bool = False) -> dict:
    """Add the demo school. Returns counts; does nothing if the demo students already exist."""
    rng = random.Random(SEED)
    log = print if verbose else (lambda *a, **k: None)
    leftovers = clear_orphans(session)
    if leftovers:
        log(f"Removed {leftovers} leftover rows of deleted students.")

    # --- reference data (shared, get-or-create) ------------------------------------
    year = session.scalar(select(sm.DBAcademicYear).where(sm.DBAcademicYear.name == "2026-27"))
    if year is None:
        year = sm.DBAcademicYear(name="2026-27", start_date=date(2026, 4, 1),
                                 end_date=date(2027, 3, 31), is_current=True)
        session.add(year)
        session.flush()
    for ordinal, (name, mx) in enumerate([("Terminal", 40), ("Half-yearly", 60), ("Annual", 100)], 1):
        _get_or_create(session, sm.DBExam, {"ordinal": ordinal, "max_marks": mx},
                       academic_year_id=year.id, name=name)
    terminal = session.scalar(select(sm.DBExam).where(
        sm.DBExam.academic_year_id == year.id, sm.DBExam.name == "Terminal"))
    for day, name in HOLIDAYS:
        _get_or_create(session, sm.DBHoliday, {"name": name}, date=day)
    subjects = {n: _get_or_create(session, sm.DBSubject, name=n)
                for n in sorted(set(SUBJECTS_LOWER + SUBJECTS_PRIMARY + SUBJECTS_UPPER))}

    teachers = []
    for i in range(1, TEACHERS + 1):
        mobile = f"92{i:08d}"
        t = session.scalar(select(sm.DBTeacher).where(sm.DBTeacher.mobile == mobile))
        if t is None:
            first = (WOMEN if i % 3 else MEN)[(i * 7) % 10]
            t = sm.DBTeacher(name=f"{first} {SURNAMES[(i * 5) % len(SURNAMES)]}", mobile=mobile)
            session.add(t)
            session.flush()
        teachers.append(t)

    drivers, routes = [], []
    for i in range(1, ROUTES + 1):
        driver = session.scalar(select(DBDriver).where(DBDriver.name == f"Demo Driver {i}"))
        if driver is None:
            now = int(datetime(2026, 4, 1).timestamp())
            driver = DBDriver(name=f"Demo Driver {i}", route=f"Demo Route {i}", status="active",
                              vehicle_number=f"DEMO-UP-{i:02d}", contact_number=f"93{i:08d}",
                              license_number=f"DEMO-DL-{i:03d}", experience_years=3 + i,
                              created_at=now, updated_at=now)
            session.add(driver)
            session.flush()
        drivers.append(driver)
        routes.append(_get_or_create(session, sm.DBRoute,
                                     {"driver_id": driver.id, "monthly_fee": 400 + 50 * i},
                                     name=f"Demo Route {i}"))

    sections = []
    for idx, (grade, letter, size) in enumerate(CLASS_SIZES):
        section = _get_or_create(session, sm.DBClassSection,
                                 {"class_teacher_id": teachers[idx % TEACHERS].id},
                                 academic_year_id=year.id, grade=grade, section=letter)
        sections.append((section, size))
        for j, subject_name in enumerate(_subjects_for(grade)):
            _get_or_create(session, sm.DBClassSubject,
                           {"teacher_id": teachers[(idx + j) % TEACHERS].id},
                           class_section_id=section.id, subject_id=subjects[subject_name].id)

    if session.scalar(select(func.count()).select_from(DBStudent)
                      .where(DBStudent.admission_no.like(f"{DEMO_PREFIX}%"))):
        session.commit()  # keep any missing shared reference rows
        log("Demo students already exist - nothing more to add.")
        return summary(session)

    # --- students and families ------------------------------------------------------
    slots = []  # one entry per student: (section, grade)
    for section, size in sections:
        slots.extend([(section, section.grade)] * size)
    order = list(range(len(slots)))
    rng.shuffle(order)

    family_of = {}  # slot index -> family number
    family_members = defaultdict(list)
    family_no = 0
    pool = list(order)
    for size, count in ((3, THREE_CHILD_FAMILIES), (2, TWO_CHILD_FAMILIES)):
        for _ in range(count):
            members, grades = [], set()
            for idx in list(pool):
                if slots[idx][1] not in grades:
                    members.append(idx)
                    grades.add(slots[idx][1])
                    pool.remove(idx)
                if len(members) == size:
                    break
            if len(members) < size:
                pool.extend(members)
                continue
            family_no += 1
            for idx in members:
                family_of[idx] = family_no
                family_members[family_no].append(idx)
    for idx in pool:
        family_no += 1
        family_of[idx] = family_no
        family_members[family_no].append(idx)

    family_info = {}
    for fam in range(1, family_no + 1):
        surname = rng.choice(SURNAMES)
        family_info[fam] = {
            "father": f"{rng.choice(MEN)} {surname}", "mother": f"{rng.choice(WOMEN)} {surname}",
            "surname": surname, "mobile": f"91{fam:08d}", "village": rng.choice(VILLAGES),
        }

    rider_slots = set(rng.sample(range(len(slots)), RIDERS))
    students = {}  # slot index -> DBStudent
    roll_counter = defaultdict(int)
    stamp = int(datetime(2026, 4, 1).timestamp())
    for number, idx in enumerate(range(len(slots)), 1):  # admission order = class order
        section, grade = slots[idx]
        fam = family_info[family_of[idx]]
        girl = rng.random() < 0.5
        route = routes[rng.randrange(ROUTES)] if idx in rider_slots else None
        year_of_birth = 2026 - GRADE_AGE[grade]
        roll_counter[section.id] += 1
        student = DBStudent(
            name=f"{rng.choice(GIRLS if girl else BOYS)} {fam['surname']}",
            father_name=fam["father"], mother_name=fam["mother"], mobile=fam["mobile"],
            class_=grade, address=f"{fam['village']}, Demo District", village=fam["village"],
            route=route.name if route else None, route_id=route.id if route else None,
            fees=float(route.monthly_fee) if route else 0.0, status="active",
            created_at=stamp, updated_at=stamp, class_section_id=section.id,
            admission_no=f"{DEMO_PREFIX}{number:04d}", sr_no=f"{DEMO_PREFIX}SR-{number:04d}",
            roll_no=roll_counter[section.id], house=HOUSES[number % 4],
            dob=date(year_of_birth, rng.randint(1, 12), rng.randint(1, 28)),
        )
        session.add(student)
        students[idx] = student
    session.flush()

    # the last-admitted child of a three-child family gets free tuition
    free_tuition = {max(members, key=lambda i: students[i].admission_no)
                    for members in family_members.values() if len(members) >= 3}

    # --- attendance ------------------------------------------------------------------
    days = list(_working_days())
    attendance = []
    for idx, student in students.items():
        absence_rate = rng.choice([0.03] * 6 + [0.08] * 3 + [0.25])  # a few chronic absentees
        for day in days:
            roll = rng.random()
            status = ("absent" if roll < absence_rate else
                      "leave" if roll < absence_rate + 0.01 else
                      "late" if roll < absence_rate + 0.04 else "present")
            attendance.append({"student_id": student.id, "class_section_id": student.class_section_id,
                               "date": day, "status": status, "created_at": datetime(2026, 11, 22)})
    session.execute(sm.DBAttendance.__table__.insert(), attendance)

    # --- Terminal exam marks ---------------------------------------------------------
    scores = []
    for idx, student in students.items():
        grade = slots[idx][1]
        ability = _clip(rng.gauss(64, 17), 20, 98)
        for subject_name in _subjects_for(grade):
            subject_bias = rng.gauss(0, 7)
            parts = [(1, 20), (2, 20)] if (int(grade) >= 6 if grade[0].isdigit() else False) and \
                subject_name in TWO_PAPER_SUBJECTS else [(1, 40)]
            for part, max_marks in parts:
                absent = rng.random() < 0.015
                pct = _clip(ability + subject_bias + rng.gauss(0, 6), 5, 100)
                marks = None if absent else round(round(pct / 100 * max_marks * 2) / 2, 1)
                scores.append({"exam_id": terminal.id, "student_id": student.id,
                               "subject_id": subjects[subject_name].id, "part": part,
                               "marks": marks, "max_marks": max_marks, "is_absent": absent,
                               "created_at": datetime(2026, 9, 30)})
    session.execute(sm.DBAssessmentScore.__table__.insert(), scores)

    # --- fees: invoices (tuition, van) and payments -----------------------------------
    next_receipt = (session.scalar(select(func.count()).select_from(sm.DBFeePayment)
                                   .where(sm.DBFeePayment.receipt_no.like(f"{DEMO_PREFIX}%"))) or 0) + 1
    payments = []
    for idx, student in students.items():
        grade = slots[idx][1]
        roll = rng.random()
        unpaid_months = 0 if roll < 0.70 else rng.randint(1, 2) if roll < 0.90 else rng.randint(3, 5)
        partial_last = rng.random() < 0.05
        fee_lines = [("tuition", TUITION[grade], "Three-children rule: free tuition" if idx in free_tuition else None)]
        if student.route_id:
            fee_lines.append(("van", routes[int(student.route.split()[-1]) - 1].monthly_fee, None))
        for month_index, (yr, mo) in enumerate(FEE_MONTHS):
            due = date(yr, mo, 15)
            for fee_type, amount, discount_reason in fee_lines:
                discount = amount if discount_reason else 0
                invoice = sm.DBFeeInvoice(
                    student_id=student.id, academic_year_id=year.id, fee_type=fee_type,
                    period=f"{yr}-{mo:02d}", amount=amount, discount=discount,
                    discount_reason=discount_reason, due_date=due, created_at=datetime(yr, mo, 1))
                session.add(invoice)
                session.flush()
                net = amount - discount
                if net == 0 or month_index >= len(FEE_MONTHS) - unpaid_months:
                    continue
                pay = net
                if partial_last and month_index == len(FEE_MONTHS) - unpaid_months - 1:
                    pay = net // 2
                paid_on = max(date(yr, mo, 1), due - timedelta(days=rng.randint(0, 10)))
                payments.append({"invoice_id": invoice.id, "receipt_no": f"{DEMO_PREFIX}{next_receipt:06d}",
                                 "amount": pay, "paid_on": paid_on, "method": rng.choice(["cash", "cash", "upi"]),
                                 "created_at": datetime(paid_on.year, paid_on.month, paid_on.day)})
                next_receipt += 1
    if payments:
        session.execute(sm.DBFeePayment.__table__.insert(), payments)
    session.commit()
    log("Seeded demo school data.")
    return summary(session)


def summary(session: Session) -> dict:
    def count(model, *where):
        return session.scalar(select(func.count()).select_from(model).where(*where)) or 0

    demo = DBStudent.admission_no.like(f"{DEMO_PREFIX}%")
    return {
        "students": count(DBStudent, demo),
        "teachers": count(sm.DBTeacher, sm.DBTeacher.mobile.like("92%")),
        "routes": count(sm.DBRoute, sm.DBRoute.name.like("Demo Route %")),
        "riders": count(DBStudent, demo, DBStudent.route_id.is_not(None)),
        "attendance": count(sm.DBAttendance),
        "scores": count(sm.DBAssessmentScore),
        "invoices": count(sm.DBFeeInvoice),
        "payments": count(sm.DBFeePayment),
    }


def reset_demo(session: Session) -> dict:
    """Delete only rows created by this script. Real students, fees and logins are untouched."""
    ids = list(session.scalars(select(DBStudent.id).where(DBStudent.admission_no.like(f"{DEMO_PREFIX}%"))))
    invoice_ids = list(session.scalars(select(sm.DBFeeInvoice.id).where(sm.DBFeeInvoice.student_id.in_(ids)))) if ids else []
    if invoice_ids:
        session.execute(delete(sm.DBFeePayment).where(sm.DBFeePayment.invoice_id.in_(invoice_ids)))
        session.execute(delete(sm.DBFeeInvoice).where(sm.DBFeeInvoice.id.in_(invoice_ids)))
    if ids:
        session.execute(delete(sm.DBAssessmentScore).where(sm.DBAssessmentScore.student_id.in_(ids)))
        session.execute(delete(sm.DBAttendance).where(sm.DBAttendance.student_id.in_(ids)))
        session.execute(delete(DBStudent).where(DBStudent.id.in_(ids)))
    teacher_ids = list(session.scalars(select(sm.DBTeacher.id).where(sm.DBTeacher.mobile.like("92%"))))
    if teacher_ids:
        session.execute(update(sm.DBClassSubject).where(sm.DBClassSubject.teacher_id.in_(teacher_ids))
                        .values(teacher_id=None))
        session.execute(update(sm.DBClassSection).where(sm.DBClassSection.class_teacher_id.in_(teacher_ids))
                        .values(class_teacher_id=None))
        session.execute(delete(sm.DBTeacher).where(sm.DBTeacher.id.in_(teacher_ids)))
    session.execute(delete(sm.DBRoute).where(sm.DBRoute.name.like("Demo Route %")))
    session.execute(delete(DBDriver).where(DBDriver.name.like("Demo Driver %")))
    session.commit()
    return {"students_removed": len(ids)}


def main() -> None:
    os.chdir(BACKEND_DIR)
    from sqlalchemy import inspect
    from src.core.models.models import sync_engine

    if not inspect(sync_engine).has_table("academic_years"):
        sys.exit("The school tables are missing. Run `python setup_local.py` first.")
    with Session(sync_engine) as session:
        if "--reset-demo" in sys.argv:
            if "--yes" not in sys.argv and input("Delete the demo school data? Type yes: ").strip() != "yes":
                sys.exit("Cancelled.")
            print(reset_demo(session))
            return
        result = seed(session, verbose="--verbose" in sys.argv)
        print("Demo school data:", result)


if __name__ == "__main__":
    main()
