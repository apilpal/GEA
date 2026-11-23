# Fee payments and scorecards (Phase 2, issue #34)

## Fees: how the office uses it
1. Open **Fees** and search by name, admission number or mobile number, or pick a class.
2. Tap the student. The statement shows every invoice with its status (paid, partial, unpaid, overdue), discount, balance and payments. Overdue amounts are in red.
3. On an invoice with a balance tap **Record payment**, check the amount (it starts at the full balance), choose cash, UPI, bank or other, and tap **Receive**. A confirmation asks once more. A receipt number such as `R-000012` is issued.
4. The admin can **Reverse** a wrong payment and must give a reason. The original stays on the statement (struck through) with the reversal below it, and the balance comes back.

### API (all under `/api`)
| Method and path | Who | What |
|---|---|---|
| `GET /fees/classes` | admin, clerk | Classes of the current session (for the filter). |
| `GET /fees/students?q=&class_section_id=` | admin, clerk | Students (max 30) with balance and overdue amount. Nothing is listed without a search text or class. |
| `GET /fees/students/{id}` | admin, clerk | Statement: invoices with derived status, balance and payments, and totals. |
| `POST /fees/payments` | admin, clerk | `{"invoice_id", "amount", "paid_on"?, "method"?}`. Returns the receipt number and the new balance. |
| `POST /fees/payments/{id}/reverse` | admin only | `{"reason"}`. Adds a negative row linked to the payment. |

### Rules enforced by the server
- Whole rupees. A payment must be more than 0 and not more than the balance (the net of amount minus discount minus payments). A fully paid or free invoice takes no payment. The date cannot be in the future.
- Status is derived, never typed: `paid` (nothing left), `overdue` (balance left after the due date), `partial` (some paid, not yet due), `unpaid`. Due on the 15th.
- Receipt numbers are `R-000001`, `R-000002`, ... always the next number after the highest one issued. A reversal gets `<receipt>-X`. Numbers are never reused, even after a reversal. If two payments pick the same number at the same moment the second one retries with the next number.
- Payments are never edited or deleted. A payment can be reversed once; a reversal cannot be reversed. After a reversal the invoice can be paid again with a new receipt.
- Teachers and other roles get 403. Only the admin can reverse.

## Scorecards: how to use it
Open **Scorecard**, pick a class and a student. The table shows each subject in the Terminal, Half-yearly and Annual exams, the subject total, and below it the total, percent and position of each exam and overall, plus the attendance rate of the session.

### API (all under `/api`)
| Method and path | Who | What |
|---|---|---|
| `GET /scorecards/classes` | admin, teacher | Classes the user may view (a teacher: class teacher or a subject teacher of the class). |
| `GET /scorecards/classes/{id}/students` | same | Active students of the class. |
| `GET /scorecards/students/{id}` | same | The scorecard. |

### Rules
- AB (absent) and marks not entered yet are shown as `AB` and a dash and are left out of totals and percentages. They are never counted as zero. A real 0 counts.
- Percent = marks obtained / maximum of the parts that have marks, to 2 decimals. A subject with two papers where one is missing shows the mark with `*`.
- Position = rank among the active students of the class who have a percent. Students with the same percent share a position (1, 2, 2, 4). A student with no marks has no position.
- Attendance rate = (present + late) / (recorded days - leave days), for the session.
- No pass or fail is shown because the school's pass mark is not decided yet (open decision 1 in `02-data-rules-and-roles.md`).

## Not in this change
- Printing a receipt or a report card (Phase 4, #39) and CSV export.
- The overdue follow-up list and fee analytics (#37).
- Advance payment for the whole year (open decision) and creating the monthly invoices (the demo data has them; generating real invoices is a later step).
- Note for #35 to #37: `reports`, `charts` and `dashboard` still allow teachers, but the role table in `02-data-rules-and-roles.md` says teachers should not see fee data. To be fixed there.
