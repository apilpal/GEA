# Attendance entry (Phase 2, issue #32)

## How a teacher uses it
1. Open **Attendance** in the menu.
2. Pick the class and the date (today is preselected).
3. Everyone starts as **Present**. Tap **A** (absent), **L** (late) or **Lv** (leave) for the exceptions.
4. Tap **Save attendance**. The whole class is saved at once. Opening the same class and date later shows what was saved; saving again replaces it.

## API (all under `/api`)
| Method and path | Who | What |
|---|---|---|
| `GET /attendance/classes` | admin, teacher | Classes of the current session the user may mark. A teacher sees only the classes where they are class teacher. |
| `GET /attendance/roster?class_section_id=&date=` | admin, class teacher | Roster with each student's saved status (default `present`), plus `can_save` and `reason`. Writes nothing. |
| `PUT /attendance/roster` | admin, class teacher | Saves the whole class for one date in one transaction. |

`PUT` body: `{"class_section_id": 1, "date": "2026-11-18", "entries": [{"student_id": 7, "status": "absent", "remark": "fever"}]}`.
Students left out of `entries` are saved as present.

## Rules enforced by the server
- Other roles (accountant, driver, student, parent) get 403. A teacher of another class gets 403 and nothing is written.
- No future dates, no Sundays, no holidays, no dates outside the session.
- A teacher can mark today and the 2 days before. The admin can correct any earlier date of the session.
- A student who is not in the class (or inactive), appears twice, or has an invalid status rejects the whole request with 422.
- If saving fails, nothing is saved (transaction rollback).
- Saving again updates the same row (never a second row) and records `updated_by` and `updated_at`.
- Only active students are listed.

## Not in this change
- Remarks are supported by the API but the screen does not show a remark box yet.
- Marking attendance for teachers (staff attendance) comes later.
- "Class teacher" is the only assignment that gives a teacher access. Teachers must be linked to a login (`teachers.user_id`) and set as class teacher by the admin; the screen for that is part of the Phase 5 staff handoff. In the demo data the teachers have no logins, so use the admin account to try the screen.
- The `Class: N/A` and Students-page paging items are separate issues.
