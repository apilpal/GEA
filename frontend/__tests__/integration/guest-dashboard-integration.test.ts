/**
 * Integration tests for guest dashboard functionality.
 *
 * Tests the complete guest dashboard workflow including:
 * - Guest user creation and authentication
 * - Dashboard data loading and display
 * - Guest-specific UI components and interactions
 * - Navigation and routing for guest users
 * - Error handling and edge cases
 * - Guest session management
 */

import { authService } from '../../src/ts/services/auth-service';
import { apiService } from '../../src/ts/services/api-service';
import { guestDashboardComponent } from '../../src/ts/components/auth/guest-dashboard-component';
import * as dashboardManager from '../../src/ts/page-managers/dashboard-manager';

// Mock all external dependencies
jest.mock('../../src/ts/services/auth-service');
jest.mock('../../src/ts/services/api-service');
jest.mock('../../src/ts/components/auth/guest-dashboard-component');
jest.mock('../../src/ts/page-managers/dashboard-manager');

describe('Guest Dashboard Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup DOM environment
        document.body.innerHTML = `
            <div id="app">
                <div id="dashboard-page" class="page">
                    <div class="dashboard-container">
                        <div id="total-students-dash">0</div>
                        <div id="total-drivers-dash">0</div>
                        <div data-guest-dashboard></div>
                    </div>
                </div>
                <div id="login-page" class="page" style="display: none;">Login Content</div>
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

    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    describe('Guest User Creation and Authentication Flow', () => {
        test('should create guest user and load dashboard successfully', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user_123',
                email: 'guest@test.local',
                is_guest: true,
                session_expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
            };

            const mockDashboardData = {
                data: {
                    guest_access: true,
                    permissions: ['dashboard:read'],
                    summary: {
                        total_students: 150,
                        total_drivers: 25
                    },
                    message: 'Guest access - limited data available.'
                }
            };

            (authService.createGuestUser as jest.Mock).mockResolvedValue(mockGuestUser);
            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
            (guestDashboardComponent.initialize as jest.Mock).mockResolvedValue(undefined);

            // Act - Simulate guest user creation flow
            await authService.createGuestUser();
            const isGuest = authService.isGuestUser();

            if (isGuest) {
                await authService.getGuestDashboardData();
                await guestDashboardComponent.initialize();
            }

            // Assert
            expect(authService.createGuestUser).toHaveBeenCalled();
            expect(authService.isGuestUser).toHaveBeenCalled();
            expect(authService.isGuestUser()).toBe(true);
            expect(authService.getGuestDashboardData).toHaveBeenCalled();
            expect(guestDashboardComponent.initialize).toHaveBeenCalled();

            // Verify dashboard data is loaded
            const studentsElement = document.getElementById('total-students-dash');
            const driversElement = document.getElementById('total-drivers-dash');
            expect(studentsElement?.textContent).toBe('150');
            expect(driversElement?.textContent).toBe('25');
        });

        test('should handle guest user creation failure gracefully', async () => {
            // Arrange
            const creationError = new Error('Guest creation failed');
            (authService.createGuestUser as jest.Mock).mockRejectedValue(creationError);

            // Act & Assert
            await expect(authService.createGuestUser()).rejects.toThrow('Guest creation failed');

            // Should not proceed with dashboard loading
            expect(authService.isGuestUser).not.toHaveBeenCalled();
        });

        test('should handle guest session expiration', async () => {
            // Arrange
            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.isGuestSessionExpired as jest.Mock).mockReturnValue(true);
            (authService.createGuestUser as jest.Mock).mockResolvedValue({
                id: 2,
                username: 'guest_user_456',
                is_guest: true
            });

            const mockDashboardData = {
                data: {
                    guest_access: true,
                    summary: { total_students: 100, total_drivers: 20 }
                }
            };
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);

            // Act - Initialize dashboard manager which should handle session refresh
            await dashboardManager.initializeGuestDashboard();

            // Assert
            expect(authService.isGuestSessionExpired).toHaveBeenCalled();
            expect(authService.createGuestUser).toHaveBeenCalled(); // Should refresh session
            expect(authService.getGuestDashboardData).toHaveBeenCalled(); // Should reload data
            expect(console.log).toHaveBeenCalledWith('[DASHBOARD] Guest session expired, creating new session');
        });
    });

    describe('Guest Dashboard Data Loading Integration', () => {
        test('should load and display guest dashboard data correctly', async () => {
            // Arrange
            const mockDashboardResponse = {
                error: null,
                data: {
                    guest_access: true,
                    permissions: ['dashboard:read'],
                    summary: {
                        total_students: 200,
                        total_drivers: 35
                    },
                    message: 'Welcome to the guest dashboard!'
                }
            };

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(mockDashboardResponse);
            (guestDashboardComponent.initialize as jest.Mock).mockResolvedValue(undefined);

            // Act
            await dashboardManager.initializeGuestDashboard();

            // Assert
            expect(authService.getGuestDashboardData).toHaveBeenCalled();
            expect(guestDashboardComponent.initialize).toHaveBeenCalled();

            // Verify DOM elements are updated
            const studentsElement = document.getElementById('total-students-dash');
            const driversElement = document.getElementById('total-drivers-dash');
            expect(studentsElement?.textContent).toBe('200');
            expect(driversElement?.textContent).toBe('35');
        });

        test('should handle API errors during data loading', async () => {
            // Arrange
            const apiError = new Error('API service unavailable');
            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockRejectedValue(apiError);

            // Act
            await dashboardManager.initializeGuestDashboard();

            // Assert
            expect(console.error).toHaveBeenCalledWith('Failed to update dashboard stats:', apiError);
        });

        test('should handle network timeouts gracefully', async () => {
            // Arrange
            const timeoutError = new Error('Request timeout');
            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockRejectedValue(timeoutError);

            // Act
            await dashboardManager.initializeGuestDashboard();

            // Assert
            expect(console.error).toHaveBeenCalledWith('Failed to update dashboard stats:', timeoutError);
        });
    });

    describe('Guest Dashboard UI Integration', () => {
        test('should display guest indicators on dashboard elements', async () => {
            // Arrange
            const mockDashboardData = {
                data: {
                    guest_access: true,
                    summary: {
                        total_students: 175,
                        total_drivers: 28
                    }
                }
            };

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);

            // Act
            await dashboardManager.updateDashboardStats();

            // Assert - Guest indicators should be added
            const studentsElement = document.getElementById('total-students-dash');
            const driversElement = document.getElementById('total-drivers-dash');

            const studentIndicator = studentsElement?.querySelector('.guest-indicator');
            const driverIndicator = driversElement?.querySelector('.guest-indicator');

            expect(studentIndicator).toBeTruthy();
            expect(driverIndicator).toBeTruthy();
            expect((studentIndicator as HTMLElement)?.title).toBe('Limited view - sign up for full access');
            expect((driverIndicator as HTMLElement)?.title).toBe('Limited view - sign up for full access');
            expect(studentIndicator?.textContent).toBe('👁️');
            expect(driverIndicator?.textContent).toBe('👁️');
        });

        test('should display guest banner with upgrade options', async () => {
            // Arrange
            const mockDashboardData = {
                data: {
                    guest_access: true,
                    summary: {
                        total_students: 150,
                        total_drivers: 25
                    }
                }
            };

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);

            // Act
            await dashboardManager.updateDashboardStats();

            // Assert - Guest banner should be displayed
            const guestBanner = document.querySelector('[data-guest-banner]');
            expect(guestBanner).toBeTruthy();
            expect(guestBanner?.textContent).toContain('Guest Access');
            expect(guestBanner?.textContent).toContain('Sign Up Free');
            expect(guestBanner?.textContent).toContain('Learn More');
        });

        test('should show guest features modal when learn more is clicked', async () => {
            // Arrange - Setup dashboard with guest banner
            document.body.innerHTML = `
                <div class="dashboard-container">
                    <div class="guest-dashboard-banner" data-guest-banner>
                        <button data-guest-learn-more>Learn More</button>
                    </div>
                </div>
            `;

            const mockDashboardData = {
                data: {
                    guest_access: true,
                    summary: { total_students: 100, total_drivers: 20 }
                }
            };

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);

            // Act - Trigger learn more click
            await dashboardManager.updateDashboardStats();

            const learnMoreButton = document.querySelector('[data-guest-learn-more]');
            (learnMoreButton as HTMLElement)?.click();

            // Assert - Modal should be displayed
            const modal = document.querySelector('[data-guest-features-modal]');
            expect(modal).toBeTruthy();
            expect(modal?.textContent).toContain('Guest vs Full Account');
            expect(modal?.textContent).toContain('Upgrade to Full Account');
            expect(console.log).toHaveBeenCalledWith('[DASHBOARD] Guest features modal displayed');
        });

        test('should handle guest signup button click', async () => {
            // Arrange - Setup dashboard with guest banner
            document.body.innerHTML = `
                <div class="dashboard-container">
                    <div class="guest-dashboard-banner" data-guest-banner>
                        <button data-guest-signup>Sign Up Free</button>
                    </div>
                </div>
            `;

            // Act - Trigger signup button click
            const signupButton = document.querySelector('[data-guest-signup]');
            (signupButton as HTMLElement)?.click();

            // Assert - Should redirect to register with guest parameter
            expect(window.location.href).toBe('/register?guest=true');
        });
    });

    describe('Guest Dashboard Navigation Integration', () => {
        test('should maintain guest access during navigation', async () => {
            // Arrange
            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue({
                data: {
                    guest_access: true,
                    summary: { total_students: 100, total_drivers: 20 }
                }
            });

            // Act - Initialize guest dashboard
            await dashboardManager.initializeGuestDashboard();

            // Simulate navigation to dashboard
            window.location.hash = '#dashboard';
            window.dispatchEvent(new Event('hashchange'));

            // Assert - Guest access should be maintained
            expect(authService.isGuestUser).toHaveBeenCalled();
            expect(window.location.hash).toBe('#dashboard');
        });

        test('should prevent access to protected pages for guest users', () => {
            // Arrange
            (authService.isGuestUser as jest.Mock).mockReturnValue(true);

            // Mock router navigation
            const mockNavigateToPage = jest.fn();
            jest.doMock('../../src/ts/router', () => ({
                navigateToPage: mockNavigateToPage
            }));

            // Act - Try to navigate to protected page
            const { navigateToPage } = require('../../src/ts/router');
            navigateToPage('students');

            // Assert - Should redirect to login instead
            expect(window.location.hash).toBe('#login');
        });
    });

    describe('Guest Session Management Integration', () => {
        test('should refresh expired guest sessions automatically', async () => {
            // Arrange
            jest.useFakeTimers();

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.isGuestSessionExpired as jest.Mock).mockReturnValue(true);
            (authService.createGuestUser as jest.Mock).mockResolvedValue({
                id: 3,
                username: 'guest_user_789',
                is_guest: true
            });

            const mockDashboardData = {
                data: {
                    guest_access: true,
                    summary: { total_students: 125, total_drivers: 22 }
                }
            };
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);

            // Act - Initialize dashboard (sets up periodic refresh)
            await dashboardManager.initializeGuestDashboard();

            // Fast-forward time by 1 minute (60000ms)
            jest.advanceTimersByTime(60000);

            // Assert - Should check for session refresh
            expect(authService.isGuestSessionExpired).toHaveBeenCalled();
            expect(authService.createGuestUser).toHaveBeenCalled();

            jest.useRealTimers();
        });

        test('should handle session refresh failures gracefully', async () => {
            // Arrange
            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.isGuestSessionExpired as jest.Mock).mockReturnValue(true);
            (authService.createGuestUser as jest.Mock).mockRejectedValue(new Error('Session refresh failed'));

            // Act
            await dashboardManager.initializeGuestDashboard();

            // Assert - Should handle error gracefully
            expect(console.error).toHaveBeenCalledWith(
                '[DASHBOARD] Failed to initialize GuestDashboardComponent:',
                expect.any(Error)
            );
        });
    });

    describe('Error Handling and Edge Cases Integration', () => {
        test('should handle missing dashboard container gracefully', async () => {
            // Arrange - Remove dashboard container
            document.body.innerHTML = '<div>No dashboard container</div>';

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue({
                data: {
                    guest_access: true,
                    summary: { total_students: 100, total_drivers: 20 }
                }
            });

            // Act
            await dashboardManager.initializeGuestDashboard();

            // Assert - Should handle gracefully and log warning
            expect(console.warn).toHaveBeenCalledWith('[DASHBOARD] No dashboard container found for guest elements');
        });

        test('should handle corrupted dashboard data', async () => {
            // Arrange - Mock corrupted data response
            const corruptedData = {
                data: {
                    guest_access: true,
                    summary: null // Corrupted summary data
                }
            };

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(corruptedData);

            // Act
            await dashboardManager.updateDashboardStats();

            // Assert - Should handle gracefully without throwing
            expect(console.log).toHaveBeenCalledWith('[DASHBOARD] Updating stats for guest user');

            // DOM elements should show default values
            const studentsElement = document.getElementById('total-students-dash');
            const driversElement = document.getElementById('total-drivers-dash');
            expect(studentsElement?.textContent).toBe('0');
            expect(driversElement?.textContent).toBe('0');
        });

        test('should handle concurrent dashboard updates', async () => {
            // Arrange
            let resolveCount = 0;
            const deferredPromise = new Promise((resolve) => {
                setTimeout(() => {
                    resolveCount++;
                    resolve({
                        data: {
                            guest_access: true,
                            summary: { total_students: 100, total_drivers: 20 }
                        }
                    });
                }, 100);
            });

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockReturnValue(deferredPromise);

            // Act - Trigger multiple concurrent updates
            const updatePromises = [
                dashboardManager.updateDashboardStats(),
                dashboardManager.updateDashboardStats(),
                dashboardManager.updateDashboardStats()
            ];

            await Promise.all(updatePromises);

            // Assert - All updates should complete successfully
            expect(authService.getGuestDashboardData).toHaveBeenCalledTimes(3);

            // Should handle concurrent updates without issues
            const studentsElement = document.getElementById('total-students-dash');
            expect(studentsElement?.textContent).toBe('100');
        });
    });

    describe('Guest Dashboard Performance Integration', () => {
        test('should handle rapid navigation changes efficiently', async () => {
            // Arrange
            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue({
                data: {
                    guest_access: true,
                    summary: { total_students: 150, total_drivers: 25 }
                }
            });

            // Act - Simulate rapid navigation
            const navigationEvents = [];
            for (let i = 0; i < 5; i++) {
                window.location.hash = '#dashboard';
                window.dispatchEvent(new Event('hashchange'));
                navigationEvents.push(Promise.resolve());
            }

            await Promise.all(navigationEvents);

            // Assert - Should handle rapid changes without errors
            expect(authService.getGuestDashboardData).toHaveBeenCalled();
        });

        test('should cleanup resources properly on component destruction', () => {
            // Arrange - Initialize component
            const mockComponent = {
                destroy: jest.fn(),
                guestDashboardContainer: document.querySelector('[data-guest-dashboard]'),
                upgradePromptShown: false
            };

            Object.assign(guestDashboardComponent, mockComponent);

            // Act - Destroy component
            guestDashboardComponent.destroy();

            // Assert - Should cleanup properly
            expect(guestDashboardComponent.destroy).toHaveBeenCalled();
            expect((guestDashboardComponent as any).guestDashboardContainer).toBeNull();
            expect((guestDashboardComponent as any).upgradePromptShown).toBe(false);
        });
    });

    describe('Guest Dashboard Accessibility Integration', () => {
        test('should maintain accessibility features for guest users', async () => {
            // Arrange
            const mockDashboardData = {
                data: {
                    guest_access: true,
                    summary: {
                        total_students: 180,
                        total_drivers: 30
                    }
                }
            };

            (authService.isGuestUser as jest.Mock).mockReturnValue(true);
            (authService.getGuestDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);

            // Act
            await dashboardManager.updateDashboardStats();

            // Assert - Guest indicators should have proper accessibility attributes
            const studentsElement = document.getElementById('total-students-dash');
            const studentIndicator = studentsElement?.querySelector('.guest-indicator');

            expect(studentIndicator).toBeTruthy();
            expect((studentIndicator as HTMLElement)?.title).toBeTruthy(); // Should have tooltip for screen readers
            expect(studentIndicator?.textContent).toBeTruthy(); // Should have visual indicator
        });

        test('should provide keyboard navigation support', async () => {
            // Arrange - Setup guest modal
            document.body.innerHTML = `
                <div class="guest-features-modal" data-guest-features-modal>
                    <div class="guest-modal-content">
                        <button data-guest-modal-close>&times;</button>
                        <button data-guest-upgrade-cta>Upgrade</button>
                    </div>
                </div>
            `;

            // Act - Test keyboard navigation
            const modal = document.querySelector('[data-guest-features-modal]');
            const closeButton = document.querySelector('[data-guest-modal-close]');
            const upgradeButton = document.querySelector('[data-guest-upgrade-cta]');

            // Simulate keyboard events
            (closeButton as HTMLElement)?.focus();
            (closeButton as HTMLElement)?.click();

            // Assert - Modal should be removed
            const modalAfterClose = document.querySelector('[data-guest-features-modal]');
            expect(modalAfterClose).toBeFalsy();
        });
    });
});