// Analytics page (issue #35).
// The admin sees the school summary and a class-by-class comparison; the admin and teachers can open
// one class to see every student. All numbers are computed on the server. A student with no marks
// yet is shown as "no marks yet" and is not counted as zero. Buckets are labels for follow-up, not
// pass or fail. All text from the server is added with textContent, never innerHTML.
import { apiService } from '@/ts/services/api-service';

interface Buckets { distinction: number; steady: number; borderline: number; at_risk: number }
interface Group { students: number; with_marks: number; average_percent: number | null; buckets: Buckets;
                  attendance_rate: number | null; attendance_days: number }
interface ClassRow extends Group { class_section_id: number; name: string; grade: string; section: string; class_teacher: string | null }
interface GradeRow extends Group { grade: string; sections: number }
interface ExamOption { exam_id: number; name: string }
interface BucketRule { key: keyof Buckets; label: string; rule: string }
interface Overview { session: string; exam: ExamOption | null; exams: ExamOption[]; school: Group; grades: GradeRow[];
                     classes: ClassRow[]; unassigned_students: number; bucket_rules: BucketRule[] }
interface StudentRow { student_id: number; name: string; roll_no: number | null; percent: number | null; bucket: keyof Buckets | null;
                       position: number | null; attendance_rate: number | null }
interface ClassDetail { class: { class_section_id: number; name: string; session: string | null }; exam: ExamOption | null;
                        exams: ExamOption[]; summary: Group; students: StudentRow[]; bucket_rules: BucketRule[] }
interface ClassInfo { id: number; name: string; student_count: number }

const state = { examId: '' as string, classId: null as number | null };

/** "62.5%" or a dash when there is no number. */
export function percentLabel(value: number | null): string {
    return value === null || value === undefined ? '–' : `${value}%`;
}

/** Plain label of a bucket, or "No marks yet" for a student who has none. */
export function bucketLabel(bucket: keyof Buckets | null): string {
    switch (bucket) {
        case 'distinction': return 'Distinction';
        case 'steady': return 'Steady';
        case 'borderline': return 'Borderline';
        case 'at_risk': return 'At risk';
        default: return 'No marks yet';
    }
}

/** "3 of 40" or a dash when the student has no position. */
export function rankLabel(position: number | null, of: number): string {
    return position === null ? '–' : `${position} of ${of}`;
}

function isAdmin(): boolean {
    try { return JSON.parse(localStorage.getItem('auth_user') || '{}').role === 'admin'; } catch { return false; }
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

function note(text: string, kind = ''): HTMLElement {
    return el('p', { class: 'an-note', 'data-kind': kind, text });
}

function chips(group: Group): HTMLElement {
    const chip = (label: string, value: string): HTMLElement =>
        el('div', { class: 'an-chip' }, el('span', { text: label }), el('strong', { text: value }));
    return el('div', { class: 'an-chips' },
        chip('Students', String(group.students)),
        chip('With marks', String(group.with_marks)),
        chip('Average', percentLabel(group.average_percent)),
        chip('Attendance', percentLabel(group.attendance_rate)));
}

function bucketChips(buckets: Buckets): HTMLElement {
    const keys: (keyof Buckets)[] = ['distinction', 'steady', 'borderline', 'at_risk'];
    return el('div', { class: 'an-chips' }, ...keys.map(key =>
        el('div', { class: `an-chip an-${key}` }, el('span', { text: bucketLabel(key) }), el('strong', { text: String(buckets[key]) }))));
}

function rulesBox(rules: BucketRule[]): HTMLElement {
    return el('details', { class: 'an-rules' },
        el('summary', { text: 'What do these labels mean?' }),
        el('ul', {}, ...rules.map(r => el('li', {}, el('strong', { text: `${r.label}: ` }), r.rule))),
        note('Labels use the average percent of the exams counted. Absent (AB) and marks not entered yet are left out, never counted as zero. A student with no marks is not placed in any label. These limits are not pass or fail marks; they are for follow-up until the school decides its pass mark.'));
}

function examSelect(exams: ExamOption[], onChange: (value: string) => void): HTMLElement {
    const select = el('select', { class: 'form-control', 'aria-label': 'Exam' }, el('option', { value: '', text: 'All exams together' }));
    exams.forEach(e => select.append(el('option', { value: String(e.exam_id), text: e.name })));
    select.value = state.examId;
    select.addEventListener('change', () => onChange(select.value));
    return el('label', { class: 'an-field' }, el('span', { text: 'Exam' }), select);
}

function groupRow(label: string, group: Group, onOpen?: () => void): HTMLElement {
    const cells = [String(group.students), String(group.with_marks), percentLabel(group.average_percent), percentLabel(group.attendance_rate),
                   String(group.buckets.distinction), String(group.buckets.steady), String(group.buckets.borderline), String(group.buckets.at_risk)];
    const first = el('th', { scope: 'row' });
    if (onOpen) {
        const button = el('button', { type: 'button', class: 'an-link', text: label });
        button.addEventListener('click', onOpen);
        first.append(button);
    } else first.textContent = label;
    return el('tr', {}, first, ...cells.map(text => el('td', { text })));
}

function comparisonTable(first: string, rows: HTMLElement[]): HTMLElement {
    const heads = [first, 'Students', 'With marks', 'Average', 'Attendance', 'Distinction', 'Steady', 'Borderline', 'At risk'];
    return el('div', { class: 'an-scroll' }, el('table', { class: 'an-table' },
        el('thead', {}, el('tr', {}, ...heads.map(text => el('th', { text })))), el('tbody', {}, ...rows)));
}

function renderDetail(data: ClassDetail): void {
    const box = document.getElementById('an-detail');
    if (!box) return;
    const ranked = data.students.filter(s => s.percent !== null).length;
    const rows = data.students.map(s => el('tr', {},
        el('td', { text: s.roll_no != null ? String(s.roll_no) : '' }),
        el('th', { scope: 'row', text: s.name }),
        el('td', { text: percentLabel(s.percent) }),
        el('td', { text: bucketLabel(s.bucket) }),
        el('td', { text: rankLabel(s.position, ranked) }),
        el('td', { text: percentLabel(s.attendance_rate) })));
    const onExam = (value: string): void => {
        state.examId = value;
        if (isAdmin()) void loadOverview(); // reloads the overview and then this class
        else void loadDetail(data.class.class_section_id);
    };
    box.replaceChildren(
        el('div', { class: 'an-controls' }, examSelect(data.exams, onExam)),
        el('h3', { class: 'an-title', text: `Class ${data.class.name}${data.exam ? ` · ${data.exam.name}` : ' · all exams'}` }),
        chips(data.summary),
        bucketChips(data.summary.buckets),
        el('div', { class: 'an-scroll' }, el('table', { class: 'an-table' },
            el('thead', {}, el('tr', {}, ...['Roll', 'Student', 'Percent', 'Label', 'Position', 'Attendance'].map(text => el('th', { text })))),
            el('tbody', {}, ...rows))),
        note('Students with the same percent share a position. A dash means there is nothing to count yet.'),
        rulesBox(data.bucket_rules));
    box.style.display = 'block';
}

async function loadDetail(classId: number): Promise<void> {
    const box = document.getElementById('an-detail');
    state.classId = classId;
    if (box) { box.replaceChildren(note('Loading…')); box.style.display = 'block'; }
    const query = state.examId ? `?exam_id=${encodeURIComponent(state.examId)}` : '';
    const response = await apiService.get<ClassDetail>(`/analytics/classes/${classId}${query}`);
    if (response.error || !response.data) {
        if (box) { box.replaceChildren(note(response.error || 'Could not load the class', 'error')); }
        return;
    }
    renderDetail(response.data);
}

function renderOverview(root: HTMLElement, data: Overview): void {
    const classRows = data.classes.map(c => groupRow(c.name, c, () => { void loadDetail(c.class_section_id); }));
    const gradeRows = data.grades.map(g => groupRow(`Class ${g.grade} (${g.sections} section${g.sections === 1 ? '' : 's'})`, g));
    root.replaceChildren(
        el('div', { class: 'an-controls' }, examSelect(data.exams, value => { state.examId = value; void loadOverview(); })),
        el('h3', { class: 'an-title', text: `School summary · ${data.session}${data.exam ? ` · ${data.exam.name}` : ' · all exams'}` }),
        chips(data.school),
        bucketChips(data.school.buckets),
        data.unassigned_students ? note(`${data.unassigned_students} active student(s) are not in a class this session and are not counted above.`) : el('span'),
        rulesBox(data.bucket_rules),
        el('h3', { class: 'an-title', text: 'Grades' }),
        comparisonTable('Grade', gradeRows),
        el('h3', { class: 'an-title', text: 'Classes (tap a class to see its students)' }),
        comparisonTable('Class', classRows),
        el('div', { id: 'an-detail', style: 'display:none' }));
    if (state.classId !== null && data.classes.some(c => c.class_section_id === state.classId)) void loadDetail(state.classId);
}

async function loadOverview(): Promise<void> {
    const root = document.getElementById('analytics-root');
    if (!root) return;
    const query = state.examId ? `?exam_id=${encodeURIComponent(state.examId)}` : '';
    const response = await apiService.get<Overview>(`/analytics/overview${query}`);
    if (response.error || !response.data) {
        root.replaceChildren(note(response.error || 'Could not load the analytics', 'error'));
        return;
    }
    renderOverview(root, response.data);
}

/** Teachers only see the classes they teach: a class picker, then the class detail. */
async function loadTeacherView(root: HTMLElement): Promise<void> {
    const response = await apiService.get<ClassInfo[]>('/scorecards/classes');
    if (response.status === 403) { root.replaceChildren(note('Analytics can be viewed by teachers and the admin only.')); return; }
    if (response.error || !Array.isArray(response.data)) { root.replaceChildren(note(response.error || 'Could not load classes', 'error')); return; }
    if (!response.data.length) { root.replaceChildren(note('No class is assigned to you yet. Ask the admin.')); return; }
    const select = el('select', { id: 'an-class', class: 'form-control', 'aria-label': 'Class' }, el('option', { value: '', text: 'Select class' }));
    response.data.forEach(c => select.append(el('option', { value: String(c.id), text: `Class ${c.name} (${c.student_count})` })));
    select.addEventListener('change', () => { if (select.value) void loadDetail(Number(select.value)); });
    root.replaceChildren(
        el('div', { class: 'an-controls' }, el('label', { class: 'an-field' }, el('span', { text: 'Class' }), select)),
        el('div', { id: 'an-detail', style: 'display:none' }));
    if (response.data.length === 1) {
        select.value = String(response.data[0].id);
        void loadDetail(response.data[0].id);
    }
}

/** Builds the analytics page. */
export async function loadAnalyticsPage(): Promise<void> {
    const root = document.getElementById('analytics-root');
    if (!root) return;
    root.replaceChildren(note('Loading…'));
    if (isAdmin()) await loadOverview();
    else await loadTeacherView(root);
}
