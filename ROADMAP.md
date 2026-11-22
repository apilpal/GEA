# School Academic & Fee Analytics Platform — Roadmap

**Target scale:** approximately 600 students, 30 teachers, 5 transport routes, and 100 van riders  
**Stack:** FastAPI, SQLite, SQLAlchemy/Alembic, TypeScript, Vite, SCSS  
**Locale:** INR (`₹`)  
**Status:** Approved planning roadmap

## Objectives

- Make daily attendance, assessment marks, and fee entry quick and reliable.
- Record neutral student marks per subject and class section.
- Compare student, subject, class, and section performance across exams and terms.
- Diagnose academic and operational gaps using attendance, transport, and fee data.
- Give management clear fee billing, collection, pending dues, and route-level visibility.

## Delivery phases

| Phase | Scope | Deliverables | Exit criteria |
|---|---|---|---|
| 0 | Foundation | Data rules, role matrix, migrations, backup and recovery | Definitions and permissions approved |
| 1 | Schema and demo data | Academic, attendance, marks, and fee tables | Migration and seed process verified |
| 2 | Entry and scorecards | Bulk entry APIs and student scorecards | Staff workflows tested by role |
| 3 | Analytics engine | Management, class, subject, and fee analytics | Calculations independently verified |
| 4 | Mobile and exports | Print, CSV, accessibility, and mobile UX | Pilot workflows usable on phones |
| 5 | Pilot and operations | Staff pilot, training, monitoring, backup validation | Go-live criteria signed off |

## Phase 0 — Foundation and decisions

- Review existing student, user, driver, route, authentication, and database structures.
- Define academic-year, grade/section, subject, exam-term, fee-period, and payment rules.
- Define Admin/Management, Teacher, and Office Clerk permissions, including assigned-class restrictions.
- Map existing student and transport records into the academic model.
- Document attendance, exam absence, fee discount, partial payment, overdue, and correction rules.
- Select a migration, backup, restore, and audit strategy.

**Exit criteria:** Data rules, role matrix, migration plan, and backup procedure are approved.

## Phase 1 — Schema and realistic demo data

- Add Alembic migrations for academic years and class sections.
- Add migrations for subjects and class-subject mappings.
- Extend student profiles with class/section, roll number, admission number, and village.
- Add attendance, exam-term, assessment-score, fee-invoice, and fee-payment tables.
- Add uniqueness constraints and indexes for common lookups and duplicate prevention.
- Seed repeatable fictional data for approximately 600 students, 30 teachers, 5 routes, 5 subjects, and 2 terms.
- Keep demo seeding separate from production data and make it safe to rerun.
- Test database backup and restore with a seed dataset.

**Exit criteria:** A fresh database migrates and seeds reproducibly without duplicate or destructive side effects.

## Phase 2 — Entry workflows and student scorecards

- Build the attendance roster endpoint for class/section and date.
- Implement bulk attendance save in one transaction.
- Build the marks roster endpoint for class, subject, and exam term.
- Implement bulk marks upsert with 0-to-maximum-marks validation.
- Build fee payment entry with unique receipt numbers and derived invoice status.
- Add student search and filtering by name, class/section, village, route, and risk flag.
- Build the student scorecard API with profile, attendance, transport, fees, marks, averages, and term trends.
- Add mobile-friendly attendance, marks, and fee entry interfaces.
- Record who made attendance, marks, and payment entries or changes.

**Exit criteria:** Role-scoped staff workflows pass end-to-end tests and scorecard calculations reconcile independently.

## Phase 3 — Analytics and diagnostics

- Implement the management summary API.
- Implement class-to-class and section-to-section comparisons.
- Implement subject comparison and bottleneck analytics.
- Implement fee analytics grouped by class/section and transport route.
- Compute school, class, subject, attendance, and fee metrics server-side.
- Add distinction, steady, borderline, and at-risk distribution buckets.
- Add root-cause tags for attendance gaps, subject gaps, and high-spread polarization.
- Add overdue and pending-fee follow-up lists.
- Add report tables and charts with class/student drill-down.

**Exit criteria:** Calculations pass normal, missing, partial, and edge-case fixtures; reports clearly explain risk labels.

## Phase 4 — Mobile, print, and exports

- Polish responsive student cards and tables.
- Add sticky comparison-table columns and mobile horizontal scrolling.
- Use numeric mobile keyboard input for marks and ₹ fee amounts.
- Add printable student scorecards and class-comparison views.
- Add CSV exports for students, marks, attendance, and fees.
- Standardize `₹` formatting across forms, cards, receipts, and reports.
- Review keyboard navigation, labels, focus, contrast, and screen-reader status.
- Test on representative Android phones over local Wi-Fi/hotspot.

**Exit criteria:** Core data-entry and reporting workflows are usable on a phone and reconcile after print/export.

## Phase 5 — Pilot and operational readiness

- Pilot with a limited set of classes, teachers, clerks, and fictional records.
- Verify role restrictions, bulk saves, receipts, analytics, migration, and recovery.
- Establish daily backup timing and test restoration from a real backup copy.
- Add operational logging for bulk-save failures, authorization failures, and backup failures.
- Publish staff operating guides for attendance, marks, payments, exports, and recovery.
- Resolve pilot feedback and document known limitations.

**Exit criteria:** Staff sign off; a backup is successfully restored; go-live and recovery procedures are documented.

## Key implementation rules

- Use Alembic migrations for every schema change.
- Enforce authorization in FastAPI dependencies and services, not only in the frontend.
- Keep payment and invoice changes in transactions that update audit records consistently.
- Generate fee receipts with unique numbers and preserve a traceable payment history.
- Keep demo data clearly separated from real records.
- Define attendance and missing-mark edge cases before implementing averages and risk flags.
- Back up SQLite before bulk imports or migration runs and test restoration.
- Prefer server-side SQL/Python aggregation for compact analytics responses.

## Working sequence

1. Approve data definitions and permissions.
2. Create migrations and seed/demo data.
3. Build and test attendance, marks, and fee entry.
4. Build student search and scorecards.
5. Implement analytics APIs and verify calculations.
6. Add reports, print, CSV, and mobile polish.
7. Pilot, train users, and validate backups.

## Tracking

GitHub phase issues and sub-task issues should be created from this roadmap. Each issue should remain independently actionable and link back to the relevant phase and exit criterion.
