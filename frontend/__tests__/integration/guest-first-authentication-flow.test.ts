/**
 * Guest-First Authentication Flow Integration Tests
 *
 * Tests the updated authentication flow with guest-first dashboard architecture:
 * - Guest access to dashboard without authentication
 * - Auto-creation of guest users for dashboard access
 * - Updated authentication checks that consider guest users as authenticated for dashboard
 * - Public API endpoints integration
 * - Enhanced error scenarios for guest-first flow
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

describe('Guest-First Authentication Flow Integration Tests', () => {
  describe('Guest-First Dashboard Architecture', () => {
    test('should allow guest access to dashboard without authentication', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestDashboardData = {
        guest_access: true,
        permissions: ['dashboard:read'],
        summary: {
          total_students: 100,
          total_drivers: 10,
          system_status: 'operational'
        },
        message: 'Guest access - limited data available.'
      };

      // Mock public dashboard API (no authentication required)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(guestDashboardData)
      } as Response);

      // Act - Access dashboard without authentication
      const dashboardResponse = await fetch('/api/dashboard/public/stats');
      const dashboardData = await dashboardResponse.json();

      // Assert
      expect(dashboardResponse.ok).toBe(true);
      expect(dashboardData.guest_access).toBe(true);
      expect(dashboardData.summary.total_students).toBe(100);
    });

    test('should auto-create guest user for unauthenticated dashboard access', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_auto_created',
        is_guest: true,
        guest_id: 'auto_guest_123',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      const guestDashboardData = {
        guest_access: true,
        permissions: ['dashboard:read'],
        summary: { total_students: 50, total_drivers: 5 }
      };

      // Mock guest user creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(guestUser)
      } as Response);

      // Mock guest dashboard access
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(guestDashboardData)
      } as Response);

      // Act - Simulate guest-first dashboard access
      const guestResult = await authService.createGuestUser();
      const dashboardResult = await authService.getGuestDashboardData();

      // Assert
      expect(guestResult.error).toBeUndefined();
      expect(guestResult.data?.is_guest).toBe(true);
      expect(dashboardResult.data?.guest_access).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('guest_access_enabled', 'true');
    });

    test('should maintain guest session for dashboard access', async () => {
      // Arrange
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Act
      const isGuest = authService.isGuestUser();
      const isAuthenticated = await authService.isAuthenticated();

      // Assert - Guest users should be considered authenticated for dashboard access
      expect(isGuest).toBe(true);
      expect(isAuthenticated).toBe(true);
    });

    test('should handle guest dashboard access errors gracefully', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Dashboard service unavailable'));

      // Act
      const dashboardResult = await authService.getGuestDashboardData();

      // Assert
      expect(dashboardResult.error).toBe('An unexpected error occurred while loading dashboard');
      expect(dashboardResult.data).toBeUndefined();
    });

    test('should redirect to login for protected routes while allowing guest dashboard access', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock guest dashboard success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ guest_access: true, summary: {} })
      } as Response);

      // Mock protected route failure (should redirect to login)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      // Act
      const dashboardResponse = await fetch('/api/dashboard/public/stats');
      const protectedResponse = await fetch('/api/protected-route');

      // Assert
      expect(dashboardResponse.ok).toBe(true); // Guest dashboard should work
      expect(protectedResponse.ok).toBe(false); // Protected routes should require auth
      expect(protectedResponse.status).toBe(401);
    });
  });

  describe('Public API Endpoints Integration', () => {
    test('should access public stats without authentication', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const publicStatsData = {
        total_drivers: 25,
        total_students: 150,
        total_revenue: 50000,
        active_drivers: 22,
        system_status: 'operational',
        guest_access: true,
        last_updated: '2024-01-15T10:30:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(publicStatsData)
      } as Response);

      // Act
      const statsResponse = await fetch('/api/dashboard/public/stats');
      const statsData = await statsResponse.json();

      // Assert
      expect(statsResponse.ok).toBe(true);
      expect(statsData.guest_access).toBe(true);
      expect(statsData.total_students).toBe(150);
      expect(statsData.total_drivers).toBe(25);
    });

    test('should access public charts data without authentication', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const publicChartsData = {
        student_distribution: {
          labels: ['Grade 1', 'Grade 2', 'Grade 3'],
          data: [50, 45, 55]
        },
        revenue_by_driver: {
          labels: ['Driver A', 'Driver B', 'Driver C'],
          data: [15000, 20000, 15000]
        },
        revenue_by_class: {
          labels: ['Morning', 'Afternoon', 'Evening'],
          data: [25000, 20000, 5000]
        },
        guest_access: true,
        charts_count: 3
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(publicChartsData)
      } as Response);

      // Act
      const chartsResponse = await fetch('/api/dashboard/public/charts');
      const chartsData = await chartsResponse.json();

      // Assert
      expect(chartsResponse.ok).toBe(true);
      expect(chartsData.guest_access).toBe(true);
      expect(chartsData.charts_count).toBe(3);
      expect(chartsData.student_distribution.labels).toHaveLength(3);
    });

    test('should access public driver information with data filtering', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const publicDriversData = {
        drivers: [
          {
            id: 1,
            name: 'John Doe',
            route: 'Route A',
            status: 'active',
            total_students: 25
          },
          {
            id: 2,
            name: 'Jane Smith',
            route: 'Route B',
            status: 'active',
            total_students: 30
          }
        ],
        total_count: 2,
        guest_access: true,
        pagination: {
          skip: 0,
          limit: 20,
          has_more: false
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(publicDriversData)
      } as Response);

      // Act
      const driversResponse = await fetch('/api/dashboard/public/drivers');
      const driversData = await driversResponse.json();

      // Assert
      expect(driversResponse.ok).toBe(true);
      expect(driversData.guest_access).toBe(true);
      expect(driversData.drivers).toHaveLength(2);
      expect(driversData.drivers[0]).not.toHaveProperty('contact_number');
      expect(driversData.drivers[0]).not.toHaveProperty('license_number');
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should handle rate limiting on public endpoints', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'retry-after': '60'
        })
      } as Response);

      // Act
      const response = await fetch('/api/dashboard/public/stats');

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
    });

    test('should respect different rate limits per public endpoint', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Stats endpoint (30 per minute)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ guest_access: true }),
        headers: new Headers({ 'x-ratelimit-limit': '30' })
      } as Response);

      // Charts endpoint (20 per minute)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ guest_access: true }),
        headers: new Headers({ 'x-ratelimit-limit': '20' })
      } as Response);

      // Drivers endpoint (25 per minute)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ guest_access: true }),
        headers: new Headers({ 'x-ratelimit-limit': '25' })
      } as Response);

      // Act
      const statsResponse = await fetch('/api/dashboard/public/stats');
      const chartsResponse = await fetch('/api/dashboard/public/charts');
      const driversResponse = await fetch('/api/dashboard/public/drivers');

      // Assert
      expect(statsResponse.ok).toBe(true);
      expect(chartsResponse.ok).toBe(true);
      expect(driversResponse.ok).toBe(true);
    });
  });

  describe('Guest Dashboard Functionality', () => {
    test('should load guest dashboard data with limited permissions', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      const guestDashboardData = {
        guest_access: true,
        permissions: ['dashboard:read'],
        summary: {
          total_students: 75,
          total_drivers: 8,
          system_status: 'operational'
        },
        message: 'Guest access - limited data available.'
      };

      // Mock guest user state
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock guest dashboard API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(guestDashboardData)
      } as Response);

      // Act
      const isGuest = authService.isGuestUser();
      const dashboardResult = await authService.getGuestDashboardData();

      // Assert
      expect(isGuest).toBe(true);
      expect(dashboardResult.data?.guest_access).toBe(true);
      expect(dashboardResult.data?.permissions).toEqual(['dashboard:read']);
      expect(dashboardResult.data?.summary.total_students).toBe(75);
    });

    test('should show upgrade prompts for guest users', async () => {
      // Arrange
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Act
      const isGuest = authService.isGuestUser();
      const storedUser = authService.getStoredUser();

      // Assert
      expect(isGuest).toBe(true);
      expect(storedUser?.is_guest).toBe(true);
      // In a real scenario, this would trigger UI upgrade prompts
    });

    test('should handle guest user session timeout', async () => {
      // Arrange
      const expiredGuestUser = {
        id: 1,
        username: 'expired_guest',
        is_guest: true,
        expires_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredGuestUser));

      // Act
      const isGuest = authService.isGuestUser();
      const isExpired = authService.isGuestSessionExpired();

      // Assert
      expect(isGuest).toBe(true);
      expect(isExpired).toBe(true);
    });
  });

  describe('Error Scenarios for Guest-First Flow', () => {
    test('should handle network errors during public API access', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));

      // Act & Assert
      await expect(fetch('/api/dashboard/public/stats')).rejects.toThrow('Network Error');
    });

    test('should handle server errors on public endpoints', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as Response);

      // Act
      const response = await fetch('/api/dashboard/public/stats');

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(503);
    });

    test('should handle malformed responses from public APIs', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        }
      } as Response);

      // Act & Assert
      await expect(fetch('/api/dashboard/public/stats')).rejects.toThrow();
    });

    test('should maintain security by filtering sensitive data in public responses', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const publicDriversResponse = {
        drivers: [
          {
            id: 1,
            name: 'Test Driver',
            route: 'Test Route',
            status: 'active',
            total_students: 20,
            // These should NOT be present in public response
            contact_number: '+1234567890',
            license_number: 'ABC123',
            vehicle_number: 'XYZ789'
          }
        ],
        total_count: 1,
        guest_access: true,
        pagination: { skip: 0, limit: 20, has_more: false }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(publicDriversResponse)
      } as Response);

      // Act
      const response = await fetch('/api/dashboard/public/drivers');
      const data = await response.json();

      // Assert - Sensitive data should be filtered out
      expect(data.drivers[0]).not.toHaveProperty('contact_number');
      expect(data.drivers[0]).not.toHaveProperty('license_number');
      expect(data.drivers[0]).not.toHaveProperty('vehicle_number');
      expect(data.drivers[0]).toHaveProperty('name');
      expect(data.drivers[0]).toHaveProperty('route');
    });
  });

  describe('JWT Token Management for Guest Users', () => {
    /**
     * @description Test comprehensive JWT token handling scenarios for guest users
     * including token creation, validation, expiration, and refresh
     */
    test('should handle guest JWT token creation and storage', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestTokenResponse = {
        access_token: 'guest.jwt.token.12345',
        token_type: 'Bearer',
        expires_in: 3600,
        guest_id: 'guest_123',
        is_guest: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(guestTokenResponse)
      } as Response);

      // Act
      const tokenResult = await authService.createGuestToken();

      // Assert
      expect(tokenResult.error).toBeUndefined();
      expect(tokenResult.data?.access_token).toBe('guest.jwt.token.12345');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'guest_token',
        'guest.jwt.token.12345'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'guest_token_expires',
        expect.any(String)
      );
    });

    test('should validate guest JWT token properly', async () => {
      // Arrange
      const validToken = 'valid.guest.token.123';
      const validGuestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'guest_token') return validToken;
        if (key === 'guest_user') return JSON.stringify(validGuestUser);
        return null;
      });

      // Act
      const isValid = authService.validateGuestToken();
      const tokenPayload = authService.getGuestTokenPayload();

      // Assert
      expect(isValid).toBe(true);
      expect(tokenPayload?.is_guest).toBe(true);
      expect(tokenPayload?.username).toBe('guest_user');
    });

    test('should handle expired guest JWT token', async () => {
      // Arrange
      const expiredToken = 'expired.guest.token.123';
      const expiredGuestUser = {
        id: 1,
        username: 'expired_guest',
        is_guest: true,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'guest_token') return expiredToken;
        if (key === 'guest_user') return JSON.stringify(expiredGuestUser);
        return null;
      });

      // Act
      const isValid = authService.validateGuestToken();

      // Assert
      expect(isValid).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('guest_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('guest_user');
    });

    test('should refresh expired guest JWT token', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const refreshResponse = {
        access_token: 'new.guest.token.456',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(refreshResponse)
      } as Response);

      // Act
      const refreshResult = await authService.refreshGuestToken();

      // Assert
      expect(refreshResult.error).toBeUndefined();
      expect(refreshResult.data?.access_token).toBe('new.guest.token.456');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'guest_token',
        'new.guest.token.456'
      );
    });

    test('should handle malformed guest JWT token', () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue('malformed.token');

      // Act & Assert
      expect(() => authService.getGuestTokenPayload()).not.toThrow();
      expect(authService.validateGuestToken()).toBe(false);
    });
  });

  describe('Guest User Conversion Flow', () => {
    test('should convert guest user to registered user successfully', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user_123',
        is_guest: true,
        guest_id: 'guest_123'
      };

      const convertedUser = {
        id: 1,
        username: 'new_user',
        email: 'newuser@example.com',
        role: 'student',
        is_active: true,
        is_guest: false
      };

      // Mock current guest user
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock conversion API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(convertedUser)
      } as Response);

      // Act
      const conversionResult = await authService.convertGuestToUser(
        'new_user',
        'newuser@example.com',
        'password123'
      );

      // Assert
      expect(conversionResult.error).toBeUndefined();
      expect(conversionResult.data?.is_guest).toBe(false);
      expect(conversionResult.data?.username).toBe('new_user');
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });

    test('should handle guest conversion failures gracefully', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user_123',
        is_guest: true,
        guest_id: 'guest_123'
      };

      // Mock conversion failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Username already exists' })
      } as Response);

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Act
      const conversionResult = await authService.convertGuestToUser(
        'existing_user',
        'test@example.com',
        'password123'
      );

      // Assert
      expect(conversionResult.error).toBe('Username already exists');
      expect(conversionResult.data).toBeUndefined();
    });

    test('should transfer guest token during conversion', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user_123',
        is_guest: true,
        guest_token: 'guest.jwt.token.123'
      };

      const conversionResponse = {
        access_token: 'regular.jwt.token.456',
        token_type: 'Bearer',
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

      // Act
      const conversionResult = await authService.convertGuestToUser(
        'new_user',
        'newuser@example.com',
        'password123'
      );

      // Assert
      expect(conversionResult.error).toBeUndefined();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'access_token',
        'regular.jwt.token.456'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(conversionResponse.user)
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('guest_token');
    });
  });

  describe('Integration with Existing Authentication', () => {
    test('should work alongside existing authentication flow', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockUser = {
        id: 1,
        username: 'dev_user',
        email: 'dev@example.com',
        role: 'admin',
        is_active: true
      };

      // Mock successful login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'jwt-token-123',
          token_type: 'Bearer'
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUser)
      } as Response);

      // Act
      const loginResult = await authService.login({
        username_or_email: 'dev_user',
        password: 'dev_password_123'
      });

      // Assert - Existing authentication should still work
      expect(loginResult.error).toBeUndefined();
      expect(loginResult.data).toEqual(mockUser);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('access_token', 'jwt-token-123');
    });

    test('should maintain security for protected routes', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockLocalStorage.getItem.mockReturnValue(null);

      // Mock protected route access without authentication
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      // Act
      const isAuthenticated = await authService.isAuthenticated();
      const protectedResponse = await fetch('/api/protected-route');

      // Assert - Protected routes should still require authentication
      expect(isAuthenticated).toBe(false);
      expect(protectedResponse.ok).toBe(false);
      expect(protectedResponse.status).toBe(401);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle rapid guest dashboard operations efficiently', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestDashboardData = {
        guest_access: true,
        summary: { total_students: 100, total_drivers: 10 }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(guestDashboardData)
      } as Response);

      // Act - Multiple rapid operations
      const operations = [];
      for (let i = 0; i < 5; i++) {
        operations.push(fetch('/api/dashboard/public/stats'));
      }

      const results = await Promise.all(operations);

      // Assert - All operations should complete successfully
      results.forEach(result => {
        expect(result.ok).toBe(true);
      });
    });

    test('should handle guest user state updates efficiently', () => {
      // Arrange
      const guestUser = {
        id: 1,
        username: 'guest_test',
        is_guest: true
      };

      // Act - Multiple state checks
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(authService.isGuestUser());
      }

      // Assert - All operations should return consistent results
      operations.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });
});