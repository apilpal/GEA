// Fees page (issue #34): find a student, see the fee statement, record and reverse payments.
// Amounts are whole rupees. All text from the server is added with textContent, never innerHTML.
import { apiService } from '@/ts/services/api-service';

interface ClassInfo { id: number; name: string }
interface Found {
    student_id: number; name: string; roll_no: number | null; admission_no: string | null;
    mobile: string | null; class_name: string | null; balance: number; overdue: number;
}
interface Payment {
    payment_id: number; receipt_no: string; amount: number; paid_on: string; method: string;
    is_reversal: boolean; is_reversed: boolean; reason: string | null;
}
interface Invoice {
    invoice_id: number; fee_type: string; period: string; amount: number; discount: number;
    discount_reason: string | null; due_date: string; paid: number; balance: number;
    status: 'paid' | 'partial' | 'unpaid' | 'overdue'; payments: Payment[];
}
interface Statement {
    student: { student_id: number; name: string; roll_no: number | null; admission_no: string | null;
               mobile: string | null; father_name: string | null; class_name: string | null };
    totals: { billed: number; discount: number; paid: number; balance: number; overdue: number };
    invoices: Invoice[];
}

const METHODS = ['cash', 'upi', 'bank', 'other'];
const state = { classes: [] as ClassInfo[], current: null as Statement | null, busy: false };

/** Rupees with the Indian digit grouping, e.g. ₹1,20,000. */
export function rupees(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
}

/** Whole rupees only: digits, more than zero. Returns the number or null. */
export function parseAmount(text: string): number | null {
    const value = text.trim();
    if (!/^\d+$/.test(value)) return null;
    const number = Number(value);
    return number > 0 ? number : null;
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

function isAdmin(): boolean {
    try { return JSON.parse(localStorage.getItem('auth_user') || '{}').role === 'admin'; } catch { return false; }
}

function setMessage(text: string, kind: 'info' | 'error' | 'success' = 'info'): void {
    const box = document.getElementById('fees-message');
    if (!box) return;
    box.textContent = text;
    box.setAttribute('data-kind', kind);
    box.style.display = text ? 'block' : 'none';
}

function periodLabel(period: string): string {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
}

async function search(): Promise<void> {
    const q = (document.getElementById('fees-q') as HTMLInputElement).value.trim();
    const classId = (document.getElementById('fees-class') as HTMLSelectElement).value;
    const list = document.getElementById('fees-results');
    if (!list) return;
    if (!q && !classId) {
        list.replaceChildren(el('p', { class: 'fe-note', text: 'Type a name, admission number or mobile number, or pick a class.' }));
        return;
    }
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (classId) params.class_section_id = classId;
    const response = await apiService.get<Found[]>('/fees/students', params);
    if (response.error || !Array.isArray(response.data)) {
        list.replaceChildren(el('p', { class: 'fe-note', 'data-kind': 'error', text: response.error || 'Search failed' }));
        return;
    }
    if (!response.data.length) {
        list.replaceChildren(el('p', { class: 'fe-note', text: 'No student found.' }));
        return;
    }
    list.replaceChildren(...response.data.map(s => {
        const row = el('button', { type: 'button', class: 'fe-student' },
            el('span', { class: 'fe-student-name', text: s.name }),
            el('span', { class: 'fe-student-meta', text: [s.class_name ? `Class ${s.class_name}` : '', s.roll_no != null ? `Roll ${s.roll_no}` : '', s.admission_no || ''].filter(Boolean).join(' · ') }),
            el('span', { class: s.overdue > 0 ? 'fe-owe fe-bad' : 'fe-owe', text: s.balance > 0 ? `Due ${rupees(s.balance)}` : 'Paid up' }));
        row.addEventListener('click', () => { void openStatement(s.student_id); });
        return row;
    }));
}

async function openStatement(studentId: number): Promise<void> {
    setMessage('Loading…');
    const response = await apiService.get<Statement>(`/fees/students/${studentId}`);
    if (response.error || !response.data) {
        setMessage(response.error || 'Could not load the fee statement', 'error');
        return;
    }
    state.current = response.data;
    setMessage('');
    renderStatement();
}

function renderStatement(): void {
    const box = document.getElementById('fees-statement');
    const data = state.current;
    if (!box || !data) return;
    const s = data.student;
    const chip = (label: string, value: number, bad = false) =>
        el('div', { class: bad && value > 0 ? 'fe-chip fe-bad' : 'fe-chip' }, el('span', { text: label }), el('strong', { text: rupees(value) }));

    const back = el('button', { type: 'button', class: 'btn btn-outline', text: 'Back to search' });
    back.addEventListener('click', () => {
        state.current = null;
        box.style.display = 'none';
        const finder = document.getElementById('fees-finder');
        if (finder) finder.style.display = 'block';
        void search();
    });

    const invoices = data.invoices.map(invoice => renderInvoice(invoice, s.name));
    box.replaceChildren(
        back,
        el('h3', { class: 'fe-title', text: s.name }),
        el('p', { class: 'fe-note', text: [s.class_name ? `Class ${s.class_name}` : '', s.roll_no != null ? `Roll ${s.roll_no}` : '', s.admission_no || '', s.mobile || '', s.father_name ? `Father: ${s.father_name}` : ''].filter(Boolean).join(' · ') }),
        el('div', { class: 'fe-chips' }, chip('Billed', data.totals.billed), chip('Paid', data.totals.paid),
           chip('Balance', data.totals.balance), chip('Overdue', data.totals.overdue, true)),
        ...(invoices.length ? invoices : [el('p', { class: 'fe-note', text: 'No invoices yet.' })]));
    box.style.display = 'block';
    const finder = document.getElementById('fees-finder');
    if (finder) finder.style.display = 'none';
}

function renderInvoice(invoice: Invoice, studentName: string): HTMLElement {
    const title = `${periodLabel(invoice.period)} · ${invoice.fee_type}`;
    const money = invoice.discount > 0
        ? `${rupees(invoice.amount)} − ${rupees(invoice.discount)} discount`
        : rupees(invoice.amount);
    const head = el('div', { class: 'fe-inv-head' },
        el('div', {}, el('strong', { text: title }), el('div', { class: 'fe-note', text: `${money} · due ${invoice.due_date}` })),
        el('div', { class: 'fe-inv-right' },
            el('span', { class: `fe-badge fe-${invoice.status}`, text: invoice.status }),
            el('div', { class: 'fe-note', text: invoice.balance > 0 ? `Balance ${rupees(invoice.balance)}` : '' })));
    const box = el('div', { class: 'fe-invoice' }, head);
    if (invoice.discount_reason) box.append(el('div', { class: 'fe-note', text: invoice.discount_reason }));

    invoice.payments.forEach(p => {
        const line = el('div', { class: p.is_reversal || p.is_reversed ? 'fe-payment fe-struck' : 'fe-payment' },
            el('span', { text: `${p.receipt_no} · ${p.paid_on} · ${p.method}` }),
            el('strong', { text: p.amount < 0 ? `−${rupees(-p.amount)}` : rupees(p.amount) }));
        box.append(line);
        if (p.reason) box.append(el('div', { class: 'fe-note', text: `Reason: ${p.reason}` }));
        if (isAdmin() && !p.is_reversal && !p.is_reversed) {
            const reverse = el('button', { type: 'button', class: 'fe-link', text: `Reverse ${p.receipt_no}` });
            reverse.addEventListener('click', () => { void reversePayment(p); });
            box.append(reverse);
        }
    });

    if (invoice.balance > 0) {
        const pay = el('button', { type: 'button', class: 'btn btn-primary fe-pay', text: 'Record payment' });
        pay.addEventListener('click', () => {
            pay.replaceWith(paymentForm(invoice, studentName, title));
        });
        box.append(pay);
    }
    return box;
}

function paymentForm(invoice: Invoice, studentName: string, title: string): HTMLElement {
    const amount = el('input', { type: 'text', inputmode: 'numeric', class: 'form-control', value: String(invoice.balance), 'aria-label': 'Amount in rupees' });
    const method = el('select', { class: 'form-control', 'aria-label': 'Payment method' }, ...METHODS.map(m => el('option', { value: m, text: m })));
    const confirm = el('button', { type: 'button', class: 'btn btn-primary', text: 'Receive' });
    const note = el('div', { class: 'fe-note', text: `Up to ${rupees(invoice.balance)}` });
    confirm.addEventListener('click', async () => {
        const value = parseAmount(amount.value);
        if (value === null) { note.textContent = 'Enter a whole number of rupees, more than 0'; return; }
        if (value > invoice.balance) { note.textContent = `The balance is only ${rupees(invoice.balance)}`; return; }
        if (state.busy || !window.confirm(`Receive ${rupees(value)} (${method.value}) from ${studentName} for ${title}?`)) return;
        state.busy = true;
        confirm.disabled = true;
        const response = await apiService.post<{ receipt_no: string; amount: number }>('/fees/payments', {
            invoice_id: invoice.invoice_id, amount: value, method: method.value
        });
        state.busy = false;
        confirm.disabled = false;
        if (response.error || !response.data) {
            note.textContent = response.error || 'Not saved. Please try again.';
            return;
        }
        await openStatement(state.current!.student.student_id);
        setMessage(`Receipt ${response.data.receipt_no}: ${rupees(response.data.amount)} received.`, 'success');
    });
    return el('div', { class: 'fe-form' }, amount, method, confirm, note);
}

async function reversePayment(payment: Payment): Promise<void> {
    const reason = window.prompt(`Why is ${payment.receipt_no} (${rupees(payment.amount)}) being reversed?`);
    if (reason === null) return;
    if (reason.trim().length < 3) { setMessage('Please give a reason (at least 3 letters).', 'error'); return; }
    const response = await apiService.post<{ receipt_no: string }>(`/fees/payments/${payment.payment_id}/reverse`, { reason: reason.trim() });
    if (response.error) { setMessage(response.error, 'error'); return; }
    await openStatement(state.current!.student.student_id);
    setMessage(`${payment.receipt_no} reversed (${response.data?.receipt_no}).`, 'success');
}

/** Builds the fees page. Allowed for the admin and the office clerk. */
export async function loadFeesPage(): Promise<void> {
    const container = document.getElementById('fees-root');
    if (!container) return;
    container.replaceChildren(el('p', { class: 'fe-note', text: 'Loading…' }));
    const response = await apiService.get<ClassInfo[]>('/fees/classes');
    if (response.status === 403) {
        container.replaceChildren(el('p', { class: 'fe-note', text: 'Fees can be handled by the admin and the office clerk only.' }));
        return;
    }
    if (response.error || !Array.isArray(response.data)) {
        container.replaceChildren(el('p', { class: 'fe-note', 'data-kind': 'error', text: response.error || 'Could not load classes' }));
        return;
    }
    state.classes = response.data;
    state.current = null;

    const q = el('input', { id: 'fees-q', type: 'search', class: 'form-control', placeholder: 'Name, admission no. or mobile', 'aria-label': 'Search students' });
    const classSelect = el('select', { id: 'fees-class', class: 'form-control', 'aria-label': 'Class' }, el('option', { value: '', text: 'All classes' }));
    state.classes.forEach(c => classSelect.append(el('option', { value: String(c.id), text: `Class ${c.name}` })));
    let timer = 0;
    q.addEventListener('input', () => { window.clearTimeout(timer); timer = window.setTimeout(() => { void search(); }, 300); });
    classSelect.addEventListener('change', () => { void search(); });

    container.replaceChildren(
        el('div', { id: 'fees-message', class: 'fe-message', role: 'status', style: 'display:none' }),
        el('div', { id: 'fees-finder' },
            el('div', { class: 'fe-controls' }, q, classSelect),
            el('div', { id: 'fees-results', class: 'fe-results' })),
        el('div', { id: 'fees-statement', style: 'display:none' }));
    void search();
}
