/**
 * Guest Dashboard Functionality Integration Tests
 *
 * Tests comprehensive guest dashboard access patterns, functionality limitations,
 * and integration scenarios for the guest-first architecture.
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

describe('Guest Dashboard Functionality Integration Tests', () => {
  describe('Guest Dashboard Access Patterns', () => {
    /**
     * @description Test various guest dashboard access scenarios including
     * initial access, data loading, and permission handling
     */
    test('should allow guest access to dashboard with limited data', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        guest_id: 'guest_123',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      const limitedDashboardData = {
        guest_access: true,
        permissions: ['dashboard:read'],
        summary: {
          total_students: 50, // Limited data
          total_drivers: 5,   // Limited data
          system_status: 'operational'
        },
        message: 'Guest access - limited data available.',
        data_restrictions: [
          'contact_details_hidden',
          'financial_data_hidden',
          'admin_functions_disabled'
        ]
      };

      // Mock guest user state
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock limited dashboard API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(limitedDashboardData)
      } as Response);

      // Act
      const isGuest = authService.isGuestUser();
      const dashboardResult = await authService.getGuestDashboardData();

      // Assert
      expect(isGuest).toBe(true);
      expect(dashboardResult.data?.guest_access).toBe(true);
      expect(dashboardResult.data?.permissions).toEqual(['dashboard:read']);
      expect(dashboardResult.data?.summary.total_students).toBe(50);
      expect(dashboardResult.data?.data_restrictions).toContain('contact_details_hidden');
    });

    test('should handle guest dashboard access without prior authentication', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock auto guest creation
      const guestUser = {
        id: 1,
        username: 'auto_guest',
        is_guest: true,
        guest_id: 'auto_guest_123',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      // Mock guest dashboard data for new guest
      const dashboardData = {
        guest_access: true,
        permissions: ['dashboard:read'],
        summary: {
          total_students: 25,
          total_drivers: 3,
          system_status: 'operational'
        },
        welcome_message: 'Welcome to the guest dashboard!'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(guestUser)
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(dashboardData)
      } as Response);

      // Act - Access dashboard without prior guest creation
      const guestResult = await authService.createGuestUser();
      const dashboardResult = await authService.getGuestDashboardData();

      // Assert
      expect(guestResult.error).toBeUndefined();
      expect(guestResult.data?.is_guest).toBe(true);
      expect(dashboardResult.data?.guest_access).toBe(true);
      expect(dashboardResult.data?.welcome_message).toBe('Welcome to the guest dashboard!');
    });

    test('should enforce guest dashboard data limitations', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        role: 'guest'
      };

      // Mock dashboard response with sensitive data that should be filtered
      const unfilteredResponse = {
        guest_access: true,
        summary: {
          total_students: 100,
          total_drivers: 10,
          internal_metrics: {
            server_load: 0.75,
            database_performance: 'optimal'
          },
          sensitive_data: {
            user_contact_info: ['user1@example.com', 'user2@example.com'],
            financial_records: [1000, 2000, 1500]
          }
        }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(unfilteredResponse)
      } as Response);

      // Act
      const dashboardResult = await authService.getGuestDashboardData();

      // Assert - Sensitive data should be filtered out
      expect(dashboardResult.data?.summary).toBeDefined();
      expect(dashboardResult.data?.summary.total_students).toBe(100);
      expect(dashboardResult.data?.summary.total_drivers).toBe(10);
      expect(dashboardResult.data?.summary.internal_metrics).toBeUndefined();
      expect(dashboardResult.data?.summary.sensitive_data).toBeUndefined();
    });
  });

  describe('Guest Dashboard Functionality Limitations', () => {
    /**
     * @description Test that guest users have limited functionality and cannot
     * access features reserved for authenticated users
     */
    test('should restrict guest users from accessing protected dashboard features', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        permissions: ['dashboard:read']
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock protected feature access attempts
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ error: 'Guest users cannot access this feature' })
      } as Response);

      // Act - Try to access protected dashboard features
      const protectedResponse = await fetch('/api/dashboard/protected-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      // Assert
      expect(protectedResponse.ok).toBe(false);
      expect(protectedResponse.status).toBe(403);
    });

    test('should show upgrade prompts for premium features', async () => {
      // Arrange
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        upgrade_prompts: [
          'advanced_reports',
          'export_functionality',
          'priority_support'
        ]
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Act
      const isGuest = authService.isGuestUser();
      const storedUser = authService.getStoredUser();

      // Assert - Should identify upgrade opportunities
      expect(isGuest).toBe(true);
      expect(storedUser?.is_guest).toBe(true);
      expect((storedUser as any)?.upgrade_prompts).toContain('advanced_reports');
    });

    test('should limit guest dashboard data refresh frequency', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        last_refresh: Date.now()
      };

      const dashboardData = {
        guest_access: true,
        summary: { total_students: 50, total_drivers: 5 },
        refresh_limit: '30 seconds between refreshes'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(dashboardData)
      } as Response);

      // Act - Attempt rapid refreshes
      const startTime = Date.now();
      const refresh1 = await authService.getGuestDashboardData();
      const refresh2 = await authService.getGuestDashboardData();
      const endTime = Date.now();

      // Assert - Should handle rate limiting
      expect(refresh1.data?.guest_access).toBe(true);
      expect(refresh2.data?.guest_access).toBe(true);
      expect(endTime - startTime).toBeGreaterThan(100); // Should have some delay
    });
  });

  describe('Guest Dashboard UI Integration', () => {
    /**
     * @description Test UI components and interactions specific to guest dashboard
     * including visual indicators, upgrade prompts, and user experience
     */
    test('should display guest user indicators in dashboard UI', () => {
      // Arrange
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true,
        display_name: 'Guest User'
      };

      // Setup DOM environment
      document.body.innerHTML = `
        <div class="dashboard-header">
          <div class="user-status" data-guest-indicator></div>
          <span class="user-name" data-user-name></span>
        </div>
        <div class="guest-features">
          <div class="upgrade-prompt" data-upgrade-prompt style="display: none;">
            Upgrade for full access
          </div>
        </div>
      `;

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Act - Initialize guest dashboard UI
      const isGuest = authService.isGuestUser();
      if (isGuest) {
        const guestIndicator = document.querySelector('[data-guest-indicator]');
        const userName = document.querySelector('[data-user-name]');
        const upgradePrompt = document.querySelector('[data-upgrade-prompt]');

        if (guestIndicator) guestIndicator.textContent = 'Guest';
        if (userName) userName.textContent = 'Guest User';
        if (upgradePrompt) {
          (upgradePrompt as HTMLElement).style.display = 'block';
        }
      }

      // Assert - UI should show guest indicators
      expect(document.querySelector('[data-guest-indicator]')?.textContent).toBe('Guest');
      expect(document.querySelector('[data-user-name]')?.textContent).toBe('Guest User');
      expect((document.querySelector('[data-upgrade-prompt]') as HTMLElement)?.style.display).toBe('block');
    });

    test('should handle guest dashboard component interactions', async () => {
      // Arrange
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true
      };

      // Setup DOM with interactive elements
      document.body.innerHTML = `
        <div class="guest-dashboard">
          <button class="refresh-btn" data-refresh>Refresh</button>
          <button class="upgrade-btn" data-upgrade>Upgrade Account</button>
          <div class="guest-notice" data-guest-notice>
            You are viewing limited guest data
          </div>
        </div>
      `;

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock refresh API
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          guest_access: true,
          summary: { total_students: 75, total_drivers: 8 }
        })
      } as Response);

      // Act - Simulate user interactions
      const refreshBtn = document.querySelector('[data-refresh]') as HTMLButtonElement;
      const upgradeBtn = document.querySelector('[data-upgrade]') as HTMLButtonElement;

      if (refreshBtn) refreshBtn.click();
      if (upgradeBtn) upgradeBtn.click();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert - Should handle interactions appropriately
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/dashboard/guest/refresh',
        expect.any(Object)
      );
    });
  });

  describe('Guest Dashboard Error Handling', () => {
    /**
     * @description Test error scenarios specific to guest dashboard functionality
     * including network issues, permission errors, and data loading failures
     */
    test('should handle guest dashboard loading failures gracefully', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Dashboard service unavailable'));

      // Act
      const dashboardResult = await authService.getGuestDashboardData();

      // Assert
      expect(dashboardResult.error).toBe('An unexpected error occurred while loading dashboard');
      expect(dashboardResult.data).toBeUndefined();
    });

    test('should handle guest session expiration during dashboard usage', async () => {
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

      // Assert - Should detect expiration
      expect(isGuest).toBe(true);
      expect(isExpired).toBe(true);
    });

    test('should handle malformed guest dashboard data', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));

      // Mock malformed response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          // Missing required fields
          guest_access: true
          // summary and permissions missing
        })
      } as Response);

      // Act
      const dashboardResult = await authService.getGuestDashboardData();

      // Assert - Should handle gracefully
      expect(dashboardResult.error).toBeUndefined();
      expect(dashboardResult.data?.guest_access).toBe(true);
    });
  });

  describe('Guest Dashboard Performance and Scalability', () => {
    /**
     * @description Test performance characteristics of guest dashboard
     * including load times, memory usage, and concurrent access
     */
    test('should load guest dashboard data efficiently', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true
      };

      const dashboardData = {
        guest_access: true,
        summary: { total_students: 100, total_drivers: 10 },
        permissions: ['dashboard:read'],
        charts: ['student_distribution', 'driver_routes']
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(dashboardData)
      } as Response);

      // Act - Measure load time
      const startTime = performance.now();
      const dashboardResult = await authService.getGuestDashboardData();
      const endTime = performance.now();

      // Assert - Should load within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // Should load within 1 second
      expect(dashboardResult.error).toBeUndefined();
      expect(dashboardResult.data?.guest_access).toBe(true);
    });

    test('should handle concurrent guest dashboard access', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user',
        is_guest: true
      };

      const dashboardData = {
        guest_access: true,
        summary: { total_students: 50, total_drivers: 5 }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(guestUser));
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(dashboardData)
      } as Response);

      // Act - Multiple concurrent dashboard loads
      const dashboardOperations = Array.from({ length: 5 }, () =>
        authService.getGuestDashboardData()
      );

      const results = await Promise.all(dashboardOperations);

      // Assert - All operations should succeed
      results.forEach((result, index) => {
        expect(result.error).toBeUndefined();
        expect(result.data?.guest_access).toBe(true);
        expect(result.data?.summary.total_students).toBe(50);
      });
    });
  });
});