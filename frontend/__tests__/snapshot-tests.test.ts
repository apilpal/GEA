// Snapshot tests for custom elements
declare const global: any;

describe('Custom Elements Snapshots', () => {
    describe('StudentTable Snapshots', () => {
        test('renders table with empty state', () => {
            const table = new (global as any).MockStudentTable();
            table.connectedCallback();

            expect(table.shadowRoot.innerHTML).toMatchSnapshot();
        });

        test('renders table with students', () => {
            const table = new (global as any).MockStudentTable();
            const students = [
                { name: 'John Doe', class: '10A', fees: '1000', status: 'active' },
                { name: 'Jane Smith', class: '10B', fees: '1500', status: 'inactive' }
            ];

            table.setStudents(students);
            table.connectedCallback();

            expect(table.shadowRoot.innerHTML).toMatchSnapshot();
        });

        test('renders table after filtering', () => {
            const table = new (global as any).MockStudentTable();
            const students = [
                { name: 'John Doe', class: '10A', fees: '1000', status: 'active' },
                { name: 'Jane Smith', class: '10B', fees: '1500', status: 'inactive' }
            ];

            table.setStudents(students);
            table.filterStudents('John');

            expect(table.shadowRoot.innerHTML).toMatchSnapshot();
        });
    });

    describe('StudentProfileCard Snapshots', () => {
        test('renders with no student data', () => {
            const card = new (global as any).MockStudentProfileCard();
            card.connectedCallback();

            expect(card.shadowRoot.innerHTML).toMatchSnapshot();
        });

        test('renders complete student profile', () => {
            const card = new (global as any).MockStudentProfileCard();
            const student = {
                name: 'John Doe',
                class: '10A',
                fees: '1000',
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

            card.setStudent(student);

            expect(card.shadowRoot.innerHTML).toMatchSnapshot();
        });

        test('renders with minimal student data', () => {
            const card = new (global as any).MockStudentProfileCard();
            const student = {
                name: 'Jane Smith',
                class: '9B'
            };

            card.setStudent(student);

            expect(card.shadowRoot.innerHTML).toMatchSnapshot();
        });
    });

    describe('DriverInfo Snapshots', () => {
        test('renders driver info with data', () => {
            const driverInfo = new (global as any).MockDriverInfo();
            driverInfo.setDriver('chacha');
            driverInfo.setStudentCount(25);

            expect(driverInfo.shadowRoot.innerHTML).toMatchSnapshot();
        });

        test('renders driver info with null driver', () => {
            const driverInfo = new (global as any).MockDriverInfo();
            driverInfo.setDriver(null);

            expect(driverInfo.shadowRoot.innerHTML).toMatchSnapshot();
        });
    });

    describe('ChartComponent Snapshots', () => {
        test('renders chart container', () => {
            const chart = new (global as any).MockChartComponent();
            chart.connectedCallback();

            expect(chart.shadowRoot.innerHTML).toMatchSnapshot();
        });

        test('renders chart with data', () => {
            const chart = new (global as any).MockChartComponent();
            const data = {
                type: 'bar',
                title: 'Test Chart',
                labels: ['A', 'B', 'C'],
                values: [1, 2, 3],
                colors: ['red', 'green', 'blue']
            };

            chart.setData(data);

            expect(chart.shadowRoot.innerHTML).toMatchSnapshot();
        });
    });
});