// Attendance entry page (issue #32).
// A teacher picks a class and a date, everyone starts as present, the teacher taps the
// few exceptions and saves the whole class at once. All text from the server is added with
// textContent, never innerHTML.
import { apiService } from '@/ts/services/api-service';

type Status = 'present' | 'absent' | 'late' | 'leave';

interface ClassInfo { id: number; name: string; student_count: number }
interface RosterStudent { student_id: number; name: string; roll_no: number | null; status: Status; remark: string | null }
interface Roster {
    class_section_id: number;
    class_name: string;
    date: string;
    already_saved: boolean;
    can_save: boolean;
    reason: string | null;
    students: RosterStudent[];
}

const STATUSES: { value: Status; short: string; label: string; color: string }[] = [
    { value: 'present', short: 'P', label: 'Present', color: 'var(--color-success, #16a34a)' },
    { value: 'absent', short: 'A', label: 'Absent', color: 'var(--color-danger, #dc2626)' },
    { value: 'late', short: 'L', label: 'Late', color: 'var(--color-warning, #d97706)' },
    { value: 'leave', short: 'Lv', label: 'Leave', color: 'var(--color-info, #2563eb)' }
];

const STORAGE_KEY = 'attendance_last_selection';

const state = {
    classes: [] as ClassInfo[],
    roster: null as Roster | null,
    marks: new Map<number, Status>(),
    changed: false,
    saving: false
};

/** Today's date in the phone's own time zone, as YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}

/** Number of students per status, used for the summary line. */
export function countStatuses(marks: Iterable<Status>): Record<Status, number> {
    const counts: Record<Status, number> = { present: 0, absent: 0, late: 0, leave: 0 };
    for (const status of marks) counts[status] += 1;
    return counts;
}

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Partial<Record<string, string>> = {},
    ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (value === undefined) continue;
        if (key === 'text') node.textContent = value;
        else if (key === 'style') node.setAttribute('style', value);
        else node.setAttribute(key, value);
    }
    for (const child of children) node.append(child);
    return node;
}

function remember(selection: { classId?: string; date?: string }): void {
    try {
        const old = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, ...selection }));
    } catch { /* storage can be blocked; the page works without it */ }
}

function remembered(): { classId?: string } {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function root(): HTMLElement | null {
    return document.getElementById('attendance-root');
}

function setMessage(text: string, kind: 'info' | 'error' | 'success' = 'info'): void {
    const box = document.getElementById('attendance-message');
    if (!box) return;
    box.textContent = text;
    box.setAttribute('data-kind', kind);
    box.style.display = text ? 'block' : 'none';
}

function selectedClassId(): string {
    return (document.getElementById('attendance-class') as HTMLSelectElement | null)?.value || '';
}

function selectedDate(): string {
    return (document.getElementById('attendance-date') as HTMLInputElement | null)?.value || '';
}

function confirmDiscard(): boolean {
    return !state.changed || window.confirm('You have unsaved changes. Discard them?');
}

function renderSummary(): void {
    const box = document.getElementById('attendance-summary');
    if (!box || !state.roster) return;
    const counts = countStatuses(state.marks.values());
    box.replaceChildren(...STATUSES.map(s =>
        el('span', { class: 'att-count', style: `color:${s.color}`, text: `${s.label}: ${counts[s.value]}` })));
    const save = document.getElementById('attendance-save') as HTMLButtonElement | null;
    if (save) {
        save.disabled = state.saving || !state.roster.can_save;
        save.textContent = state.saving ? 'Saving…' : state.roster.already_saved ? 'Update attendance' : 'Save attendance';
    }
}

function renderRoster(): void {
    const list = document.getElementById('attendance-list');
    const roster = state.roster;
    if (!list || !roster) return;

    list.replaceChildren(...roster.students.map(student => {
        const current = state.marks.get(student.student_id) ?? 'present';
        const buttons = STATUSES.map(s => {
            const active = s.value === current;
            const button = el('button', {
                type: 'button',
                class: 'att-btn',
                'data-status': s.value,
                'aria-pressed': String(active),
                'aria-label': `${s.label}: ${student.name}`,
                style: active ? `background:${s.color};color:#fff;border-color:${s.color}` : '',
                text: s.short
            });
            button.disabled = !roster.can_save;
            button.addEventListener('click', () => {
                state.marks.set(student.student_id, s.value);
                state.changed = true;
                renderRoster();
                renderSummary();
            });
            return button;
        });
        const label = el('div', { class: 'att-name' },
            el('span', { class: 'att-roll', text: student.roll_no != null ? String(student.roll_no) : '–' }),
            el('span', { text: student.name }));
        return el('div', { class: 'att-row' }, label, el('div', { class: 'att-buttons' }, ...buttons));
    }));

    const emptyNote = document.getElementById('attendance-empty');
    if (emptyNote) emptyNote.style.display = roster.students.length ? 'none' : 'block';
}

async function loadRoster(): Promise<void> {
    const classId = selectedClassId();
    const date = selectedDate();
    const controls = document.getElementById('attendance-body');
    if (!classId || !date) {
        if (controls) controls.style.display = 'none';
        return;
    }
    remember({ classId });
    setMessage('Loading…');
    const response = await apiService.get<Roster>('/attendance/roster', { class_section_id: classId, date });
    if (response.error || !response.data) {
        state.roster = null;
        if (controls) controls.style.display = 'none';
        setMessage(response.error || 'Could not load the class', 'error');
        return;
    }
    const roster = response.data;
    state.roster = roster;
    state.marks = new Map(roster.students.map(s => [s.student_id, s.status] as [number, Status]));
    state.changed = false;
    if (controls) controls.style.display = 'block';

    if (!roster.can_save) setMessage(roster.reason || 'This date cannot be changed', 'error');
    else if (roster.already_saved) setMessage('Attendance for this day was saved earlier. Saving again will replace it.', 'info');
    else setMessage('');
    renderRoster();
    renderSummary();
}

async function saveRoster(): Promise<void> {
    const roster = state.roster;
    if (!roster || state.saving || !roster.can_save) return;
    state.saving = true;
    renderSummary();
    const entries = roster.students.map(s => ({
        student_id: s.student_id,
        status: state.marks.get(s.student_id) ?? 'present',
        remark: s.remark
    }));
    const response = await apiService.put<{ counts: Record<Status, number>; total: number }>('/attendance/roster', {
        class_section_id: roster.class_section_id,
        date: roster.date,
        entries
    });
    state.saving = false;
    if (response.error || !response.data) {
        renderSummary();
        setMessage(`Not saved. ${response.error || 'Please try again.'}`, 'error');
        return;
    }
    const c = response.data.counts;
    state.changed = false;
    roster.already_saved = true;
    renderSummary();
    setMessage(`Saved ${response.data.total} students: ${c.present} present, ${c.absent} absent, ${c.late} late, ${c.leave} on leave.`, 'success');
}

function buildPage(container: HTMLElement): void {
    const classSelect = el('select', { id: 'attendance-class', class: 'form-control', 'aria-label': 'Class' });
    classSelect.append(el('option', { value: '', text: 'Select class' }));
    state.classes.forEach(c => classSelect.append(el('option', { value: String(c.id), text: `Class ${c.name} (${c.student_count})` })));

    const today = localToday();
    const dateInput = el('input', { id: 'attendance-date', class: 'form-control', type: 'date', value: today, max: today, 'aria-label': 'Date' });

    const markAll = el('button', { type: 'button', class: 'btn btn-outline', id: 'attendance-all-present', text: 'Mark all present' });
    markAll.addEventListener('click', () => {
        if (!state.roster) return;
        state.roster.students.forEach(s => state.marks.set(s.student_id, 'present'));
        state.changed = true;
        renderRoster();
        renderSummary();
    });

    const save = el('button', { type: 'button', class: 'btn btn-primary', id: 'attendance-save', text: 'Save attendance' });
    save.addEventListener('click', () => { void saveRoster(); });

    let previousClass = '';
    let previousDate = today;
    const onChange = (event: Event) => {
        const target = event.target as HTMLSelectElement | HTMLInputElement;
        if (!confirmDiscard()) {
            classSelect.value = previousClass;
            dateInput.value = previousDate;
            return;
        }
        previousClass = classSelect.value;
        previousDate = dateInput.value;
        if (target === dateInput && !dateInput.value) return;
        void loadRoster();
    };
    classSelect.addEventListener('change', onChange);
    dateInput.addEventListener('change', onChange);

    container.replaceChildren(
        el('div', { class: 'att-controls' },
            el('label', { class: 'att-field' }, el('span', { text: 'Class' }), classSelect),
            el('label', { class: 'att-field' }, el('span', { text: 'Date' }), dateInput)),
        el('div', { id: 'attendance-message', class: 'att-message', role: 'status', style: 'display:none' }),
        el('div', { id: 'attendance-body', style: 'display:none' },
            el('div', { class: 'att-toolbar' }, el('div', { id: 'attendance-summary', class: 'att-summary' }), markAll),
            el('div', { id: 'attendance-list', class: 'att-list' }),
            el('p', { id: 'attendance-empty', class: 'att-message', style: 'display:none', text: 'This class has no students yet.' }),
            el('div', { class: 'att-savebar' }, save)));

    const saved = remembered().classId;
    if (saved && state.classes.some(c => String(c.id) === saved)) {
        classSelect.value = saved;
        previousClass = saved;
        void loadRoster();
    } else if (state.classes.length === 1) {
        classSelect.value = String(state.classes[0].id);
        previousClass = classSelect.value;
        void loadRoster();
    }
}

/**
 * Loads the classes the signed-in user may mark and builds the attendance page.
 * Teachers see their own class; the admin sees every class.
 */
export async function loadAttendancePage(): Promise<void> {
    const container = root();
    if (!container) return;
    container.replaceChildren(el('p', { class: 'att-message', text: 'Loading classes…' }));

    const response = await apiService.get<ClassInfo[]>('/attendance/classes');
    if (response.status === 403) {
        container.replaceChildren(el('p', { class: 'att-message', text: 'Attendance can be marked by teachers and the admin only.' }));
        return;
    }
    if (response.error || !Array.isArray(response.data)) {
        container.replaceChildren(el('p', { class: 'att-message', 'data-kind': 'error', text: response.error || 'Could not load classes.' }));
        return;
    }
    state.classes = response.data;
    state.roster = null;
    state.marks = new Map();
    state.changed = false;
    if (!state.classes.length) {
        container.replaceChildren(el('p', { class: 'att-message', text: 'No class is assigned to you yet. Ask the admin to set you as class teacher.' }));
        return;
    }
    buildPage(container);
}
