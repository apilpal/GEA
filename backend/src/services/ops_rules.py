"""Rules for operations monitoring (Phase 5, issue #40). Pure functions, no database or files."""

from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional

# Kinds of events written to the operations log. Never a student name, mark, amount or password.
AUTH_FAILURE = "auth_failure"
BULK_SAVE_FAILURE = "bulk_save_failure"
SERVER_ERROR = "server_error"
BACKUP_OK = "backup_ok"
BACKUP_FAILURE = "backup_failure"
KINDS = (AUTH_FAILURE, BULK_SAVE_FAILURE, SERVER_ERROR, BACKUP_OK, BACKUP_FAILURE)

# The saves that write many rows at once: attendance roster, marks sheet, fee payments and reversals.
BULK_SAVES = (
    ("PUT", "/api/attendance/roster"),
    ("PUT", "/api/marks/sheet"),
    ("POST", "/api/fees/payments"),
)

BACKUP_FRESH_HOURS = 26      # a daily backup that ran last night is still fresh in the morning
BACKUP_LATE_HOURS = 72       # after this the backup has been missing for days


def _is_bulk_save(method: str, path: str) -> bool:
    path = path.rstrip("/")
    return any(method == m and (path == p or (p.endswith("/payments") and path.startswith(p + "/"))) for m, p in BULK_SAVES)


def classify(method: str, path: str, status: int) -> Optional[str]:
    """Which operations event a finished request is, or None when it is not worth recording."""
    if status in (401, 403):
        return AUTH_FAILURE
    if status >= 500:
        return SERVER_ERROR
    if status >= 400 and _is_bulk_save(method.upper(), path):
        return BULK_SAVE_FAILURE
    return None


def backup_state(age_hours: Optional[float]) -> str:
    """none: no backup at all. ok: made in the last day. late: more than a day old. stale: days old."""
    if age_hours is None:
        return "none"
    if age_hours <= BACKUP_FRESH_HOURS:
        return "ok"
    return "late" if age_hours <= BACKUP_LATE_HOURS else "stale"


def backup_due(now: datetime, newest: Optional[datetime], hour: int) -> bool:
    """Time to make the daily backup: it is past ``hour`` o'clock and the newest backup is over 20 hours old.

    With no backup at all the first one is made at once, whatever the hour.
    """
    if newest is None:
        return True
    return now.hour >= hour and now - newest >= timedelta(hours=20)


def count_by_kind(events: Iterable[dict]) -> Dict[str, int]:
    counts = {kind: 0 for kind in KINDS}
    for event in events:
        kind = event.get("kind")
        if kind in counts:
            counts[kind] += 1
    return counts


def needs_attention(state: str, counts: Dict[str, int]) -> List[str]:
    """Plain sentences for the admin: what to look at today. An empty list means all is well."""
    notes = []
    if state == "none":
        notes.append("There is no backup yet. Run: pnpm backup")
    elif state in ("late", "stale"):
        notes.append("The newest backup is old. Check that the app has been running, or run: pnpm backup")
    if counts.get(BACKUP_FAILURE):
        notes.append(f"{counts[BACKUP_FAILURE]} backup(s) failed in the last day.")
    if counts.get(BULK_SAVE_FAILURE):
        notes.append(f"{counts[BULK_SAVE_FAILURE]} attendance, marks or payment save(s) failed in the last day.")
    if counts.get(SERVER_ERROR):
        notes.append(f"{counts[SERVER_ERROR]} server error(s) in the last day.")
    if counts.get(AUTH_FAILURE, 0) >= 20:
        notes.append(f"{counts[AUTH_FAILURE]} refused sign-ins or permissions in the last day. Check for guessing.")
    return notes
