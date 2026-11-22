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

## 3. Rules

**Attendance**
- One record per student per date: `present`, `absent`, `late`, `leave`.
- Roster opens with everyone `present`; saving writes the whole class in one transaction.
- No records on Sundays or on dates in the holiday list. DECIDE: working week Mon-Sat?
- `late` counts as present for the attendance rate. `leave` (approved) is excluded from both numerator and denominator.
- Saving again for the same class and date replaces the earlier entries and logs who changed them.
- Attendance rate = present + late days / (recorded days - leave days).

**Marks** (marks only for now; no letter grades)
- Maximum marks per subject: Terminal 40, Half-yearly 60, Annual 100, so 200 in total per subject. Terminal and Half-yearly are entered as part I and part II that add up to the exam total. DECIDE: how 40 and 60 split between I and II.
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
- Invoice status is derived, never typed: `unpaid`, `partial`, `paid`, `overdue` (balance above zero after the due date). DECIDE: due day of the month.
- Discount rules, each recorded on the invoice with its reason:
  1. **Yearly lump sum:** exam fee and tie/belt charges are free. A van paid for the full year saves one month's van fee.
  2. **Monthly payers:** no discount.
  3. **Three children:** when three siblings study here, one child's tuition is free. Siblings are children with the **same parent mobile number**. Which child is free (the youngest, or the highest fee): DECIDE.
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

1. Working week and holiday list.
2. Pass mark, and whether each subject must be passed.
3. How Terminal 40 and Half-yearly 60 split between parts I and II.
4. Due day of the month for fees, and whether advance payments are allowed.
5. Which sibling gets the free tuition under the three-children rule.
6. Subject list per class, section list, and which teacher teaches what.
7. Whether to keep the public endpoints.
