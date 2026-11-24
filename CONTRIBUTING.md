# Contributing

Short guide for working on this project, from a phone (Termux) or a computer. `CLAUDE.md` has the technical rules; this file is the workflow.

## Before you start
- The plan is `ROADMAP.md` and the GitHub issues (#21 to #41). Pick one issue. Ask the owner first if someone else may already be doing it.
- **This repo is public. Use fake data only.** Never commit real student names, phone numbers, passwords, tokens or `.env` files.

## Set up (first time)
```
git clone https://github.com/apilpal/GEA.git
cd GEA
bash scripts/termux-setup.sh     # installs everything, asks for an admin login
pnpm seed-school                 # demo data (fake). Do not run `pnpm seed` after it
pnpm dev                         # app at http://127.0.0.1:5173
```

## Make a change
1. `git checkout main && git pull`
2. `git checkout -b phase3-short-name-35` (one issue, one branch)
3. Make the change. Keep it small and about that one issue.
4. Run the tests (below). Say honestly in the PR what you did and did not run.
5. `git add -A && git commit -m "Short clear message"`
6. `git push -u origin phase3-short-name-35`, then open a pull request on GitHub with `Closes #35` in the description. The owner reviews and merges.

If `git pull` says "divergent branches", do not merge. Ask the owner, or run `git fetch origin` then `git reset --hard origin/main` only if you have nothing on `main` you need.

## Tests
```
cd backend && source .venv/bin/activate
python -m pytest tests_school -q --noconftest --ignore=tests_school/test_token_refresh.py
```
Every new endpoint needs tests (see `backend/tests_school/test_marks_api.py` as the model). Frontend: `cd frontend && pnpm build` must succeed.

## Working with Claude
Open the repo and tell Claude which issue you are doing. `CLAUDE.md` is read automatically and has the rules, the code map and the known pitfalls.

## Do not
- Edit old Alembic migrations (add a new one), commit directly to `main`, or change business rules (marks, fees, attendance) without asking the owner.
