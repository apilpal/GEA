"""Operations log (Phase 5, issue #40): one JSON line per event in ``logs/ops.log``.

Only a fixed list of fields is ever written (kind, time, method, path, status, reason, count). The caller
cannot add others, so a student's name, marks, an amount or a token cannot end up in this file.
Standard library only, so the backup tool can use it too.
"""

import json
import logging
import logging.handlers
from datetime import datetime
from pathlib import Path
from typing import List, Optional

BACKEND_DIR = Path(__file__).resolve().parents[2]
LOG_PATH = BACKEND_DIR / "logs" / "ops.log"
ALLOWED_FIELDS = ("method", "path", "status", "reason", "count")
MAX_TEXT = 120

_logger = logging.getLogger("ops")
_logger.propagate = False
_handler_path: Optional[Path] = None


def _text(value) -> str:
    return str(value).replace("\n", " ").replace("\r", " ")[:MAX_TEXT]


def _ensure_handler() -> None:
    """Attach the rotating file (1 MB, 5 files) once, and again if LOG_PATH was changed."""
    global _handler_path
    # Alembic's logging setup (fileConfig) switches off every logger that already exists. Switch ours back on
    # each time, or the log would silently stop after the first migration.
    _logger.disabled = False
    if _handler_path == LOG_PATH:
        return
    for old in list(_logger.handlers):
        _logger.removeHandler(old)
        old.close()
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    handler = logging.handlers.RotatingFileHandler(LOG_PATH, maxBytes=1_000_000, backupCount=5, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(handler)
    _logger.setLevel(logging.INFO)
    _handler_path = LOG_PATH


def record(kind: str, now: Optional[datetime] = None, **fields) -> None:
    """Write one event. Never raises: a full disk must not break a request."""
    try:
        event = {"time": (now or datetime.now()).isoformat(timespec="seconds"), "kind": _text(kind)}
        event.update({name: (fields[name] if isinstance(fields[name], int) else _text(fields[name]))
                      for name in ALLOWED_FIELDS if fields.get(name) is not None})
        _ensure_handler()
        _logger.info(json.dumps(event, ensure_ascii=False))
    except Exception:  # noqa: BLE001 - logging must never be the reason something fails
        pass


def recent(limit: int = 20, since: Optional[datetime] = None, path: Optional[Path] = None) -> List[dict]:
    """The newest events first, from ops.log. Lines that cannot be read are skipped."""
    path = path or LOG_PATH
    if not path.exists():
        return []
    events: List[dict] = []
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return []
    for line in reversed(lines):
        try:
            event = json.loads(line)
            when = datetime.fromisoformat(event["time"])
        except (ValueError, KeyError, TypeError):
            continue
        if since is not None and when < since:
            break                      # the file is in time order, so everything older is also too old
        events.append(event)
        if len(events) >= limit:
            break
    return events
