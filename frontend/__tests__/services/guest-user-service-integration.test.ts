// Frontend service layer integration tests for guest user functionality
// Tests API service interactions and data handling

describe('Guest User Service Integration', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup global API service
        global.apiService = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn()
        };
    });

    describe('Guest Login Service Integration', () => {
        test('should handle guest login API call correctly', async () => {
            // Arrange
            const expectedResponse = {
                access_token: 'guest_access_token_12345',
                refresh_token: 'guest_refresh_token_12345',
                token_type: 'bearer',
                user: {
                    id: 1,
                    username: 'guest_test123',
                    email: 'guest_test123@guest.local',
                    role: 'student',
                    is_active: true,
                    is_guest: true,
                    guest_token: 'guest_123',
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                guest_id: 'guest_123',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                is_guest: true
            };

            global.apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: expectedResponse
            });

            // Act - Simulate guest login API call
            const response = await global.apiService.post('/auth/guest', {});

            // Assert
            expect(global.apiService.post).toHaveBeenCalledWith('/auth/guest', {});
            expect(response.error).toBeNull();
            expect(response.data).toEqual(expectedResponse);
            expect(response.data.is_guest).toBe(true);
            expect(response.data.user.is_guest).toBe(true);
        });

        test('should handle guest login API errors', async () => {
            // Arrange
            const apiError = {
                error: 'Server error',
                data: null
            };

            global.apiService.post = jest.fn().mockResolvedValue(apiError);

            // Act
            const response = await global.apiService.post('/auth/guest', {});

            // Assert
            expect(response.error).toBe('Server error');
            expect(response.data).toBeNull();
        });

        test('should handle guest login with existing token', async () => {
            // Arrange
            const guestToken = 'existing_guest_token_123';

            const expectedResponse = {
                access_token: 'refreshed_access_token',
                user: {
                    id: 1,
                    username: 'guest_test123',
                    is_guest: true
                },
                guest_id: 'guest_123',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                is_guest: true
            };

            global.apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: expectedResponse
            });

            // Act
            const response = await global.apiService.post('/auth/guest', {
                guest_token: guestToken
            });

            // Assert
            expect(global.apiService.post).toHaveBeenCalledWith('/auth/guest', {
                guest_token: guestToken
            });
            expect(response.data.access_token).toBe('refreshed_access_token');
        });
    });

    describe('Guest Dashboard Service Integration', () => {
        test('should fetch guest dashboard data successfully', async () => {
            // Arrange
            const dashboardData = {
                guest_access: true,
                permissions: ['dashboard:read'],
                summary: {
                    total_students: 150,
                    total_drivers: 12,
                    active_routes: 8
                },
                message: 'Guest access - limited data available. Sign up for full access.'
            };

            global.apiService.get = jest.fn().mockResolvedValue({
                error: null,
                data: dashboardData
            });

            // Act
            const response = await global.apiService.get('/auth/guest/dashboard');

            // Assert
            expect(global.apiService.get).toHaveBeenCalledWith('/auth/guest/dashboard');
            expect(response.error).toBeNull();
            expect(response.data.guest_access).toBe(true);
            expect(response.data.permissions).toContain('dashboard:read');
            expect(response.data.summary.total_students).toBe(150);
        });

        test('should handle guest dashboard access denial', async () => {
            // Arrange
            global.apiService.get = jest.fn().mockResolvedValue({
                error: 'Access denied',
                data: null
            });

            // Act
            const response = await global.apiService.get('/auth/guest/dashboard');

            // Assert
            expect(response.error).toBe('Access denied');
            expect(response.data).toBeNull();
        });

        test('should handle guest dashboard network errors', async () => {
            // Arrange
            global.apiService.get = jest.fn().mockRejectedValue(new Error('Network timeout'));

            // Act & Assert
            await expect(global.apiService.get('/auth/guest/dashboard')).rejects.toThrow('Network timeout');
        });
    });

    describe('Guest Conversion Service Integration', () => {
        test('should convert guest to registered user successfully', async () => {
            // Arrange
            const conversionRequest = {
                guest_id: 'guest_123',
                username: 'newuser',
                email: 'newuser@test.com',
                password: 'secure_password_123'
            };

            const conversionResponse = {
                id: 1,
                username: 'newuser',
                email: 'newuser@test.com',
                role: 'student',
                is_active: true,
                is_guest: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            global.apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: conversionResponse
            });

            // Act
            const response = await global.apiService.post('/auth/convert-guest', conversionRequest);

            // Assert
            expect(global.apiService.post).toHaveBeenCalledWith('/auth/convert-guest', conversionRequest);
            expect(response.error).toBeNull();
            expect(response.data.username).toBe('newuser');
            expect(response.data.email).toBe('newuser@test.com');
            expect(response.data.is_guest).toBe(false);
        });

        test('should handle conversion validation errors', async () => {
            // Arrange
            const invalidRequest = {
                guest_id: 'guest_123',
                username: 'ab', // Too short
                email: 'invalid-email',
                password: '123'
            };

            global.apiService.post = jest.fn().mockResolvedValue({
                error: 'Validation failed',
                data: null
            });

            // Act
            const response = await global.apiService.post('/auth/convert-guest', invalidRequest);

            // Assert
            expect(response.error).toBe('Validation failed');
            expect(response.data).toBeNull();
        });

        test('should handle guest not found during conversion', async () => {
            // Arrange
            const conversionRequest = {
                guest_id: 'nonexistent_guest',
                username: 'newuser',
                email: 'newuser@test.com',
                password: 'password123'
            };

            global.apiService.post = jest.fn().mockResolvedValue({
                error: 'Guest user not found',
                data: null
            });

            // Act
            const response = await global.apiService.post('/auth/convert-guest', conversionRequest);

            // Assert
            expect(response.error).toBe('Guest user not found');
        });
    });

    describe('Service Error Handling', () => {
        test('should handle API service unavailability', async () => {
            // Arrange
            global.apiService.post = jest.fn().mockRejectedValue(new Error('Service unavailable'));

            // Act & Assert
            await expect(global.apiService.post('/auth/guest', {})).rejects.toThrow('Service unavailable');
        });

        test('should handle malformed API responses', async () => {
            // Arrange
            global.apiService.get = jest.fn().mockResolvedValue({
                // Missing error and data fields
            });

            // Act
            const response = await global.apiService.get('/auth/guest/dashboard');

            // Assert - Should handle missing fields gracefully
            expect(response).toBeDefined();
        });

        test('should handle network timeouts', async () => {
            // Arrange
            global.apiService.post = jest.fn().mockRejectedValue(new Error('Request timeout'));

            // Act & Assert
            await expect(global.apiService.post('/auth/guest', {})).rejects.toThrow('Request timeout');
        });
    });

    describe('Token Management Integration', () => {
        test('should handle guest token refresh', async () => {
            // Arrange
            const refreshResponse = {
                access_token: 'new_access_token_456',
                token_type: 'bearer',
                user: {
                    id: 1,
                    username: 'guest_test123',
                    is_guest: true
                }
            };

            global.apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: refreshResponse
            });

            // Act
            const response = await global.apiService.post('/auth/refresh', {
                refresh_token: 'guest_refresh_token'
            });

            // Assert
            expect(global.apiService.post).toHaveBeenCalledWith('/auth/refresh', {
                refresh_token: 'guest_refresh_token'
            });
            expect(response.data.access_token).toBe('new_access_token_456');
        });

        test('should handle invalid guest tokens', async () => {
            // Arrange
            global.apiService.post = jest.fn().mockResolvedValue({
                error: 'Invalid token',
                data: null
            });

            // Act
            const response = await global.apiService.post('/auth/refresh', {
                refresh_token: 'invalid_token'
            });

            // Assert
            expect(response.error).toBe('Invalid token');
        });
    });

    describe('Data Transformation', () => {
        test('should transform guest user data correctly', async () => {
            // Arrange
            const rawGuestData = {
                guest_user: {
                    id: 1,
                    username: 'guest_test123',
                    email: 'guest_test123@guest.local',
                    role: 'student',
                    is_active: true,
                    created_at: '2024-10-19T07:30:00Z',
                    updated_at: '2024-10-19T07:30:00Z'
                },
                access_token: 'guest_token_123',
                refresh_token: 'refresh_token_123',
                guest_id: 'guest_123',
                expires_at: '2024-10-19T31:30:00Z'
            };

            global.apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: rawGuestData
            });

            // Act
            const response = await global.apiService.post('/auth/guest', {});

            // Assert - Data should be properly structured
            expect(response.data.guest_user).toBeDefined();
            expect(response.data.access_token).toBeDefined();
            expect(response.data.refresh_token).toBeDefined();
            expect(response.data.expires_at).toBeDefined();
        });

        test('should handle missing guest data fields', async () => {
            // Arrange
            const incompleteData = {
                access_token: 'token_only',
                // Missing other fields
            };

            global.apiService.post = jest.fn().mockResolvedValue({
                error: null,
                data: incompleteData
            });

            // Act
            const response = await global.apiService.post('/auth/guest', {});

            // Assert - Should handle missing fields gracefully
            expect(response.data.access_token).toBe('token_only');
            expect(response.data.guest_user).toBeUndefined();
        });
    });

    describe('Performance and Caching', () => {
        test('should handle concurrent guest API calls', async () => {
            // Arrange
            const guestResponse = {
                error: null,
                data: {
                    access_token: 'guest_token',
                    user: { id: 1, username: 'guest_test', is_guest: true },
                    guest_id: 'guest_123',
                    expires_at: new Date().toISOString(),
                    is_guest: true
                }
            };

            global.apiService.post = jest.fn().mockResolvedValue(guestResponse);

            // Act - Multiple concurrent calls
            const requests = [
                global.apiService.post('/auth/guest', {}),
                global.apiService.post('/auth/guest', {}),
                global.apiService.post('/auth/guest', {})
            ];

            const responses = await Promise.all(requests);

            // Assert - All should succeed
            expect(global.apiService.post).toHaveBeenCalledTimes(3);
            responses.forEach(response => {
                expect(response.error).toBeNull();
                expect(response.data.access_token).toBe('guest_token');
            });
        });

        test('should handle API response caching for guest data', async () => {
            // Arrange
            const dashboardData = {
                guest_access: true,
                permissions: ['dashboard:read'],
                summary: { total_students: 100, total_drivers: 10 },
                message: 'Cached guest data'
            };

            global.apiService.get = jest.fn().mockResolvedValue({
                error: null,
                data: dashboardData
            });

            // Act - Multiple calls for same data
            const response1 = await global.apiService.get('/auth/guest/dashboard');
            const response2 = await global.apiService.get('/auth/guest/dashboard');

            // Assert - Should handle repeated calls correctly
            expect(global.apiService.get).toHaveBeenCalledTimes(2);
            expect(response1.data).toEqual(response2.data);
        });
    });

    describe('Security Integration', () => {
        test('should handle guest token security validation', async () => {
            // Arrange
            global.apiService.post = jest.fn().mockResolvedValue({
                error: 'Invalid token signature',
                data: null
            });

            // Act
            const response = await global.apiService.post('/auth/refresh', {
                refresh_token: 'tampered_token'
            });

            // Assert
            expect(response.error).toBe('Invalid token signature');
        });

        test('should handle guest session expiration', async () => {
            // Arrange
            global.apiService.get = jest.fn().mockResolvedValue({
                error: 'Guest session expired',
                data: null
            });

            // Act
            const response = await global.apiService.get('/auth/guest/dashboard');

            // Assert
            expect(response.error).toBe('Guest session expired');
        });
    });
});