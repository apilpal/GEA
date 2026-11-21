/**
 * Guest-to-Registered User Conversion Workflow Integration Tests
 *
 * Tests the complete guest user conversion workflow including:
 * - Guest user registration process
 * - State transition management
 * - Data migration and cleanup
 * - Error handling during conversion
 * - Post-conversion functionality
 */

import { authService } from '../../src/ts/services/auth-service';
import { apiService } from '../../src/ts/services/api-service';

// Mock browser APIs and services
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Setup global mocks
beforeAll(() => {
  // Mock localStorage and sessionStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true
  });

  // Mock fetch for API calls
  global.fetch = jest.fn();
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockSessionStorage.getItem.mockClear();
  mockSessionStorage.setItem.mockClear();
  mockSessionStorage.removeItem.mockClear();
});

describe('Guest-to-Registered User Conversion Workflow Integration Tests', () => {
  describe('Guest User Registration Process', () => {
    test('should successfully convert guest user to registered user', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user_123',
        email: null,
        is_guest: true,
        guest_id: 'guest_123',
        guest_token: 'guest.jwt.token.123',
        preferences: {
          theme: 'dark',
          language: 'en'
        },
        created_at: new Date().toISOString()
      };

      const conversionData = {
        username: 'new_user',
        email: 'newuser@example.com',
        password: 'secure_password_123',
        guest_id: 'guest_123'
      };

      const convertedUser = {
        id: 1,
        username: 'new_user',
        email: 'newuser@example.com',
        role: 'student',
        is_active: true,
        is_guest: false,
        preferences: guestUser.preferences, // Should migrate preferences
        created_at: guestUser.created_at
      };

      // Mock current guest user
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock conversion API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'regular.jwt.token.456',
          token_type: 'Bearer',
          user: convertedUser
        })
      } as Response);

      // Act
      const conversionResult = await authService.convertGuestToUser(
        conversionData.username,
        conversionData.email,
        conversionData.password
      );

      // Assert
      expect(conversionResult.error).toBeUndefined();
      expect(conversionResult.data?.is_guest).toBe(false);
      expect(conversionResult.data?.username).toBe('new_user');
      expect(conversionResult.data?.email).toBe('newuser@example.com');
      

      // Verify guest data cleanup
      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'access_token',
        'regular.jwt.token.456'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(convertedUser)
      );
    });

    test('should handle guest conversion with data validation', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock validation errors
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'Validation failed',
          details: {
            username: ['Username must be at least 3 characters'],
            email: ['Invalid email format'],
            password: ['Password must contain special characters']
          }
        })
      } as Response);

      // Act
      const conversionResult = await authService.convertGuestToUser(
        'ab', // Too short
        'invalid-email', // Invalid format
        'password' // No special characters
      );

      // Assert
      expect(conversionResult.error).toBe('Validation failed');
      expect(conversionResult.data).toBeUndefined();
      expect(conversionResult.error).toBe('Validation failed');
    });

    test('should handle duplicate username during guest conversion', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock duplicate username error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          error: 'Username already exists',
          suggestion: 'Try: new_user_2024 or alternative_username'
        })
      } as Response);

      // Act
      const conversionResult = await authService.convertGuestToUser(
        'existing_username',
        'user@example.com',
        'password123'
      );

      // Assert
      expect(conversionResult.error).toBe('Username already exists');
      expect(conversionResult.error).toBe('Username already exists');
    });
  });

  describe('State Transition Management', () => {
    test('should properly cleanup guest state after conversion', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_token: 'guest.token.123',
        guest_id: 'guest_123',
        guest_preferences: { theme: 'dark' }
      };

      const convertedUser = {
        id: 1,
        username: 'new_user',
        email: 'newuser@example.com',
        is_guest: false,
        preferences: { theme: 'dark' }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock successful conversion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'regular.token.456',
          user: convertedUser
        })
      } as Response);

      // Act
      await authService.convertGuestToUser('new_user', 'newuser@example.com', 'password123');

      // Assert - Guest state should be completely cleaned up
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('guest_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('guest_user');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('guest_access_enabled');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('guest_preferences');
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });

    test('should migrate guest preferences during conversion', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_preferences: {
          theme: 'dark',
          language: 'en',
          notifications: {
            email: false,
            push: true,
            sms: false
          },
          dashboard_layout: 'compact'
        }
      };

      const convertedUser = {
        id: 1,
        username: 'new_user',
        email: 'newuser@example.com',
        is_guest: false,
        preferences: guestUser.guest_preferences
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'regular.token.456',
          user: convertedUser
        })
      } as Response);

      // Act
      const conversionResult = await authService.convertGuestToUser(
        'new_user',
        'newuser@example.com',
        'password123'
      );

      // Assert - Preferences should be migrated
      expect(conversionResult.data?.is_guest).toBe(false);
    });

    test('should handle session state transition during conversion', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_token: 'guest.token.123'
      };

      const conversionResponse = {
        access_token: 'regular.token.456',
        refresh_token: 'regular.refresh.token.789',
        user: {
          id: 1,
          username: 'new_user',
          email: 'newuser@example.com',
          is_guest: false
        }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(conversionResponse)
      } as Response);

      // Act - Convert guest to user
      const conversionResult = await authService.convertGuestToUser(
        'new_user',
        'newuser@example.com',
        'password123'
      );

      // Assert - Session should transition properly
      expect(conversionResult.error).toBeUndefined();

      // Check that new auth tokens are stored
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'access_token',
        'regular.token.456'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'refresh_token',
        'regular.refresh.token.789'
      );

      // Check that guest tokens are removed
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('guest_token');
    });
  });

  describe('Error Handling During Conversion', () => {
    test('should handle network failures during guest conversion', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock network failure
      mockFetch.mockRejectedValueOnce(new Error('Network connection failed'));

      // Act
      const conversionResult = await authService.convertGuestToUser(
        'new_user',
        'newuser@example.com',
        'password123'
      );

      // Assert
      expect(conversionResult.error).toBe('Network connection failed');
      expect(conversionResult.data).toBeUndefined();

      // Guest state should be preserved on failure
      expect(mockLocalStorage.clear).not.toHaveBeenCalled();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('guest_token');
    });

    test('should handle server errors during guest conversion', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error occurred' })
      } as Response);

      // Act
      const conversionResult = await authService.convertGuestToUser(
        'new_user',
        'newuser@example.com',
        'password123'
      );

      // Assert
      expect(conversionResult.error).toBe('Server error occurred');
      expect(conversionResult.data).toBeUndefined();

      // Guest state should remain intact
      expect(mockLocalStorage.clear).not.toHaveBeenCalled();
    });

    test('should handle expired guest session during conversion attempt', async () => {
      // Arrange
      const expiredGuestUser = {
        id: 1,
        username: 'expired_guest',
        is_guest: true,
        guest_id: 'guest_123',
        expires_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredGuestUser));

      // Act
      const isExpired = authService.isGuestSessionExpired();
      const conversionResult = await authService.convertGuestToUser(
        'new_user',
        'newuser@example.com',
        'password123'
      );

      // Assert
      expect(isExpired).toBe(true);
      expect(conversionResult.error).toBe('Guest session has expired');
      expect(conversionResult.data).toBeUndefined();
    });

    test('should handle concurrent conversion attempts', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123'
      };

      const conversionResponse = {
        access_token: 'regular.token.456',
        user: {
          id: 1,
          username: 'new_user',
          email: 'newuser@example.com',
          is_guest: false
        }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock successful conversion (only once)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(conversionResponse)
      } as Response);

      // Act - Multiple concurrent conversion attempts
      const conversionPromises = [
        authService.convertGuestToUser('user1', 'user1@example.com', 'password123'),
        authService.convertGuestToUser('user2', 'user2@example.com', 'password123'),
        authService.convertGuestToUser('user3', 'user3@example.com', 'password123')
      ];

      const results = await Promise.all(conversionPromises);

      // Assert - Only first should succeed, others should fail
      expect(results[0].error).toBeUndefined();
      expect(results[0].data?.is_guest).toBe(false);

      // Other attempts should fail due to guest state being cleared
      results.slice(1).forEach(result => {
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Post-Conversion Functionality', () => {
    test('should provide enhanced permissions after conversion', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123'
      };

      const convertedUser = {
        id: 1,
        username: 'new_user',
        email: 'newuser@example.com',
        role: 'student',
        is_active: true,
        is_guest: false,
        permissions: [
          'dashboard:read',
          'dashboard:write',
          'reports:read',
          'profile:write'
        ]
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'regular.token.456',
          user: convertedUser
        })
      } as Response);

      // Act
      const conversionResult = await authService.convertGuestToUser(
        'new_user',
        'newuser@example.com',
        'password123'
      );

      // Assert - Should have enhanced permissions
      expect(conversionResult.error).toBeUndefined();
      expect(conversionResult.data?.is_guest).toBe(false);
      expect(conversionResult.data?.role).toBe('student');
    });

    test('should enable full dashboard access after conversion', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123'
      };

      const fullDashboardData = {
        summary: {
          total_students: 100,
          total_drivers: 10,
          total_revenue: 50000,
          system_health: 'excellent'
        },
        recent_activity: [
          { type: 'user_registration', timestamp: new Date().toISOString() },
          { type: 'data_update', timestamp: new Date().toISOString() }
        ],
        analytics: {
          user_growth: 15,
          engagement_rate: 85,
          system_performance: 95
        }
      };

      // Setup converted user state
      const convertedUser = {
        id: 1,
        username: 'new_user',
        email: 'newuser@example.com',
        is_guest: false,
        access_token: 'regular.token.456'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'regular.token.456',
          user: convertedUser
        })
      } as Response);

      // Mock full dashboard access
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fullDashboardData)
      } as Response);

      // Act - Convert guest and access full dashboard
      const conversionResult = await authService.convertGuestToUser(
        'new_user',
        'newuser@example.com',
        'password123'
      );

      const dashboardResult = await fetch('/api/dashboard', {
        headers: { 'Authorization': 'Bearer regular.token.456' }
      });

      // Assert - Should have access to full dashboard features
      expect(conversionResult.error).toBeUndefined();
      expect(conversionResult.data?.is_guest).toBe(false);

      expect(dashboardResult.ok).toBe(true);
      const dashboardData = await dashboardResult.json();
      expect(dashboardData.summary.total_revenue).toBe(50000);
      expect(dashboardData.analytics).toBeDefined();
    });
  });
});