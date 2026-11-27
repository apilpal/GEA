import { printDate, query, safeFileName } from '../src/ts/services/export-tools';

describe('export tools', () => {
    it('writes the date for the top of a printed page', () => {
        expect(printDate(new Date(2026, 10, 27))).toBe('27 Nov 2026');
        expect(printDate(new Date(2026, 0, 5))).toBe('5 Jan 2026');
    });

    it('makes plain file names', () => {
        expect(safeFileName('fees', '2026-10', 'van')).toBe('gea-fees-2026-10-van.csv');
        expect(safeFileName('marks', '5-A', 'Half yearly')).toBe('gea-marks-5-A-Half-yearly.csv');
        expect(safeFileName('students', '', null, undefined)).toBe('gea-students.csv');
        expect(safeFileName('students', '../x y')).toBe('gea-students-x-y.csv');
    });

    it('leaves empty values out of the query', () => {
        expect(query({ period: '', fee_type: 'van', class_section_id: 3, exam_id: null, x: undefined }))
            .toEqual({ fee_type: 'van', class_section_id: '3' });
    });
});
