// Analytics page (issues #35 and #36).
// The admin sees the school summary and a class-by-class comparison; the admin and teachers can open
// one class to see every student. All numbers are computed on the server. A student with no marks
// yet is shown as "no marks yet" and is not counted as zero. Buckets are labels for follow-up, not
// pass or fail. Notes (tags) always show their plain reason. All text from the server is added with textContent, never innerHTML.
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
interface Tag { key: string; label: string; reason: string }
interface TagRule { key: string; label: string; scope: string; rule: string }
interface DiagStudent { student_id: number; name: string; roll_no: number | null; percent: number | null; bucket: keyof Buckets | null;
                        tags: Tag[]; needs_follow_up: boolean; subjects: { subject_id: number; name: string; percent: number | null }[] }
interface Diagnostics { summary: { average_percent: number | null; spread: number | null; attendance_rate: number | null;
                                   school_attendance_rate: number | null; follow_up_students: number };
                        tags: Tag[]; subjects: { subject_id: number; name: string; average_percent: number | null; with_marks: number }[];
                        students: DiagStudent[]; tag_rules: TagRule[] }
interface SubjectRow extends Group { subject_id: number; name: string }
interface SubjectCell { taught: boolean; average_percent: number | null; with_marks: number }
interface SubjectClass { class_section_id: number; name: string; average_percent: number | null; subjects: Record<string, SubjectCell> }
interface Bottleneck { class_section_id: number; class: string; subject: string; average_percent: number; class_average: number; gap: number }
interface SubjectComparison { subjects: SubjectRow[]; classes: SubjectClass[]; bottlenecks: Bottleneck[]; tag_rules: TagRule[] }

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

function tagRulesBox(rules: TagRule[]): HTMLElement {
    return el('details', { class: 'an-rules' },
        el('summary', { text: 'What do the notes mean?' }),
        el('ul', {}, ...rules.map(r => el('li', {}, el('strong', { text: `${r.label} (${r.scope}): ` }), r.rule))),
        note('Notes explain why a class or student may need follow-up, with the numbers behind each one. They are not a diagnosis and not pass or fail. The limits are assumed until the school decides them.'));
}

function tagList(tags: Tag[]): HTMLElement {
    return el('ul', { class: 'an-tags' }, ...tags.map(t => el('li', {}, el('strong', { text: `${t.label}: ` }), t.reason)));
}

function examSelect(exams: ExamOption[], onChange: (value: string) => void): HTMLElement {
    const select = el('select', { class: 'form-control', 'aria-label': 'Exam' }, el('option', { value: '', text: 'All exams together' }));
    exams.forEach(e => select.append(el('option', { value: String(e.exam_id), text: e.name })));
    select.value = state.examId;
    select.addEventListener('change', () => onChange(select.value));
    return el('label', { class: 'an-field' }, el('span', { text: 'Exam' }), select);
}

function groupRow(label: string, group: Group, onOpen?: () => void, withAttendance = true): HTMLElement {
    const cells = [String(group.students), String(group.with_marks), percentLabel(group.average_percent),
                   ...(withAttendance ? [percentLabel(group.attendance_rate)] : []),
                   String(group.buckets.distinction), String(group.buckets.steady), String(group.buckets.borderline), String(group.buckets.at_risk)];
    const first = el('th', { scope: 'row' });
    if (onOpen) {
        const button = el('button', { type: 'button', class: 'an-link', text: label });
        button.addEventListener('click', onOpen);
        first.append(button);
    } else first.textContent = label;
    return el('tr', {}, first, ...cells.map(text => el('td', { text })));
}

function comparisonTable(first: string, rows: HTMLElement[], caption = '', withAttendance = true): HTMLElement {
    const heads = [first, 'Students', 'With marks', 'Average', ...(withAttendance ? ['Attendance'] : []), 'Distinction', 'Steady', 'Borderline', 'At risk'];
    return el('div', { class: 'an-scroll' }, el('table', { class: 'an-table' },
        el('caption', { class: 'sr-only', text: caption || `${first} comparison` }),
        el('thead', {}, el('tr', {}, ...heads.map(text => el('th', { scope: 'col', text })))), el('tbody', {}, ...rows)));
}

function renderDetail(data: ClassDetail, diag: Diagnostics | null): void {
    const box = document.getElementById('an-detail');
    if (!box) return;
    const ranked = data.students.filter(s => s.percent !== null).length;
    const rows = data.students.map(s => el('tr', {},
        el('th', { scope: 'row', text: `${s.roll_no != null ? `${s.roll_no}. ` : ''}${s.name}` }),
        el('td', { text: percentLabel(s.percent) }),
        el('td', { text: bucketLabel(s.bucket) }),
        el('td', { text: rankLabel(s.position, ranked) }),
        el('td', { text: percentLabel(s.attendance_rate) })));
    // Only teachers get an exam picker here; the admin picks the exam once, at the top of the page.
    const onExam = (value: string): void => { state.examId = value; void loadDetail(data.class.class_section_id); };
    box.replaceChildren(
        ...(isAdmin() ? [] : [el('div', { class: 'an-controls' }, examSelect(data.exams, onExam))]),
        el('h3', { class: 'an-title', text: `Class ${data.class.name}${data.exam ? ` · ${data.exam.name}` : ' · all exams'}` }),
        chips(data.summary),
        bucketChips(data.summary.buckets),
        el('div', { class: 'an-scroll' }, el('table', { class: 'an-table' },
            el('caption', { class: 'sr-only', text: `Students of class ${data.class.name}: percent, label, position and attendance` }),
            el('thead', {}, el('tr', {}, ...['Student', 'Percent', 'Label', 'Position', 'Attendance'].map(text => el('th', { scope: 'col', text })))),
            el('tbody', {}, ...rows))),
        note('Students with the same percent share a position. A dash means there is nothing to count yet.'),
        rulesBox(data.bucket_rules),
        ...(diag ? diagnosticsPanel(diag) : []));
    box.style.display = 'block';
}

/** Class notes, subject averages and the students who may need follow-up, each with a plain reason. */
export function diagnosticsPanel(diag: Diagnostics): HTMLElement[] {
    const follow = diag.students.filter(s => s.needs_follow_up);
    const subjectRows = diag.subjects.map(subject => el('tr', {},
        el('th', { scope: 'row', text: subject.name }),
        el('td', { text: percentLabel(subject.average_percent) }),
        el('td', { text: String(subject.with_marks) })));
    const followList = follow.map(student => el('li', {},
        el('strong', { text: `${student.roll_no != null ? `${student.roll_no}. ` : ''}${student.name}` }),
        el('span', { text: ` · ${percentLabel(student.percent)} · ${bucketLabel(student.bucket)}` }),
        student.tags.length ? tagList(student.tags) : el('p', { class: 'an-note', text: 'Low marks, no other note.' })));
    return [
        el('h3', { class: 'an-title', text: 'Why? Notes for this class' }),
        diag.tags.length ? tagList(diag.tags) : note('No class-level notes.'),
        subjectRows.length ? el('div', { class: 'an-scroll' }, el('table', { class: 'an-table' },
            el('caption', { class: 'sr-only', text: 'Subject averages of this class' }),
            el('thead', {}, el('tr', {}, ...['Subject', 'Class average', 'Students with marks'].map(text => el('th', { scope: 'col', text })))),
            el('tbody', {}, ...subjectRows))) : el('span'),
        el('h3', { class: 'an-title', text: `Students who may need follow-up (${follow.length})` }),
        follow.length ? el('ul', { class: 'an-follow' }, ...followList) : note('No student needs follow-up from the marks and attendance entered so far.'),
        tagRulesBox(diag.tag_rules)];
}

async function loadDetail(classId: number, scroll = false): Promise<void> {
    const box = document.getElementById('an-detail');
    state.classId = classId;
    if (box) { box.replaceChildren(note('Loading…')); box.style.display = 'block'; }
    const query = state.examId ? `?exam_id=${encodeURIComponent(state.examId)}` : '';
    const [response, diag] = await Promise.all([
        apiService.get<ClassDetail>(`/analytics/classes/${classId}${query}`),
        apiService.get<Diagnostics>(`/analytics/classes/${classId}/diagnostics${query}`)]);
    if (response.error || !response.data) {
        if (box) { box.replaceChildren(note(response.error || 'Could not load the class', 'error')); }
        return;
    }
    renderDetail(response.data, diag.error || !diag.data ? null : diag.data);
    if (scroll && box) {
        // Move focus to the class heading so keyboard and screen-reader users land on the new content.
        const heading = box.querySelector('h3');
        if (heading) { heading.setAttribute('tabindex', '-1'); (heading as HTMLElement).focus({ preventScroll: true }); }
        const calm = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        box.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    }
}

function renderOverview(root: HTMLElement, data: Overview): void {
    const classRows = data.classes.map(c => groupRow(c.name, c, () => { void loadDetail(c.class_section_id, true); }));
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
        el('div', { id: 'an-subjects' }),
        el('div', { id: 'an-detail', style: 'display:none' }));
    void loadSubjects();
    if (state.classId !== null && data.classes.some(c => c.class_section_id === state.classId)) void loadDetail(state.classId);
}

function renderSubjects(data: SubjectComparison): void {
    const box = document.getElementById('an-subjects');
    if (!box) return;
    const subjectRows = data.subjects.map(s => groupRow(s.name, s, undefined, false));
    const header = ['Class', 'Average', ...data.subjects.map(s => s.name)];
    const matrixRows = data.classes.map(c => el('tr', {},
        el('th', { scope: 'row', text: c.name }),
        el('td', { text: percentLabel(c.average_percent) }),
        ...data.subjects.map(s => {
            const cell = c.subjects[String(s.subject_id)];
            return el('td', { text: !cell || !cell.taught ? 'n/a' : percentLabel(cell.average_percent) });
        })));
    const bottlenecks = data.bottlenecks.map(b => {
        const button = el('button', { type: 'button', class: 'an-link', text: `${b.class} · ${b.subject}` });
        button.addEventListener('click', () => { void loadDetail(b.class_section_id, true); });
        return el('li', {}, button,
            el('span', { text: ` average ${percentLabel(b.average_percent)} is ${b.gap} points below the class average ${percentLabel(b.class_average)}` }));
    });
    box.replaceChildren(
        el('h3', { class: 'an-title', text: 'Subjects across the school (weakest first)' }),
        comparisonTable('Subject', subjectRows, 'Subjects across the school: average percent and labels', false),
        el('h3', { class: 'an-title', text: 'Biggest bottlenecks' }),
        bottlenecks.length ? el('ul', { class: 'an-follow' }, ...bottlenecks) : note('No subject is far below its class average.'),
        el('h3', { class: 'an-title', text: 'Average percent by class and subject' }),
        el('div', { class: 'an-scroll' }, el('table', { class: 'an-table' },
            el('caption', { class: 'sr-only', text: 'Average percent of each class in each subject' }),
            el('thead', {}, el('tr', {}, ...header.map(text => el('th', { scope: 'col', text })))), el('tbody', {}, ...matrixRows))),
        note('n/a = the class does not have this subject. A dash = no marks to count yet.'),
        tagRulesBox(data.tag_rules));
}

async function loadSubjects(): Promise<void> {
    const box = document.getElementById('an-subjects');
    if (!box) return;
    const query = state.examId ? `?exam_id=${encodeURIComponent(state.examId)}` : '';
    const response = await apiService.get<SubjectComparison>(`/analytics/subjects${query}`);
    if (response.error || !response.data) { box.replaceChildren(note(response.error || 'Could not load the subject comparison', 'error')); return; }
    renderSubjects(response.data);
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
