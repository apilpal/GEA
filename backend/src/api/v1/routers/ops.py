"""Operations status (Phase 5, issue #40). Admin only.

GET /ops/status: how old the newest backup is, how many problems happened in the last 24 hours
(refused access, failed bulk saves, server errors, failed backups), the newest events, and a short list
of what needs attention. Events hold no student data (see src/core/ops_log.py).
"""

from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from src.core import ops_log
from src.core.models import User, UserRole
from src.services.ops_rules import backup_state, count_by_kind, needs_attention
from src.utils.auth_utils import check_permissions

router = APIRouter()
require_admin = check_permissions([UserRole.ADMIN])


def now() -> datetime:
    """The current time. A function so tests can replace it."""
    return datetime.now()


def database_path() -> Path:
    """The SQLite file. A function so tests can replace it."""
    from src.core.config.config import config

    url = config.DATABASE_URL
    if not url.startswith("sqlite:///"):
        raise HTTPException(status_code=501, detail="Backups are for SQLite databases only")
    return (ops_log.BACKEND_DIR / url[len("sqlite:///"):]).resolve()


@router.get("/ops/status")
async def ops_status(user: User = Depends(require_admin)):
    import db_backup

    info = db_backup.status(database_path(), now())
    state = backup_state(info["age_hours"])
    events = ops_log.recent(limit=500, since=now() - timedelta(days=1))
    counts = count_by_kind(events)
    return {"backup": {**info, "state": state}, "last_24_hours": counts,
            "recent_events": events[:20], "needs_attention": needs_attention(state, counts)}
