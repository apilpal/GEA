// Scorecard page (issue #34): pick a class and a student to see the marks of every exam.
// AB (absent) and marks not entered yet are shown as such and never counted as zero.
// All text from the server is added with textContent, never innerHTML.
import { apiService } from '@/ts/services/api-service';
import { exportBar } from '@/ts/services/export-tools';

interface ClassInfo { id: number; name: string; student_count: number }
interface StudentInfo { student_id: number; name: string; roll_no: number | null }
interface Cell { marks: number | null; max: number; status: 'entered' | 'partial' | 'absent' | 'missing' }
interface SubjectRow { subject_id: number; name: string; exams: Record<string, Cell>; total: number | null; max: number; percent: number | null }
interface ExamTotal { exam_id: number; name: string; max_marks: number; total: number | null; max: number; percent: number | null; position: number | null; of: number }
interface Card {
    student: { student_id: number; name: string; roll_no: number | null; admission_no: string | null; father_name: string | null;
               mother_name: string | null; dob: string | null; class_name: string; session: string | null };
    exams: { exam_id: number; name: string; max_marks: number }[];
    subjects: SubjectRow[];
    exam_totals: ExamTotal[];
    overall: { total: number | null; max: number; percent: number | null; position: number | null; of: number };
    attendance: { present: number; absent: number; late: number; leave: number; recorded: number; rate: number | null };
}

/** What to show in a marks cell: the mark, AB for absent, or a dash when nothing is entered. */
export function cellText(cell: Cell | undefined): string {
    if (!cell) return '–';
    if (cell.status === 'absent') return 'AB';
    if (cell.status === 'missing' || cell.marks === null) return '–';
    return cell.status === 'partial' ? `${cell.marks}*` : String(cell.marks);
}

/** "62.5%" or a dash. */
export function percentText(value: number | null): string {
    return value === null ? '–' : `${value}%`;
}

/** "2 of 40" or a dash when the student has no position. */
export function positionText(position: number | null, of: number): string {
    return position === null ? '–' : `${position} of ${of}`;
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

function setMessage(text: string, kind: 'info' | 'error' = 'info'): void {
    const box = document.getElementById('sc-message');
    if (!box) return;
    box.textContent = text;
    box.setAttribute('data-kind', kind);
    box.style.display = text ? 'block' : 'none';
}

function renderCard(card: Card): void {
    const box = document.getElementById('sc-card');
    if (!box) return;
    const s = card.student;
    const header = el('tr', {}, el('th', { scope: 'col', text: 'Subject' }),
        ...card.exams.map(e => el('th', { scope: 'col', text: `${e.name} (${e.max_marks})` })), el('th', { scope: 'col', text: 'Total' }));
    const rows = card.subjects.map(subject => el('tr', {},
        el('th', { scope: 'row', text: subject.name }),
        ...card.exams.map(e => {
            const cell = subject.exams[String(e.exam_id)];
            return el('td', { class: cell?.status === 'absent' ? 'sc-ab' : '', title: cell?.status === 'partial' ? 'One paper is not entered yet' : '', text: cellText(cell) });
        }),
        el('td', { text: subject.total === null ? '–' : `${subject.total}/${subject.max}` })));
    const totalRow = el('tr', { class: 'sc-total' }, el('th', { scope: 'row', text: 'Total' }),
        ...card.exams.map(e => {
            const t = card.exam_totals.find(x => x.exam_id === e.exam_id);
            return el('td', { text: t && t.total !== null ? `${t.total}/${t.max}` : '–' });
        }),
        el('td', { text: card.overall.total === null ? '–' : `${card.overall.total}/${card.overall.max}` }));
    const percentRow = el('tr', { class: 'sc-total' }, el('th', { scope: 'row', text: 'Percent' }),
        ...card.exams.map(e => el('td', { text: percentText(card.exam_totals.find(x => x.exam_id === e.exam_id)?.percent ?? null) })),
        el('td', { text: percentText(card.overall.percent) }));
    const positionRow = el('tr', { class: 'sc-total' }, el('th', { scope: 'row', text: 'Position' }),
        ...card.exams.map(e => {
            const t = card.exam_totals.find(x => x.exam_id === e.exam_id);
            return el('td', { text: t ? positionText(t.position, t.of) : '–' });
        }),
        el('td', { text: positionText(card.overall.position, card.overall.of) }));

    const a = card.attendance;
    box.replaceChildren(
        exportBar(`Scorecard of ${s.name}, class ${s.class_name}`),
        el('h3', { class: 'sc-title', text: s.name }),
        el('p', { class: 'sc-note', text: [`Class ${s.class_name}`, s.roll_no != null ? `Roll ${s.roll_no}` : '', s.admission_no || '', s.session ? `Session ${s.session}` : '', s.father_name ? `Father: ${s.father_name}` : '', s.mother_name ? `Mother: ${s.mother_name}` : ''].filter(Boolean).join(' · ') }),
        el('div', { class: 'sc-scroll' }, el('table', { class: 'sc-table' }, el('caption', { class: 'sr-only', text: `Marks of ${s.name} in every subject and exam` }), el('thead', {}, header), el('tbody', {}, ...rows, totalRow, percentRow, positionRow))),
        el('p', { class: 'sc-note', text: 'AB = absent. A dash means not entered yet. AB and dashes are left out of totals and percentages. * means one paper is not entered yet.' }),
        el('p', { class: 'sc-attendance', text: a.recorded
            ? `Attendance: ${percentText(a.rate)} (present ${a.present}, late ${a.late}, absent ${a.absent}, leave ${a.leave})`
            : 'Attendance: not recorded yet' }));
    box.style.display = 'block';
}

async function loadStudents(classId: string): Promise<void> {
    const studentSelect = document.getElementById('sc-student') as HTMLSelectElement | null;
    const box = document.getElementById('sc-card');
    if (box) box.style.display = 'none';
    if (!studentSelect) return;
    studentSelect.replaceChildren(el('option', { value: '', text: 'Select student' }));
    if (!classId) return;
    const response = await apiService.get<StudentInfo[]>(`/scorecards/classes/${classId}/students`);
    if (response.error || !Array.isArray(response.data)) { setMessage(response.error || 'Could not load students', 'error'); return; }
    setMessage('');
    response.data.forEach(s => studentSelect.append(el('option', {
        value: String(s.student_id), text: `${s.roll_no != null ? `${s.roll_no}. ` : ''}${s.name}` })));
}

async function loadCard(studentId: string): Promise<void> {
    const box = document.getElementById('sc-card');
    if (!studentId) { if (box) box.style.display = 'none'; return; }
    setMessage('Loading…');
    const response = await apiService.get<Card>(`/scorecards/students/${studentId}`);
    if (response.error || !response.data) {
        if (box) box.style.display = 'none';
        setMessage(response.error || 'Could not load the scorecard', 'error');
        return;
    }
    setMessage('');
    renderCard(response.data);
}

/** Builds the scorecard page. Teachers see the classes they teach; the admin sees all. */
export async function loadScorecardPage(): Promise<void> {
    const container = document.getElementById('scorecard-root');
    if (!container) return;
    container.replaceChildren(el('p', { class: 'sc-note', text: 'Loading…' }));
    const response = await apiService.get<ClassInfo[]>('/scorecards/classes');
    if (response.status === 403) {
        container.replaceChildren(el('p', { class: 'sc-note', text: 'Scorecards can be viewed by teachers and the admin only.' }));
        return;
    }
    if (response.error || !Array.isArray(response.data)) {
        container.replaceChildren(el('p', { class: 'sc-note', 'data-kind': 'error', text: response.error || 'Could not load classes' }));
        return;
    }
    if (!response.data.length) {
        container.replaceChildren(el('p', { class: 'sc-note', text: 'No class is assigned to you yet. Ask the admin.' }));
        return;
    }
    const classSelect = el('select', { id: 'sc-class', class: 'form-control', 'aria-label': 'Class' }, el('option', { value: '', text: 'Select class' }));
    response.data.forEach(c => classSelect.append(el('option', { value: String(c.id), text: `Class ${c.name} (${c.student_count})` })));
    const studentSelect = el('select', { id: 'sc-student', class: 'form-control', 'aria-label': 'Student' }, el('option', { value: '', text: 'Select student' }));
    classSelect.addEventListener('change', () => { void loadStudents(classSelect.value); });
    studentSelect.addEventListener('change', () => { void loadCard(studentSelect.value); });
    container.replaceChildren(
        el('div', { class: 'sc-controls' },
            el('label', { class: 'sc-field' }, el('span', { text: 'Class' }), classSelect),
            el('label', { class: 'sc-field' }, el('span', { text: 'Student' }), studentSelect)),
        el('div', { id: 'sc-message', class: 'sc-message', role: 'status', style: 'display:none' }),
        el('div', { id: 'sc-card', style: 'display:none' }));
    if (response.data.length === 1) {
        classSelect.value = String(response.data[0].id);
        void loadStudents(classSelect.value);
    }
}
