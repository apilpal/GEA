# GEA Role-Scoped Student Data — SEC-2 Design

**Status:** Proposed design for review  
**Scope:** Backend authorization foundation only  
**Parent:** Epic A — Security (#71)  
**Primary issue:** SEC-2 — Limit student data by role (#82)

## 1. Purpose

Establish one reusable backend policy for student records. Lists, search, detail endpoints, dashboard data sources, transport endpoints and reports must apply the same authorization rules. Hiding a UI element is never an authorization boundary.

This document is a design and sequencing proposal. It does not authorize collecting new personal data or implementing dependent epic features.

## 2. Scope boundaries

### SEC-2 owns

- Resolve the authenticated user and role.
- Resolve verified teacher/class and driver/route assignments.
- Apply assignment scoping in database queries before results are returned.
- Apply the same policy to list, search, detail and direct-ID requests.
- Filter returned fields by role and approved purpose.
- Fail closed when identity or assignment mapping is absent or ambiguous.
- Provide reusable policy helpers and authorization tests.

### Other issues own

| Area | Owner | SEC-2 relationship |
|---|---|---|
| Teacher fee/payment access | SEC-3 (#83) | Reuse authorization foundation; fee-specific rules remain here |
| Driver and route creation/assignment operations | TRN-2 (#115) | Owns operational workflow and verified account linkage UX |
| Student-to-route and stop assignment | TRN-4 (#117) | Owns workflow and data validation |
| Driver route screen | TRN-3 (#116) | Consume secured API; no duplicate route policy |
| Student list paging/search/filter UI | STU-1 (#103) | Query only already-authorized records and counts |
| Student list/detail UI | STU-2 (#104), STU-3 (#105) | Render only API-authorized fields |
| Sensitive-field masking | STU-7 (#109) | Mask/reveal UI is additional to backend authorization |
| Dashboard panels/charts | DSH-3 (#112), DSH-4 (#113) | Use secured data sources; no dashboard-specific student policy |
| Reports and exports | RPT-1 (#119), RPT-3 (#121), PRV-8 (#96) | Report-specific rules and output safeguards remain in those issues |
| Data purpose/retention/audit | PRV-1, PRV-4, PRV-6 (#88, #92, #94) | Approve field purpose and lifecycle; SEC-2 enforces approved access |

## 3. Role policy

- **Admin:** access according to explicitly granted/approved permissions; do not treat role name alone as unrestricted access.
- **Teacher:** students in assigned classes only; no fee/payment fields (SEC-3 owns fee endpoints and policy).
- **Driver:** students on routes assigned to the authenticated driver, and only approved transport fields.
- **Accountant/clerk:** only records and fields required for approved office/fee tasks; detailed fee policy belongs to SEC-3.
- **Student/parent:** no access to other students; self/ward access requires verified relationship mapping and is not assumed by this design.
- **Unknown role or missing assignment:** deny by default.

## 4. Data-model decisions to resolve before implementation

1. `DBDriver` currently has no authenticated-user link. Add a nullable, unique `drivers.user_id` FK only after migration compatibility and admin-controlled linking are designed. Never match by name or phone.
2. Do not assume existing `students.mobile` means guardian phone. Confirm its current semantics and usage before exposing it.
3. Do not add `guardian_phone` or a transport-stop column as part of SEC-2 by default. PRV-1 must approve purpose/access/retention; TRN-4 should own stop assignment and validation. If approved, use dedicated fields rather than overloading `mobile`.
4. Inspect Alembic head and migration conventions before creating any migration. Preserve existing records and support rollback where safe.

## 5. Enforcement design

- Centralize policy decisions in a backend service/dependency rather than duplicating role checks in routers.
- Scope SQL queries before pagination, aggregation, search or serialization.
- For a direct ID outside the user's scope, return the application's consistent not-found/forbidden response without leaking record existence.
- Use explicit response schemas/field allowlists per role and endpoint; do not serialize broad ORM objects.
- Ensure counts, filter options, search snippets and error messages do not reveal out-of-scope records.
- Keep authorization separate from UI navigation and field masking.
- Avoid logging student values or contact details in authorization/audit logs.

## 6. Test plan

Cover authenticated and unauthenticated access, each supported role, assigned and unassigned teachers, assigned and unassigned drivers, cross-class and cross-route IDs, missing driver-user links, direct detail/search access, response-field allowlists, aggregate/count leakage, and fee-field denial for teachers. Include regression tests for existing admin workflows and migration upgrade behavior.

## 7. Delivery sequence

1. Review this design and confirm role/field policy with the school.
2. Confirm data semantics and assignment ownership with PRV-1, TRN-2 and TRN-4.
3. Inspect current models, routers, services and Alembic head; write migration plan.
4. Implement SEC-2 backend policy and tests only.
5. Have dependent UI/report/transport issues consume the secured APIs.
6. Verify issue boundaries and update the roadmap after each accepted change.

## 8. Explicit non-goals

No dashboard, student UI, transport UI, report catalogue, export workflow, privacy notice/consent workflow, live bus tracking, fee endpoint redesign, or new personal-data collection is implemented by SEC-2.
