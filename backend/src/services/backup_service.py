"""Daily automatic backup while the app is running (Phase 5, issue #40).

The app checks every few minutes. When it is past the backup hour and the newest backup is more than
20 hours old it makes a new one (SQLite's own backup API, verified, old ones pruned by db_backup).
The first backup is made at once when there is none. Every result goes to the operations log.
If the phone was off at the backup hour, the backup is made as soon as the app starts again.
"""

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from src.core import ops_log
from src.services.ops_rules import BACKUP_FAILURE, BACKUP_OK, backup_due

logger = logging.getLogger(__name__)
CHECK_EVERY_SECONDS = 600


def newest_backup_time(db_path: Path) -> Optional[datetime]:
    import db_backup

    files = db_backup.list_backups(db_path)
    regular = [f for f in files if db_backup.REGULAR.match(f.name)]
    return datetime.fromtimestamp(max(f.stat().st_mtime for f in regular)) if regular else None


def run_once(db_path: Path, hour: int, now: Optional[datetime] = None) -> Optional[str]:
    """Make a backup when one is due. Returns 'made', 'failed' or None (not due). Never raises."""
    import db_backup

    now = now or datetime.now()
    try:
        if not backup_due(now, newest_backup_time(db_path), hour):
            return None
        db_backup.backup(db_path, now=now)
        ops_log.record(BACKUP_OK, now=now, reason="daily", count=len(db_backup.list_backups(db_path)))
        return "made"
    except Exception as exc:  # noqa: BLE001 - one bad night must not stop the app
        logger.error("daily backup failed: %s", exc)
        ops_log.record(BACKUP_FAILURE, now=now, reason=f"daily: {exc}")
        return "failed"


async def daily_backup_loop(db_path: Path, hour: int = 2, every: int = CHECK_EVERY_SECONDS) -> None:
    while True:
        await asyncio.to_thread(run_once, db_path, hour)
        await asyncio.sleep(every)
