// Unit tests for StudentTable component
import { StudentTable } from '../src/ts/components/students/index';

describe('StudentTable Component', () => {
    let mockContainer: HTMLElement;
    let studentTable: StudentTable;

    const mockStudents = [
        {
            route: '1',
            name: 'John Doe',
            father_name: 'Father Doe',
            mobile: '1234567890',
            class_: '10',
            address: 'Test Address',
            fees: '1000',
            status: 'active'
        },
        {
            route: '2',
            name: 'Jane Smith',
            father_name: 'Father Smith',
            mobile: '0987654321',
            class_: '9',
            address: 'Another Address',
            fees: '1200',
            status: 'active'
        }
    ];

    beforeEach(() => {
        mockContainer = document.createElement('div');
        mockContainer.id = 'test-container';
        document.body.appendChild(mockContainer);

        // Create and configure the component
        studentTable = new StudentTable();
        mockContainer.appendChild(studentTable);
    });

    afterEach(() => {
        if (document.body.contains(mockContainer)) {
            document.body.removeChild(mockContainer);
        }
        jest.clearAllMocks();
    });

    describe('Component Initialization', () => {
        test('should create shadow root', () => {
            expect(studentTable.shadowRoot).toBeDefined();
        });

        test('should render initial table structure', () => {
            const shadow = studentTable.shadowRoot!;
            expect(shadow.innerHTML).toContain('student-table');
            expect(shadow.innerHTML).toContain('Total Students:');
        });

        test('should display 0 students initially', () => {
            const countElement = studentTable.shadowRoot!.getElementById('total-count');
            expect(countElement?.textContent).toBe('0');
        });
    });

    describe('setStudents Method', () => {
        test('should set students and update display', () => {
            studentTable.setStudents(mockStudents);

            const countElement = studentTable.shadowRoot!.getElementById('total-count');
            expect(countElement?.textContent).toBe('2');

            const tbody = studentTable.shadowRoot!.getElementById('table-body');
            expect(tbody?.innerHTML).toContain('John Doe');
            expect(tbody?.innerHTML).toContain('Jane Smith');
        });

        test('should handle empty student array', () => {
            studentTable.setStudents([]);

            const countElement = studentTable.shadowRoot!.getElementById('total-count');
            expect(countElement?.textContent).toBe('0');

            const tbody = studentTable.shadowRoot!.getElementById('table-body');
            expect(tbody?.innerHTML).toBe('');
        });

        test('should handle null/undefined values gracefully', () => {
            const studentsWithNulls = [{
                route: null,
                name: 'Test Student',
                father_name: undefined,
                mobile: '1234567890',
                class_: '',
                address: null,
                fees: undefined,
                status: 'active'
            }];

            studentTable.setStudents(studentsWithNulls as any);

            const tbody = studentTable.shadowRoot!.getElementById('table-body');
            expect(tbody?.innerHTML).toContain('Test Student');
            expect(tbody?.innerHTML).toContain('N/A');
        });
    });

    describe('Search Functionality', () => {
        beforeEach(() => {
            studentTable.setStudents(mockStudents);
        });

        test('should filter students by name', () => {
            const searchInput = studentTable.shadowRoot!.getElementById('search-input') as HTMLInputElement;
            searchInput.value = 'John';
            searchInput.dispatchEvent(new Event('input'));

            // Wait for debounced search
            return new Promise(resolve => setTimeout(() => {
                const tbody = studentTable.shadowRoot!.getElementById('table-body');
                const countElement = studentTable.shadowRoot!.getElementById('total-count');

                expect(countElement?.textContent).toBe('1');
                expect(tbody?.innerHTML).toContain('John Doe');
                expect(tbody?.innerHTML).not.toContain('Jane Smith');
                resolve(void 0);
            }, 350));
        });

        test('should handle case-insensitive search', () => {
            const searchInput = studentTable.shadowRoot!.getElementById('search-input') as HTMLInputElement;
            searchInput.value = 'jane';
            searchInput.dispatchEvent(new Event('input'));

            return new Promise(resolve => setTimeout(() => {
                const countElement = studentTable.shadowRoot!.getElementById('total-count');
                expect(countElement?.textContent).toBe('1');
                resolve(void 0);
            }, 350));
        });

        test('should clear search when input is empty', () => {
            const searchInput = studentTable.shadowRoot!.getElementById('search-input') as HTMLInputElement;
            const clearButton = studentTable.shadowRoot!.getElementById('clear-search') as HTMLButtonElement;

            searchInput.value = 'John';
            searchInput.dispatchEvent(new Event('input'));

            return new Promise(resolve => setTimeout(() => {
                expect(studentTable.shadowRoot!.getElementById('total-count')?.textContent).toBe('1');

                clearButton.click();

                return new Promise(resolve2 => setTimeout(() => {
                    expect(studentTable.shadowRoot!.getElementById('total-count')?.textContent).toBe('2');
                    resolve2(void 0);
                }, 50));
            }, 350));
        });
    });

    describe('Sorting Functionality', () => {
        beforeEach(() => {
            studentTable.setStudents(mockStudents);
        });

        test('should sort by name ascending', () => {
            const nameHeader = studentTable.shadowRoot!.querySelector('[data-column="name"]') as HTMLElement;
            nameHeader.click();

            return new Promise(resolve => setTimeout(() => {
                const tbody = studentTable.shadowRoot!.getElementById('table-body');
                const firstRow = tbody?.querySelector('tr:first-child td:nth-child(4)');
                expect(firstRow?.textContent).toBe('Jane Smith');
                resolve(void 0);
            }, 50));
        });

        test('should toggle sort direction on same column click', () => {
            const nameHeader = studentTable.shadowRoot!.querySelector('[data-column="name"]') as HTMLElement;

            nameHeader.click(); // First click - ascending

            return new Promise(resolve => setTimeout(() => {
                nameHeader.click(); // Second click - descending

                return new Promise(resolve2 => setTimeout(() => {
                    const tbody = studentTable.shadowRoot!.getElementById('table-body');
                    const firstRow = tbody?.querySelector('tr:first-child td:nth-child(4)');
                    expect(firstRow?.textContent).toBe('John Doe');
                    resolve2(void 0);
                }, 50));
            }, 50));
        });

        test('should sort by route number', () => {
            const routeHeader = studentTable.shadowRoot!.querySelector('[data-column="route"]') as HTMLElement;
            routeHeader.click();

            return new Promise(resolve => setTimeout(() => {
                const tbody = studentTable.shadowRoot!.getElementById('table-body');
                const firstRow = tbody?.querySelector('tr:first-child td:nth-child(3)');
                expect(firstRow?.textContent).toBe('1');
                resolve(void 0);
            }, 50));
        });
    });

    describe('Action Buttons', () => {
        beforeEach(() => {
            studentTable.setStudents(mockStudents);
        });

        test('should dispatch add-student event', () => {
            const addButton = studentTable.shadowRoot!.getElementById('add-student-btn') as HTMLButtonElement;

            let eventFired = false;
            studentTable.addEventListener('add-student', () => {
                eventFired = true;
            });

            addButton.click();
            expect(eventFired).toBe(true);
        });

        test('should dispatch student-action event for view', () => {
            let eventDetail: any = null;
            studentTable.addEventListener('student-action', (e: any) => {
                eventDetail = e.detail;
            });

            const viewButton = studentTable.shadowRoot!.querySelector('[data-action="view"][data-index="0"]') as HTMLButtonElement;
            viewButton.click();

            expect(eventDetail).toEqual({ action: 'view', index: 0 });
        });

        test('should dispatch student-action event for edit', () => {
            let eventDetail: any = null;
            studentTable.addEventListener('student-action', (e: any) => {
                eventDetail = e.detail;
            });

            const editButton = studentTable.shadowRoot!.querySelector('[data-action="edit"][data-index="1"]') as HTMLButtonElement;
            editButton.click();

            expect(eventDetail).toEqual({ action: 'edit', index: 1 });
        });

        test('should dispatch student-action event for delete', () => {
            let eventDetail: any = null;
            studentTable.addEventListener('student-action', (e: any) => {
                eventDetail = e.detail;
            });

            const deleteButton = studentTable.shadowRoot!.querySelector('[data-action="delete"][data-index="0"]') as HTMLButtonElement;
            deleteButton.click();

            expect(eventDetail).toEqual({ action: 'delete', index: 0 });
        });
    });

    describe('Status Display', () => {
        test('should display active status for active students', () => {
            const activeStudent = [{
                route: '1',
                name: 'Active Student',
                father_name: 'Father',
                mobile: '1234567890',
                class_: '10',
                address: 'Address',
                fees: '1000',
                status: 'active'
            }];

            studentTable.setStudents(activeStudent as any);

            const statusCell = studentTable.shadowRoot!.querySelector('.status-indicator');
            expect(statusCell?.textContent).toBe('Active');
            expect(statusCell?.classList.contains('active')).toBe(true);
        });

        test('should display inactive status for inactive students', () => {
            const inactiveStudent = [{
                route: '1',
                name: 'Inactive Student',
                father_name: 'Father',
                mobile: '1234567890',
                class_: '10',
                address: 'Address',
                fees: '1000',
                status: 'inactive'
            }];

            studentTable.setStudents(inactiveStudent as any);

            const statusCell = studentTable.shadowRoot!.querySelector('.status-indicator');
            expect(statusCell?.textContent).toBe('Inactive');
            expect(statusCell?.classList.contains('inactive')).toBe(true);
        });

        test('should default to active for missing status', () => {
            const noStatusStudent = [{
                route: '1',
                name: 'No Status Student',
                father_name: 'Father',
                mobile: '1234567890',
                class_: '10',
                address: 'Address',
                fees: '1000'
            }];

            studentTable.setStudents(noStatusStudent as any);

            const statusCell = studentTable.shadowRoot!.querySelector('.status-indicator');
            expect(statusCell?.textContent).toBe('Active');
        });
    });

    describe('Accessibility', () => {
        beforeEach(() => {
            studentTable.setStudents(mockStudents);
        });

        test('should have proper ARIA labels on action buttons', () => {
            const viewButton = studentTable.shadowRoot!.querySelector('[data-action="view"][data-index="0"]') as HTMLButtonElement;
            expect(viewButton.getAttribute('aria-label')).toBe('View John Doe details');

            const editButton = studentTable.shadowRoot!.querySelector('[data-action="edit"][data-index="0"]') as HTMLButtonElement;
            expect(editButton.getAttribute('aria-label')).toBe('Edit John Doe');

            const deleteButton = studentTable.shadowRoot!.querySelector('[data-action="delete"][data-index="0"]') as HTMLButtonElement;
            expect(deleteButton.getAttribute('aria-label')).toBe('Delete John Doe');
        });

        test('should have proper titles on table cells and buttons', () => {
            const viewButton = studentTable.shadowRoot!.querySelector('[data-action="view"]') as HTMLButtonElement;
            expect(viewButton.title).toBe('View Details');

            const addressCell = studentTable.shadowRoot!.querySelector('td[title]');
            expect(addressCell?.getAttribute('title')).toBe('Test Address');
        });
    });

    describe('Performance', () => {
        test('should debounce search input', () => {
            studentTable.setStudents(mockStudents);
            const searchInput = studentTable.shadowRoot!.getElementById('search-input') as HTMLInputElement;

            // Simulate rapid typing
            searchInput.value = 'J';
            searchInput.dispatchEvent(new Event('input'));

            searchInput.value = 'Jo';
            searchInput.dispatchEvent(new Event('input'));

            searchInput.value = 'Joh';
            searchInput.dispatchEvent(new Event('input'));

            searchInput.value = 'John';
            searchInput.dispatchEvent(new Event('input'));

            // Should only process the last input after debounce delay
            return new Promise(resolve => setTimeout(() => {
                const countElement = studentTable.shadowRoot!.getElementById('total-count');
                expect(countElement?.textContent).toBe('1');
                resolve(void 0);
            }, 400));
        });
    });
});