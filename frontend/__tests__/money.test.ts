// Money display (issue #38)
import { formatRupees } from '../src/ts/services/money';

describe('formatRupees', () => {
    it('uses the rupee sign and Indian digit grouping', () => {
        expect(formatRupees(0)).toBe('₹0');
        expect(formatRupees(600)).toBe('₹600');
        expect(formatRupees(120000)).toBe('₹1,20,000');
        expect(formatRupees(1234567)).toBe('₹12,34,567');
    });

    it('never shows a dollar sign and rounds stray decimals to whole rupees', () => {
        expect(formatRupees(2400.0)).toBe('₹2,400');
        expect(formatRupees(399.6)).toBe('₹400');
        expect(formatRupees(12.5)).not.toContain('$');
    });

    it('accepts numbers written as text, like the student fee field', () => {
        expect(formatRupees('450')).toBe('₹450');
        expect(formatRupees('₹1,200')).toBe('₹1,200');
        expect(formatRupees(' 75000 ')).toBe('₹75,000');
    });

    it('shows a negative amount with a minus sign', () => {
        expect(formatRupees(-500)).toBe('−₹500');
        expect(formatRupees(-0.2)).toBe('₹0');          // rounds to nothing: no "−₹0"
    });

    it('treats missing or invalid values as zero', () => {
        expect(formatRupees(null)).toBe('₹0');
        expect(formatRupees(undefined)).toBe('₹0');
        expect(formatRupees('')).toBe('₹0');
        expect(formatRupees('abc')).toBe('₹0');
        expect(formatRupees(NaN)).toBe('₹0');
        expect(formatRupees(Infinity)).toBe('₹0');
    });
});
