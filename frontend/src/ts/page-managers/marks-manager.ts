// Marks entry page (issue #33).
// A teacher picks a class, an exam and a subject, types the marks of every student and saves
// them all at once. Marks are checked as they are typed (0 up to the maximum, at most 2 decimals);
// an absent student is saved as AB, never as zero. Server text is added with textContent only.
import { apiService } from '@/ts/services/api-service';

interface ExamInfo { id: number; name: string; max_marks: number }
interface ClassOption { id: number; name: string; subjects: { id: number; name: string }[] }
interface Options { exams: ExamInfo[]; classes: ClassOption[] }
interface PartInfo { part: number; max_marks: number }
interface SheetScore { part: number; marks: number | null; is_absent: boolean; saved: boolean }
interface SheetStudent { student_id: number; name: string; roll_no: number | null; scores: SheetScore[] }
interface Sheet {
    class_section_id: number;
    exam_id: number;
    subject_id: number;
    parts: PartInfo[];
    students: SheetStudent[];
}
interface Cell { text: string; absent: boolean; saved: boolean }

const STORAGE_KEY = 'marks_last_selection';
const ROMAN = ['', 'I', 'II'];

const state = {
    options: null as Options | null,
    sheet: null as Sheet | null,
    cells: new Map<string, Cell>(),
    changed: false,
    saving: false
};

const cellKey = (studentId: number, part: number): string => `${studentId}:${part}`;

/**
 * Problem with a typed mark, or null when it is fine (an empty box is fine: not entered yet).
 * Same rules as the server: 0 to the maximum, at most 2 decimals.
 */
export function checkMark(text: string, max: number): string | null {
    const value = text.trim();
    if (value === '') return null;
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(value)) return 'Enter a number';
    if (/\.\d{3,}$/.test(value)) return 'At most 2 decimals';
    if (Number(value) > max) return `Maximum is ${max}`;
    return null;
}

/** How many cells have a mark, are absent, or are still empty. */
export function summarize(cells: Iterable<Cell>): { entered: number; absent: number; missing: number } {
    const result = { entered: 0, absent: 0, missing: 0 };
    for (const cell of cells) {
        if (cell.absent) result.absent += 1;
        else if (cell.text.trim() !== '') result.entered += 1;
        else result.missing += 1;
    }
    return result;
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
        else node.setAttribute(key, value);
    }
    for (const child of children) node.append(child);
    return node;
}

function remember(selection: Record<string, string>): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'), ...selection })); } catch { /* optional */ }
}

function remembered(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function select(id: string): HTMLSelectElement | null {
    return document.getElementById(id) as HTMLSelectElement | null;
}

function setMessage(text: string, kind: 'info' | 'error' | 'success' = 'info'): void {
    const box = document.getElementById('marks-message');
    if (!box) return;
    box.textContent = text;
    box.setAttribute('data-kind', kind);
    box.style.display = text ? 'block' : 'none';
}

function maxOf(part: number): number {
    return state.sheet?.parts.find(p => p.part === part)?.max_marks ?? 0;
}

/** Problems that stop a save: wrong numbers, or a saved mark that was blanked. */
function blockingProblems(): number {
    let count = 0;
    state.cells.forEach((cell, key) => {
        const part = Number(key.split(':')[1]);
        if (checkMark(cell.text, maxOf(part))) count += 1;
        else if (cell.saved && !cell.absent && cell.text.trim() === '') count += 1;
    });
    return count;
}

function renderSummary(): void {
    const box = document.getElementById('marks-summary');
    const save = document.getElementById('marks-save') as HTMLButtonElement | null;
    if (!box) return;
    const s = summarize(state.cells.values());
    const problems = blockingProblems();
    box.replaceChildren(
        el('span', { text: `Entered: ${s.entered}` }),
        el('span', { text: `AB: ${s.absent}` }),
        el('span', { text: `Missing: ${s.missing}` }),
        ...(problems ? [el('span', { class: 'mk-bad', text: `Fix: ${problems}` })] : []));
    if (save) {
        save.disabled = state.saving || problems > 0;
        save.textContent = state.saving ? 'Saving…' : 'Save marks';
    }
}

function refreshCell(input: HTMLInputElement, absentButton: HTMLButtonElement, key: string, part: number): void {
    const cell = state.cells.get(key)!;
    const problem = cell.absent ? null : checkMark(cell.text, maxOf(part));
    const blanked = cell.saved && !cell.absent && cell.text.trim() === '';
    input.disabled = cell.absent;
    input.value = cell.absent ? '' : cell.text;
    input.classList.toggle('mk-invalid', !!problem || blanked);
    input.title = problem || (blanked ? 'Enter the corrected mark or AB' : '');
    absentButton.setAttribute('aria-pressed', String(cell.absent));
    absentButton.classList.toggle('mk-ab-on', cell.absent);
}

function renderSheet(): void {
    const list = document.getElementById('marks-list');
    const sheet = state.sheet;
    if (!list || !sheet) return;
    const multiple = sheet.parts.length > 1;

    list.replaceChildren(...sheet.students.map(student => {
        const cells = sheet.parts.map(part => {
            const key = cellKey(student.student_id, part.part);
            const input = el('input', {
                type: 'text', inputmode: 'decimal', class: 'mk-input', autocomplete: 'off',
                placeholder: `/${part.max_marks}`,
                'aria-label': `${student.name}${multiple ? ` part ${ROMAN[part.part]}` : ''} marks out of ${part.max_marks}`
            });
            const absentButton = el('button', { type: 'button', class: 'mk-ab', 'aria-label': `Absent: ${student.name}`, text: 'AB' });
            input.addEventListener('input', () => {
                const cell = state.cells.get(key)!;
                cell.text = input.value;
                state.changed = true;
                refreshCell(input, absentButton, key, part.part);
                renderSummary();
            });
            input.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('#marks-list .mk-input:not(:disabled)'));
                inputs[inputs.indexOf(input) + 1]?.focus();
            });
            absentButton.addEventListener('click', () => {
                const cell = state.cells.get(key)!;
                cell.absent = !cell.absent;
                if (cell.absent) cell.text = '';
                state.changed = true;
                refreshCell(input, absentButton, key, part.part);
                renderSummary();
            });
            refreshCell(input, absentButton, key, part.part);
            return el('div', { class: 'mk-cell' },
                ...(multiple ? [el('span', { class: 'mk-part', text: `Part ${ROMAN[part.part]}` })] : []),
                input, absentButton);
        });
        const label = el('div', { class: 'mk-name' },
            el('span', { class: 'mk-roll', text: student.roll_no != null ? String(student.roll_no) : '–' }),
            el('span', { text: student.name }));
        return el('div', { class: 'mk-row' }, label, el('div', { class: 'mk-cells' }, ...cells));
    }));
    const empty = document.getElementById('marks-empty');
    if (empty) empty.style.display = sheet.students.length ? 'none' : 'block';
}

function confirmDiscard(): boolean {
    return !state.changed || window.confirm('You have unsaved marks. Discard them?');
}

async function loadSheet(): Promise<void> {
    const classId = select('marks-class')?.value || '';
    const examId = select('marks-exam')?.value || '';
    const subjectId = select('marks-subject')?.value || '';
    const body = document.getElementById('marks-body');
    if (!classId || !examId || !subjectId) {
        if (body) body.style.display = 'none';
        setMessage('');
        return;
    }
    remember({ classId, examId, subjectId });
    setMessage('Loading…');
    const response = await apiService.get<Sheet>('/marks/sheet', {
        class_section_id: classId, exam_id: examId, subject_id: subjectId
    });
    if (response.error || !response.data) {
        state.sheet = null;
        if (body) body.style.display = 'none';
        setMessage(response.error || 'Could not load the marks sheet', 'error');
        return;
    }
    const sheet = response.data;
    state.sheet = sheet;
    state.cells = new Map();
    sheet.students.forEach(student => student.scores.forEach(score => {
        state.cells.set(cellKey(student.student_id, score.part), {
            text: score.marks == null ? '' : String(score.marks),
            absent: score.is_absent,
            saved: score.saved
        });
    }));
    state.changed = false;
    if (body) body.style.display = 'block';
    setMessage('');
    renderSheet();
    renderSummary();
}

async function saveSheet(): Promise<void> {
    const sheet = state.sheet;
    if (!sheet || state.saving || blockingProblems() > 0) return;
    state.saving = true;
    renderSummary();
    const entries = sheet.students.flatMap(student => sheet.parts.map(part => {
        const cell = state.cells.get(cellKey(student.student_id, part.part))!;
        const text = cell.text.trim();
        return {
            student_id: student.student_id,
            part: part.part,
            marks: cell.absent || text === '' ? null : Number(text),
            is_absent: cell.absent
        };
    }));
    const response = await apiService.put<{ created: number; updated: number; unchanged: number }>('/marks/sheet', {
        class_section_id: sheet.class_section_id,
        exam_id: sheet.exam_id,
        subject_id: sheet.subject_id,
        entries
    });
    state.saving = false;
    if (response.error || !response.data) {
        renderSummary();
        setMessage(response.error || 'Not saved. Please try again.', 'error');
        return;
    }
    state.cells.forEach(cell => { if (cell.absent || cell.text.trim() !== '') cell.saved = true; });
    state.changed = false;
    renderSummary();
    const r = response.data;
    setMessage(`Saved. ${r.created} new, ${r.updated} changed, ${r.unchanged} unchanged.`, 'success');
}

function fillSubjects(classId: string, keep?: string): void {
    const subjectSelect = select('marks-subject');
    if (!subjectSelect || !state.options) return;
    subjectSelect.replaceChildren(el('option', { value: '', text: 'Select subject' }));
    const chosen = state.options.classes.find(c => String(c.id) === classId);
    chosen?.subjects.forEach(s => subjectSelect.append(el('option', { value: String(s.id), text: s.name })));
    if (keep && chosen?.subjects.some(s => String(s.id) === keep)) subjectSelect.value = keep;
}

function buildPage(container: HTMLElement, options: Options): void {
    const classSelect = el('select', { id: 'marks-class', class: 'form-control', 'aria-label': 'Class' },
        el('option', { value: '', text: 'Select class' }));
    options.classes.forEach(c => classSelect.append(el('option', { value: String(c.id), text: `Class ${c.name}` })));
    const examSelect = el('select', { id: 'marks-exam', class: 'form-control', 'aria-label': 'Exam' },
        el('option', { value: '', text: 'Select exam' }));
    options.exams.forEach(e => examSelect.append(el('option', { value: String(e.id), text: `${e.name} (${e.max_marks})` })));
    const subjectSelect = el('select', { id: 'marks-subject', class: 'form-control', 'aria-label': 'Subject' },
        el('option', { value: '', text: 'Select subject' }));

    const save = el('button', { type: 'button', class: 'btn btn-primary', id: 'marks-save', text: 'Save marks' });
    save.addEventListener('click', () => { void saveSheet(); });

    let previous = { c: '', e: '', s: '' };
    const onChange = (event: Event) => {
        if (!confirmDiscard()) {
            classSelect.value = previous.c;
            fillSubjects(previous.c, previous.s);
            examSelect.value = previous.e;
            subjectSelect.value = previous.s;
            return;
        }
        if (event.target === classSelect) fillSubjects(classSelect.value);
        previous = { c: classSelect.value, e: examSelect.value, s: subjectSelect.value };
        void loadSheet();
    };
    [classSelect, examSelect, subjectSelect].forEach(s => s.addEventListener('change', onChange));

    container.replaceChildren(
        el('div', { class: 'mk-controls' },
            el('label', { class: 'mk-field' }, el('span', { text: 'Class' }), classSelect),
            el('label', { class: 'mk-field' }, el('span', { text: 'Exam' }), examSelect),
            el('label', { class: 'mk-field' }, el('span', { text: 'Subject' }), subjectSelect)),
        el('div', { id: 'marks-message', class: 'mk-message', role: 'status', style: 'display:none' }),
        el('div', { id: 'marks-body', style: 'display:none' },
            el('div', { id: 'marks-summary', class: 'mk-summary' }),
            el('p', { class: 'mk-hint', text: 'Type the marks. Tap AB if the student was absent (AB is not zero). Press Enter to go to the next student.' }),
            el('div', { id: 'marks-list', class: 'mk-list' }),
            el('p', { id: 'marks-empty', class: 'mk-message', style: 'display:none', text: 'This class has no students yet.' }),
            el('div', { class: 'mk-savebar' }, save)));

    const last = remembered();
    if (last.classId && options.classes.some(c => String(c.id) === last.classId)) {
        classSelect.value = last.classId;
        fillSubjects(last.classId, last.subjectId);
    } else if (options.classes.length === 1) {
        classSelect.value = String(options.classes[0].id);
        fillSubjects(classSelect.value);
    }
    if (last.examId && options.exams.some(e => String(e.id) === last.examId)) examSelect.value = last.examId;
    else if (options.exams.length) examSelect.value = String(options.exams[0].id);
    previous = { c: classSelect.value, e: examSelect.value, s: subjectSelect.value };
    if (classSelect.value && subjectSelect.value) void loadSheet();
}

/**
 * Loads the exams and the class/subject pairs the signed-in user may enter marks for,
 * then builds the page. A teacher sees only their own subjects; the admin sees all.
 */
export async function loadMarksPage(): Promise<void> {
    const container = document.getElementById('marks-root');
    if (!container) return;
    container.replaceChildren(el('p', { class: 'mk-message', text: 'Loading…' }));

    const response = await apiService.get<Options>('/marks/options');
    if (response.status === 403) {
        container.replaceChildren(el('p', { class: 'mk-message', text: 'Marks can be entered by teachers and the admin only.' }));
        return;
    }
    if (response.error || !response.data) {
        container.replaceChildren(el('p', { class: 'mk-message', 'data-kind': 'error', text: response.error || 'Could not load the exams and classes.' }));
        return;
    }
    state.options = response.data;
    state.sheet = null;
    state.cells = new Map();
    state.changed = false;
    if (!response.data.classes.length) {
        container.replaceChildren(el('p', { class: 'mk-message', text: 'No subject is assigned to you yet. Ask the admin to assign your subjects.' }));
        return;
    }
    buildPage(container, response.data);
}
