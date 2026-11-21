import { BaseComponent } from '@/ts/components/core/index';
interface Student {
    route: string;
    name: string;
    father_name: string;
    mobile: string;
    class: string;
    address: string;
    fees?: string;
    id?: string;
    status?: 'active' | 'inactive';
    created_date?: string;
    last_updated?: string;
    driver?: string;
    contact_info?: {
        primary_mobile: string;
        secondary_mobile: string;
        father_contact: string;
    };
    location_details?: {
        route_number: string;
        full_address: string;
        area: string;
    };
}
declare class StudentTable extends BaseComponent {
    private students;
    private originalStudents;
    private sortColumn;
    private sortAscending;
    private searchTerm;
    private searchTimeout;
    private isMobile;
    private mediaQuery;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    setStudents(students: Student[]): void;
    protected render(): void;
    private renderLazy;
    private renderVisibleRows;
    private renderCards;
    private renderFull;
    private renderStudentCards;
    private renderTableRows;
    protected setupEventListeners(): void;
    private removeEventListeners;
    private filterStudents;
    private sortTable;
    private updateTableBody;
    private updateTotalCount;
    private updateSortIndicators;
    private initializeMediaQuery;
    private checkScreenSize;
    private handleScreenSizeChange;
}
export { StudentTable };
export type { Student };
//# sourceMappingURL=student-table.d.ts.map