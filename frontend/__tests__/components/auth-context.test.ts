/**
 * Unit tests for AuthContext component.
 *
 * Tests the authentication state management including:
 * - Guest user creation during initialization
 * - Authentication state transitions
 * - Guest user authentication flow
 * - Error handling and edge cases
 * - State management and subscriptions
 */

import { authContext } from '../../src/ts/components/auth/auth-context';
import { authService } from '../../src/ts/services/auth-service';

// Mock the auth service
jest.mock('../../src/ts/services/auth-service');
jest.mock('../../src/ts/services/api-service');

describe('AuthContext', () => {
    let mockAuthService: jest.Mocked<typeof authService>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup auth service mock
        mockAuthService = authService as jest.Mocked<typeof authService>;

        // Mock console methods to avoid noise in tests
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();

        // Mock performance.now for consistent timing
        jest.spyOn(performance, 'now').mockReturnValue(1000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Initialization and Guest User Creation', () => {
        test('should create guest user when none exists and set isAuthenticated to true', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user_123',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true,
                guest_token: 'guest_token_123',
                expires_at: new Date(Date.now() + 3600000).toISOString()
            };

            mockAuthService.isGuestUser.mockReturnValue(false);
            mockAuthService.getStoredUser.mockReturnValue(null);
            mockAuthService.isAuthenticated.mockResolvedValue(false);
            mockAuthService.getCurrentGuestUser.mockReturnValue(null);
            mockAuthService.ensureGuestAccess.mockResolvedValue({
                data: mockGuestUser,
                error: null
            });

            // Act
            await authContext.initialize();

            // Assert
            expect(mockAuthService.ensureGuestAccess).toHaveBeenCalled();
            expect(mockAuthService.isAuthenticated).toHaveBeenCalled();

            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockGuestUser);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(null);
        });

        test('should use existing guest user if already available', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user_456',
                email: 'guest2@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true,
                guest_token: 'guest_token_456',
                expires_at: new Date(Date.now() + 3600000).toISOString()
            };

            mockAuthService.isGuestUser.mockReturnValue(true);
            mockAuthService.getStoredUser.mockReturnValue(mockGuestUser);

            // Act
            await authContext.initialize();

            // Assert
            expect(mockAuthService.isGuestUser).toHaveBeenCalled();
            expect(mockAuthService.ensureGuestAccess).not.toHaveBeenCalled();

            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockGuestUser);
            expect(state.isLoading).toBe(false);
        });

        test('should handle guest user creation failure gracefully', async () => {
            // Arrange
            const creationError = 'Failed to create guest user';

            mockAuthService.isGuestUser.mockReturnValue(false);
            mockAuthService.getStoredUser.mockReturnValue(null);
            mockAuthService.isAuthenticated.mockResolvedValue(false);
            mockAuthService.getCurrentGuestUser.mockReturnValue(null);
            mockAuthService.ensureGuestAccess.mockResolvedValue({
                data: null,
                error: creationError
            });

            // Act
            await authContext.initialize();

            // Assert
            expect(mockAuthService.ensureGuestAccess).toHaveBeenCalled();

            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBe(null);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(null); // Error is cleared in fallback
        });

        test('should handle initialization timeout gracefully', async () => {
            // Arrange
            mockAuthService.isGuestUser.mockReturnValue(false);
            mockAuthService.getStoredUser.mockReturnValue(null);
            mockAuthService.isAuthenticated.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(false), 15000))
            );
            mockAuthService.getCurrentGuestUser.mockReturnValue(null);
            mockAuthService.ensureGuestAccess.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'timeout' }), 15000))
            );

            // Act
            await authContext.initialize();

            // Assert
            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBe(null);
            expect(state.isLoading).toBe(false);
        });
    });

    describe('Authentication State Management', () => {
        test('should maintain guest user authentication state correctly', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user_test',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            mockAuthService.isGuestUser.mockReturnValue(true);
            mockAuthService.getStoredUser.mockReturnValue(mockGuestUser);

            // Act
            await authContext.initialize();

            // Assert
            let state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockGuestUser);

            // Test state persistence
            state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockGuestUser);
        });

        test('should handle regular user authentication alongside guest logic', async () => {
            // Arrange
            const mockRegularUser = {
                id: 2,
                username: 'regular_user',
                email: 'user@test.local',
                role: 'student',
                is_active: true
            };

            mockAuthService.isGuestUser.mockReturnValue(false);
            mockAuthService.getStoredUser.mockReturnValue(null);
            mockAuthService.isAuthenticated.mockResolvedValue(true);
            mockAuthService.getCurrentUser.mockResolvedValue({
                data: mockRegularUser,
                error: null
            });

            // Act
            await authContext.initialize();

            // Assert
            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockRegularUser);
            expect(state.user?.role).toBe('student');
        });

        test('should clear authentication state on logout', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            mockAuthService.isGuestUser.mockReturnValue(true);
            mockAuthService.getStoredUser.mockReturnValue(mockGuestUser);
            mockAuthService.logout.mockResolvedValue({ error: null });

            await authContext.initialize();

            // Act
            await authContext.logout();

            // Assert
            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBe(null);
            expect(state.isLoading).toBe(false);
            expect(mockAuthService.logout).toHaveBeenCalled();
        });
    });

    describe('State Subscriptions and Updates', () => {
        test('should notify subscribers of state changes', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            const stateChanges: any[] = [];
            const unsubscribe = authContext.subscribe((state) => {
                stateChanges.push(state);
            });

            mockAuthService.isGuestUser.mockReturnValue(true);
            mockAuthService.getStoredUser.mockReturnValue(mockGuestUser);

            // Act
            await authContext.initialize();

            // Cleanup
            unsubscribe();

            // Assert
            expect(stateChanges.length).toBeGreaterThan(1);
            const finalState = stateChanges[stateChanges.length - 1];
            expect(finalState.isAuthenticated).toBe(true);
            expect(finalState.user).toEqual(mockGuestUser);
        });

        test('should handle subscription errors gracefully', async () => {
            // Arrange
            const errorSubscriber = jest.fn(() => {
                throw new Error('Subscriber error');
            });

            authContext.subscribe(errorSubscriber);

            mockAuthService.isGuestUser.mockReturnValue(true);
            mockAuthService.getStoredUser.mockReturnValue({
                id: 1,
                username: 'guest_user',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            });

            // Act
            await authContext.initialize();

            // Assert
            expect(errorSubscriber).toHaveBeenCalled();
            expect(console.error).toHaveBeenCalledWith('Error in auth state listener:', expect.any(Error));
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle network errors during initialization', async () => {
            // Arrange
            const networkError = new Error('Network error');

            mockAuthService.isGuestUser.mockReturnValue(false);
            mockAuthService.getStoredUser.mockReturnValue(null);
            mockAuthService.isAuthenticated.mockRejectedValue(networkError);
            mockAuthService.getCurrentGuestUser.mockReturnValue(null);
            mockAuthService.ensureGuestAccess.mockRejectedValue(networkError);

            // Act
            await authContext.initialize();

            // Assert
            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBe(null);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(null); // Error is cleared in fallback
        });

        test('should handle malformed guest user data', async () => {
            // Arrange
            const malformedGuestUser = {
                id: 1,
                username: '', // Invalid empty username
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            mockAuthService.isGuestUser.mockReturnValue(false);
            mockAuthService.getStoredUser.mockReturnValue(null);
            mockAuthService.isAuthenticated.mockResolvedValue(false);
            mockAuthService.getCurrentGuestUser.mockReturnValue(null);
            mockAuthService.ensureGuestAccess.mockResolvedValue({
                data: malformedGuestUser,
                error: null
            });

            // Act
            await authContext.initialize();

            // Assert
            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(malformedGuestUser);
            expect(state.isLoading).toBe(false);
        });

        test('should handle concurrent initialization calls', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            mockAuthService.isGuestUser.mockReturnValue(false);
            mockAuthService.getStoredUser.mockReturnValue(null);
            mockAuthService.isAuthenticated.mockResolvedValue(false);
            mockAuthService.getCurrentGuestUser.mockReturnValue(null);
            mockAuthService.ensureGuestAccess.mockResolvedValue({
                data: mockGuestUser,
                error: null
            });

            // Act - Call initialize multiple times concurrently
            const initPromises = [
                authContext.initialize(),
                authContext.initialize(),
                authContext.initialize()
            ];

            await Promise.all(initPromises);

            // Assert
            expect(mockAuthService.ensureGuestAccess).toHaveBeenCalledTimes(3);

            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockGuestUser);
        });
    });

    describe('Login and Authentication Methods', () => {
        test('should handle guest user login flow', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            mockAuthService.login.mockResolvedValue({
                data: mockGuestUser,
                error: null
            });

            // Act
            await authContext.login({
                username_or_email: 'guest@test.local',
                password: 'guest_password'
            });

            // Assert
            expect(mockAuthService.login).toHaveBeenCalledWith({
                username_or_email: 'guest@test.local',
                password: 'guest_password'
            });

            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockGuestUser);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(null);
        });

        test('should handle login errors correctly', async () => {
            // Arrange
            const loginError = 'Invalid credentials';

            mockAuthService.login.mockResolvedValue({
                data: null,
                error: loginError
            });

            // Act & Assert
            await expect(authContext.login({
                username_or_email: 'guest@test.local',
                password: 'wrong_password'
            })).rejects.toThrow(loginError);

            const state = authContext.getState();
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(loginError);
        });

        test('should refresh authentication for guest users', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            mockAuthService.isGuestUser.mockReturnValue(true);
            mockAuthService.getStoredUser.mockReturnValue(mockGuestUser);
            mockAuthService.refreshToken.mockResolvedValue({ success: true });

            await authContext.initialize();

            // Act
            await authContext.refreshAuth();

            // Assert
            expect(mockAuthService.refreshToken).toHaveBeenCalled();

            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockGuestUser);
        });
    });

    describe('Role and Permission Methods', () => {
        test('should correctly identify guest user roles', async () => {
            // Arrange
            const mockGuestUser = {
                id: 1,
                username: 'guest_user',
                email: 'guest@test.local',
                role: 'guest',
                is_active: true,
                is_guest: true
            };

            mockAuthService.isGuestUser.mockReturnValue(true);
            mockAuthService.getStoredUser.mockReturnValue(mockGuestUser);

            await authContext.initialize();

            // Act & Assert
            expect(authContext.hasRole('guest')).toBe(true);
            expect(authContext.hasRole('admin')).toBe(false);
            expect(authContext.isAdmin()).toBe(false);
            expect(authContext.hasAnyRole(['guest', 'student'])).toBe(true);
            expect(authContext.hasAnyRole(['admin', 'teacher'])).toBe(false);
        });

        test('should handle null user for role checks', async () => {
            // Arrange
            mockAuthService.isGuestUser.mockReturnValue(false);
            mockAuthService.getStoredUser.mockReturnValue(null);
            mockAuthService.isAuthenticated.mockResolvedValue(false);
            mockAuthService.getCurrentGuestUser.mockReturnValue(null);
            mockAuthService.ensureGuestAccess.mockResolvedValue({
                data: null,
                error: 'Failed to create guest'
            });

            await authContext.initialize();

            // Act & Assert
            expect(authContext.hasRole('guest')).toBe(false);
            expect(authContext.isAdmin()).toBe(false);
            expect(authContext.hasAnyRole(['guest', 'student'])).toBe(false);
        });
    });
});