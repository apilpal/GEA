// JSDOM setup and global mocks are now in jest.setup.js

describe('Student Profile Script Tests', () => {
    let mockContainer: HTMLElement;
    let studentTable: HTMLElement;
    let studentProfile: HTMLElement;
    let modalsContainer: HTMLElement;

    beforeEach(() => {
        // Create mock containers for the new custom element architecture
        mockContainer = document.createElement('div');
        mockContainer.id = 'app';
        document.body.appendChild(mockContainer);

        studentTable = document.createElement('student-table');
        studentTable.id = 'studentTable';
        mockContainer.appendChild(studentTable);

        studentProfile = document.createElement('student-profile-card');
        studentProfile.id = 'studentProfile';
        studentProfile.style.display = 'none';
        mockContainer.appendChild(studentProfile);

        modalsContainer = document.createElement('div');
        modalsContainer.id = 'modals';
        document.body.appendChild(modalsContainer);

        // Mock console methods to avoid noise in tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Clear containers
        mockContainer.innerHTML = '';
        mockContainer.appendChild(studentTable);
        mockContainer.appendChild(studentProfile);
        modalsContainer.innerHTML = '';
    });

    afterEach(() => {
        // Clean up
        if (document.body.contains(mockContainer)) {
            document.body.removeChild(mockContainer);
        }
        if (document.body.contains(modalsContainer)) {
            document.body.removeChild(modalsContainer);
        }
        jest.restoreAllMocks();
        ((global as any).fetch as jest.Mock).mockClear();
    });

    describe('loadStudentProfiles', () => {
        test('loads and displays student data successfully', async () => {
            const mockStudents = [
                {
                    route: '1',
                    name: 'John Doe',
                    father_name: 'Father Doe',
                    mobile: '1234567890',
                    class: '10',
                    address: 'Test Address',
                    fees: '1000',
                    contact_info: {
                        primary_mobile: '1234567890',
                        father_contact: 'Father Doe'
                    },
                    location_details: {
                        route_number: '1',
                        full_address: 'Test Address',
                        area: 'Test'
                    }
                }
            ];
            const mockResponse = { students: mockStudents, total_count: 1 };

            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            // Import and execute the compiled script logic
            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if fetch was called with correct URL
            expect((global as any).fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/students');

            // Check if custom elements were used (new architecture)
            expect(mockContainer.innerHTML).toContain('student-table');
            expect(mockContainer.innerHTML).toContain('student-profile-card');
        });

        test('handles API error response', async () => {
            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: jest.fn().mockResolvedValue({ detail: 'Server error' })
            });

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if error message is displayed in the app container
            expect(mockContainer.innerHTML).toContain('Error loading data');
        });

        test('handles network error', async () => {
            ((global as any).fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if error message is displayed in the app container
            expect(mockContainer.innerHTML).toContain('Error loading data');
        });

        test('handles empty student data', async () => {
            const mockResponse = { students: [], total_count: 0 };

            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if no data message is displayed in the app container
            expect(mockContainer.innerHTML).toContain('No valid student data found');
        });
    });

    describe('Student Profile Interaction', () => {
        test('clicking student row shows profile', async () => {
            const mockStudent = {
                route: '1',
                name: 'John Doe',
                father_name: 'Father Doe',
                mobile: '1234567890',
                class: '10',
                address: 'Test Address',
                fees: '1000',
                contact_info: {
                    primary_mobile: '1234567890',
                    father_contact: 'Father Doe'
                },
                location_details: {
                    route_number: '1',
                    full_address: 'Test Address',
                    area: 'Test'
                }
            };

            // First call returns student list
            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    students: [mockStudent],
                    total_count: 1
                })
            });

            // Second call returns individual student
            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockStudent)
            });

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for initial load
            await new Promise(resolve => setTimeout(resolve, 100));

            // Find and click the student row in the shadow DOM
            const studentTable = mockContainer.querySelector('#studentTable') as any;
            expect(studentTable).not.toBeNull();

            // Trigger student-action event for view action
            const viewEvent = new CustomEvent('student-action', {
                detail: { action: 'view', index: 0 }
            });
            studentTable.dispatchEvent(viewEvent);

            // Wait for profile load
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if profile is displayed in the student-profile-card
            const studentProfile = mockContainer.querySelector('#studentProfile') as any;
            expect(studentProfile.shadowRoot.innerHTML).toContain('John Doe');
        });

        test('back button returns to list', async () => {
            const mockStudent = {
                route: '1',
                name: 'John Doe',
                father_name: 'Father Doe',
                mobile: '1234567890',
                class: '10',
                address: 'Test Address',
                fees: '1000',
                contact_info: {
                    primary_mobile: '1234567890',
                    father_contact: 'Father Doe'
                },
                location_details: {
                    route_number: '1',
                    full_address: 'Test Address',
                    area: 'Test'
                }
            };

            // Mock the fetch for initial load
            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    students: [mockStudent],
                    total_count: 1
                })
            });

            // Mock the fetch for profile load
            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockStudent)
            });

            // Mock the fetch for back button (should reload student list)
            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    students: [mockStudent],
                    total_count: 1
                })
            });

            require('../src/ts/script.ts');

            // Load student list first
            const loadEvent = new Event('DOMContentLoaded');
            document.dispatchEvent(loadEvent);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Click on student row to show profile
            const studentRow = mockContainer.querySelector('.student-row') as HTMLElement;
            expect(studentRow).not.toBeNull();
            studentRow.click();
            await new Promise(resolve => setTimeout(resolve, 10));

            // Now simulate back button click (should reload the list)
            const backButton = document.getElementById('backButton');
            expect(backButton).not.toBeNull();
            backButton!.click();

            // Wait for transition
            await new Promise(resolve => setTimeout(resolve, 10));

            // Check that the table was re-rendered (back button functionality works)
            expect(mockContainer.innerHTML).toContain('<table class="student-table">');
        });
    });

    describe('Service Worker Registration', () => {
        test('registers service worker when supported', async () => {
            // Use the mocked service worker from jest.setup.js
            require('../src/ts/script.ts');

            // Simulate load event
            const loadEvent = new Event('load');
            window.dispatchEvent(loadEvent);

            // Wait for service worker registration
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
        });

        test('handles service worker registration failure', async () => {
            // Temporarily mock register to reject
            const originalRegister = navigator.serviceWorker.register;
            navigator.serviceWorker.register = jest.fn().mockRejectedValue(new Error('Registration failed'));

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            require('../src/ts/script.ts');

            // Simulate load event
            const loadEvent = new Event('load');
            window.dispatchEvent(loadEvent);

            // Wait for service worker registration attempt
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');

            // Restore original register
            navigator.serviceWorker.register = originalRegister;
        });

    });

    describe('Data Validation', () => {
        test('handles student data with missing fields', async () => {
            const mockStudents = [
                {
                    name: 'John Doe',
                    // Missing other fields - should still be valid due to name field
                    status: 'active'
                }
            ];
            const mockResponse = { students: mockStudents, total_count: 1 };

            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should display student with N/A for missing fields
            const studentTable = mockContainer.querySelector('#studentTable') as any;
            expect(studentTable.shadowRoot.innerHTML).toContain('John Doe');
            // The code fills missing fields with 'N/A' in the cells array, so expect multiple 'N/A'
            const naCount = (studentTable.shadowRoot.innerHTML.match(/N\/A/g) || []).length;
            expect(naCount).toBeGreaterThan(0);
        });

        test('handles invalid student data gracefully', async () => {
            const mockStudents = [
                null,
                undefined,
                {},
                { name: '', father_name: null, class: undefined }
            ];
            const mockResponse = { students: mockStudents, total_count: 4 };

            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should handle invalid data without crashing - none of the invalid students have valid names, so show no data message
            expect(mockContainer.innerHTML).toContain('No valid student data found');
        });

        test('validates student contact information display', async () => {
            const mockStudents = [
                {
                    name: 'Test Student',
                    father_name: 'Test Father',
                    class: '8',
                    mobile: '9999999999',
                    contact_info: {
                        primary_mobile: '9999999999',
                        secondary_mobile: '8888888888',
                        father_contact: 'Test Father'
                    },
                    location_details: {
                        route_number: '5',
                        full_address: 'Test Address',
                        area: 'Test Area'
                    },
                    fees: '1500',
                    status: 'active'
                }
            ];
            const mockResponse = { students: mockStudents, total_count: 1 };

            // Mock both initial load and profile detail fetch
            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockStudents[0])
            });

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for initial load
            await new Promise(resolve => setTimeout(resolve, 100));

            // Click on student row to show profile
            const studentTable = mockContainer.querySelector('#studentTable') as any;
            const viewEvent = new CustomEvent('student-action', {
                detail: { action: 'view', index: 0 }
            });
            studentTable.dispatchEvent(viewEvent);

            // Wait for profile load
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check detailed contact info display in the student profile custom element
            const studentProfile = mockContainer.querySelector('#studentProfile') as any;
            expect(studentProfile.shadowRoot.innerHTML).toContain('Test Student');
            expect(studentProfile.shadowRoot.innerHTML).toContain('9999999999');
            expect(studentProfile.shadowRoot.innerHTML).toContain('8888888888');
            expect(studentProfile.shadowRoot.innerHTML).toContain('Test Father');
        });
    });

    describe('UI Responsiveness', () => {
        test('table renders with responsive classes', async () => {
            const mockStudents = [
                {
                    name: 'Responsive Test',
                    father_name: 'Test Father',
                    class: '9',
                    mobile: '1234567890',
                    address: 'Responsive Address',
                    fees: '1200'
                }
            ];
            const mockResponse = { students: mockStudents, total_count: 1 };

            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check for responsive table structure in the shadow DOM
            const studentTable = mockContainer.querySelector('#studentTable') as any;
            expect(studentTable.shadowRoot.innerHTML).toContain('student-table');
            expect(studentTable.shadowRoot.innerHTML).toContain('<th>');
            expect(studentTable.shadowRoot.innerHTML).toContain('<td>');
        });

        test('handles window resize events', async () => {
            const mockStudents = [
                {
                    name: 'Resize Test',
                    father_name: 'Test Father',
                    class: '7',
                    mobile: '1111111111',
                    address: 'Resize Address',
                    fees: '1300'
                }
            ];
            const mockResponse = { students: mockStudents, total_count: 1 };

            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for initial load
            await new Promise(resolve => setTimeout(resolve, 10));

            // Simulate window resize
            const resizeEvent = new Event('resize');
            window.dispatchEvent(resizeEvent);

            // Wait for resize handling
            await new Promise(resolve => setTimeout(resolve, 50));

            // Should not crash and maintain functionality - just check that content is still there
            // Note: The new architecture uses shadow DOM, so we check the student table's shadow root
            const studentTable = mockContainer.querySelector('#studentTable') as any;
            expect(studentTable.shadowRoot.innerHTML).toContain('Resize Test');
        });
    });

    describe('Error Handling', () => {
        test('displays timeout error message', async () => {
            ((global as any).fetch as jest.Mock).mockImplementationOnce(
                () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
            );

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 200));

            // Check if timeout error is handled
            expect(mockContainer.innerHTML).toContain('Error loading data');
        });

        test('handles malformed JSON response', async () => {
            ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            });

            require('../src/ts/script.ts');

            // Simulate DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should handle JSON parse errors gracefully
            expect(mockContainer.innerHTML).toContain('Error loading data');
        });
    });
});