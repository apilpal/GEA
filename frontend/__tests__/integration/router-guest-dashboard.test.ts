/**
 * Integration tests for router guest dashboard functionality.
 *
 * Tests the updated router configuration that allows guest access to dashboard
 * and ensures proper guest-first navigation flow.
 */

import { navigateToPage, initializeNavigation } from '../../src/ts/router';
import { authContext } from '../../src/ts/components/auth/auth-context';
import { authService } from '../../src/ts/services/auth-service';

describe('Router Guest Dashboard Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup DOM environment
        document.body.innerHTML = `
            <nav>
                <div class="menu-item" data-page="dashboard">Dashboard</div>
                <div class="menu-item" data-page="transport">Transport</div>
                <div class="menu-item" data-page="students">Students</div>
                <div class="menu-item" data-page="login">Login</div>
            </nav>
            <div id="dashboard-page" class="page">Dashboard Content</div>
            <div id="transport-page" class="page">Transport Content</div>
            <div id="students-page" class="page">Students Content</div>
            <div id="login-page" class="page">Login Content</div>
            <div id="page-title"></div>
            <div id="toast-container"></div>
        `;

        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: { hash: '', href: '' },
            writable: true
        });

        // Mock requestIdleCallback
        global.requestIdleCallback = jest.fn((cb) => setTimeout(cb, 0));
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    describe('Guest Dashboard Access', () => {
        test('should allow guest users to access dashboard without authentication', async () => {
            // Arrange - Setup guest user state
            const guestUser = {
                id: 1,
                username: 'guest_test',
                email: 'guest@test.local',
                role: 'student',
                is_active: true,
                is_guest: true
            };

            // Mock auth state
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: guestUser,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(true);

            // Mock ensureGuestAccess to resolve with guest user data
            jest.spyOn(authService, 'ensureGuestAccess').mockResolvedValue({ data: guestUser });

            // Act - Navigate to dashboard
            navigateToPage('dashboard');

            // Assert - Should navigate to dashboard without redirecting to login
            expect(window.location.hash).toBe('#dashboard');
            expect(document.getElementById('dashboard-page').classList.contains('active')).toBe(true);
        });

        test('should redirect unauthenticated non-guest users to login for protected pages', () => {
            // Arrange - Setup unauthenticated state
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);

            // Act - Try to navigate to protected page
            navigateToPage('transport');

            // Assert - Should redirect to login
            expect(window.location.hash).toBe('#login');
            expect(document.getElementById('login-page').classList.contains('active')).toBe(true);
        });

        test('should allow guest users to access dashboard on initial load', async () => {
            // Arrange - Setup guest access mocks
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);
            jest.spyOn(authService, 'ensureGuestAccess').mockResolvedValue({ data: null });

            // Mock dashboard manager
            const mockInitializeGuestDashboard = jest.fn();
            jest.doMock('../../src/ts/page-managers/dashboard-manager', () => ({
                initializeGuestDashboard: mockInitializeGuestDashboard
            }));

            // Act - Initialize navigation (simulates initial load)
            initializeNavigation();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should ensure guest access and navigate to dashboard
            expect(authService.ensureGuestAccess).toHaveBeenCalled();
            expect(window.location.hash).toBe('#dashboard');
        });

        test('should handle guest access creation failure gracefully', async () => {
            // Arrange - Setup mocks for failure scenario
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);
            jest.spyOn(authService, 'ensureGuestAccess').mockRejectedValue(new Error('Guest creation failed'));

            // Act - Initialize navigation
            initializeNavigation();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should fallback to login page
            expect(window.location.hash).toBe('#login');
        });

        test('should maintain guest access configuration in navigation', () => {
            // Arrange
            const navigationConfig = require('../../src/ts/router').navigationConfig;

            // Assert - Dashboard should have guest access enabled
            expect(navigationConfig.dashboard.requiresAuth).toBe(false);
            expect(navigationConfig.dashboard.allowWhenGuest).toBe(true);

            // Assert - Protected pages should still require auth
            expect(navigationConfig.transport.requiresAuth).toBe(true);
            expect(navigationConfig.students.requiresAuth).toBe(true);
            expect(navigationConfig.reports.requiresAuth).toBe(true);
        });
    });

    describe('Authentication Check Updates', () => {
        test('should consider guest users as authenticated for dashboard access', () => {
            // Arrange
            const { checkAuthentication } = require('../../src/ts/router');

            // Mock guest user state
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: { id: 1, username: 'guest', email: 'guest@test.com', role: 'guest', is_active: true, is_guest: true } as any,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(true);

            // Act
            const isAuthenticated = checkAuthentication();

            // Assert - Guest users should be considered authenticated
            expect(isAuthenticated).toBe(true);
        });

        test('should properly identify regular authenticated users', () => {
            // Arrange
            const { checkAuthentication } = require('../../src/ts/router');

            // Mock regular authenticated user
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: true,
                user: { id: 1, username: 'regular', email: 'user@test.com', role: 'user', is_active: true, is_guest: false } as any,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);

            // Act
            const isAuthenticated = checkAuthentication();

            // Assert
            expect(isAuthenticated).toBe(true);
        });

        test('should identify unauthenticated users correctly', () => {
            // Arrange
            const { checkAuthentication } = require('../../src/ts/router');

            // Mock unauthenticated state
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);

            // Act
            const isAuthenticated = checkAuthentication();

            // Assert
            expect(isAuthenticated).toBe(false);
        });
    });

    describe('Dashboard Data Loading', () => {
        test('should load dashboard data for guest users', async () => {
            // Arrange
            const mockUpdateDashboardStats = jest.fn().mockResolvedValue(undefined);
            jest.doMock('../../src/ts/page-managers/dashboard-manager', () => ({
                updateDashboardStats: mockUpdateDashboardStats
            }));

            // Setup guest user
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: { id: 1, username: 'guest', email: 'guest@test.com', role: 'guest', is_active: true, is_guest: true } as any,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(true);

            // Act - Navigate to dashboard
            navigateToPage('dashboard');

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should load dashboard data
            expect(mockUpdateDashboardStats).toHaveBeenCalled();
        });

        test('should handle dashboard data loading errors gracefully', async () => {
            // Arrange
            const mockUpdateDashboardStats = jest.fn().mockRejectedValue(new Error('Data loading failed'));
            jest.doMock('../../src/ts/page-managers/dashboard-manager', () => ({
                updateDashboardStats: mockUpdateDashboardStats
            }));

            // Setup guest user
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: { id: 1, username: 'guest', email: 'guest@test.com', role: 'guest', is_active: true, is_guest: true } as any,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(true);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act - Navigate to dashboard
            navigateToPage('dashboard');

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should handle error gracefully
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load data for page dashboard'),
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Navigation Flow Integration', () => {
        test('should maintain proper navigation flow for guest users', async () => {
            // Arrange - Setup guest user
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: { id: 1, username: 'guest', email: 'guest@test.com', role: 'guest', is_active: true, is_guest: true } as any,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(true);

            // Act - Navigate through different pages
            navigateToPage('dashboard');
            expect(window.location.hash).toBe('#dashboard');

            navigateToPage('transport');
            expect(window.location.hash).toBe('#login'); // Should redirect to login for protected page

            navigateToPage('dashboard');
            expect(window.location.hash).toBe('#dashboard'); // Should allow back to dashboard
        });

        test('should prevent guest users from accessing protected pages', () => {
            // Arrange - Setup guest user
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: { id: 1, username: 'guest', email: 'guest@test.com', role: 'guest', is_active: true, is_guest: true } as any,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(true);

            // Act - Try to access protected page
            navigateToPage('students');

            // Assert - Should redirect to login
            expect(window.location.hash).toBe('#login');
        });

        test('should allow authenticated users full access', () => {
            // Arrange - Setup authenticated user
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: true,
                user: { id: 1, username: 'regular', email: 'user@test.com', role: 'user', is_active: true, is_guest: false } as any,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);

            // Act - Navigate to protected page
            navigateToPage('students');

            // Assert - Should allow access
            expect(window.location.hash).toBe('#students');
            expect(document.getElementById('students-page').classList.contains('active')).toBe(true);
        });
    });

    describe('Hash Change Handling', () => {
        test('should handle hash changes for guest dashboard access', () => {
            // Arrange - Setup guest user
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: { id: 1, username: 'guest', email: 'guest@test.com', role: 'guest', is_active: true, is_guest: true } as any,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(true);

            // Act - Simulate hash change to dashboard
            window.location.hash = '#dashboard';
            window.dispatchEvent(new Event('hashchange'));

            // Assert - Should navigate to dashboard
            expect(document.getElementById('dashboard-page').classList.contains('active')).toBe(true);
        });

        test('should handle initial load with guest dashboard default', async () => {
            // Arrange - No hash, setup guest access
            window.location.hash = '';
            jest.spyOn(authService, 'ensureGuestAccess').mockResolvedValue({ data: null });

            // Act - Simulate initial load
            const { handleInitialLoad } = require('../../src/ts/router');
            handleInitialLoad();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should default to dashboard with guest access
            expect(authService.ensureGuestAccess).toHaveBeenCalled();
        });
    });

    describe('Default Guest Dashboard Behavior Without Authentication', () => {
        test('should default to guest dashboard when no authentication exists', async () => {
            // Arrange - No existing authentication
            window.location.hash = '';
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);
            jest.spyOn(authService, 'ensureGuestAccess').mockResolvedValue({
                data: {
                    id: 1,
                    username: 'guest_auto_created',
                    email: 'guest@test.local',
                    role: 'guest',
                    is_active: true,
                    is_guest: true
                },
                error: null
            });

            // Act - Initialize navigation (simulates app startup)
            initializeNavigation();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should automatically create guest user and navigate to dashboard
            expect(authService.ensureGuestAccess).toHaveBeenCalled();
            expect(window.location.hash).toBe('#dashboard');
            expect(document.getElementById('dashboard-page').classList.contains('active')).toBe(true);
        });

        test('should not redirect to login when guest user is created automatically', async () => {
            // Arrange - Fresh app load with no hash
            window.location.hash = '';
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);
            jest.spyOn(authService, 'ensureGuestAccess').mockResolvedValue({
                data: {
                    id: 1,
                    username: 'guest_default',
                    email: 'guest@test.local',
                    role: 'guest',
                    is_active: true,
                    is_guest: true
                },
                error: null
            });

            // Act - Initialize navigation
            initializeNavigation();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should stay on dashboard, not redirect to login
            expect(window.location.hash).toBe('#dashboard');
            expect(window.location.hash).not.toBe('#login');
        });

        test('should handle guest user creation during initial load without authentication', async () => {
            // Arrange - Simulate fresh browser session
            window.location.hash = '';
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);
            jest.spyOn(authService, 'ensureGuestAccess').mockResolvedValue({
                data: {
                    id: 1,
                    username: 'guest_initial',
                    email: 'guest@test.local',
                    role: 'guest',
                    is_active: true,
                    is_guest: true
                },
                error: null
            });

            // Act - Handle initial load
            const { handleInitialLoad } = require('../../src/ts/router');
            handleInitialLoad();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should create guest user and navigate to dashboard
            expect(authService.ensureGuestAccess).toHaveBeenCalled();
            expect(window.location.hash).toBe('#dashboard');
        });

        test('should fallback to login only when guest user creation fails', async () => {
            // Arrange - Guest creation fails
            window.location.hash = '';
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);
            jest.spyOn(authService, 'ensureGuestAccess').mockResolvedValue({
                data: null,
                error: 'Failed to create guest user'
            });

            // Act - Initialize navigation
            initializeNavigation();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should fallback to login when guest creation fails
            expect(window.location.hash).toBe('#login');
        });

        test('should maintain guest dashboard as default even with hash navigation', async () => {
            // Arrange - User navigates with hash but no authentication
            window.location.hash = '#dashboard';
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);
            jest.spyOn(authService, 'ensureGuestAccess').mockResolvedValue({
                data: {
                    id: 1,
                    username: 'guest_hash',
                    email: 'guest@test.local',
                    role: 'guest',
                    is_active: true,
                    is_guest: true
                },
                error: null
            });

            // Act - Handle hash change
            window.dispatchEvent(new Event('hashchange'));

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should stay on dashboard and create guest user
            expect(window.location.hash).toBe('#dashboard');
            expect(authService.ensureGuestAccess).toHaveBeenCalled();
        });

        test('should handle rapid navigation changes during guest user creation', async () => {
            // Arrange - Rapid navigation during guest creation
            window.location.hash = '';
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            // Mock slow guest creation
            jest.spyOn(authService, 'isGuestUser').mockReturnValue(false);
            jest.spyOn(authService, 'ensureGuestAccess').mockImplementation(() =>
                new Promise(resolve =>
                    setTimeout(() => resolve({
                        data: {
                            id: 1,
                            username: 'guest_slow',
                            email: 'guest@test.local',
                            role: 'guest',
                            is_active: true,
                            is_guest: true
                        },
                        error: null
                    }), 100)
                )
            );

            // Act - Rapid navigation changes
            initializeNavigation();
            window.location.hash = '#dashboard';
            window.dispatchEvent(new Event('hashchange'));
            window.location.hash = '#transport';
            window.dispatchEvent(new Event('hashchange'));
            window.location.hash = '#dashboard';
            window.dispatchEvent(new Event('hashchange'));

            // Wait for all operations
            await new Promise(resolve => setTimeout(resolve, 150));

            // Assert - Should handle rapid changes and end up on dashboard
            expect(window.location.hash).toBe('#dashboard');
            expect(authService.ensureGuestAccess).toHaveBeenCalled();
        });

        test('should update page title correctly for guest dashboard', async () => {
            // Arrange - Guest user accessing dashboard
            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: {
                    id: 1,
                    username: 'guest_title',
                    email: 'guest@test.local',
                    role: 'guest',
                    is_active: true,
                    is_guest: true
                },
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(true);

            // Act - Navigate to dashboard
            navigateToPage('dashboard');

            // Assert - Should update page title
            const pageTitle = document.getElementById('page-title');
            expect(pageTitle?.textContent).toBe('Dashboard');
        });

        test('should handle guest user session timeout during navigation', async () => {
            // Arrange - Guest user with expired session
            const expiredGuestUser = {
                id: 1,
                username: 'guest_expired',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true,
                expires_at: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
            };

            jest.spyOn(authContext, 'getState').mockReturnValue({
                isAuthenticated: false,
                user: expiredGuestUser,
                isLoading: false,
                error: null
            });

            jest.spyOn(authService, 'isGuestUser').mockReturnValue(true);
            jest.spyOn(authService, 'isGuestSessionExpired').mockReturnValue(true);
            jest.spyOn(authService, 'ensureGuestAccess').mockResolvedValue({
                data: {
                    id: 2,
                    username: 'guest_refreshed',
                    email: 'guest@test.local',
                    role: 'guest',
                    is_active: true,
                    is_guest: true
                },
                error: null
            });

            // Act - Navigate to dashboard with expired session
            navigateToPage('dashboard');

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Should refresh guest session and stay on dashboard
            expect(authService.isGuestSessionExpired).toHaveBeenCalled();
            expect(authService.ensureGuestAccess).toHaveBeenCalled();
            expect(window.location.hash).toBe('#dashboard');
        });
    });
});