# Marks entry (Phase 2, issue #33)

## How a teacher uses it
1. Open **Marks** in the menu.
2. Pick the class, the exam (Terminal, Half-yearly or Annual) and the subject. A teacher sees only the subjects assigned to them; the admin sees all.
3. Type each student's marks. A wrong mark (above the maximum, below 0, more than 2 decimals) turns red and the Save button stays off until it is fixed.
4. Tap **AB** for a student who was absent. AB is saved as "absent", not as zero, and is left out of averages later.
5. Press Enter to jump to the next student. Tap **Save marks**.

Students you leave empty are "not entered yet" and are shown as a dash later. You can save in several rounds. A mark that was already saved cannot be blanked: enter the corrected mark or AB.

## API (all under `/api`)
| Method and path | What |
|---|---|
| `GET /marks/options` | Exams of the current session and the class/subject pairs the user may enter. |
| `GET /marks/sheet?class_section_id=&exam_id=&subject_id=` | The sheet: parts with their maximum, and each student's saved marks. Writes nothing. |
| `PUT /marks/sheet` | Saves the sheet in one transaction. |

`PUT` body: `{"class_section_id": 1, "exam_id": 1, "subject_id": 3, "entries": [{"student_id": 7, "part": 1, "marks": 17.5, "is_absent": false}]}`.
The response says how many marks were created, changed or unchanged.

## Rules enforced by the server
- Only the admin and the teacher assigned to that subject in that class. Another teacher, or the same teacher with another subject, gets 403 and nothing is written. Other roles get 403.
- A mark is from 0 to the maximum of its part with at most 2 decimals. `is_absent` together with marks is rejected.
- Any invalid mark rejects the whole request (422, "Nothing saved. ..." with the first few problems). If saving fails, nothing is saved.
- Saving a mark again replaces it in the same row; `updated_by` and `updated_at` record who changed it.
- Students or parts left out of the request are left as they were. Inactive students and students of other classes are rejected.

## Parts and maximum marks
Maximum: Terminal 40, Half-yearly 60, Annual 100. In classes 6 to 8, Hindi, English and Mathematics have two papers (part I and II) in the Terminal and Half-yearly exams, split evenly: Terminal 20 + 20, Half-yearly 30 + 30. Everything else is one part. These rules live in `backend/src/services/marks_rules.py` so they can be changed in one place when the school confirms the real split and subject list (open decision 4 in `02-data-rules-and-roles.md`).

## Not in this change
- Pass marks, totals, percentages and ranks (Phase 3 and the scorecards in #34).
- Locking an exam after the marks are checked.
- A teacher needs a login linked to their teacher profile and a subject assigned in the class; the screen for assigning is part of the Phase 5 staff handoff. In the demo data the teachers have no logins, so use the admin account to try the screen.
