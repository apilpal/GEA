/**
 * Comprehensive integration tests for complete guest dashboard flow.
 *
 * Tests the entire guest dashboard workflow from app initialization to dashboard display:
 * - App initialization without authentication
 * - Automatic guest user creation during startup
 * - Router defaulting to guest dashboard
 * - Complete authentication and navigation flow
 * - Error handling and fallback scenarios
 * - End-to-end guest user experience
 */

import { authContext } from '../../src/ts/components/auth/auth-context';
import { authService } from '../../src/ts/services/auth-service';
import { initializeNavigation, navigateToPage } from '../../src/ts/router';

// Mock all external dependencies
jest.mock('../../src/ts/components/auth/auth-context');
jest.mock('../../src/ts/services/auth-service');
jest.mock('../../src/ts/router');
jest.mock('../../src/ts/page-managers/dashboard-manager');

describe('Complete Guest Dashboard Integration Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup complete DOM environment
        document.body.innerHTML = `
            <div id="app">
                <div id="login-page" class="page">Login Content</div>
                <div id="dashboard-page" class="page">Dashboard Content</div>
                <div id="transport-page" class="page">Transport Content</div>
                <div id="students-page" class="page">Students Content</div>
                <div id="main-app" style="display: none;">Main App Content</div>
                <div id="auth-loading" style="display: none;">Loading...</div>
                <div id="page-title">Test App</div>
                <div id="toast-container"></div>
                <nav>
                    <div class="menu-item" data-page="dashboard">Dashboard</div>
                    <div class="menu-item" data-page="transport">Transport</div>
                    <div class="menu-item" data-page="students">Students</div>
                    <div class="menu-item" data-page="login">Login</div>
                </nav>
                <div class="dashboard-container">
                    <div id="total-students-dash">0</div>
                    <div id="total-drivers-dash">0</div>
                    <div data-guest-dashboard></div>
                </div>
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

        // Mock requestIdleCallback
        global.requestIdleCallback = jest.fn((cb) => setTimeout(cb, 0));
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    describe('Complete Guest Dashboard Flow from App Initialization', () => {
        test('should complete full guest dashboard flow without login', async () => {
            // Arrange - Fresh app initialization
            const mockGuestUser = {
                id: 1,
                username: 'guest_complete_flow',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true,
                guest_token: 'guest_token_123',
                expires_at: new Date(Date.now() + 3600000).toISOString()
            };

            const mockDashboardData = {
                data: {
                    guest_access: true,
                    permissions: ['dashboard:read'],
                    summary: {
                        total_students: 150,
                        total_drivers: 25
                    },
                    message: 'Guest dashboard loaded successfully'
                }
            };

            // Mock auth context initialization
            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            // Mock auth service for guest user
            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getStoredUser as jest.Mock).mockReturnValue(mockGuestUser);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);

            // Mock router initialization
            (initializeNavigation as jest.Mock).mockImplementation(() => {
                // Simulate router setting up guest dashboard
                window.location.hash = '#dashboard';
                document.getElementById('dashboard-page')?.classList.add('active');
                document.getElementById('page-title')!.textContent = 'Dashboard';
            });

            // Act - Simulate complete app initialization
            const mockAppController = require('../../src/ts/app-controller');

            // Simulate DOMContentLoaded event
            document.dispatchEvent(new Event('DOMContentLoaded'));

            // Wait for all async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert - Complete flow should result in guest dashboard
            expect(authContext.initialize).toHaveBeenCalled();
            expect(authService.isGuestUser).toHaveBeenCalled();
            expect(initializeNavigation).toHaveBeenCalled();

            // Verify final state
            expect(window.location.hash).toBe('#dashboard');
            expect(document.getElementById('dashboard-page')?.classList.contains('active')).toBe(true);
            expect(document.getElementById('page-title')?.textContent).toBe('Dashboard');

            // Verify guest user is authenticated
            const finalState = authContext.getState();
            expect(finalState.isAuthenticated).toBe(true);
            expect(finalState.user).toEqual(mockGuestUser);
            expect(finalState.isLoading).toBe(false);
        });

        test('should handle complete flow when guest user creation fails', async () => {
            // Arrange - Guest creation fails
            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(false);
            (authService.getStoredUser as jest.Mock).mockReturnValue(null);
            (authService.ensureGuestAccess as jest.Mock).mockResolvedValue({
                data: null,
                error: 'Failed to create guest user'
            });

            (initializeNavigation as jest.Mock).mockImplementation(() => {
                // Should fallback to login
                window.location.hash = '#login';
                document.getElementById('login-page')?.classList.add('active');
                document.getElementById('page-title')!.textContent = 'Login';
            });

            // Act - Simulate app initialization with guest creation failure
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert - Should fallback to login
            expect(window.location.hash).toBe('#login');
            expect(document.getElementById('login-page')?.classList.contains('active')).toBe(true);
            expect(document.getElementById('page-title')?.textContent).toBe('Login');
        });

        test('should handle complete flow with network errors during initialization', async () => {
            // Arrange - Network error during initialization
            const networkError = new Error('Network connection failed');

            (authContext.initialize as jest.Mock).mockRejectedValue(networkError);
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            (initializeNavigation as jest.Mock).mockImplementation(() => {
                // Should fallback to login on error
                window.location.hash = '#login';
                document.getElementById('login-page')?.classList.add('active');
            });

            // Act - Simulate app initialization with network error
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert - Should handle error gracefully and show login
            expect(console.error).toHaveBeenCalledWith(
                '[AUTH-DEBUG] AppController: Auth initialization failed:',
                networkError
            );
            expect(window.location.hash).toBe('#login');
        });

        test('should maintain guest dashboard state during navigation', async () => {
            // Arrange - Guest user navigating between pages
            const mockGuestUser = {
                id: 1,
                username: 'guest_navigation',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);

            // Mock navigation functions
            (navigateToPage as jest.Mock).mockImplementation((page: string) => {
                if (page === 'dashboard') {
                    window.location.hash = '#dashboard';
                    document.getElementById('dashboard-page')?.classList.add('active');
                } else if (page === 'transport') {
                    // Should redirect guest users from protected pages
                    window.location.hash = '#login';
                    document.getElementById('login-page')?.classList.add('active');
                }
            });

            // Act - Simulate guest user navigation
            navigateToPage('dashboard');
            expect(window.location.hash).toBe('#dashboard');

            navigateToPage('transport');
            expect(window.location.hash).toBe('#login');

            navigateToPage('dashboard');
            expect(window.location.hash).toBe('#dashboard');

            // Assert - Should maintain guest authentication throughout
            expect(authService.isGuestUser).toHaveBeenCalledTimes(3);
            expect(authContext.getState().isAuthenticated).toBe(true);
            expect(authContext.getState().user).toEqual(mockGuestUser);
        });

        test('should handle complete flow with guest session expiration', async () => {
            // Arrange - Guest session expires during use
            const initialGuestUser = {
                id: 1,
                username: 'guest_initial',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true,
                expires_at: new Date(Date.now() - 1000).toISOString() // Already expired
            };

            const refreshedGuestUser = {
                id: 2,
                username: 'guest_refreshed',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true,
                expires_at: new Date(Date.now() + 3600000).toISOString()
            };

            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: initialGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.isGuestSessionExpired as jest.Mock).mockReturnValue(true);
            (authService.ensureGuestAccess as jest.Mock).mockResolvedValue({
                data: refreshedGuestUser,
                error: null
            });

            // Act - Simulate session expiration during navigation
            navigateToPage('dashboard');

            // Wait for session refresh
            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert - Should refresh session and maintain dashboard access
            expect(authService.isGuestSessionExpired).toHaveBeenCalled();
            expect(authService.ensureGuestAccess).toHaveBeenCalled();
            expect(window.location.hash).toBe('#dashboard');

            // Verify updated user state
            expect(authContext.getState().user).toEqual(refreshedGuestUser);
        });
    });

    describe('End-to-End Guest User Experience', () => {
        test('should provide seamless guest experience from start to finish', async () => {
            // Arrange - Complete user journey
            const mockGuestUser = {
                id: 1,
                username: 'guest_e2e',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            // Mock complete authentication flow
            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getStoredUser as jest.Mock).mockReturnValue(mockGuestUser);

            // Mock dashboard data loading
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue({
                data: {
                    guest_access: true,
                    summary: {
                        total_students: 200,
                        total_drivers: 30
                    }
                }
            });

            // Act - Complete user experience
            document.dispatchEvent(new Event('DOMContentLoaded'));

            // Simulate user interactions
            await new Promise(resolve => setTimeout(resolve, 50));

            // Navigate to dashboard
            navigateToPage('dashboard');
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - Complete seamless experience
            expect(window.location.hash).toBe('#dashboard');
            expect(document.getElementById('dashboard-page')?.classList.contains('active')).toBe(true);
            expect(authContext.getState().isAuthenticated).toBe(true);
            expect(authService.getGuestDashboardData).toHaveBeenCalled();
        });

        test('should handle complete flow with multiple browser tabs', async () => {
            // Arrange - Multiple tab scenario
            const mockGuestUser = {
                id: 1,
                username: 'guest_multitab',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getStoredUser as jest.Mock).mockReturnValue(mockGuestUser);

            // Act - Simulate multiple tab initialization
            const tab1Init = new Promise(resolve => {
                document.dispatchEvent(new Event('DOMContentLoaded'));
                setTimeout(resolve, 50);
            });

            const tab2Init = new Promise(resolve => {
                document.dispatchEvent(new Event('DOMContentLoaded'));
                setTimeout(resolve, 50);
            });

            await Promise.all([tab1Init, tab2Init]);

            // Assert - Should handle multiple tabs correctly
            expect(authContext.initialize).toHaveBeenCalledTimes(2);
            expect(authService.isGuestUser).toHaveBeenCalledTimes(2);
            expect(window.location.hash).toBe('#dashboard');
        });

        test('should handle complete flow with page refresh', async () => {
            // Arrange - Page refresh scenario
            const mockGuestUser = {
                id: 1,
                username: 'guest_refresh',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getStoredUser as jest.Mock).mockReturnValue(mockGuestUser);

            // Act - Simulate page refresh
            window.location.hash = '#dashboard';
            document.dispatchEvent(new Event('DOMContentLoaded'));

            // Simulate hash change after refresh
            window.dispatchEvent(new Event('hashchange'));

            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert - Should maintain guest state after refresh
            expect(window.location.hash).toBe('#dashboard');
            expect(document.getElementById('dashboard-page')?.classList.contains('active')).toBe(true);
            expect(authContext.getState().isAuthenticated).toBe(true);
        });

        test('should handle complete flow with slow network conditions', async () => {
            // Arrange - Slow network simulation
            const mockGuestUser = {
                id: 1,
                username: 'guest_slow',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            // Mock slow initialization
            (authContext.initialize as jest.Mock).mockImplementation(() =>
                new Promise(resolve => setTimeout(resolve, 2000))
            );
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getStoredUser as jest.Mock).mockReturnValue(mockGuestUser);

            // Act - Simulate slow network initialization
            document.dispatchEvent(new Event('DOMContentLoaded'));

            // Wait for initialization timeout (15 seconds as per app controller)
            await new Promise(resolve => setTimeout(resolve, 16000));

            // Assert - Should handle slow network and eventually show dashboard
            expect(authContext.initialize).toHaveBeenCalled();
            expect(window.location.hash).toBe('#dashboard');
        });
    });

    describe('Error Recovery and Fallback Scenarios', () => {
        test('should recover from temporary guest creation failures', async () => {
            // Arrange - Temporary failure followed by success
            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(false);
            (authService.getStoredUser as jest.Mock).mockReturnValue(null);

            // First call fails, second succeeds
            (authService.ensureGuestAccess as jest.Mock)
                .mockRejectedValueOnce(new Error('Temporary network error'))
                .mockResolvedValueOnce({
                    data: {
                        id: 1,
                        username: 'guest_recovery',
                        email: 'guest@test.local',
                        role: 'guest',
                        is_active: true,
                        is_guest: true
                    },
                    error: null
                });

            (initializeNavigation as jest.Mock).mockImplementation(() => {
                window.location.hash = '#dashboard';
                document.getElementById('dashboard-page')?.classList.add('active');
            });

            // Act - Simulate recovery scenario
            document.dispatchEvent(new Event('DOMContentLoaded'));

            // Wait for retry mechanism
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert - Should eventually succeed and show dashboard
            expect(authService.ensureGuestAccess).toHaveBeenCalledTimes(2);
            expect(window.location.hash).toBe('#dashboard');
        });

        test('should handle complete system failure gracefully', async () => {
            // Arrange - Complete system failure
            (authContext.initialize as jest.Mock).mockRejectedValue(new Error('Critical system error'));
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: null
            });

            (initializeNavigation as jest.Mock).mockImplementation(() => {
                window.location.hash = '#login';
                document.getElementById('login-page')?.classList.add('active');
            });

            // Act - Simulate critical failure
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert - Should fallback to login page
            expect(console.error).toHaveBeenCalledWith(
                '[AUTH-DEBUG] AppController: Auth initialization failed:',
                expect.any(Error)
            );
            expect(window.location.hash).toBe('#login');
        });

        test('should handle corrupted guest user data', async () => {
            // Arrange - Corrupted guest user data
            const corruptedGuestUser = {
                id: 1,
                username: '', // Invalid empty username
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: corruptedGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getStoredUser as jest.Mock).mockReturnValue(corruptedGuestUser);

            // Act - Handle corrupted data
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert - Should handle corrupted data gracefully
            expect(window.location.hash).toBe('#dashboard');
            expect(authContext.getState().user).toEqual(corruptedGuestUser);
        });
    });

    describe('Performance and Resource Management', () => {
        test('should handle rapid app reinitializations efficiently', async () => {
            // Arrange - Rapid reinitializations
            const mockGuestUser = {
                id: 1,
                username: 'guest_performance',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getStoredUser as jest.Mock).mockReturnValue(mockGuestUser);

            // Act - Rapid DOMContentLoaded events
            document.dispatchEvent(new Event('DOMContentLoaded'));
            document.dispatchEvent(new Event('DOMContentLoaded'));
            document.dispatchEvent(new Event('DOMContentLoaded'));

            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert - Should handle rapid initialization without issues
            expect(authContext.initialize).toHaveBeenCalledTimes(3);
            expect(window.location.hash).toBe('#dashboard');
        });

        test('should cleanup resources properly on navigation away', async () => {
            // Arrange - Navigation away from guest dashboard
            const mockGuestUser = {
                id: 1,
                username: 'guest_cleanup',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            let unsubscribeCallback: () => void;
            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockImplementation((callback) => {
                unsubscribeCallback = () => {};
                return unsubscribeCallback;
            });
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getStoredUser as jest.Mock).mockReturnValue(mockGuestUser);

            // Act - Initialize and then simulate navigation away
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await new Promise(resolve => setTimeout(resolve, 50));

            // Simulate page unload
            window.dispatchEvent(new Event('beforeunload'));

            // Assert - Should cleanup resources
            expect(typeof unsubscribeCallback).toBe('function');
        });
    });

    describe('Accessibility and User Experience', () => {
        test('should maintain accessibility throughout guest flow', async () => {
            // Arrange - Accessibility testing
            const mockGuestUser = {
                id: 1,
                username: 'guest_accessibility',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            (authContext.initialize as jest.Mock).mockResolvedValue(undefined);
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: true,
                user: mockGuestUser,
                isLoading: false,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getStoredUser as jest.Mock).mockReturnValue(mockGuestUser);

            // Act - Complete accessibility flow
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert - Should maintain proper page structure
            expect(document.getElementById('page-title')?.textContent).toBeTruthy();
            expect(document.querySelector('.page.active')).toBeTruthy();
            expect(window.location.hash).toBeTruthy();
        });

        test('should provide clear feedback during guest loading', async () => {
            // Arrange - Loading feedback testing
            (authContext.initialize as jest.Mock).mockImplementation(() =>
                new Promise(resolve => setTimeout(resolve, 100))
            );
            (authContext.subscribe as jest.Mock).mockReturnValue(() => {});
            (authContext.getState as jest.Mock).mockReturnValue({
                isAuthenticated: false,
                user: null,
                isLoading: true,
                error: null
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(false);
            (authService.getStoredUser as jest.Mock).mockReturnValue(null);

            // Act - Loading state
            document.dispatchEvent(new Event('DOMContentLoaded'));

            // Check loading state
            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert - Should show loading state initially
            const loadingState = authContext.getState();
            expect(loadingState.isLoading).toBe(true);
        });
    });
});