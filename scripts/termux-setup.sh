#!/usr/bin/env bash
# One-time setup for running the app on Termux (also works on most Linux/macOS shells).
# Usage:  bash scripts/termux-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

say() { printf '\n==> %s\n' "$*"; }

IS_TERMUX=0
if [ -n "${PREFIX:-}" ] && [ -d "$PREFIX/bin" ] && command -v pkg >/dev/null 2>&1; then IS_TERMUX=1; fi

if [ "$IS_TERMUX" = 1 ]; then
  say "Installing system packages (python, nodejs, build tools)"
  pkg update -y
  # rust/clang are needed because bcrypt and pydantic-core are compiled on the phone.
  pkg install -y python nodejs git rust clang make binutils libffi openssl python-cryptography libcompiler-rt
  # Android build hint needed by Rust-based Python packages
  export ANDROID_API_LEVEL="$(getprop ro.build.version.sdk 2>/dev/null || echo 24)"
fi

command -v python3 >/dev/null || { echo "python3 not found"; exit 1; }
command -v node    >/dev/null || { echo "node not found"; exit 1; }

say "Preparing pnpm"
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm || { echo "Could not install pnpm; will fall back to npm"; }
fi
if command -v pnpm >/dev/null 2>&1; then PM=pnpm; else PM=npm; fi
echo "Using package manager: $PM"

say "Installing frontend packages (only what the dev server needs)"
(
  cd "$ROOT/frontend"
  export PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
  if [ "$PM" = pnpm ]; then
    pnpm install --prod --ignore-scripts
  else
    npm install --omit=dev --ignore-scripts --no-audit --no-fund
  fi
)

say "Creating Python environment"
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  # --system-site-packages lets the venv use Termux's prebuilt 'cryptography'
  python3 -m venv --system-site-packages .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
# Mobile connections drop often, so retry the download a few times.
pip_install() {
  for attempt in 1 2 3 4 5; do
    if python -m pip install --retries 10 --timeout 60 "$@"; then return 0; fi
    echo "Download failed (attempt $attempt of 5). Retrying in 5 seconds..."
    sleep 5
  done
  echo "Could not download the Python packages. Check your connection and run this script again."
  return 1
}
pip_install -r requirements-termux.txt

say "Creating backend settings (.env.development)"
if [ ! -f .env.development ]; then
  SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
  cat > .env.development <<ENV
ENVIRONMENT=development
SECRET_KEY=$SECRET
DATABASE_URL=sqlite:///./data/students.db
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
LOGIN_BYPASS_ENABLED=false
ENABLE_LOGIN_RATE_LIMITING=false
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
ENV
  chmod 600 .env.development
  echo "Wrote backend/.env.development with a fresh random SECRET_KEY."
else
  echo "backend/.env.development already exists - keeping it."
fi

say "Creating database and first admin user"
mkdir -p data
python setup_local.py

say "Done"
echo "Start everything with:   $PM run dev"
echo "Then open:               http://127.0.0.1:5173"
