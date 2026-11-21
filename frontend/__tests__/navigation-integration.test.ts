// Integration tests for navigation and page functionality

describe('Navigation Integration', () => {
    beforeEach(() => {
        // Setup DOM elements
        document.body.innerHTML = `
            <div id="page-title"></div>
            <nav>
                <a class="menu-item" data-page="dashboard" href="#">Dashboard</a>
                <a class="menu-item" data-page="students" href="#">Students</a>
                <a class="menu-item" data-page="reports" href="#">Reports</a>
            </nav>
            <div id="dashboard-page" class="page active"></div>
            <div id="students-page" class="page"></div>
            <div id="reports-page" class="page"></div>
        `;

        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: { hash: '#dashboard' },
            writable: true
        });

        // Mock hashchange event
        (global as any).hashChangeListeners = [];
        window.addEventListener = jest.fn((event, listener) => {
            if (event === 'hashchange') {
                (global as any).hashChangeListeners.push(listener);
            }
        });

        // Reset customElements registry
        (global as any).customElements = {
            define: jest.fn(),
            get: jest.fn(),
            whenDefined: jest.fn().mockResolvedValue(undefined)
        };
    });

    test('initializes navigation correctly', async () => {
        // Import and run initialization using dynamic import for ES modules
        const scriptModule = await import('../src/ts/script.ts');

        // Check that DOMContentLoaded listeners were set up
        expect(document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    test('updates navigation UI when hash changes', async () => {
        // Import the navigation functions using dynamic import for ES modules
        const scriptModule = await import('../src/ts/script.ts');

        // Simulate hash change to students
        window.location.hash = '#students';
        (global as any).hashChangeListeners.forEach((listener: any) => listener());

        // Check that students page is active
        const studentsPage = document.getElementById('students-page');
        const dashboardPage = document.getElementById('dashboard-page');
        const studentsMenuItem = document.querySelector('[data-page="students"]');
        const dashboardMenuItem = document.querySelector('[data-page="dashboard"]');

        expect(studentsPage?.classList.contains('active')).toBe(true);
        expect(dashboardPage?.classList.contains('active')).toBe(false);
        expect(studentsMenuItem?.classList.contains('active')).toBe(true);
        expect(dashboardMenuItem?.classList.contains('active')).toBe(false);
    });

    test('updates page title correctly', async () => {
        const scriptModule = await import('../src/ts/script.ts');

        // Test different pages
        const testCases = [
            { hash: '#dashboard', expected: 'Dashboard' },
            { hash: '#students', expected: 'Students' },
            { hash: '#reports', expected: 'Reports' },
            { hash: '#unknown', expected: 'Dashboard' } // fallback
        ];

        testCases.forEach(({ hash, expected }) => {
            window.location.hash = hash;
            (global as any).hashChangeListeners.forEach((listener: any) => listener());

            const pageTitle = document.getElementById('page-title');
            expect(pageTitle?.textContent).toBe(expected);
        });
    });

    test('menu item click updates hash and navigation', async () => {
        const scriptModule = await import('../src/ts/script.ts');

        // Click students menu item
        const studentsMenuItem = document.querySelector('[data-page="students"]') as HTMLElement;
        studentsMenuItem.click();

        // Check hash was updated
        expect(window.location.hash).toBe('#students');

        // Check navigation was updated
        const studentsPage = document.getElementById('students-page');
        expect(studentsPage?.classList.contains('active')).toBe(true);
    });
});

describe('Transport Page Integration', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <select id="driver-select">
                <option value="">Select Driver</option>
            </select>
            <tbody id="driver-table-body"></tbody>
        `;

        // Mock API service
        (global as any).apiService = {
            get: jest.fn()
        };
    });

    test('loads drivers and populates select', async () => {
        const mockDrivers = [
            { name: 'John Driver', route: 'R001' },
            { name: 'Jane Driver', route: 'R002' }
        ];

        (global as any).apiService.get.mockResolvedValue({ data: { drivers: mockDrivers } });

        const script = require('../src/ts/script.ts');

        // Simulate transport page becoming active
        const transportPage = document.createElement('div');
        transportPage.id = 'transport-page';
        transportPage.classList.add('active');
        transportPage.setAttribute('data-drivers-loaded', 'true');
        document.body.appendChild(transportPage);

        // Trigger driver loading
        const loadDrivers = (global as any).loadDriversForTransportPage;
        await loadDrivers();

        const driverSelect = document.getElementById('driver-select') as HTMLSelectElement;
        expect(driverSelect.options.length).toBe(3); // Including the default option
        expect(driverSelect.options[1].textContent).toBe('John Driver');
        expect(driverSelect.options[2].textContent).toBe('Jane Driver');
    });

    test('handles driver selection and loads student data', async () => {
        const mockStudents = [
            { name: 'Student 1', route: 'R001', mobile: '1234567890' },
            { name: 'Student 2', route: 'R001', mobile: '0987654321' }
        ];

        (global as any).apiService.get.mockResolvedValue({ data: mockStudents });

        const script = require('../src/ts/script.ts');

        // Simulate driver selection
        const driverSelect = document.getElementById('driver-select') as HTMLSelectElement;
        driverSelect.value = 'John Driver';

        const event = new Event('change');
        driverSelect.dispatchEvent(event);

        // Check API was called for students
        expect(global.apiService.get).toHaveBeenCalledWith('/drivers/John Driver');

        // Driver info component should be updated
        expect(document.querySelector('driver-info')).toBeDefined();
    });
});

describe('Chat Integration', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <input id="chat-input" value="Hello bot" />
            <button id="send-btn"></button>
            <div id="chat-messages"></div>
        `;

        // Mock API service
        global.apiService = {
            post: jest.fn()
        };
    });

    test('sends message and displays response', async () => {
        const mockResponse = { response: 'Hello human!' };
        global.apiService.post.mockResolvedValue({ data: mockResponse });

        const script = require('../src/ts/script.ts');

        // Click send button
        const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
        sendBtn.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        const chatMessages = document.getElementById('chat-messages');
        expect(chatMessages?.innerHTML).toContain('Hello bot');
        expect(chatMessages?.innerHTML).toContain('Hello human!');
        expect(global.apiService.post).toHaveBeenCalledWith('/chat', { message: 'Hello bot' });
    });

    test('handles Enter key press', () => {
        const script = require('../src/ts/script.ts');

        const chatInput = document.getElementById('chat-input') as HTMLInputElement;

        // Simulate Enter key press
        const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
        chatInput.dispatchEvent(enterEvent);

        // Message should be sent
        expect(global.apiService.post).toHaveBeenCalledWith('/chat', { message: 'Hello bot' });
    });

    test('clears input after sending', async () => {
        global.apiService.post.mockResolvedValue({ data: { response: 'OK' } });

        const script = require('../src/ts/script.ts');

        const chatInput = document.getElementById('chat-input') as HTMLInputElement;
        const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;

        sendBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(chatInput.value).toBe('');
    });
});

describe('Reports Integration', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="report-total-students"></div>
            <div id="report-total-drivers"></div>
            <tbody id="driver-student-tbody"></tbody>
            <div id="toast-container"></div>
        `;

        // Mock API service
        (global as any).apiService = {
            get: jest.fn()
        };
    });

    test('generates and displays reports', async () => {
        const mockSummary = {
            total_students: 150,
            total_drivers: 10,
            drivers: [
                { driver_name: 'John', student_count: 20, revenue: 5000 }
            ]
        };

        global.apiService.get.mockResolvedValue({ data: mockSummary });

        const script = require('../src/ts/script.ts');

        // Call generate reports
        const generateReports = (global as any).generateAllReports;
        await generateReports();

        const totalStudents = document.getElementById('report-total-students');
        const totalDrivers = document.getElementById('report-total-drivers');

        expect(totalStudents?.textContent).toBe('150');
        expect(totalDrivers?.textContent).toBe('10');
        expect(global.apiService.get).toHaveBeenCalledWith('/reports/summary');
    });

    test('shows toast on successful report generation', async () => {
        global.apiService.get.mockResolvedValue({ data: { total_students: 100 } });

        const script = require('../src/ts/script.ts');

        const generateReports = (global as any).generateAllReports;
        await generateReports();

        const toastContainer = document.getElementById('toast-container');
        expect(toastContainer?.innerHTML).toContain('Reports updated successfully');
    });
});