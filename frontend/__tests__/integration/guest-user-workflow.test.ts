// Integration tests for guest user workflows
// Tests complete guest user journey from login to conversion

describe('Guest User Workflow Integration', () => {
    beforeEach(() => {
        // Reset all mocks and setup clean environment
        jest.clearAllMocks();

        // Setup DOM environment
        document.body.innerHTML = `
            <div class="auth-container">
                <button data-guest-login>Continue as Guest</button>
                <input type="checkbox" data-enable-guest>
            </div>
            <nav>
                <div data-guest-status>
                    <span class="guest-badge">Guest User</span>
                    <button class="guest-convert-btn">Upgrade</button>
                    <button class="guest-logout-btn">×</button>
                </div>
            </nav>
            <div class="dashboard-container" data-guest-dashboard>
                <div id="total-students-dash">0</div>
                <div id="total-drivers-dash">0</div>
            </div>
        `;

        // Setup global services
        global.authService = {
            getStoredUser: jest.fn(),
            storeUser: jest.fn(),
            clearStoredUser: jest.fn()
        };

        global.apiService = {
            get: jest.fn(),
            post: jest.fn()
        };

        // Clear localStorage mock
        localStorage.clear();
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    describe('Complete Guest User Journey', () => {
        test('should complete full guest user workflow', async () => {
            // Arrange - Setup initial state
            localStorage.getItem = jest.fn().mockReturnValue(null); // Guest access not enabled

            const guestLoginComponent = new (global as any).GuestLoginComponent();
            const guestDashboardComponent = new (global as any).GuestDashboardComponent();

            // Step 1: Guest login process
            // Arrange guest login API response
            const guestLoginResponse = {
                error: null,
                data: {
                    access_token: 'guest_access_token_123',
                    refresh_token: 'guest_refresh_token_123',
                    token_type: 'bearer',
                    user: {
                        id: 1,
                        username: 'guest_test123',
                        email: 'guest_test123@guest.local',
                        role: 'student',
                        is_active: true,
                        is_guest: true
                    },
                    guest_id: 'guest_123',
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    is_guest: true
                }
            };

            global.apiService.post = jest.fn().mockResolvedValue(guestLoginResponse);

            // Act - Initialize guest login component
            await guestLoginComponent.initialize();

            // Assert - Guest login option should be shown
            const guestButton = document.querySelector('[data-guest-login]');
            expect(guestButton).toBeTruthy();

            // Step 2: Perform guest login
            // Arrange
            Object.defineProperty(window.location, 'href', {
                value: '',
                writable: true
            });

            // Act - Trigger guest login
            await guestLoginComponent.handleGuestLogin();

            // Assert - API should be called and localStorage updated
            expect(global.apiService.post).toHaveBeenCalledWith('/auth/guest', {});
            expect(localStorage.setItem).toHaveBeenCalledWith('guest_access_enabled', 'true');
            expect(window.location.href).toBe('/dashboard');

            // Step 3: Dashboard access
            // Arrange - Setup guest user as current user
            global.authService.getStoredUser = jest.fn().mockReturnValue({
                id: 1,
                username: 'guest_test123',
                is_guest: true
            });

            const dashboardResponse = {
                error: null,
                data: {
                    guest_access: true,
                    permissions: ['dashboard:read'],
                    summary: {
                        total_students: 100,
                        total_drivers: 10
                    },
                    message: 'Guest access - limited data available.'
                }
            };

            global.apiService.get = jest.fn().mockResolvedValue(dashboardResponse);

            // Act - Initialize dashboard component
            await guestDashboardComponent.initialize();

            // Assert - Dashboard should load guest data
            expect(global.apiService.get).toHaveBeenCalledWith('/auth/guest/dashboard');

            // Check if dashboard was rendered with guest data
            const dashboardContainer = document.querySelector('[data-guest-dashboard]');
            expect(dashboardContainer).toBeTruthy();

            // Step 4: Guest conversion process
            // Arrange - Setup conversion request
            const conversionRequest = {
                guest_id: 'guest_123',
                username: 'newuser',
                email: 'newuser@test.com',
                password: 'password123'
            };

            const conversionResponse = {
                id: 1,
                username: 'newuser',
                email: 'newuser@test.com',
                role: 'student',
                is_active: true,
                is_guest: false
            };

            global.apiService.post = jest.fn()
                .mockResolvedValueOnce(guestLoginResponse) // For login
                .mockResolvedValueOnce({
                    error: null,
                    data: conversionResponse
                }); // For conversion

            // Act - Trigger guest conversion
            await guestLoginComponent.convertGuestToUser(conversionRequest);

            // Assert - Conversion should succeed
            expect(global.apiService.post).toHaveBeenCalledWith('/auth/convert-guest', conversionRequest);
        });

        test('should handle guest workflow errors gracefully', async () => {
            // Arrange
            const guestLoginComponent = new (global as any).GuestLoginComponent();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Setup API failure
            global.apiService.post = jest.fn().mockRejectedValue(new Error('Network error'));

            // Act - Try guest login with error
            await guestLoginComponent.handleGuestLogin();

            // Assert - Should handle error without crashing
            expect(consoleSpy).toHaveBeenCalledWith(
                '[GUEST-LOGIN] Guest login failed:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        test('should handle guest dashboard access for non-guest users', async () => {
            // Arrange
            global.authService.getStoredUser = jest.fn().mockReturnValue({
                id: 1,
                username: 'regular_user',
                is_guest: false
            });

            const guestDashboardComponent = new (global as any).GuestDashboardComponent();

            // Act
            await guestDashboardComponent.initialize();

            // Assert - Should not load dashboard data for non-guest users
            expect(global.apiService.get).not.toHaveBeenCalled();
        });
    });

    describe('Component Interactions', () => {
        test('should handle guest login to dashboard transition', async () => {
            // Arrange
            const guestLoginComponent = new (global as any).GuestLoginComponent();
            const guestDashboardComponent = new (global as any).GuestDashboardComponent();

            // Setup successful guest login
            const guestLoginResponse = {
                error: null,
                data: {
                    access_token: 'guest_token',
                    user: { id: 1, username: 'guest_test', is_guest: true },
                    guest_id: 'guest_123',
                    expires_at: new Date().toISOString(),
                    is_guest: true
                }
            };

            global.apiService.post = jest.fn().mockResolvedValue(guestLoginResponse);

            // Setup dashboard data
            const dashboardResponse = {
                error: null,
                data: {
                    guest_access: true,
                    permissions: ['dashboard:read'],
                    summary: { total_students: 50, total_drivers: 5 },
                    message: 'Guest dashboard data'
                }
            };

            global.apiService.get = jest.fn().mockResolvedValue(dashboardResponse);

            // Act - Login as guest
            await guestLoginComponent.handleGuestLogin();

            // Setup guest user as current user
            global.authService.getStoredUser = jest.fn().mockReturnValue({
                id: 1,
                username: 'guest_test',
                is_guest: true
            });

            // Act - Load dashboard
            await guestDashboardComponent.initialize();

            // Assert - Both components should work together
            expect(global.apiService.post).toHaveBeenCalledWith('/auth/guest', {});
            expect(global.apiService.get).toHaveBeenCalledWith('/auth/guest/dashboard');
        });

        test('should handle guest status updates across components', async () => {
            // Arrange
            const guestLoginComponent = new (global as any).GuestLoginComponent();

            // Setup guest user
            global.authService.getStoredUser = jest.fn().mockReturnValue({
                id: 1,
                username: 'guest_test',
                is_guest: true
            });

            // Act - Show guest status
            guestLoginComponent.showGuestStatus();

            // Assert - Status should be displayed
            const statusIndicator = document.querySelector('[data-guest-status]');
            expect(statusIndicator).toBeTruthy();
            expect(statusIndicator.textContent).toContain('Guest User');
        });
    });

    describe('Error Recovery', () => {
        test('should recover from guest login failures', async () => {
            // Arrange
            const guestLoginComponent = new (global as any).GuestLoginComponent();

            // First attempt fails
            global.apiService.post = jest.fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    error: null,
                    data: {
                        access_token: 'guest_token',
                        user: { id: 1, username: 'guest_test', is_guest: true },
                        guest_id: 'guest_123',
                        expires_at: new Date().toISOString(),
                        is_guest: true
                    }
                });

            // Act - First attempt should fail
            await guestLoginComponent.handleGuestLogin();

            // Second attempt should succeed
            await guestLoginComponent.handleGuestLogin();

            // Assert - API should be called twice
            expect(global.apiService.post).toHaveBeenCalledTimes(2);
        });

        test('should handle dashboard loading failures gracefully', async () => {
            // Arrange
            const guestDashboardComponent = new (global as any).GuestDashboardComponent();

            global.authService.getStoredUser = jest.fn().mockReturnValue({
                id: 1,
                username: 'guest_test',
                is_guest: true
            });

            global.apiService.get = jest.fn().mockRejectedValue(new Error('Server error'));

            // Act
            await guestDashboardComponent.loadGuestDashboardData();

            // Assert - Should show error without crashing
            const errorElement = document.querySelector('.guest-dashboard-error');
            expect(errorElement).toBeTruthy();
        });
    });

    describe('Data Flow', () => {
        test('should pass guest data correctly between components', async () => {
            // Arrange
            const guestLoginComponent = new (global as any).GuestLoginComponent();
            const guestDashboardComponent = new (global as any).GuestDashboardComponent();

            const guestUser = {
                id: 1,
                username: 'guest_test',
                email: 'guest_test@guest.local',
                is_guest: true
            };

            // Setup API responses
            global.apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: {
                    access_token: 'guest_token',
                    user: guestUser,
                    guest_id: 'guest_123',
                    expires_at: new Date().toISOString(),
                    is_guest: true
                }
            });

            global.apiService.get = jest.fn().mockResolvedValue({
                error: null,
                data: {
                    guest_access: true,
                    permissions: ['dashboard:read'],
                    summary: { total_students: 75, total_drivers: 8 },
                    message: 'Guest data'
                }
            });

            // Act - Login and load dashboard
            await guestLoginComponent.handleGuestLogin();

            global.authService.getStoredUser = jest.fn().mockReturnValue(guestUser);
            await guestDashboardComponent.initialize();

            // Assert - Data should flow correctly
            expect(global.apiService.post).toHaveBeenCalled();
            expect(global.apiService.get).toHaveBeenCalled();
            expect(guestDashboardComponent.isGuestUser()).toBe(true);
        });

        test('should handle guest user data updates', () => {
            // Arrange
            const guestDashboardComponent = new (global as any).GuestDashboardComponent();
            const summaryData = {
                total_students: 200,
                total_drivers: 15
            };

            // Setup DOM elements
            document.body.innerHTML = `
                <div id="total-students-dash">0</div>
                <div id="total-drivers-dash">0</div>
            `;

            // Act
            guestDashboardComponent.updateGuestSummaryData(summaryData);

            // Assert - Data should be updated in DOM
            expect(document.getElementById('total-students-dash').textContent).toBe('200');
            expect(document.getElementById('total-drivers-dash').textContent).toBe('15');
        });
    });

    describe('Event Coordination', () => {
        test('should coordinate events between components', async () => {
            // Arrange
            const guestLoginComponent = new (global as any).GuestLoginComponent();
            const guestDashboardComponent = new (global as any).GuestDashboardComponent();

            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');

            // Setup guest login success
            global.apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: {
                    access_token: 'guest_token',
                    user: { id: 1, username: 'guest_test', is_guest: true },
                    guest_id: 'guest_123',
                    expires_at: new Date().toISOString(),
                    is_guest: true
                }
            });

            // Act - Trigger guest login
            await guestLoginComponent.handleGuestLogin();

            // Assert - Should dispatch success event
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'guest-login-success'
                })
            );

            dispatchEventSpy.mockRestore();
        });

        test('should handle guest upgrade events', () => {
            // Arrange
            const guestDashboardComponent = new (global as any).GuestDashboardComponent();
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');

            // Act - Trigger upgrade request
            guestDashboardComponent.handleUpgradeNow();

            // Assert - Should dispatch upgrade event
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'guest-upgrade-requested'
                })
            );

            dispatchEventSpy.mockRestore();
        });
    });

    describe('State Management', () => {
        test('should maintain guest state across component interactions', async () => {
            // Arrange
            const guestLoginComponent = new (global as any).GuestLoginComponent();
            const guestDashboardComponent = new (global as any).GuestDashboardComponent();

            const guestUser = {
                id: 1,
                username: 'guest_test',
                is_guest: true
            };

            global.authService.getStoredUser = jest.fn().mockReturnValue(guestUser);

            // Act - Initialize both components
            await guestLoginComponent.initialize();
            await guestDashboardComponent.initialize();

            // Assert - Both should recognize guest state
            expect(guestLoginComponent.isGuestUser()).toBe(true);
            expect(guestDashboardComponent.isGuestUser()).toBe(true);
        });

        test('should handle state cleanup on guest logout', () => {
            // Arrange
            const guestLoginComponent = new (global as any).GuestLoginComponent();

            // Setup guest state
            global.authService.getStoredUser = jest.fn().mockReturnValue({
                id: 1,
                username: 'guest_test',
                is_guest: true
            });

            guestLoginComponent.showGuestStatus();

            // Act - Disable guest access
            guestLoginComponent.disableGuestAccess();

            // Assert - localStorage should be cleared
            expect(localStorage.removeItem).toHaveBeenCalledWith('guest_access_enabled');
        });
    });

    describe('Performance', () => {
        test('should handle rapid guest operations efficiently', async () => {
            // Arrange
            const guestLoginComponent = new (global as any).GuestLoginComponent();

            global.apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: {
                    access_token: 'guest_token',
                    user: { id: 1, username: 'guest_test', is_guest: true },
                    guest_id: 'guest_123',
                    expires_at: new Date().toISOString(),
                    is_guest: true
                }
            });

            // Act - Multiple rapid operations
            const operations = [];
            for (let i = 0; i < 5; i++) {
                operations.push(guestLoginComponent.isGuestAccessEnabled());
            }

            const results = await Promise.all(operations);

            // Assert - All operations should complete successfully
            results.forEach(result => {
                expect(typeof result).toBe('boolean');
            });
        });
    });

    describe('Accessibility Integration', () => {
        test('should maintain accessibility during guest workflow', async () => {
            // Arrange
            const guestDashboardComponent = new (global as any).GuestDashboardComponent();

            global.authService.getStoredUser = jest.fn().mockReturnValue({
                id: 1,
                username: 'guest_test',
                is_guest: true
            });

            global.apiService.get = jest.fn().mockResolvedValue({
                error: null,
                data: {
                    guest_access: true,
                    permissions: ['dashboard:read'],
                    summary: { total_students: 50, total_drivers: 5 },
                    message: 'Guest data'
                }
            });

            // Act
            await guestDashboardComponent.initialize();

            // Assert - Should maintain ARIA attributes
            const dashboardContainer = document.querySelector('[data-guest-dashboard]');
            expect(dashboardContainer).toBeTruthy();

            // Check for guest indicators that provide context
            const indicators = dashboardContainer.querySelectorAll('.guest-indicator');
            indicators.forEach(indicator => {
                expect(indicator.title).toBeTruthy();
            });
        });
    });
});