// Money display for the whole app (issue #38): whole rupees with the ₹ sign and Indian digit grouping
// (₹1,20,000). Fees are whole rupees; a stray decimal from older data is rounded, never shown as "$".

/** "₹1,20,000", "−₹500", or "₹0" when the value is missing or not a number. */
export function formatRupees(amount: number | string | null | undefined): string {
    const value = typeof amount === 'string' ? Number(amount.replace(/[,₹\s]/g, '')) : amount;
    if (value === null || value === undefined || !Number.isFinite(value)) return '₹0';
    const rounded = Math.round(Math.abs(value));
    const text = `₹${rounded.toLocaleString('en-IN')}`;
    return value < 0 && rounded !== 0 ? `−${text}` : text;
}
