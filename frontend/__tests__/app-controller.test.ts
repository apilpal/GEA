// Unit tests for main app controller functionality in script.ts
// Tests the DOM manipulation, API integration, and event handling

// Mock the custom elements
class MockStudentTable extends global.HTMLElement {
    public students: any[] = [];
    public shadowRoot: any = {
        innerHTML: '',
        getElementById: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        addEventListener: jest.fn()
    };

    constructor() {
        super();
        (this as any)._ceState = undefined;
    }

    connectedCallback() {}
    disconnectedCallback() {}
    setStudents(students: any[]) { this.students = students; }
    getStudents() { return this.students; }
    dispatchEvent = jest.fn();
    addEventListener = jest.fn();
}

class MockStudentProfileCard extends global.HTMLElement {
    public student: any = null;
    public shadowRoot: any = {
        innerHTML: '',
        getElementById: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        addEventListener: jest.fn()
    };

    constructor() {
        super();
        (this as any)._ceState = undefined;
    }

    connectedCallback() {}
    disconnectedCallback() {}
    setStudent(student: any) { this.student = student; }
    getStudent() { return this.student; }
}

describe('App Controller', () => {
    let mockFetch: jest.MockedFunction<typeof fetch>;
    let originalDocument: Document;

    beforeEach(() => {
        // Store original document
        originalDocument = global.document;

        // Register mock custom elements using the new utility
        (global as any).registerTestCustomElement('student-table', MockStudentTable);
        (global as any).registerTestCustomElement('student-profile-card', MockStudentProfileCard);

        // Mock DOM elements
        document.body.innerHTML = `
            <div id="app"></div>
            <student-table id="studentTable"></student-table>
            <student-profile-card id="studentProfile"></student-profile-card>
            <div id="modals"></div>
        `;

        // Mock fetch
        mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockClear();

        // Reset students data by clearing any global state
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore original document
        global.document = originalDocument;
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    describe('loadStudentProfiles', () => {
        test('should load students successfully', async () => {
            const mockStudents = [
                { name: 'John Doe', class: '10', fees: 1000, status: 'active', mother_name: 'Jane Doe', date_of_birth: '2010-01-01' },
                { name: 'Jane Smith', class: '11', fees: 1500, status: 'inactive', mother_name: 'Mary Smith', date_of_birth: '2009-05-15' }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ students: mockStudents })
            } as Response);

            // Import and run the app controller
            require('../src/ts/script');

            // Wait for DOMContentLoaded
            await new Promise(resolve => setTimeout(resolve, 0));

            // Check that fetch was called correctly
            expect(mockFetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/students');

            // Check that students were set on the table
            const studentTable = document.getElementById('studentTable') as any;
            expect(studentTable.setStudents).toHaveBeenCalledWith(mockStudents);
        });

        test('should handle API errors gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => ({ detail: 'Server error' })
            } as Response);

            // Mock console.error to capture error logs
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Import and run the app controller
            require('../src/ts/script');

            // Wait for DOMContentLoaded
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(consoleSpy).toHaveBeenCalledWith('Error loading student data:', expect.any(Error));

            consoleSpy.mockRestore();
        });

        test('should handle invalid API response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ invalid: 'response' })
            } as Response);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(consoleSpy).toHaveBeenCalledWith('Error loading student data:', expect.any(Error));

            consoleSpy.mockRestore();
        });

        test('should filter invalid students', async () => {
            const mockResponse = {
                students: [
                    { name: 'Valid Student', class: '10A' },
                    { invalid: 'student' },
                    { name: '', class: '10B' }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            } as Response);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            expect(studentTable.setStudents).toHaveBeenCalledWith([
                { name: 'Valid Student', class: '10A' }
            ]);
        });
    });

    describe('showStudentProfile', () => {
        test('should load and display student profile', async () => {
            const mockStudent = {
                name: 'John Doe',
                class: '10A',
                fees: '1000',
                contact_info: { primary_mobile: '1234567890' }
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockStudent
            } as Response);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            // Simulate student-action event
            const studentTable = document.getElementById('studentTable') as any;
            studentTable.dispatchEvent(new CustomEvent('student-action', {
                detail: { action: 'view', index: 0 }
            }));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockFetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/students/0');

            const studentProfile = document.getElementById('studentProfile') as any;
            expect(studentProfile.setStudent).toHaveBeenCalledWith(mockStudent);
        });

        test('should handle profile loading errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({ detail: 'Student not found' })
            } as Response);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            studentTable.dispatchEvent(new CustomEvent('student-action', {
                detail: { action: 'view', index: 0 }
            }));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(consoleSpy).toHaveBeenCalledWith('Error loading student profile:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('Student Management', () => {
        test('should handle delete student action', async () => {
            const mockStudents = [
                { name: 'John Doe', class: '10A' },
                { name: 'Jane Smith', class: '10B' }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ students: mockStudents })
            } as Response);

            // Mock window.confirm
            const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            studentTable.dispatchEvent(new CustomEvent('student-action', {
                detail: { action: 'delete', index: 0 }
            }));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete John Doe?');
            expect(studentTable.setStudents).toHaveBeenCalledWith([mockStudents[1]]);

            confirmSpy.mockRestore();
        });

        test('should cancel delete when user declines', async () => {
            const mockStudents = [{ name: 'John Doe', class: '10A' }];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ students: mockStudents })
            } as Response);

            const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            const initialStudents = studentTable.setStudents.mock.calls[0][0];

            studentTable.dispatchEvent(new CustomEvent('student-action', {
                detail: { action: 'delete', index: 0 }
            }));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(studentTable.setStudents).toHaveBeenCalledTimes(1); // Only initial load

            confirmSpy.mockRestore();
        });
    });

    describe('Modal Management', () => {
        test('should show add student form', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ students: [] })
            } as Response);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            studentTable.dispatchEvent(new CustomEvent('add-student'));

            await new Promise(resolve => setTimeout(resolve, 0));

            const modalsContainer = document.getElementById('modals')!;
            expect(modalsContainer.innerHTML).toContain('Add New Student');
            expect(modalsContainer.innerHTML).toContain('addStudentForm');
        });

        test('should close modal on cancel', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ students: [] })
            } as Response);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            studentTable.dispatchEvent(new CustomEvent('add-student'));

            await new Promise(resolve => setTimeout(resolve, 0));

            // Click cancel button
            const cancelBtn = document.getElementById('cancelAdd');
            cancelBtn?.click();

            const modalsContainer = document.getElementById('modals')!;
            expect(modalsContainer.innerHTML).toBe('');
        });
    });

    describe('Form Submission', () => {
        test('should add new student successfully', async () => {
            const mockStudents: any[] = [];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ students: mockStudents })
            } as Response);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            studentTable.dispatchEvent(new CustomEvent('add-student'));

            await new Promise(resolve => setTimeout(resolve, 0));

            // Fill form
            const nameInput = document.getElementById('addName') as HTMLInputElement;
            const classInput = document.getElementById('addClass') as HTMLInputElement;
            const mobileInput = document.getElementById('addMobile') as HTMLInputElement;

            nameInput.value = 'New Student';
            classInput.value = '10C';
            mobileInput.value = '1234567890';

            // Submit form
            const form = document.getElementById('addStudentForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(studentTable.setStudents).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'New Student',
                        class: '10C',
                        mobile: '1234567890'
                    })
                ])
            );

            // Modal should be closed
            const modalsContainer = document.getElementById('modals')!;
            expect(modalsContainer.innerHTML).toBe('');
        });

        test('should handle edit student form submission', async () => {
            const mockStudents = [{ name: 'John Doe', class: '10A', fees: '1000' }];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ students: mockStudents })
            } as Response);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            studentTable.dispatchEvent(new CustomEvent('student-action', {
                detail: { action: 'edit', index: 0 }
            }));

            await new Promise(resolve => setTimeout(resolve, 0));

            // Modify form
            const nameInput = document.getElementById('editName') as HTMLInputElement;
            nameInput.value = 'Updated Name';

            // Submit form
            const form = document.getElementById('editStudentForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(studentTable.setStudents).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Updated Name',
                        last_updated: expect.any(String)
                    })
                ])
            );
        });
    });

    describe('Error Handling', () => {
        test('should show notification on successful operations', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ students: [] })
            } as Response);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            studentTable.dispatchEvent(new CustomEvent('add-student'));

            await new Promise(resolve => setTimeout(resolve, 0));

            const nameInput = document.getElementById('addName') as HTMLInputElement;
            nameInput.value = 'Test Student';

            const form = document.getElementById('addStudentForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));

            await new Promise(resolve => setTimeout(resolve, 0));

            // Check that a notification was added to the DOM
            const notifications = document.querySelectorAll('.notification');
            expect(notifications.length).toBeGreaterThan(0);
            expect(notifications[0].textContent).toContain('Student added successfully');
        });

        test('should handle required field validation', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ students: [] })
            } as Response);

            require('../src/ts/script');
            await new Promise(resolve => setTimeout(resolve, 0));

            const studentTable = document.getElementById('studentTable') as any;
            studentTable.dispatchEvent(new CustomEvent('add-student'));

            await new Promise(resolve => setTimeout(resolve, 0));

            // Try to submit form without required name field
            const form = document.getElementById('addStudentForm') as HTMLFormElement;

            // HTML5 validation should prevent submission without required fields
            // In test environment, we simulate the validation
            expect(form.checkValidity()).toBe(false);
        });
    });

    describe('Guest User Authentication and Navigation', () => {
        beforeEach(() => {
            // Setup DOM for guest user tests
            document.body.innerHTML = `
                <div id="app">
                    <div id="login-page" class="page">Login Content</div>
                    <div id="dashboard-page" class="page">Dashboard Content</div>
                    <div id="main-app" style="display: none;">Main App Content</div>
                    <div id="auth-loading" style="display: none;">Loading...</div>
                </div>
            `;

            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: { hash: '', href: '' },
                writable: true
            });

            // Mock console methods
            jest.spyOn(console, 'log').mockImplementation();
            jest.spyOn(console, 'error').mockImplementation();
            jest.spyOn(console, 'warn').mockImplementation();
        });

        test('should not navigate to login during guest user creation', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user_123',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            // Mock auth context and auth service
            const mockAuthContext = {
                initialize: jest.fn().mockResolvedValue(undefined),
                subscribe: jest.fn().mockReturnValue(() => {}),
                getState: jest.fn().mockReturnValue({
                    isAuthenticated: true,
                    user: mockGuestUser,
                    isLoading: false,
                    error: null
                })
            };

            const mockAuthService = {
                isGuestUser: jest.fn().mockReturnValue(true),
                getStoredUser: jest.fn().mockReturnValue(mockGuestUser)
            };

            // Mock the modules
            jest.doMock('../src/ts/components/auth/auth-context', () => ({
                authContext: mockAuthContext
            }));

            jest.doMock('../src/ts/services/auth-service', () => ({
                authService: mockAuthService
            }));

            // Act
            require('../src/ts/app-controller');
            await new Promise(resolve => setTimeout(resolve, 0));

            // Assert - Should not navigate to login during guest user creation
            expect(window.location.hash).not.toBe('login');
            expect(mockAuthContext.getState().isAuthenticated).toBe(true);
            expect(mockAuthContext.getState().user).toEqual(mockGuestUser);
        });

        test('should show dashboard for authenticated guest users', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user_456',
                email: 'guest2@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            const mockAuthContext = {
                initialize: jest.fn().mockResolvedValue(undefined),
                subscribe: jest.fn().mockReturnValue(() => {}),
                getState: jest.fn().mockReturnValue({
                    isAuthenticated: true,
                    user: mockGuestUser,
                    isLoading: false,
                    error: null
                })
            };

            jest.doMock('../src/ts/components/auth/auth-context', () => ({
                authContext: mockAuthContext
            }));

            // Act
            require('../src/ts/app-controller');
            await new Promise(resolve => setTimeout(resolve, 0));

            // Assert - Should show main app for authenticated guest users
            const mainApp = document.getElementById('main-app');
            const loginPage = document.getElementById('login-page');
            const authLoading = document.getElementById('auth-loading');

            expect(mainApp?.style.display).toBe('block');
            expect(loginPage?.classList.contains('active')).toBe(false);
            expect(authLoading?.style.display).toBe('none');
        });

        test('should handle guest user authentication state changes', async () => {
            // Arrange
            let stateChangeCallback: (state: any) => void;
            const mockAuthContext = {
                initialize: jest.fn().mockResolvedValue(undefined),
                subscribe: jest.fn().mockImplementation((callback) => {
                    stateChangeCallback = callback;
                    return () => {};
                }),
                getState: jest.fn().mockReturnValue({
                    isAuthenticated: false,
                    user: null,
                    isLoading: true,
                    error: null
                })
            };

            jest.doMock('../src/ts/components/auth/auth-context', () => ({
                authContext: mockAuthContext
            }));

            // Act
            require('../src/ts/app-controller');
            await new Promise(resolve => setTimeout(resolve, 0));

            // Simulate guest user authentication
            const mockGuestUser = {
                id: 1,
                username: 'guest_user_789',
                email: 'guest3@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            stateChangeCallback({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            // Assert - Should handle guest user login correctly
            expect(mockAuthContext.getState).toHaveBeenCalled();
            expect(window.location.hash).toBe('dashboard');
        });

        test('should handle guest user logout correctly', async () => {
            // Arrange
            let stateChangeCallback: (state: any) => void;
            const mockAuthContext = {
                initialize: jest.fn().mockResolvedValue(undefined),
                subscribe: jest.fn().mockImplementation((callback) => {
                    stateChangeCallback = callback;
                    return () => {};
                }),
                getState: jest.fn().mockReturnValue({
                    isAuthenticated: true,
                    user: {
                        id: 1,
                        username: 'guest_user',
                        email: 'guest@test.local',
                        role: 'guest',
                        is_active: true,
                        is_guest: true
                    },
                    isLoading: false,
                    error: null
                }),
                logout: jest.fn().mockResolvedValue(undefined)
            };

            jest.doMock('../src/ts/components/auth/auth-context', () => ({
                authContext: mockAuthContext
            }));

            // Act
            require('../src/ts/app-controller');
            await new Promise(resolve => setTimeout(resolve, 0));

            // Simulate guest user logout
            stateChangeCallback({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            // Assert - Should handle guest user logout correctly
            expect(window.location.hash).toBe('login');
            expect(mockAuthContext.logout).toHaveBeenCalled();
        });

        test('should handle authentication initialization timeout', async () => {
            // Arrange
            const mockAuthContext = {
                initialize: jest.fn().mockImplementation(() =>
                    new Promise(resolve => setTimeout(resolve, 15000))
                ),
                subscribe: jest.fn().mockReturnValue(() => {}),
                getState: jest.fn().mockReturnValue({
                    isAuthenticated: false,
                    user: null,
                    isLoading: true,
                    error: null
                })
            };

            jest.doMock('../src/ts/components/auth/auth-context', () => ({
                authContext: mockAuthContext
            }));

            // Act
            require('../src/ts/app-controller');
            await new Promise(resolve => setTimeout(resolve, 0));

            // Wait for timeout handling
            await new Promise(resolve => setTimeout(resolve, 16000));

            // Assert - Should handle timeout and show login
            expect(window.location.hash).toBe('login');
        });

        test('should update UI correctly for guest user authentication', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user_ui',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            const mockAuthContext = {
                initialize: jest.fn().mockResolvedValue(undefined),
                subscribe: jest.fn().mockReturnValue(() => {}),
                getState: jest.fn().mockReturnValue({
                    isAuthenticated: true,
                    user: mockGuestUser,
                    isLoading: false,
                    error: null
                })
            };

            jest.doMock('../src/ts/components/auth/auth-context', () => ({
                authContext: mockAuthContext
            }));

            // Act
            require('../src/ts/app-controller');
            await new Promise(resolve => setTimeout(resolve, 0));

            // Assert - UI should be updated for authenticated guest user
            const mainApp = document.getElementById('main-app');
            const loginPage = document.getElementById('login-page');
            const authLoading = document.getElementById('auth-loading');

            expect(mainApp?.style.display).toBe('block');
            expect(loginPage?.classList.contains('active')).toBe(false);
            expect(authLoading?.style.display).toBe('none');
        });

        test('should handle guest user authentication errors gracefully', async () => {
            // Arrange
            let stateChangeCallback: (state: any) => void;
            const mockAuthContext = {
                initialize: jest.fn().mockResolvedValue(undefined),
                subscribe: jest.fn().mockImplementation((callback) => {
                    stateChangeCallback = callback;
                    return () => {};
                }),
                getState: jest.fn().mockReturnValue({
                    isAuthenticated: false,
                    user: null,
                    isLoading: false,
                    error: 'Authentication failed'
                })
            };

            jest.doMock('../src/ts/components/auth/auth-context', () => ({
                authContext: mockAuthContext
            }));

            // Act
            require('../src/ts/app-controller');
            await new Promise(resolve => setTimeout(resolve, 0));

            // Simulate authentication error
            stateChangeCallback({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: 'Network error during guest authentication'
            });

            // Assert - Should handle error and show login
            expect(window.location.hash).toBe('login');
        });
    });
});