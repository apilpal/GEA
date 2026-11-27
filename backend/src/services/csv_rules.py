"""Rules for the CSV exports (Phase 4, issue #39). Pure functions, no database."""

import csv
import io
from typing import Iterable, List, Sequence

BOM = "﻿"                       # lets Excel on a phone or PC read Hindi names and the rupee sign
DANGEROUS_START = ("=", "+", "-", "@", "\t", "\r")


def safe_cell(value) -> object:
    """Numbers stay numbers. Text that a spreadsheet could run as a formula gets a leading apostrophe.

    A student name or remark typed as =HYPERLINK(...) must not run when the file is opened.
    """
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (int, float)):
        return value
    text = str(value)
    return "'" + text if text.startswith(DANGEROUS_START) else text


def to_csv(header: Sequence[str], rows: Iterable[Sequence]) -> str:
    """The whole file as text: header, one line per row, Windows line ends, with a BOM."""
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\r\n")
    writer.writerow(header)
    for row in rows:
        writer.writerow([safe_cell(v) for v in row])
    return BOM + out.getvalue()


def marks_cell(marks, is_absent: bool) -> object:
    """AB for absent, blank for not entered, never zero for either."""
    if is_absent:
        return "AB"
    if marks is None:
        return ""
    value = float(marks)
    return int(value) if value == int(value) else value


def file_name(kind: str, *parts: str) -> str:
    """exports like gea-fees-2026-10.csv; only letters, digits and dashes."""
    cleaned = [p.replace(" ", "-") for p in parts if p]
    safe = "".join(ch for ch in "-".join([kind] + cleaned) if ch.isalnum() or ch == "-")
    return f"gea-{safe}.csv"
