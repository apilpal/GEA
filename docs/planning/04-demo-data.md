# Demo school data (issue #30)

`backend/seed_school_data.py` builds a fictional school the size of Gurukul Educational Academy so every screen and report has something to show. **All of it is made up.**

## What it creates (session 2026-27)

| Item | Amount |
|---|---|
| Students | 521, in the real class sections (P.G. 35; L.K.G. A 38, B 19; U.K.G. A 33, B 36; I to V sections A and B; VI 30, VII 27, VIII 18) |
| Teachers | 30 (profiles only, no logins), with a class teacher per section and a teacher per class subject |
| Routes and drivers | 5 demo routes and 5 demo drivers; 100 students ride the van |
| Families | 40 two-child and 8 three-child families that share a parent mobile number |
| Attendance | every working day (Monday to Saturday) from 1 Sep to 21 Nov 2026, with a few frequently absent students |
| Marks | Terminal exam: out of 40 per subject; classes 6 to 8 have two papers (I and II) for Hindi, English and Mathematics; about 1.5 percent absent |
| Fees | monthly tuition (Rs 550, 600 or 650 by class) and van invoices for April to November, due on the 15th; about 70 percent paid up, 20 percent a month or two behind, 10 percent three to five months behind, a few partial payments; the last-admitted child of each three-child family has free tuition |

Demo rows are recognisable: admission numbers start `DEMO-`, student mobiles `91...`, teachers `92...`, drivers `93...`, routes and drivers are named `Demo ...`, villages `Demo ...`.

## Commands (from `backend/`, after `python setup_local.py`)

| Task | Command |
|---|---|
| Add the demo school | `python seed_school_data.py` (or `pnpm seed-school` from the repo root) |
| Remove only the demo rows | `python seed_school_data.py --reset-demo` |

Safe by default: running it again changes nothing, and it never edits or deletes rows it did not create. `--reset-demo` deletes only the demo rows listed above, after asking you to type `yes`.

**Warning:** the older `seed_sample_data.py --reset` deletes *all* students and drivers, including these and any real ones. Use it only on a throw-away database.

## Tests

`python -m pytest tests_school -q --noconftest` checks the scale, that a second run changes nothing, that real rows survive a reset, that reports are not empty, that fee totals match an independent calculation, and the three-children rule.
