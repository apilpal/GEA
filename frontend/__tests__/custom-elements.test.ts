// Unit tests for custom elements with external CSS
// Using global test utilities and HTMLElement from jest.setup.js

interface Student {
    name: string;
    class: string;
    fees?: string;
    status?: string;
    contact_info?: any;
    location_details?: any;
}

interface Driver {
    name: string;
    route: string;
}

describe('Custom Elements with External CSS', () => {
    let mockTable: any;
    let mockCard: any;
    let mockDriverInfo: any;

    beforeEach(() => {
        mockTable = new (global as any).MockStudentTable();
        mockCard = new (global as any).MockStudentProfileCard();
        mockDriverInfo = new (global as any).MockDriverInfo();

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('StudentTable External CSS Integration', () => {
        test('should use external CSS instead of inline styles', () => {
            mockTable.connectedCallback();

            // Check that no <style> tags are in shadow DOM
            expect(mockTable.shadowRoot.innerHTML).not.toContain('<style>');
            expect(mockTable.shadowRoot.innerHTML).toContain('table-container');
            expect(mockTable.shadowRoot.innerHTML).toContain('student-table');
        });

        test('should render table with proper CSS classes', () => {
            const students = [
                { name: 'John Doe', class: '10A', fees: '1000', status: 'active' },
                { name: 'Jane Smith', class: '10B', fees: '1500', status: 'inactive' }
            ];

            mockTable.setStudents(students);
            mockTable.connectedCallback();

            const html = mockTable.shadowRoot.innerHTML;
            expect(html).toContain('student-row');
            expect(html).toContain('status-indicator active');
            expect(html).toContain('status-indicator inactive');
            expect(html).toContain('action-btn view-btn');
            expect(html).toContain('action-btn edit-btn');
            expect(html).toContain('action-btn delete-btn');
        });

        test('should handle search functionality with external CSS', () => {
            mockTable.connectedCallback();

            const searchInput = mockTable.shadowRoot.getElementById('search-input');
            expect(searchInput).toBeTruthy();

            const clearButton = mockTable.shadowRoot.getElementById('clear-search');
            expect(clearButton).toBeTruthy();
            expect(clearButton!.style.display).toBe('none');
        });

        test('should handle sorting with external CSS classes', () => {
            mockTable.connectedCallback();

            const headers = mockTable.shadowRoot.querySelectorAll('.sortable-header');
            expect(headers.length).toBeGreaterThan(0);

            // Test sorting functionality
            const students = [
                { name: 'Zara', class: '10A' },
                { name: 'Alice', class: '10B' }
            ];
            mockTable.setStudents(students);
            mockTable.sortTable('name', true);

            expect(mockTable.getStudents()[0].name).toBe('Alice');
        });

        test('should filter students correctly', () => {
            const students = [
                { name: 'John Doe', class: '10A' },
                { name: 'Jane Smith', class: '10B' },
                { name: 'Bob Johnson', class: '10A' }
            ];

            mockTable.setStudents(students);
            mockTable.filterStudents('John');

            expect(mockTable.getStudents()).toHaveLength(2);
            expect(mockTable.getStudents()[0].name).toBe('John Doe');
            expect(mockTable.getStudents()[1].name).toBe('Bob Johnson');
        });

        test('should update total count display', () => {
            mockTable.setStudents([]);
            mockTable.connectedCallback();

            const countElement = mockTable.shadowRoot.getElementById('total-count');
            expect(countElement!.textContent).toBe('0');

            mockTable.setStudents([{ name: 'Test', class: '10A' }]);
            expect(countElement!.textContent).toBe('1');
        });
    });

    describe('StudentProfileCard External CSS Integration', () => {
        test('should use external CSS instead of inline styles', () => {
            mockCard.connectedCallback();

            // Check that no <style> tags are in shadow DOM
            expect(mockCard.shadowRoot.innerHTML).not.toContain('<style>');
            expect(mockCard.shadowRoot.innerHTML).toContain('<p>No student data available</p>');
        });

        test('should render profile card with proper CSS classes', () => {
            const student = {
                name: 'John Doe',
                class: '10A',
                fees: '1000',
                contact_info: {
                    primary_mobile: '1234567890'
                },
                location_details: {
                    area: 'Downtown'
                }
            };

            mockCard.setStudent(student);
            const html = mockCard.shadowRoot.innerHTML;

            expect(html).toContain('profile-card');
            expect(html).toContain('profile-header');
            expect(html).toContain('student-avatar');
            expect(html).toContain('student-name-section');
            expect(html).toContain('profile-details-grid');
            expect(html).toContain('detail-card basic-info');
            expect(html).toContain('detail-card contact-info');
            expect(html).toContain('detail-card location-info');
        });

        test('should handle student avatar generation', () => {
            const student = {
                name: 'Alice',
                class: '10B'
            };

            mockCard.setStudent(student);
            const html = mockCard.shadowRoot.innerHTML;

            expect(html).toContain('A'); // First letter of name
        });

        test('should handle contact info rendering', () => {
            const student = {
                name: 'Test Student',
                contact_info: {
                    primary_mobile: '1234567890',
                    secondary_mobile: '0987654321',
                    father_contact: '1122334455'
                },
                location_details: {
                    route_number: 'R001',
                    area: 'Downtown',
                    full_address: '123 Main St'
                }
            };

            mockCard.setStudent(student);
            const html = mockCard.shadowRoot.innerHTML;

            expect(html).toContain('1234567890'); // Primary mobile
            expect(html).toContain('Downtown'); // Area
        });

        test('should handle missing optional data gracefully', () => {
            const student = {
                name: 'Test Student'
                // Missing contact_info and location_details
            };

            mockCard.setStudent(student);
            const html = mockCard.shadowRoot.innerHTML;

            expect(html).toContain('N/A'); // Should show N/A for missing data
        });

        test('should initialize with null student', () => {
            expect(mockCard.getStudent()).toBeNull();
        });

        test('should handle empty student object', () => {
            const emptyStudent = {};
            mockCard.setStudent(emptyStudent);
            expect(mockCard.getStudent()).toEqual(emptyStudent);
        });

        test('should handle null student data', () => {
            mockCard.setStudent(null);
            expect(mockCard.getStudent()).toBeNull();
        });
    });

    describe('Custom Elements Registration', () => {
        test('should register student-table custom element', () => {
            // Import should trigger customElements.define
            require('../src/ts/script');

            expect((global as any).customElements.define).toHaveBeenCalledWith(
                'student-table',
                expect.any(Function)
            );
        });

        test('should register student-profile-card custom element', () => {
            require('../src/ts/script');

            expect((global as any).customElements.define).toHaveBeenCalledWith(
                'student-profile-card',
                expect.any(Function)
            );
        });

        test('should register driver-info custom element', () => {
            require('../src/ts/script');

            expect((global as any).customElements.define).toHaveBeenCalledWith(
                'driver-info',
                expect.any(Function)
            );
        });

        test('should have been called exactly three times', () => {
            require('../src/ts/script');

            expect((global as any).customElements.define).toHaveBeenCalledTimes(3);
        });
    });

    describe('DriverInfo Custom Element', () => {
        test('should render driver info with proper CSS classes', () => {
            mockDriverInfo.setDriver('chacha');
            mockDriverInfo.setStudentCount(25);

            const html = mockDriverInfo.shadowRoot.innerHTML;

            expect(html).toContain('driver-info-card');
            expect(html).toContain('driver-header');
            expect(html).toContain('driver-avatar');
            expect(html).toContain('driver-details');
            expect(html).toContain('driver-stats');
            expect(html).toContain('Chacha Driver');
            expect(html).toContain('25 Students');
        });

        test('should handle null driver gracefully', () => {
            mockDriverInfo.setDriver(null);
            const html = mockDriverInfo.shadowRoot.innerHTML;

            expect(html).toContain('Unknown');
        });

        test('should handle driver avatar generation', () => {
            mockDriverInfo.setDriver('sandeep');

            const html = mockDriverInfo.shadowRoot.innerHTML;
            expect(html).toContain('S'); // First letter of 'Sandeep'
        });

        test('should update student count dynamically', () => {
            mockDriverInfo.setDriver('chacha');
            mockDriverInfo.setStudentCount(10);

            let html = mockDriverInfo.shadowRoot.innerHTML;
            expect(html).toContain('10 Students');

            mockDriverInfo.setStudentCount(20);
            html = mockDriverInfo.shadowRoot.innerHTML;
            expect(html).toContain('20 Students');
        });

        test('should initialize with null driver and zero count', () => {
            expect(mockDriverInfo.driver).toBeNull();
            expect(mockDriverInfo.studentCount).toBe(0);
        });
    });

    describe('Shadow DOM', () => {
        test('StudentTable should attach shadow root', () => {
            const table = new (global as any).MockStudentTable();
            table.connectedCallback();

            expect(table.shadowRoot).not.toBeNull();
        });

        test('StudentProfileCard should attach shadow root', () => {
            const card = new (global as any).MockStudentProfileCard();
            card.connectedCallback();

            expect(card.shadowRoot).not.toBeNull();
        });

        test('DriverInfo should attach shadow root', () => {
            const driverInfo = new (global as any).MockDriverInfo();
            driverInfo.connectedCallback();

            expect(driverInfo.shadowRoot).not.toBeNull();
        });
    });

    describe('Event Handling', () => {
        test('StudentTable should dispatch custom events', () => {
            const table = new (global as any).MockStudentTable();
            const mockDispatch = jest.fn();
            table.dispatchEvent = mockDispatch;

            // Simulate event dispatch
            table.dispatchEvent(new CustomEvent('student-action', {
                detail: { action: 'view', index: 0 }
            }));

            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'student-action',
                    detail: { action: 'view', index: 0 }
                })
            );
        });

        test('StudentTable should handle add-student event', () => {
            const table = new (global as any).MockStudentTable();
            const mockDispatch = jest.fn();
            table.dispatchEvent = mockDispatch;

            table.dispatchEvent(new CustomEvent('add-student'));

            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'add-student'
                })
            );
        });
    });

    describe('Data Validation', () => {
        test('StudentTable should handle invalid students data', () => {
            const table = new (global as any).MockStudentTable();

            expect(() => {
                table.setStudents(undefined as any);
            }).toThrow('students is not iterable');

            expect(() => {
                table.setStudents('invalid' as any);
            }).toThrow('students is not iterable');
        });

        test('StudentProfileCard should handle malformed student data', () => {
            const card = new (global as any).MockStudentProfileCard();

            const malformedStudent = {
                name: null,
                class: undefined,
                contact_info: 'invalid'
            };

            expect(() => {
                card.setStudent(malformedStudent);
            }).toThrow('Invalid student data: missing or invalid name');

            expect(card.getStudent()).toEqual(malformedStudent);
        });
    });

    describe('Lifecycle Methods', () => {
        test('StudentTable should handle connectedCallback', () => {
            const table = new (global as any).MockStudentTable();

            expect(() => {
                table.connectedCallback();
            }).not.toThrow();
        });

        test('StudentTable should handle disconnectedCallback', () => {
            const table = new (global as any).MockStudentTable();
            table.connectedCallback();

            expect(() => {
                table.disconnectedCallback();
            }).not.toThrow();
        });

        test('StudentProfileCard should handle connectedCallback', () => {
            const card = new (global as any).MockStudentProfileCard();

            expect(() => {
                card.connectedCallback();
            }).not.toThrow();
        });

        test('StudentProfileCard should handle disconnectedCallback', () => {
            const card = new (global as any).MockStudentProfileCard();
            card.connectedCallback();

            expect(() => {
                card.disconnectedCallback();
            }).not.toThrow();
        });
    });
});

// Additional tests for specific functionality
describe('Custom Elements Integration', () => {
    test('should handle student data transformation', () => {
        const students = [
            {
                name: 'Alice Johnson',
                father_name: 'Bob Johnson',
                class: 'Grade 10',
                fees: '5000',
                status: 'active' as const
            },
            {
                name: 'Charlie Brown',
                father_name: 'David Brown',
                class: 'Grade 9',
                fees: '4500',
                status: 'inactive' as const
            }
        ];

        const table = new (global as any).MockStudentTable();
        table.setStudents(students);

        expect(table.getStudents()).toHaveLength(2);
        expect(table.getStudents()[0].name).toBe('Alice Johnson');
        expect(table.getStudents()[1].status).toBe('inactive');
    });

    test('should handle contact info rendering', () => {
        const student = {
            name: 'Test Student',
            contact_info: {
                primary_mobile: '1234567890',
                secondary_mobile: '0987654321',
                father_contact: '1122334455'
            },
            location_details: {
                route_number: 'R001',
                area: 'Downtown',
                full_address: '123 Main St'
            }
        };

        const card = new (global as any).MockStudentProfileCard();
        card.setStudent(student);

        expect(card.getStudent()).toEqual(student);
        expect(card.getStudent()?.contact_info?.primary_mobile).toBe('1234567890');
    });

    test('should handle empty contact info gracefully', () => {
        const student = {
            name: 'Test Student',
            contact_info: {},
            location_details: {}
        };

        const card = new (global as any).MockStudentProfileCard();
        card.setStudent(student);

        expect(card.getStudent()?.contact_info).toEqual({});
        expect(card.getStudent()?.location_details).toEqual({});
    });
});