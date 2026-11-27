// Print and CSV download buttons (issue #39). Used by the Scorecard, Analytics and Fee collection pages.
// The CSV comes from /api/exports/*, which checks the role; the file is saved from the text that comes
// back, so the sign-in token is sent like on every other call. Text is added with textContent only.
import { apiService } from '@/ts/services/api-service';

export const SCHOOL_NAME = 'Gurukul Educational Academy';

/** The date as 27 Nov 2026, for the line printed at the top of a page. */
export function printDate(now: Date = new Date()): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

/** Only letters, digits and dashes, so the saved file name is the same on every phone. */
export function safeFileName(...parts: Array<string | number | null | undefined>): string {
    const text = ['gea', ...parts.filter(p => p !== null && p !== undefined && String(p) !== '')]
        .map(p => String(p).trim().replace(/\s+/g, '-')).join('-').replace(/[^A-Za-z0-9-]/g, '').replace(/-+/g, '-');
    return `${text}.csv`;
}

/** Query string with the empty values left out. */
export function query(params: Record<string, string | number | null | undefined>): Record<string, string> {
    const out: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => { if (value !== null && value !== undefined && String(value) !== '') out[key] = String(value); });
    return out;
}

/** Saves text as a file on the phone. The BOM from the server is kept so Excel reads the rupee sign and Hindi. */
export function saveText(text: string, fileName: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads one export. Returns an error text, or '' when the file was saved. */
export async function downloadCsv(endpoint: string, params: Record<string, string | number | null | undefined>, fileName: string): Promise<string> {
    const response = await apiService.get<string>(endpoint, query(params));
    if (response.error || typeof response.data !== 'string') return response.error || 'Could not download the file';
    saveText(response.data, fileName);
    return '';
}

function button(text: string, onClick: () => void | Promise<void>): HTMLButtonElement {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'btn export-btn';
    node.textContent = text;
    node.addEventListener('click', () => { void onClick(); });
    return node;
}

export interface CsvExport { label: string; endpoint: string; params: () => Record<string, string | number | null | undefined>; fileName: () => string }

/**
 * The row of buttons above a report: Print and the CSV downloads. The first line is only shown on paper
 * (school, what is printed, date). A short status line says "Saved" or what went wrong.
 */
export function exportBar(what: string, exports: CsvExport[] = [], withPrint = true): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'export-bar';
    const status = document.createElement('span');
    status.className = 'export-status no-print';
    status.setAttribute('role', 'status');
    const actions = document.createElement('div');
    actions.className = 'export-actions no-print';
    if (withPrint) actions.append(button('Print', () => window.print()));
    exports.forEach(item => actions.append(button(item.label, async () => {
        status.textContent = 'Preparing…';
        const error = await downloadCsv(item.endpoint, item.params(), item.fileName());
        status.textContent = error || 'Saved. Check your downloads.';
        status.dataset.kind = error ? 'error' : 'ok';
    })));
    const head = document.createElement('p');
    head.className = 'print-only print-head';
    head.textContent = `${SCHOOL_NAME} · ${what} · printed ${printDate()}`;
    bar.append(head, actions, status);
    return bar;
}
