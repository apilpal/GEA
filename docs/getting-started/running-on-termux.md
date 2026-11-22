# Running the app (Termux or any Linux shell)

## First time only
```
git clone https://github.com/apilpal/GEA.git
cd GEA
bash scripts/termux-setup.sh
```
The script installs Python, Node and pnpm, installs the app's packages, creates
`backend/.env.development` with a random secret key, creates the database and asks
you for the first admin username and password.

The first run can take 10-30 minutes on a phone because two Python packages (bcrypt,
pydantic-core) are compiled. Keep Termux open and the screen awake.

## Every time
```
pnpm dev
```
(`npm run dev` works too.) This starts the backend and the frontend together.
Open **http://127.0.0.1:5173** in your phone browser and log in with the admin account.
While the database is empty the dashboard shows sample data (75 students, 5 drivers, fee 500 each).
Press **Ctrl+C** in Termux to stop both.

Options (environment variables): `RELOAD=1` restarts the backend when code changes,
`BACKEND_PORT`, `FRONTEND_PORT`, and `HOST=0.0.0.0` to open the app from another device
on the same Wi-Fi.

## Other commands
- `pnpm create-admin` - run the admin/database setup again (existing users are kept).
- `pnpm seed` - add 75 sample students and 5 sample drivers (fee 500 each) to the database. Running it twice does not create duplicates. `python seed_sample_data.py --clear` (in `backend/`) deletes ALL students and drivers first.
- Add more users later from the API docs page: http://127.0.0.1:8000/docs

## If something goes wrong
See the [troubleshooting hub](../troubleshooting/README.md), or go back to the [documentation index](../README.md).
