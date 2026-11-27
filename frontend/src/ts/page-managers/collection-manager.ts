// Fee collection page (issue #37), for the admin and the office clerk.
// Shows what was billed, collected, outstanding and overdue, by fee type, class, transport route and
// month, and lists the students to follow up. Whole rupees only. A reversed payment is not counted as
// collected. When nothing is due the rate is shown as a dash, never 0% or 100%. All text from the
// server is added with textContent, never innerHTML.
import { apiService } from '@/ts/services/api-service';
import { exportBar, safeFileName } from '@/ts/services/export-tools';
import { rupees } from '@/ts/page-managers/fees-manager';

interface Group { invoices: number; billed: number; discount: number; net_due: number; collected: number;
                  outstanding: number; overdue: number; overdue_invoices: number; collection_rate: number | null }
interface ClassRow extends Group { class_section_id: number | null; name: string; students_with_overdue: number }
interface RouteRow extends Group { route_id: number | null; name: string; monthly_fee: number | null; riders: number }
interface TypeRow extends Group { fee_type: string }
interface Overview { session: string; as_of: string; periods: string[]; fee_types: string[]; totals: Group;
                     by_fee_type: TypeRow[]; by_class: ClassRow[]; by_route: RouteRow[];
                     payments_by_month: { month: string; collected: number }[];
                     payments_by_method: { method: string; collected: number }[];
                     reversals: { count: number; amount: number } }
interface Student { student_id: number; name: string; admission_no: string | null; mobile: string | null; father_name: string | null;
                    status: string | null; class_name: string | null; balance: number; overdue: number; pending: number;
                    overdue_invoices: number; pending_invoices: number; oldest_due_date: string | null; days_overdue: number }
interface FollowUp { kind: string; as_of: string; total_students: number; total_amount: number; shown: number; students: Student[] }

const state = { period: '', feeType: '', kind: 'overdue', classId: '' };

/** "25%" or a dash when nothing is due. */
export function rateText(rate: number | null): string {
    return rate === null || rate === undefined ? '–' : `${rate}%`;
}

/** "3 days" / "1 day" / "not due yet". */
export function daysText(days: number): string {
    if (days <= 0) return 'not due yet';
    return days === 1 ? '1 day' : `${days} days`;
}

/** "2026-10" as "Oct 2026". Anything else is shown as it is. */
export function monthText(period: string): string {
    const match = /^(\d{4})-(\d{2})$/.exec(period);
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return period;
    return `${names[Number(match[2]) - 1]} ${match[1]}`;
}

function titleCase(text: string): string {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
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

function chip(label: string, value: string, tone = ''): HTMLElement {
    return el('div', { class: `an-chip ${tone}`.trim() }, el('span', { text: label }), el('strong', { text: value }));
}

function totalsChips(t: Group): HTMLElement {
    return el('div', { class: 'an-chips' },
        chip('Due after discount', rupees(t.net_due)),
        chip('Collected', rupees(t.collected), 'an-distinction'),
        chip('Outstanding', rupees(t.outstanding), 'an-borderline'),
        chip('Overdue', rupees(t.overdue), 'an-at_risk'),
        chip('Collected so far', rateText(t.collection_rate)));
}

function table(heads: string[], rows: HTMLElement[]): HTMLElement {
    return el('div', { class: 'an-scroll' }, el('table', { class: 'an-table' },
        el('caption', { class: 'sr-only', text: `${heads[0]} table: ${heads.slice(1).join(', ')}` }),
        el('thead', {}, el('tr', {}, ...heads.map(text => el('th', { scope: 'col', text })))), el('tbody', {}, ...rows)));
}

function groupRow(label: string, g: Group, before: string[] = [], after: string[] = []): HTMLElement {
    return el('tr', {}, el('th', { scope: 'row', text: label }),
        ...[...before, rupees(g.net_due), rupees(g.collected), rupees(g.outstanding), rupees(g.overdue), rateText(g.collection_rate), ...after]
            .map(text => el('td', { text })));
}

function select(label: string, options: [string, string][], value: string, onChange: (v: string) => void): HTMLElement {
    const box = el('select', { class: 'form-control', 'aria-label': label });
    options.forEach(([v, text]) => box.append(el('option', { value: v, text })));
    box.value = value;
    box.addEventListener('change', () => onChange(box.value));
    return el('label', { class: 'an-field' }, el('span', { text: label }), box);
}

function qs(extra: Record<string, string>): string {
    const params = Object.entries(extra).filter(([, v]) => v !== '');
    return params.length ? `?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
}

function studentItem(s: Student, kind: string): HTMLElement {
    const where = [s.class_name ? `Class ${s.class_name}` : 'No class', s.admission_no || '', s.status === 'inactive' ? 'left the school' : '']
        .filter(Boolean).join(' · ');
    const money = kind === 'overdue'
        ? `Overdue ${rupees(s.overdue)} · oldest ${daysText(s.days_overdue)}${s.pending ? ` · plus ${rupees(s.pending)} not yet due` : ''}`
        : `Not yet due ${rupees(s.pending)}`;
    const contact = [s.father_name ? `Father: ${s.father_name}` : '', s.mobile ? `Mobile: ${s.mobile}` : 'No mobile number'].filter(Boolean).join(' · ');
    return el('li', {}, el('strong', { text: s.name }), el('span', { text: ` · ${where}` }),
        el('p', { class: 'an-note', text: money }), el('p', { class: 'an-note', text: contact }));
}

async function loadFollowUp(classes: ClassRow[]): Promise<void> {
    const box = document.getElementById('co-follow');
    if (!box) return;
    const response = await apiService.get<FollowUp>(`/fee-analytics/follow-up${qs({ kind: state.kind, period: state.period, class_section_id: state.classId })}`);
    if (response.error || !response.data) { box.replaceChildren(note(response.error || 'Could not load the follow-up list', 'error')); return; }
    const data = response.data;
    const classOptions: [string, string][] = [['', 'All classes'],
        ...classes.filter(c => c.class_section_id !== null).map(c => [String(c.class_section_id), `Class ${c.name}`] as [string, string])];
    const heading = state.kind === 'overdue' ? 'Overdue: fees past the due date' : 'Pending: not yet due, nothing overdue';
    box.replaceChildren(
        el('h3', { class: 'an-title', text: heading }),
        el('div', { class: 'an-controls' },
            select('List', [['overdue', 'Overdue'], ['pending', 'Pending (not yet due)']], state.kind, v => { state.kind = v; void loadFollowUp(classes); }),
            select('Class', classOptions, state.classId, v => { state.classId = v; void loadFollowUp(classes); })),
        note(`${data.total_students} student(s), ${rupees(data.total_amount)} in total${data.shown < data.total_students ? `. Showing the first ${data.shown}.` : '.'}`),
        data.students.length ? el('ul', { class: 'an-follow' }, ...data.students.map(s => studentItem(s, state.kind)))
                             : note('Nobody to follow up here.'));
}

function renderOverview(root: HTMLElement, data: Overview): void {
    const periodOptions: [string, string][] = [['', 'Whole session'], ...data.periods.map(p => [p, monthText(p)] as [string, string])];
    const typeOptions: [string, string][] = [['', 'All fee types'], ...data.fee_types.map(t => [t, titleCase(t)] as [string, string])];
    const reload = (): void => { void loadOverview(); };
    root.replaceChildren(
        el('div', { class: 'an-controls' },
            select('Month', periodOptions, state.period, v => { state.period = v; reload(); }),
            select('Fee type', typeOptions, state.feeType, v => { state.feeType = v; reload(); })),
        el('h3', { class: 'an-title', text: `Fee collection · ${data.session} · as of ${data.as_of}` }),
        exportBar(`Fee collection${state.period ? `, ${monthText(state.period)}` : ''}${state.feeType ? `, ${titleCase(state.feeType)}` : ''}, as of ${data.as_of}`, [
            { label: 'Fees CSV', endpoint: '/exports/fees.csv', params: () => ({ period: state.period, fee_type: state.feeType }), fileName: () => safeFileName('fees', state.period, state.feeType) }]),
        totalsChips(data.totals),
        data.reversals.count ? note(`${data.reversals.count} payment(s) reversed, ${rupees(data.reversals.amount)} in total. These are not counted as collected.`) : el('span'),
        el('h3', { class: 'an-title', text: 'By fee type' }),
        table(['Fee type', 'Due', 'Collected', 'Outstanding', 'Overdue', 'Collected so far'], data.by_fee_type.map(t => groupRow(titleCase(t.fee_type), t))),
        el('h3', { class: 'an-title', text: 'By class' }),
        table(['Class', 'Due', 'Collected', 'Outstanding', 'Overdue', 'Collected so far', 'Students overdue'],
            data.by_class.map(c => groupRow(c.name, c, [], [String(c.students_with_overdue)]))),
        el('h3', { class: 'an-title', text: 'By transport route (van fee only)' }),
        data.by_route.length ? table(['Route', 'Riders', 'Due', 'Collected', 'Outstanding', 'Overdue', 'Collected so far'],
            data.by_route.map(r => groupRow(r.name, r, [String(r.riders)]))) : note('No van fees in this view.'),
        el('h3', { class: 'an-title', text: 'Money received, by month and by method' }),
        table(['Month', 'Received'], data.payments_by_month.map(m => el('tr', {}, el('th', { scope: 'row', text: monthText(m.month) }), el('td', { text: rupees(m.collected) })))),
        table(['Method', 'Received'], data.payments_by_method.map(m => el('tr', {}, el('th', { scope: 'row', text: titleCase(m.method) }), el('td', { text: rupees(m.collected) })))),
        note('Received money is counted on the day it was paid, after reversals. Overdue means the due date has passed and a balance is left.'),
        el('div', { id: 'co-follow' }));
    void loadFollowUp(data.by_class);
}

async function loadOverview(): Promise<void> {
    const root = document.getElementById('collection-root');
    if (!root) return;
    const response = await apiService.get<Overview>(`/fee-analytics/overview${qs({ period: state.period, fee_type: state.feeType })}`);
    if (response.status === 403) { root.replaceChildren(note('Fee collection can be viewed by the admin and the office clerk only.')); return; }
    if (response.error || !response.data) { root.replaceChildren(note(response.error || 'Could not load fee collection', 'error')); return; }
    renderOverview(root, response.data);
}

/** Builds the fee collection page. */
export async function loadCollectionPage(): Promise<void> {
    const root = document.getElementById('collection-root');
    if (!root) return;
    root.replaceChildren(note('Loading…'));
    await loadOverview();
}
