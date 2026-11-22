# Data rules and role permissions (issue #28)

Status: **proposed rules, based on the school's own report card and fee board.** Items marked `DECIDE` still need the school's answer.

**School facts used here** (Gurukul Educational Academy, Kaist, Jaswant Nagar, Etawah; English medium, classes P.G. to VIII): the report card has three exams, and the fee board lists monthly fees by class group.

## 1. Glossary

| Term | Definition |
|---|---|
| Academic year | One school year, e.g. `2026-27`, April to March. Exactly one is *current*. |
| Class-section | A grade plus a section, e.g. `5-A`, within one academic year. |
| Subject | A named subject. Classes P.G. to 8 use Hindi, English, Mathematics, Science, S.S.T., G.K., Computer, Drawing, Physical; the lower classes use E.V.S. instead of Science and S.S.T. (exact list per class: DECIDE). |
| Class-subject | A subject taught in a class-section, with an assigned teacher. |
| Exam | One of three per year: **Terminal**, **Half-yearly**, **Annual**. Terminal and Half-yearly are each entered in two parts (I and II) that add to the exam total. |
| Fee period | One calendar month. Tuition and van fees are billed monthly; a family may instead pay the whole year at once (see section 3). |
| Invoice | An amount owed by a student for a fee period. Has a due date. |
| Payment | Money received against an invoice. Never edited or deleted; corrected by a reversal. |
| Receipt | A unique, never-reused number printed for each payment. Format `GEA-2026-000001`. |

## 2. Role matrix

The codebase role `accountant` is shown to users as **Office Clerk**. `Admin` = Management.

| Action | Admin | Teacher | Clerk |
|---|---|---|---|
| Manage users, classes, subjects, fee structure | yes | no | no |
| View all students | yes | assigned classes only | yes (needed for fees) |
| Create/edit student profile | yes | no | yes (contact fields only) |
| Mark attendance | yes | assigned classes, today and back 2 days | no |
| Enter/edit marks | yes | assigned class **and** subject only | no |
| Record payments, issue receipts | yes | no | yes |
| Reverse a payment | yes | no | no (request to admin) |
| View fee amounts of a student | yes | no | yes |
| Analytics: school and fee | yes | no | fee only |
| Analytics: own class | yes | yes | no |
| Export CSV | yes | own class, no fee data | fee data only |
| Backup/restore | yes | no | no |

Driver, student and parent roles keep their current limited access until their portals exist.

**Enforcement rule:** every check is made in a FastAPI dependency or service from the logged-in user's role and database assignments. The frontend only hides controls. A request that bypasses the UI must get the same 403. Teachers' class access comes from the assignment tables, never from a value sent by the client.

## 2a. Decisions recorded (Nov 2026)

| Question | Answer |
|---|---|
| Working week | Monday to Saturday (Sunday off) |
| Exam maximums | Terminal 40, Half-yearly 60, Annual 100 (200 per subject in total) |
| Fee due day | the 15th of each month |
| Free tuition for 3 siblings | the **last** sibling (the last of the three to be admitted) |
| Grades | marks only for now |
| Sibling grouping | same parent mobile number |

Still open: pass mark, holiday list, advance payments, subject list per class (see section 5).

## 2b. School facts from the exam timetables and class list

**Sections, session 2025-26 (521 students):** P.G. 35 (one section); L.K.G. A 38, B 19; U.K.G. A 33, B 36; I A 30, B 37; II A 30, B 31; III A 33, B 27; IV A 26, B 22; V A 23, B 26; VI 30, VII 27, VIII 18 (one section each). P.G.+L.K.G.+U.K.G. = 161, I to VIII = 360. Demo data should use these class sizes.

**Exam groups** (one timetable per group): P.G./L.K.G./U.K.G.; classes 1-2; classes 3-5; classes 6-8.
- Lower classes have **oral** papers (Hindi, English, Math, G.K.) plus Activities and Song/Stories.
- Classes 1-5 English has Reading (R) and Grammar (G) parts.
- Classes 6-8 have two papers (I and II) for Hindi, English and Math. This is what the "I" and "II" columns on the report card mean for these classes.
- Subjects differ by group: E.V.S. for classes 1-5, Science and S.S.T. for 6-8, Computer from class 1 up, G.K., Drawing and Physical for all.
- Terminal exams run 08:30 to 10:30, with one **Fees Day** in the middle of the exam week.

**Exam rules printed on the timetable:**
1. Students whose school and van fees are unpaid up to September are **not admitted** to the Terminal exam. The system should show this list before the exam.
2. A missed exam is **not retaken**. An absent mark is final, so only the absent flag is needed.

## 3. Rules

**Attendance**
- One record per student per date: `present`, `absent`, `late`, `leave`.
- Roster opens with everyone `present`; saving writes the whole class in one transaction.
- No records on Sundays or on dates in the holiday list. The working week is Monday to Saturday.
- `late` counts as present for the attendance rate. `leave` (approved) is excluded from both numerator and denominator.
- Saving again for the same class and date replaces the earlier entries and logs who changed them.
- Attendance rate = present + late days / (recorded days - leave days).

**Marks** (marks only for now; no letter grades)
- Maximum marks per subject: Terminal 40, Half-yearly 60, Annual 100, so 200 in total per subject. Terminal and Half-yearly are entered as part I and part II that add up to the exam total. The part split is assumed even until the school says otherwise; for classes 6-8 the parts are separate papers.
- A mark is between 0 and the maximum for that part, up to 2 decimals.
- `absent` in an exam is stored as no mark plus an absent flag, shown as "AB". It is not a zero and is left out of averages and pass rates.
- A missing mark (not entered yet) is shown as a dash and also left out.
- Grand total per subject = Terminal + Half-yearly + Annual. Student total, percent and position (rank in the class-section) follow the report card.
- Pass mark: 33 percent of the total as a placeholder. DECIDE: the school's real pass mark and whether each subject must be passed.
- Tiers (for analytics only): distinction 75 and above, steady 50 to under 75, borderline 33 to under 50, at-risk under 33.

**Fees** (from the school's fee board)
- No admission fee.
- Monthly tuition: P.G., L.K.G., U.K.G. Rs 550; classes I to IV Rs 600; classes V to VIII Rs 650. Yearly equivalents on the board: Rs 6000, Rs 6500, Rs 7000.
- Van (transport) fee is billed monthly per student, by route. Rates are set per route by the admin.
- Amounts are whole rupees (INR), stored as integers.
- Invoice status is derived, never typed: `unpaid`, `partial`, `paid`, `overdue` (balance above zero after the due date). Fees are due on the **15th** of each month.
- Discount rules, each recorded on the invoice with its reason:
  1. **Yearly lump sum:** exam fee and tie/belt charges are free. A van paid for the full year saves one month's van fee.
  2. **Monthly payers:** no discount.
  3. **Three children:** when three siblings study here, one child's tuition is free. Siblings are children with the **same parent mobile number**. The free child is the **last** of the three siblings (by admission date).
- Partial payments are allowed; each gets its own receipt. A payment cannot exceed the balance. DECIDE: advance payments for the year.
- Corrections: a wrong payment is **reversed** by an admin (a new negative entry linked to the original, with a reason). The original stays visible.
- Overdue follow-up list = invoices past due with balance above zero, oldest first.

**Audit**
- Attendance, marks and payments record `created_by`, `created_at`, and for changes `updated_by`, `updated_at`. Payment reversals are separate rows.

## 3a. Edge cases and expected outcomes

These become automated tests in Phases 1 and 2.

| Case | Expected result |
|---|---|
| Student marked late | Counts as present in the rate. |
| Student on approved leave 3 of 20 days, present 15, absent 2 | Rate = 15 / 17 = 88.2%. |
| Student absent in the exam | No mark stored, absent flag set; average uses the other subjects only. |
| Mark 101 out of 100 | Rejected with a field-level error. |
| Mark entered twice for same student, subject, term | One row, second value replaces the first, audit shows the change. |
| Teacher saves attendance for another teacher's class | 403, nothing written. |
| Teacher saves marks for their class but another subject | 403. |
| Invoice 500, payment 200 | Status `partial`, balance 300. |
| Invoice 500, discount 100, payment 400 | Status `paid`. |
| Invoice 500 due 10th, unpaid on the 11th | Status `overdue`. |
| Class 3 student pays the monthly Rs 600 | Invoice 600, no discount. |
| Three siblings with the same mobile number | One child's tuition invoice is discounted to 0, with the reason recorded. |
| Two siblings with the same mobile number | No sibling discount. |
| Parent pays the full year with van | Exam fee and tie/belt lines are discounted to 0; the van invoice drops by one month. |
| Payment of 600 against balance 500 | Rejected. |
| Payment reversed | Balance restored, receipt number not reused, both rows visible. |
| Bulk save fails halfway | Nothing saved (transaction rollback). |
| Same receipt requested concurrently | Numbers stay unique (database unique constraint). |

## 4. Public endpoints

`/public/stats`, `/public/charts`, `/public/drivers` show school data without login. Proposal: **remove them** once the dashboard is login-only, since the roadmap handles student and fee data. DECIDE: keep or remove.

## 5. Decisions still needed from the school

1. Pass mark, and whether each subject must be passed.
2. Holiday list for the session.
3. Whether advance payments for the year are allowed.
4. Exact subject list per class group, and whether oral and activity papers carry marks.
5. Section and teacher assignments.
6. Whether to keep the public endpoints.
