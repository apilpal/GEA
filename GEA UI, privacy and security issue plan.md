# GEA UI, privacy and security issue plan

Nov 28, 2026 · @Apil Pal

47 proposed issues in 7 epics, ordered so the security and privacy gaps found in the code come before the redesign. Sizes: S under a day, M one to three days, L about a week (rough guesses). This is a plan for Jira, not legal advice.

## What the code shows today

I read the page code and the API routers on the current branch. These are the gaps the issues below answer.

1. **Server text goes into pages as raw HTML.** The student table, student card and report tables build HTML from template strings, and I found no escaping in those files (74 `innerHTML` uses in the frontend). A student named `<img src=x onerror=...>` could run script in a staff browser, and the sign-in token is kept in `localStorage`, where script can read it.
2. **Drivers can see every student.** Drivers are in the staff roles, and the student list and search are not limited by class or route, so a driver account can read every student's mobile, address and parents' names.
3. **Teachers can open fee figures.** Reports, Charts and Dashboard allow the teacher role.
4. **The transport report returns full student profiles** for every driver. Route planning needs far less.
5. **Delete is a hard delete.** There is no "left school" status, and I found no confirmation step in the student components.
6. **Some screens show things that are not real:** a fixed "3 unread notifications" badge in the header, and demo numbers on the Dashboard when the database is empty. The Transport page's "Add Route" button opens the add-driver form.
7. **A strict browser security policy is not possible yet.** `index.html` still has inline `onclick` handlers and inline style blocks. The API already sends `default-src 'self'`.
8. **Login bypass switches exist** in the backend (`LOGIN_BYPASS_ENABLED`, off by default) and the frontend (`VITE_ENABLE_LOGIN_BYPASS`), and login rate limiting exists but is off by default. Nothing proves they are right in production.
9. **The AI chat answers questions about student info and contacts** for staff, and keeps conversations in the database. The code calls a local Ollama server, but one function is still named after Gemini.
10. **`/public/*` routes exist** in charts, dashboard and drivers. Today they sit behind the same role check as the rest of the router, so they are not public. Nobody has decided whether they should be.

**Already good:** a required `SECRET_KEY`, security headers on the API, an authentication audit table, backups that are verified, and an operations log that never holds student data.

## DPDP in short

The Digital Personal Data Protection Rules, 2025 were published on 14 November 2025. The rules on notice, consent, security, breach reporting, retention, children's data and people's rights start 18 months later, about 14 May 2027 (my arithmetic from the published date). The consent-manager rule has no date yet. The school is the data fiduciary for its students' data.

| Duty | What it means for this app |
| --- | --- |
| Notice (Rule 3) | A separate, plain-language notice: what data, why, who to contact, how to withdraw consent or use your rights |
| Security (Rule 6) | Reasonable safeguards: encryption, access control, logging and audits, backup and recovery |
| Breach (Rule 7) | Tell affected people without delay and the Board within hours. The sources I read give no exact number of hours |
| Retention (Rule 8) | Delete data once its purpose is over unless a law requires keeping it. Warn the person at least 48 hours before deleting. Keep logs for at least one year |
| Children (Rule 10) | Verifiable consent from a parent or guardian |
| School exemption | Schools are reported to be exempt from the parental-consent and tracking limits where processing is strictly for child safety and health (Fourth Schedule) |
| Rights (Rules 9 and 14) | Access, correction, erasure and a grievance route, with the contact published |

The school exemption is the point to confirm with a lawyer. As reported, it covers academic work, safety and health. It does not obviously cover marketing, an AI chat, photos, or sharing data with outsiders. I did not check penalty amounts.

## Build order

1. **Stop the leaks first:** SEC-1 safe rendering, SEC-2 role-scoped student data, SEC-3 fee data hidden from teachers, SEC-6 production safety checks.
2. **Privacy foundations:** PRV-1 data inventory, PRV-2 notice, PRV-4 "left school" instead of delete, PRV-6 audit trail.
3. **Rebuild the screens** on that base: Students (STU), then Dashboard (DSH), Transport (TRN) and Reports (RPT), with the app-wide pieces (UX) as they are needed.
4. **Before May 2027:** PRV-3 consent records, PRV-5 rights requests, PRV-7 breach response, PRV-10 backup encryption.

Before the staff pilot, finish at least SEC-1, SEC-2 and SEC-3. They can leak real data even in a small pilot.

## Epic A: Security

| Key | Issue | Done when | Size |
| --- | --- | --- | --- |
| SEC-1 | Safe rendering: show server text with `textContent` or an escape helper in the student table, student card, reports, transport and toasts | A student named `<img onerror=...>` shows as plain text on every page, and a test fails if raw server text goes into `innerHTML` | M |
| SEC-2 | Limit student data by role: drivers see only riders of their own route (name, class, stop, guardian phone); teachers see their own classes; clerks see fee fields | API tests per role. A driver cannot open another route's student or search the whole school | L |
| SEC-3 | Remove the teacher role from fee data on Reports, Charts and Dashboard | A teacher gets a refusal on fee endpoints and sees a teacher dashboard (see DSH-1) that still loads | M |
| SEC-4 | Keep the sign-in token out of `localStorage`: short-lived token in an httpOnly cookie, refresh rotation, sign out everywhere | Script cannot read the token. CSRF protection is decided and tested | L |
| SEC-5 | Strict content security policy for the frontend: move inline `onclick` and inline style blocks into files | The app works with a policy that has no `unsafe-inline`, and the browser console shows no violations | M |
| SEC-6 | Production safety checks: refuse to start if login bypass is on or CORS is open in production; CI fails if the production build enables bypass | A deliberate wrong setting stops the server and the build | S |
| SEC-7 | Decide the `/public/*` routes: delete them, or keep a few as deliberately public with school-wide counts only | No route is public by accident. Tests cover each one | S |
| SEC-8 | Login hardening: turn on rate limiting and lockout, password rules, force a new password for seeded users | Repeated bad logins are slowed or locked and logged. No default password works after first sign-in | M |
| SEC-9 | Dependency and secret scanning in CI, with pinned versions | A known-bad package or a committed key fails the build | S |

## Epic B: Privacy and DPDP

| Key | Issue | Done when | Size |
| --- | --- | --- | --- |
| PRV-1 | Data inventory: every personal data field, why it is collected, who can see it, how long it is kept | A table in the repo reviewed by the school. Every field in the database appears in it, or is removed | S |
| PRV-2 | Privacy notice in plain English and Hindi, shown at first sign-in and linked from every page | Names the school contact, what is collected and why, and how to ask for access, correction or erasure | M |
| PRV-3 | Guardian consent records: after legal advice, record consent for anything outside the school exemption (photos, messaging, AI chat) with date, notice version and who gave it; allow withdrawal | A consent can be recorded, shown and withdrawn, and withdrawal stops that use | L |
| PRV-4 | Retention and deletion: a "left school" status instead of hard delete, hidden from lists, then anonymise or delete after the retention period with 48 hours' notice | No student can be deleted by one click. A scheduled job applies the retention periods and logs what it did | L |
| PRV-5 | Rights requests screen: export one student's data, correct it, erase it where the law allows, record each request and the answer | Every request has a date, an owner and an outcome, and the admin can answer one in minutes | L |
| PRV-6 | Audit trail of who viewed, changed or exported personal data, without storing the data itself, kept for at least one year | Opening a student, changing a phone number and exporting a CSV each leave a log line with user, time and what | M |
| PRV-7 | Breach response: written steps, who is told, message templates, an alert when refusals spike | A practice run is done once, and the ops status flags unusual refused access | M |
| PRV-8 | Export and print safeguards: only needed columns, a "contains children's data" header, every export logged, admin can switch teacher exports off | Each CSV and printout has a short banner. The export log lists who exported what | M |
| PRV-9 | AI chat limits: keep the model local and document it, leave contact details out of answers unless the role needs them, do not store raw student details in chat history, show a notice, allow switching it off | Chat history holds no phone numbers or addresses. The admin can disable the chat | M |
| PRV-10 | Encrypt backups and keep a copy off the phone | A restore drill works from an encrypted copy that was stored elsewhere | M |

## Epic C: Students

| Key | Issue | Done when | Size |
| --- | --- | --- | --- |
| STU-1 | Paging, search and filters (class, route, status), done on the server | All students are reachable. Going back keeps your place. The page no longer stops at 100 | M |
| STU-2 | Phone-first list: one card per student with name, class, roll, route and a call button to the guardian; details open on tap | Works at 360px in both themes. Every control is at least 44px | M |
| STU-3 | Student detail page with tabs Profile, Attendance, Marks, Fees and Transport, each shown only to roles allowed to see it | A teacher sees no Fees tab and a clerk sees no Marks tab | L |
| STU-4 | Add and edit form: grouped fields, class and route chosen from lists, a 10-digit mobile check, a clear save message | No free-text class. The "Class: N/A" students can be fixed here | M |
| STU-5 | Class assignment screen: move many students into a class and section at once, and list students with no class | The "not in a class" count on Analytics can reach zero from this screen | M |
| STU-6 | Replace Delete with "Mark as left school" and a confirmation that names the student | Needs PRV-4. Hard delete is admin only and only after the retention period | S |
| STU-7 | Hide sensitive fields by default: show the last 4 digits of a mobile and reveal on tap, logged | Reveals appear in the audit trail from PRV-6 | S |

## Epic D: Dashboard

| Key | Issue | Done when | Size |
| --- | --- | --- | --- |
| DSH-1 | One dashboard per role: admin (school summary, collection, attendance today), teacher (my classes, attendance not yet marked, marks pending), clerk (collected today, overdue) | Each role lands on its own view and sees no data it may not see | L |
| DSH-2 | Remove what is not real: the fixed "3 unread" badge and demo numbers; every empty state says what to do next | No number on screen is made up. Empty pages show a next step | S |
| DSH-3 | "Today" panel: which classes have marked attendance and which have not, with a one-tap link to the class | A teacher who forgot attendance is visible to the admin by 10 am | M |
| DSH-4 | Real charts for attendance trend and collection by month, each with a table version for screen readers | Charts read the same numbers as the tables and work in the dark theme | M |

## Epic E: Transport

| Key | Issue | Done when | Size |
| --- | --- | --- | --- |
| TRN-1 | Route cards: route, driver, number of riders, monthly fee, tap to see riders | A clerk can answer "who rides the North route" in two taps | M |
| TRN-2 | Separate Add driver and Add route (the "Add Route" button opens the add-driver form today) | Each button opens its own form with its own checks | S |
| TRN-3 | Driver view: a driver sees only their own route, rider names, stop and guardian phone | Depends on SEC-2. A driver cannot reach any other page of student data | M |
| TRN-4 | Assign a student to a route from the student or the route screen, showing the fee effect | Changing a rider updates the route count and the fee shown to the clerk | M |
| TRN-5 | Decide whether to track live location at all. If yes, limit it to child safety, tell guardians in the notice and keep as little as possible | A written decision. No location is collected until it exists | S |

## Epic F: Reports and charts

| Key | Issue | Done when | Size |
| --- | --- | --- | --- |
| RPT-1 | One Reports index of named reports (class list, attendance register, marks sheet, fee dues, route list), each with filters, Print and CSV like the Analytics pages; drop the full-profile students-by-driver report | Each report lists its columns and who may open it | L |
| RPT-2 | Give Reports and Charts the same look as Analytics: ₹ amounts, titles, light and dark themes, phone widths | Both pages pass a 360px check on both themes | M |
| RPT-3 | Report access by role: teachers get academic reports, the clerk gets fee reports, the admin gets all | Depends on SEC-3. Tests per role | S |
| RPT-4 | Fold charts into the pages that use them (Analytics, Collection) and retire the standalone Charts page if it adds nothing | No chart exists without a table version | M |

## Epic G: App-wide UX

| Key | Issue | Done when | Size |
| --- | --- | --- | --- |
| UX-1 | Menu by role: show only the pages a role can use, grouped as Daily work, Reports and Admin, with a bottom bar on phones for the four most-used tasks | A clerk never sees Marks. The common task is one tap from any page | M |
| UX-2 | Sign-in page: clear error messages, show password, remember the username, no bypass hint, Hindi and English | A wrong password says so in plain words. No developer text shows | M |
| UX-3 | Hindi and English labels on every page from one translation file, with a Devanagari font and long-name tests | Switching language changes every label. No text is cut off | L |
| UX-4 | One pattern for loading, empty, error-with-retry and saved states on every page | The same words and look appear on all pages | M |
| UX-5 | Poor network: keep a draft of attendance and marks, retry saving, and say clearly when something is not saved | Turning off Wi-Fi mid-entry loses nothing. The screen says "not saved yet" | L |
| UX-6 | One SCSS design system for colours and spacing so new pages need no inline style blocks; remove old debug files and unused CSS | Needs SEC-5. A new page is built only from shared styles | L |
| UX-7 | AI Chat page: keep or remove. If kept, add a notice that answers may be wrong, role-based starter questions and no personal data prompts | A written decision, then either removal or the changes | S |
| UX-8 | Accessibility pass on the pages not covered in #38: labels, focus, contrast, status messages | Students, Dashboard, Transport, Reports, Charts, Attendance and Marks pass the same checks as Analytics | M |

## Questions for you and the school

The answers change the size of the privacy epic.

- Will parents or students ever get a login? If yes, consent, rights requests and the notice become much bigger.
- Who is the school's contact for privacy requests and complaints? The rules ask for it to be published.
- Does the school use SMS, WhatsApp, photos or any outside service with student data?
- Where will the server run: a phone, a school computer or a cloud server? This affects backups and where data is stored.
- Will a lawyer confirm which uses of student data fall inside the school exemption (Fourth Schedule), and which need guardian consent?
- Is the AI chat wanted at all?
- Should live bus location ever be collected?

## Sources

Pages I opened on 28 November 2026.

- [Digital Personal Data Protection Rules 2025: key highlights (SCC Online)](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/): dates, notice, security, breach, retention, children's data and rights.
- [DPDP Rules carve out key exemptions for healthcare providers, schools and childcare services (Storyboard18)](https://www.storyboard18.com/digital/dpdp-rules-carve-out-key-exemptions-for-healthcare-providers-schools-and-childcare-services-processing-childrens-data-84208.htm): the school exemption.

The code findings come from the repository on the current branch, not from outside sources. Each should be re-checked when its issue is picked up.
