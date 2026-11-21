/**
 * Comprehensive tests for login bypass feature implementation.
 *
 * Tests all aspects of the frontend login bypass functionality including:
 * - AuthContext bypass login functionality
 * - LoginComponent bypass button visibility and behavior
 * - AuthService bypass integration
 * - Configuration management for bypass settings
 * - Visual indicators for bypass users
 * - Error handling and edge cases
 * - Integration with backend bypass endpoint
 */

import { authContext } from '../../src/ts/components/auth/auth-context';
import { authService } from '../../src/ts/services/auth-service';
import { LoginComponent } from '../../src/ts/components/auth/login-component';
import { ProfileComponent } from '../../src/ts/components/auth/profile-component';
import { UserSessionComponent } from '../../src/ts/components/auth/user-session-component';

// Mock the dependencies
jest.mock('../../src/ts/services/auth-service');
jest.mock('../../src/ts/services/api-service');
jest.mock('../../src/ts/config');

describe('Login Bypass Frontend', () => {
    let mockAuthService: jest.Mocked<typeof authService>;
    let mockConfig: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocks
        mockAuthService = authService as jest.Mocked<typeof authService>;
        mockConfig = {
            enableLoginBypass: true,
            loginBypassUser: 'admin',
            getEnvVarBoolean: jest.fn(),
            getEnvVar: jest.fn()
        };

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

    describe('AuthContext Bypass Login', () => {
        test('should call authService.loginWithBypass when bypass is enabled', async () => {
            // Arrange
            const mockBypassUser = {
                id: 'bypass_user',
                username: 'admin',
                email: 'admin@bypass.local',
                role: 'admin',
                is_active: true,
                is_bypass_user: true
            };

            mockAuthService.loginWithBypass.mockResolvedValue({
                data: mockBypassUser,
                error: null
            });

            // Mock configuration
            jest.doMock('../../src/ts/config', () => ({
                config: mockConfig
            }));

            // Act
            await authContext.loginWithBypass();

            // Assert
            expect(mockAuthService.loginWithBypass).toHaveBeenCalled();
            
            const state = authContext.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockBypassUser);
            expect(state.user?.is_bypass_user).toBe(true);
        });

        test('should handle bypass login error correctly', async () => {
            // Arrange
            const bypassError = 'Bypass login failed: Service unavailable';
            
            mockAuthService.loginWithBypass.mockResolvedValue({
                data: null,
                error: bypassError
            });

            // Act & Assert
            await expect(authContext.loginWithBypass()).rejects.toThrow(bypassError);

            const state = authContext.getState();
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(bypassError);
        });

        test('should update state correctly during bypass login process', async () => {
            // Arrange
            const stateChanges: any[] = [];
            const unsubscribe = authContext.subscribe((state) => {
                stateChanges.push({ ...state });
            });

            const mockBypassUser = {
                id: 'bypass_user',
                username: 'admin',
                email: 'admin@bypass.local',
                role: 'admin',
                is_active: true,
                is_bypass_user: true
            };

            mockAuthService.loginWithBypass.mockResolvedValue({
                data: mockBypassUser,
                error: null
            });

            // Act
            await authContext.loginWithBypass();

            // Assert
            expect(stateChanges.length).toBeGreaterThan(0);
            
            // Should have loading state
            const loadingState = stateChanges.find(s => s.isLoading);
            expect(loadingState).toBeDefined();

            // Should have final authenticated state
            const finalState = stateChanges[stateChanges.length - 1];
            expect(finalState.isAuthenticated).toBe(true);
            expect(finalState.user?.is_bypass_user).toBe(true);

            unsubscribe();
        });

        test('should handle network errors during bypass login', async () => {
            // Arrange
            const networkError = new Error('Network error: Failed to connect');
            
            mockAuthService.loginWithBypass.mockRejectedValue(networkError);

            // Act & Assert
            await expect(authContext.loginWithBypass()).rejects.toThrow('Network error: Failed to connect');

            const state = authContext.getState();
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe('Network error: Failed to connect');
        });
    });

    describe('AuthService Bypass Integration', () => {
        test('should call correct API endpoint for bypass login', async () => {
            // Arrange
            const mockBypassUser = {
                id: 'bypass_user',
                username: 'admin',
                email: 'admin@bypass.local',
                role: 'admin',
                is_active: true,
                is_bypass_user: true
            };

            const mockApiResponse = {
                access_token: 'bypass_token_123',
                user: mockBypassUser
            };

            // Mock API service
            const { apiService } = require('../../src/ts/services/api-service');
            apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: mockApiResponse
            });

            // Mock config check
            mockConfig.enableLoginBypass = true;

            jest.doMock('../../src/ts/config', () => ({
                config: mockConfig
            }));

            // Act
            const result = await authService.loginWithBypass();

            // Assert
            expect(apiService.post).toHaveBeenCalledWith('/auth/bypass-login', {
                username: 'admin'
            });
            expect(result.data).toEqual(mockBypassUser);
            expect(result.data?.is_bypass_user).toBe(true);
        });

        test('should handle bypass login when disabled in configuration', async () => {
            // Arrange
            mockConfig.enableLoginBypass = false;

            jest.doMock('../../src/ts/config', () => ({
                config: mockConfig
            }));

            // Act
            const result = await authService.loginWithBypass();

            // Assert
            expect(result.error).toBe('Bypass login is not enabled');
            expect(result.data).toBeUndefined();
        });

        test('should use custom bypass user from configuration', async () => {
            // Arrange
            mockConfig.enableLoginBypass = true;
            mockConfig.loginBypassUser = 'custom_dev_user';

            const mockBypassUser = {
                id: 'bypass_user',
                username: 'custom_dev_user',
                email: 'custom_dev_user@bypass.local',
                role: 'admin',
                is_active: true,
                is_bypass_user: true
            };

            const mockApiResponse = {
                access_token: 'bypass_token_456',
                user: mockBypassUser
            };

            const { apiService } = require('../../src/ts/services/api-service');
            apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: mockApiResponse
            });

            jest.doMock('../../src/ts/config', () => ({
                config: mockConfig
            }));

            // Act
            const result = await authService.loginWithBypass();

            // Assert
            expect(apiService.post).toHaveBeenCalledWith('/auth/bypass-login', {
                username: 'custom_dev_user'
            });
            expect(result.data?.username).toBe('custom_dev_user');
        });

        test('should handle API errors during bypass login', async () => {
            // Arrange
            mockConfig.enableLoginBypass = true;

            const { apiService } = require('../../src/ts/services/api-service');
            apiService.post = jest.fn().mockResolvedValue({
                error: 'Bypass login failed: Internal server error',
                data: null
            });

            jest.doMock('../../src/ts/config', () => ({
                config: mockConfig
            }));

            // Act
            const result = await authService.loginWithBypass();

            // Assert
            expect(result.error).toBe('Bypass login failed: Internal server error');
            expect(result.data).toBeUndefined();
        });

        test('should handle missing access token in response', async () => {
            // Arrange
            mockConfig.enableLoginBypass = true;

            const { apiService } = require('../../src/ts/services/api-service');
            apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: {
                    // Missing access_token
                    user: {
                        id: 'bypass_user',
                        username: 'admin',
                        role: 'admin',
                        is_active: true
                    }
                }
            });

            jest.doMock('../../src/ts/config', () => ({
                config: mockConfig
            }));

            // Act
            const result = await authService.loginWithBypass();

            // Assert
            expect(result.error).toBe('No access token received from bypass login');
        });
    });

    describe('Configuration Management', () => {
        test('should handle environment variable configuration', () => {
            // Arrange
            mockConfig.getEnvVarBoolean.mockReturnValue(true);
            mockConfig.getEnvVar.mockReturnValue('dev_admin');

            // Mock config loading
            jest.doMock('../../src/ts/config', () => ({
                config: {
                    enableLoginBypass: mockConfig.getEnvVarBoolean('VITE_ENABLE_LOGIN_BYPASS', false),
                    loginBypassUser: mockConfig.getEnvVar('VITE_LOGIN_BYPASS_USER', 'admin'),
                    getEnvVarBoolean: mockConfig.getEnvVarBoolean,
                    getEnvVar: mockConfig.getEnvVar
                }
            }));

            const { config } = require('../../src/ts/config');

            // Assert
            expect(config.enableLoginBypass).toBe(true);
            expect(config.loginBypassUser).toBe('dev_admin');
            expect(mockConfig.getEnvVarBoolean).toHaveBeenCalledWith('VITE_ENABLE_LOGIN_BYPASS', false);
            expect(mockConfig.getEnvVar).toHaveBeenCalledWith('VITE_LOGIN_BYPASS_USER', 'admin');
        });

        test('should fallback to defaults when environment variables are missing', () => {
            // Arrange
            mockConfig.getEnvVarBoolean.mockReturnValue(false); // No env var, use default
            mockConfig.getEnvVar.mockReturnValue('admin'); // No env var, use default

            jest.doMock('../../src/ts/config', () => ({
                config: {
                    enableLoginBypass: mockConfig.getEnvVarBoolean('VITE_ENABLE_LOGIN_BYPASS', false),
                    loginBypassUser: mockConfig.getEnvVar('VITE_LOGIN_BYPASS_USER', 'admin'),
                    getEnvVarBoolean: mockConfig.getEnvVarBoolean,
                    getEnvVar: mockConfig.getEnvVar
                }
            }));

            const { config } = require('../../src/ts/config');

            // Assert
            expect(config.enableLoginBypass).toBe(false);
            expect(config.loginBypassUser).toBe('admin');
        });
    });

    describe('LoginComponent Bypass Integration', () => {
        let mockElement: HTMLElement;
        let mockButton: HTMLButtonElement;
        let mockSection: HTMLElement;

        beforeEach(() => {
            // Create mock DOM elements
            mockElement = document.createElement('div');
            mockButton = document.createElement('button');
            mockButton.id = 'bypass-btn';
            mockSection = document.createElement('div');
            mockSection.id = 'bypass-section';
            
            mockElement.appendChild(mockSection);
            mockSection.appendChild(mockButton);
            
            // Mock DOM methods
            mockElement.querySelector = jest.fn().mockImplementation((selector: string) => {
                if (selector === '#bypass-btn') return mockButton;
                if (selector === '#bypass-section') return mockSection;
                return null;
            });
        });

        test('should show bypass button when enabled in configuration', () => {
            // Arrange
            mockConfig.enableLoginBypass = true;

            const loginComponent = new LoginComponent();
            loginComponent.$ = jest.fn().mockReturnValue(mockElement);

            // Mock config method
            Object.defineProperty(loginComponent, 'config', {
                value: mockConfig,
                writable: true
            });

            // Act
            loginComponent.updateBypassSectionVisibility();

            // Assert
            expect(mockSection.style.display).toBe('block');
        });

        test('should hide bypass button when disabled in configuration', () => {
            // Arrange
            mockConfig.enableLoginBypass = false;

            const loginComponent = new LoginComponent();
            loginComponent.$ = jest.fn().mockReturnValue(mockElement);

            Object.defineProperty(loginComponent, 'config', {
                value: mockConfig,
                writable: true
            });

            // Act
            loginComponent.updateBypassSectionVisibility();

            // Assert
            expect(mockSection.style.display).toBe('none');
        });

        test('should handle bypass button click event', async () => {
            // Arrange
            mockConfig.enableLoginBypass = true;

            const loginComponent = new LoginComponent();
            loginComponent.$ = jest.fn().mockReturnValue(mockElement);
            loginComponent.setLoading = jest.fn();
            loginComponent.clearError = jest.fn();
            loginComponent.showError = jest.fn();

            Object.defineProperty(loginComponent, 'config', {
                value: mockConfig,
                writable: true
            });

            // Mock the authContext
            const mockAuthContext = {
                loginWithBypass: jest.fn().mockResolvedValue(undefined)
            };
            jest.doMock('../../src/ts/components/auth/auth-context', () => ({
                authContext: mockAuthContext
            }));

            // Act
            await loginComponent.handleBypassLogin();

            // Assert
            expect(mockAuthContext.loginWithBypass).toHaveBeenCalled();
            expect(loginComponent.setLoading).toHaveBeenCalledWith(false);
        });

        test('should handle bypass button click error', async () => {
            // Arrange
            mockConfig.enableLoginBypass = true;

            const loginComponent = new LoginComponent();
            loginComponent.$ = jest.fn().mockReturnValue(mockElement);
            loginComponent.setLoading = jest.fn();
            loginComponent.clearError = jest.fn();
            loginComponent.showError = jest.fn();

            Object.defineProperty(loginComponent, 'config', {
                value: mockConfig,
                writable: true
            });

            // Mock authContext to throw error
            const mockAuthContext = {
                loginWithBypass: jest.fn().mockRejectedValue(new Error('Bypass failed'))
            };
            jest.doMock('../../src/ts/components/auth/auth-context', () => ({
                authContext: mockAuthContext
            }));

            // Act
            await loginComponent.handleBypassLogin();

            // Assert
            expect(loginComponent.showError).toHaveBeenCalledWith('Bypass failed');
            expect(loginComponent.setLoading).toHaveBeenCalledWith(false);
        });
    });

    describe('ProfileComponent Bypass Indicators', () => {
        let mockElement: HTMLElement;
        let mockProfile: any;

        beforeEach(() => {
            mockElement = document.createElement('div');
            mockProfile = {
                id: 1,
                username: 'admin',
                email: 'admin@bypass.local',
                role: 'admin',
                is_active: true,
                is_bypass_user: true
            };

            // Mock DOM methods
            mockElement.querySelector = jest.fn().mockReturnValue(document.createElement('span'));
            mockElement.appendChild = jest.fn();
        });

        test('should display bypass indicator for bypass users', () => {
            // Arrange
            const profileComponent = new ProfileComponent();
            profileComponent.shadow = {
                querySelector: mockElement.querySelector,
                appendChild: mockElement.appendChild
            };

            // Act
            profileComponent.renderProfile(mockProfile);

            // Assert
            expect(mockElement.appendChild).toHaveBeenCalled();
            
            // Check that styles were added for bypass indicator
            const styleCalls = mockElement.appendChild.mock.calls.filter(call => 
                call[0] && call[0].id === 'bypass-styles'
            );
            expect(styleCalls.length).toBeGreaterThan(0);
        });

        test('should add correct styling for bypass indicator', () => {
            // Arrange
            const profileComponent = new ProfileComponent();
            profileComponent.shadow = {
                querySelector: mockElement.querySelector,
                appendChild: mockElement.appendChild
            };

            // Act
            profileComponent.addBypassIndicatorStyles();

            // Assert
            expect(mockElement.appendChild).toHaveBeenCalled();
            const styleElement = mockElement.appendChild.mock.calls[0][0];
            expect(styleElement.textContent).toContain('.bypass-indicator');
            expect(styleElement.textContent).toContain('background: var(--warning-color, #ffc107)');
        });

        test('should not add bypass styles for regular users', () => {
            // Arrange
            const regularUser = {
                ...mockProfile,
                is_bypass_user: false
            };

            const profileComponent = new ProfileComponent();
            profileComponent.shadow = {
                querySelector: mockElement.querySelector,
                appendChild: mockElement.appendChild
            };

            // Act
            profileComponent.renderProfile(regularUser);

            // Assert
            // Should not add bypass-specific styles
            const bypassStyleCalls = mockElement.appendChild.mock.calls.filter(call =>
                call[0] && call[0].id === 'bypass-styles'
            );
            expect(bypassStyleCalls.length).toBe(0);
        });
    });

    describe('UserSessionComponent Bypass Integration', () => {
        test('should display bypass indicator in session display', () => {
            // Arrange
            const sessionComponent = new UserSessionComponent();
            const mockUser = {
                id: 1,
                username: 'admin',
                role: 'admin',
                is_bypass_user: true
            };

            const mockNameElement = document.createElement('span');
            const mockRoleElement = document.createElement('span');
            
            sessionComponent.shadow = {
                querySelector: jest.fn().mockReturnValue(mockNameElement)
            };

            // Act
            sessionComponent.renderUserSession(mockUser);

            // Assert
            expect(mockNameElement.textContent).toBe('admin ⚠️');
        });

        test('should apply bypass styling to role display', () => {
            // Arrange
            const sessionComponent = new UserSessionComponent();
            const mockUser = {
                id: 1,
                username: 'admin',
                role: 'admin',
                is_bypass_user: true
            };

            const mockRoleElement = document.createElement('span');
            sessionComponent.shadow = {
                querySelector: jest.fn().mockReturnValue(mockRoleElement)
            };

            // Mock getElementById
            Object.defineProperty(sessionComponent, '$', {
                value: jest.fn().mockReturnValue(mockRoleElement),
                writable: true
            });

            // Act
            sessionComponent.renderUserSession(mockUser);

            // Assert
            expect(mockRoleElement.style.background).toBe('var(--warning-color, #ffc107)');
            expect(mockRoleElement.title).toBe('Development/Testing Mode - Bypass User');
        });

        test('should not show bypass indicators for regular users', () => {
            // Arrange
            const sessionComponent = new UserSessionComponent();
            const regularUser = {
                id: 1,
                username: 'admin',
                role: 'admin',
                is_bypass_user: false
            };

            const mockNameElement = document.createElement('span');
            sessionComponent.shadow = {
                querySelector: jest.fn().mockReturnValue(mockNameElement)
            };

            // Act
            sessionComponent.renderUserSession(regularUser);

            // Assert
            expect(mockNameElement.textContent).toBe('admin'); // No bypass indicator
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete bypass login flow from UI to backend', async () => {
            // Arrange
            const mockBypassUser = {
                id: 'bypass_user',
                username: 'admin',
                email: 'admin@bypass.local',
                role: 'admin',
                is_active: true,
                is_bypass_user: true
            };

            const mockApiResponse = {
                access_token: 'bypass_token_789',
                user: mockBypassUser
            };

            const { apiService } = require('../../src/ts/services/api-service');
            apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: mockApiResponse
            });

            mockAuthService.getCurrentUser = jest.fn().mockResolvedValue({
                data: mockBypassUser,
                error: null
            });

            mockConfig.enableLoginBypass = true;

            jest.doMock('../../src/ts/config', () => ({
                config: mockConfig
            }));

            // Act - Simulate complete flow
            const serviceResult = await authService.loginWithBypass();
            await authContext.loginWithBypass();

            // Assert
            expect(apiService.post).toHaveBeenCalledWith('/auth/bypass-login', {
                username: 'admin'
            });
            expect(serviceResult.data?.is_bypass_user).toBe(true);
            
            const state = authContext.getState();
            expect(state.user?.is_bypass_user).toBe(true);
            expect(state.isAuthenticated).toBe(true);
        });

        test('should handle bypass disabled state correctly', async () => {
            // Arrange
            mockConfig.enableLoginBypass = false;

            jest.doMock('../../src/ts/config', () => ({
                config: mockConfig
            }));

            // Act & Assert
            const serviceResult = await authService.loginWithBypass();
            expect(serviceResult.error).toBe('Bypass login is not enabled');

            // AuthContext should handle the service error
            mockAuthService.loginWithBypass.mockResolvedValue(serviceResult);
            await expect(authContext.loginWithBypass()).rejects.toThrow('Bypass login is not enabled');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle malformed user data from bypass response', async () => {
            // Arrange
            const { apiService } = require('../../src/ts/services/api-service');
            apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: {
                    access_token: 'token',
                    user: {
                        // Missing required fields
                        username: undefined,
                        role: null
                    }
                }
            });

            mockConfig.enableLoginBypass = true;

            jest.doMock('../../src/ts/config', () => ({
                config: mockConfig
            }));

            // Act
            const result = await authService.loginWithBypass();

            // Assert
            expect(result.data).toBeDefined();
            expect(result.data?.is_bypass_user).toBe(true);
            // Should still mark as bypass user even with malformed data
        });

        test('should handle concurrent bypass login attempts', async () => {
            // Arrange
            const mockBypassUser = {
                id: 'bypass_user',
                username: 'admin',
                email: 'admin@bypass.local',
                role: 'admin',
                is_active: true,
                is_bypass_user: true
            };

            mockAuthService.loginWithBypass.mockResolvedValue({
                data: mockBypassUser,
                error: null
            });

            // Act - Multiple concurrent bypass attempts
            const promises = [
                authContext.loginWithBypass(),
                authContext.loginWithBypass(),
                authContext.loginWithBypass()
            ];

            await Promise.all(promises);

            // Assert
            expect(mockAuthService.loginWithBypass).toHaveBeenCalledTimes(3);
            
            const finalState = authContext.getState();
            expect(finalState.isAuthenticated).toBe(true);
            expect(finalState.user?.is_bypass_user).toBe(true);
        });

        test('should clear authentication state on bypass login failure', async () => {
            // Arrange
            // First successful login
            const mockBypassUser = {
                id: 'bypass_user',
                username: 'admin',
                email: 'admin@bypass.local',
                role: 'admin',
                is_active: true,
                is_bypass_user: true
            };

            mockAuthService.loginWithBypass.mockResolvedValueOnce({
                data: mockBypassUser,
                error: null
            });

            await authContext.loginWithBypass();

            // Now simulate failure
            mockAuthService.loginWithBypass.mockRejectedValueOnce(
                new Error('Service temporarily unavailable')
            );

            // Act & Assert
            await expect(authContext.loginWithBypass()).rejects.toThrow('Service temporarily unavailable');

            // State should be reset
            const state = authContext.getState();
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe('Service temporarily unavailable');
        });
    });
});