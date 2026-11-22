# Current state and migration path (issue #27)

Status: draft for review. Facts below come from reading the code at commit `9657dd5`.

## 1. Backend inventory

**Tables (SQLAlchemy, `backend/src/core/models/models.py`)**

| Table | Key columns | Notes |
|---|---|---|
| `students` (`DBStudent`) | id, name, father_name, mobile (unique), `class_` (free text), address, `route` (free text), `fees` (float), status, created_at/updated_at (unix int) | No admission number, roll number, section, village, or link to a class table. `mobile` is unique, so siblings sharing a parent's number cannot both be saved, yet the school's three-children discount identifies siblings by that same number. |
| `drivers` (`DBDriver`) | id, name (unique), `route` (free text), vehicle/contact/licence (unique), status | A route exists only as a string on the driver and on the student. |
| `users` (`DBUser`) | id, username, email, hashed_password, `role`, is_active, is_bypass_user | Roles: admin, teacher, accountant, driver, student, parent. No link from a user to a teacher profile, class, or student. |
| chat tables | `chat_models.py` | Not part of the school model. |

There is **no** academic year, class/section, subject, attendance, exam, marks, invoice, or payment table.

**Class values** come from `ClassEnum` (`L.K.G.`, `U.K.G.`, `P.K.`, `P.G`, `N`, `1`..`12`, plus the duplicates `4th` and `7th`). The school only teaches P.G. to VIII, so 9 to 12 are unused and `4th`/`7th` duplicate `4`/`7`; these need normalising.

**API routes (`/api/...`)**

| Router | Endpoints | Auth today |
|---|---|---|
| auth | login, logout, refresh, me, register, token/*, login-enhanced, bypass-login | open (bypass-login is dev-only, off by default) |
| students | list, get, search, create, update, delete | staff; create/update teacher+admin; delete admin |
| drivers | list, get, info, create, update, guest list | staff; create/update admin |
| reports | summary, students-by-driver, revenue-analysis, driver-student-stats | admin, teacher, accountant |
| charts | student-distribution, revenue-by-driver, revenue-by-class | admin, teacher, accountant |
| **charts `/public/*`, dashboard `/public/*`** | counts, charts, driver list | **no login required** |
| csv_sync | sync, status, history, files, scheduler | admin |
| chat | conversations, messages | staff |

**Authentication:** JWT (RS256) in HttpOnly cookies; `check_permissions(roles)` dependency in `utils/auth_utils.py`; `require_staff`, `require_finance`, `require_admin`, `require_teacher_or_admin`.

## 2. Frontend inventory

TypeScript web components in `frontend/src/ts`: students and drivers pages, dashboard, reports, charts, login/profile, chat, and a demo-data module (`demo-data.ts`). Navigation is hash-based (`#dashboard`, `#reports` ...). Student data shapes are defined in `services/` and `components/`; they carry no class-section, roll number, or village yet. Pages affected by the new model: students list/form, dashboard stats, reports.

## 3. Findings and risks

1. **Two schema mechanisms.** `scripts/setup_local.py` builds tables with `Base.metadata.create_all`; `backend/alembic/` exists but is not used by setup.
2. **The Alembic history is broken.** There are two heads: `cb1585c67888` (a merge) and `remove_guest_user_functionality`. Some revisions also reference guest-user columns that the current model no longer has. Phase 1 must start from a clean baseline, not stack more revisions on this chain.
3. **Public endpoints.** `/public/*` routes expose aggregate counts and driver names without login. Decide whether to keep them (see rules doc, section 4).
4. **No teacher-to-class link.** "Assigned-class restriction" cannot be enforced until there is a teacher profile and class-section assignment.
5. **`students.mobile` unique** will reject siblings; the Phase 1 migration must drop that constraint and add a non-unique index, because the sibling discount groups students by parent mobile.
6. **Free-text routes and classes** mean typos create separate groups in every report.
7. **Old tests** (`backend/test_*.py`) call endpoints without a login and mostly fail since the auth change. They are not a usable baseline.
8. **SQLite only.** The target (about 600 students, 30 teachers) is comfortable for SQLite if writes go through one backend process.

## 4. Proposed mapping of existing data

| Existing | New model | Rule |
|---|---|---|
| `students.class_` | `class_section` (grade + section) | Map `4th`->`4`, `7th`->`7`; unknown values go to a review list. Section defaults to `A` until the school supplies sections. |
| `students.route` | `route` table + `students.route_id` | Create one `route` row per distinct non-empty value. |
| `drivers.route` | `route.driver_id` | Match on the same route string. |
| `students.fees` | one monthly **transport fee** invoice setting on the student's route | Keep the column during Phase 1 for rollback, stop reading it once invoices exist. |
| `students.address` | `students.village` (copy) | Keep `address`. Village is filled by hand or CSV later. |
| (new) | `admission_no`, `sr_no`, `roll_no`, `mother_name`, `dob`, `house` | The report card prints these. |
| (new) | `admission_no`, `roll_no` | Nullable at first; unique per school once filled. |
| `users` with role `teacher` | `teacher` profile linked by `user_id` | Created by the admin; assigned to class-sections and subjects. |

## 5. Migration approach

1. Back up `backend/data/students.db` (copy via SQLite's backup API, never a plain copy while the app is running).
2. Create a new Alembic baseline that matches the *current* tables, and stamp existing databases at it.
3. Each later phase adds one revision. Data moves happen in the revision, are idempotent, and keep old columns until the next phase.
4. Fresh installs run `alembic upgrade head`, then the demo seed. `setup_local.py` switches from `create_all` to Alembic in Phase 1.
5. Rollback = restore the pre-migration backup. Down-migrations are written only for additive changes.

## 6. Baseline checks to keep

Before Phase 1, the following must stay true after every change: login works for each role; students and drivers lists return data for staff and 401 without login; `pnpm dev` starts both servers; a fresh database can be created and seeded. These become automated tests in issue #29.
