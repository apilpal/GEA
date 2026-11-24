"""Remove class sections that have no students and no attendance (for example classes 9 to 12).

Those classes were created from the old sample students. The real school list stops at class 8.
Nothing is changed unless you pass --yes, and a backup is made first.

    cd backend && .venv/bin/python remove_empty_classes.py          # only shows what would go
    cd backend && .venv/bin/python remove_empty_classes.py --yes    # backs up, then removes

A class is kept if any student (even an inactive one) or any attendance row points to it.
Its subject lines (class_subjects) are removed with it. Marks belong to students, so they are
never touched.
"""
import sqlite3
import sys
from pathlib import Path
from typing import List, Tuple

Section = Tuple[int, str, str]  # (id, grade, section)


def find_empty_sections(conn: sqlite3.Connection) -> List[Section]:
    """Class sections with no student and no attendance row, in class order of creation."""
    return [tuple(row) for row in conn.execute(
        "SELECT id, grade, section FROM class_sections cs "
        "WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.class_section_id = cs.id) "
        "AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.class_section_id = cs.id) "
        "ORDER BY id")]


def remove_sections(conn: sqlite3.Connection, sections: List[Section]) -> int:
    """Delete the given sections and their subject lines in one transaction. Returns how many."""
    ids = [s[0] for s in sections]
    if not ids:
        return 0
    marks = ",".join("?" * len(ids))
    with conn:  # commits on success, rolls back on any error
        conn.execute(f"DELETE FROM class_subjects WHERE class_section_id IN ({marks})", ids)
        conn.execute(f"DELETE FROM class_sections WHERE id IN ({marks})", ids)
    return len(ids)


def main(argv) -> int:
    import db_backup

    apply = "--yes" in argv
    db_path = db_backup._database_path()
    conn = sqlite3.connect(db_path)
    try:
        empty = find_empty_sections(conn)
        if not empty:
            print("No empty classes. Nothing to do.")
            return 0
        print("Classes with no students and no attendance:")
        for _, grade, section in empty:
            print(f"  {grade}-{section}")
        if not apply:
            print("\nNothing was changed. Run again with --yes to remove them (a backup is made first).")
            return 0
        conn.close()
        saved = db_backup.backup(Path(db_path), suffix="before-class-cleanup")
        print(f"Backed up the database to {saved}")
        conn = sqlite3.connect(db_path)
        print(f"Removed {remove_sections(conn, find_empty_sections(conn))} classes.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
