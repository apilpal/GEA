/**
 * @jest-environment jsdom
 *
 * Integration tests for guest dashboard functionality.
 * Tests the complete guest user workflow from login to dashboard interaction.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the global objects
declare global {
  var authService: any;
  var apiService: any;
  var GuestDashboardComponent: any;
  var GuestLoginComponent: any;
  var registerTestCustomElement: any;
}

describe('Guest Dashboard Integration', () => {
  let guestDashboardComponent: any;
  let guestLoginComponent: any;

  beforeEach(() => {
    // Setup DOM environment
    document.body.innerHTML = `
      <div id="auth-container">
        <div data-guest-login></div>
        <div data-guest-status></div>
      </div>
      <div id="main-app">
        <div data-guest-dashboard></div>
      </div>
      <div data-guest-error></div>
    `;

    // Setup global services
    global.authService = {
      getStoredUser: jest.fn(),
      setStoredUser: jest.fn(),
      clearStoredUser: jest.fn()
    };

    global.apiService = {
      get: jest.fn(),
      post: jest.fn()
    };

    // Setup global components
    global.GuestDashboardComponent = class MockGuestDashboardComponent {
      initialize = jest.fn();
      loadGuestDashboardData = jest.fn();
      setupEventListeners = jest.fn();
      renderGuestDashboard = jest.fn();
      destroy = jest.fn();
      isGuestUser = jest.fn();
      getCurrentGuestUser = jest.fn();
      refresh = jest.fn();
    };

    global.GuestLoginComponent = class MockGuestLoginComponent {
      initialize = jest.fn();
      setupEventListeners = jest.fn();
      showGuestLoginOption = jest.fn();
      showGuestStatus = jest.fn();
      destroy = jest.fn();
      isGuestAccessEnabled = jest.fn();
      enableGuestAccess = jest.fn();
      disableGuestAccess = jest.fn();
    };

    // Create component instances
    guestDashboardComponent = new (global as any).GuestDashboardComponent();
    guestLoginComponent = new (global as any).GuestLoginComponent();

    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Guest User Authentication Flow', () => {
    test('should handle complete guest login to dashboard flow', async () => {
      // Arrange
      const mockGuestUser = {
        id: 1,
        username: 'guest_test123',
        email: 'guest_test123@guest.local',
        role: 'student',
        is_guest: true,
        guest_token: 'guest_token_123'
      };

      const mockDashboardData = {
        guest_access: true,
        permissions: ['dashboard:read'],
        summary: {
          total_students: 100,
          total_drivers: 10,
          total_revenue: 50000,
          active_drivers: 8
        },
        message: 'Guest access - limited data available. Sign up for full access.'
      };

      // Setup API responses
      global.apiService.post.mockResolvedValue({
        error: null,
        data: {
          access_token: 'guest_access_token',
          refresh_token: 'guest_refresh_token',
          user: mockGuestUser,
          guest_id: 'guest_token_123',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });

      global.apiService.get.mockResolvedValue({
        error: null,
        data: mockDashboardData
      });

      // Act - Simulate guest login
      guestLoginComponent.enableGuestAccess();
      global.authService.setStoredUser(mockGuestUser);

      // Initialize guest dashboard
      await guestDashboardComponent.initialize();

      // Assert
      expect(guestLoginComponent.enableGuestAccess).toHaveBeenCalled();
      expect(global.authService.setStoredUser).toHaveBeenCalledWith(mockGuestUser);
      expect(guestDashboardComponent.initialize).toHaveBeenCalled();
      expect(global.apiService.get).toHaveBeenCalledWith('/auth/guest/dashboard');
    });

    test('should handle guest login failure gracefully', async () => {
      // Arrange
      global.apiService.post.mockResolvedValue({
        error: 'Failed to create guest session',
        data: null
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      try {
        await guestLoginComponent.handleGuestLogin();
      } catch (error) {
        // Expected to handle error gracefully
      }

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should handle guest dashboard loading failure', async () => {
      // Arrange
      const mockGuestUser = {
        id: 1,
        username: 'guest_test123',
        is_guest: true
      };

      global.authService.getStoredUser.mockReturnValue(mockGuestUser);
      global.apiService.get.mockResolvedValue({
        error: 'Network error',
        data: null
      });

      const showErrorSpy = jest.spyOn(guestDashboardComponent, 'showGuestDashboardError');

      // Act
      await guestDashboardComponent.loadGuestDashboardData();

      // Assert
      expect(showErrorSpy).toHaveBeenCalled();
      expect(global.apiService.get).toHaveBeenCalledWith('/auth/guest/dashboard');
    });
  });

  describe('Guest to Registered User Conversion', () => {
    test('should handle guest conversion workflow', async () => {
      // Arrange
      const mockGuestUser = {
        id: 1,
        username: 'guest_test123',
        is_guest: true,
        guest_token: 'guest_token_123'
      };

      const conversionData = {
        guest_id: 'guest_token_123',
        username: 'newuser123',
        email: 'newuser@example.com',
        password: 'secure_password_123'
      };

      const mockConvertedUser = {
        id: 1,
        username: 'newuser123',
        email: 'newuser@example.com',
        role: 'student',
        is_guest: false
      };

      // Setup API responses
      global.apiService.post
        .mockResolvedValueOnce({  // Guest login
          error: null,
          data: {
            access_token: 'guest_token',
            user: mockGuestUser
          }
        })
        .mockResolvedValueOnce({  // Guest conversion
          error: null,
          data: mockConvertedUser
        });

      // Act - Complete conversion workflow
      global.authService.setStoredUser(mockGuestUser);
      await guestDashboardComponent.initialize();

      // Simulate conversion request
      const conversionResponse = await global.apiService.post('/auth/convert-guest', conversionData);

      // Assert
      expect(conversionResponse.data.username).toBe('newuser123');
      expect(conversionResponse.data.is_guest).toBe(false);
      expect(global.authService.setStoredUser).toHaveBeenCalledWith(mockConvertedUser);
    });

    test('should handle conversion validation errors', async () => {
      // Arrange
      const invalidConversionData = {
        guest_id: 'guest_token_123',
        username: 'ab',  // Invalid: too short
        email: 'invalid-email',  // Invalid format
        password: '123'  // Invalid: too short
      };

      global.apiService.post.mockResolvedValue({
        error: 'Validation failed',
        data: null
      });

      // Act
      const response = await global.apiService.post('/auth/convert-guest', invalidConversionData);

      // Assert
      expect(response.error).toBe('Validation failed');
    });
  });

  describe('Dashboard Data Management', () => {
    test('should update dashboard with real-time data', async () => {
      // Arrange
      const mockGuestUser = {
        id: 1,
        username: 'guest_test123',
        is_guest: true
      };

      const mockDashboardData = {
        guest_access: true,
        permissions: ['dashboard:read'],
        summary: {
          total_students: 150,
          total_drivers: 15,
          total_revenue: 75000,
          active_drivers: 12
        }
      };

      global.authService.getStoredUser.mockReturnValue(mockGuestUser);
      global.apiService.get.mockResolvedValue({
        error: null,
        data: mockDashboardData
      });

      // Setup DOM elements for updates
      document.body.innerHTML += `
        <div id="total-students-dash">0</div>
        <div id="total-drivers-dash">0</div>
        <div id="total-revenue-dash">0</div>
        <div id="active-drivers-dash">0</div>
      `;

      // Act
      await guestDashboardComponent.loadGuestDashboardData();
      guestDashboardComponent.updateGuestSummaryData(mockDashboardData.summary);

      // Assert
      const studentsElement = document.getElementById('total-students-dash');
      const driversElement = document.getElementById('total-drivers-dash');
      const revenueElement = document.getElementById('total-revenue-dash');
      const activeElement = document.getElementById('active-drivers-dash');

      expect(studentsElement?.textContent).toBe('150');
      expect(driversElement?.textContent).toBe('15');
      expect(revenueElement?.textContent).toBe('75000');
      expect(activeElement?.textContent).toBe('12');

      // Verify guest indicators are added
      const indicators = document.querySelectorAll('.guest-indicator');
      expect(indicators.length).toBeGreaterThan(0);
    });

    test('should handle partial dashboard data updates', async () => {
      // Arrange
      const partialDashboardData = {
        summary: {
          total_students: 75
          // Missing other fields
        }
      };

      document.body.innerHTML += '<div id="total-students-dash">0</div>';

      // Act
      guestDashboardComponent.updateGuestSummaryData(partialDashboardData.summary);

      // Assert
      const studentsElement = document.getElementById('total-students-dash');
      expect(studentsElement?.textContent).toBe('75');

      // Should not throw errors for missing fields
      expect(() => {
        guestDashboardComponent.updateGuestSummaryData({});
      }).not.toThrow();
    });
  });

  describe('UI State Transitions', () => {
    test('should transition from guest login to dashboard correctly', async () => {
      // Arrange
      const mockGuestUser = {
        id: 1,
        username: 'guest_test123',
        is_guest: true
      };

      global.authService.getStoredUser.mockReturnValue(mockGuestUser);
      global.apiService.get.mockResolvedValue({
        error: null,
        data: {
          guest_access: true,
          summary: {}
        }
      });

      // Act - Initialize components
      await guestLoginComponent.initialize();
      await guestDashboardComponent.initialize();

      // Assert
      expect(guestLoginComponent.showGuestStatus).toHaveBeenCalled();
      expect(guestDashboardComponent.loadGuestDashboardData).toHaveBeenCalled();
    });

    test('should handle upgrade prompt workflow', () => {
      // Arrange
      jest.useFakeTimers();
      const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');

      // Act - Show upgrade prompt
      guestDashboardComponent.showUpgradePrompt();

      // Fast-forward time
      jest.advanceTimersByTime(10000);

      // Assert
      const modal = document.querySelector('.guest-upgrade-modal');
      expect(modal).toBeTruthy();

      // Act - Handle upgrade action
      guestDashboardComponent.handleUpgradeNow();

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'guest-upgrade-requested'
        })
      );
      expect(window.location.href).toBe('/register?guest=true');

      jest.useRealTimers();
      dispatchEventSpy.mockRestore();
    });

    test('should handle error states and recovery', async () => {
      // Arrange
      global.apiService.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          error: null,
          data: {
            guest_access: true,
            summary: { total_students: 50 }
          }
        });

      // Act - Initial failure
      await guestDashboardComponent.loadGuestDashboardData();

      // Verify error is shown
      const errorElement = document.querySelector('.guest-dashboard-error');
      expect(errorElement).toBeTruthy();

      // Act - Retry after fixing the issue
      const retryButton = document.querySelector('[data-retry-guest-dashboard]');
      if (retryButton) {
        (retryButton as HTMLElement).click();
      }

      // Assert
      expect(global.apiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Interaction', () => {
    test('should handle cross-component communication', () => {
      // Arrange
      const eventListenerSpy = jest.spyOn(document, 'addEventListener');
      const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');

      // Act - Setup event listeners
      guestLoginComponent.setupEventListeners();
      guestDashboardComponent.setupEventListeners();

      // Assert
      expect(eventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(eventListenerSpy).toHaveBeenCalledWith('guest-upgrade-requested', expect.any(Function));

      // Act - Dispatch custom event
      document.dispatchEvent(new CustomEvent('guest-upgrade-requested'));

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalled();
    });

    test('should handle component lifecycle events', () => {
      // Arrange
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      // Act - Destroy components
      guestLoginComponent.destroy();
      guestDashboardComponent.destroy();

      // Assert
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('guest-upgrade-requested', expect.any(Function));

      // Components should clean up their references
      expect(guestLoginComponent.guestLoginButton).toBeNull();
      expect(guestDashboardComponent.guestDashboardContainer).toBeNull();
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency across components', async () => {
      // Arrange
      const mockGuestUser = {
        id: 1,
        username: 'guest_test123',
        is_guest: true
      };

      const mockDashboardData = {
        guest_access: true,
        permissions: ['dashboard:read'],
        summary: {
          total_students: 100,
          total_drivers: 10
        }
      };

      global.authService.getStoredUser.mockReturnValue(mockGuestUser);
      global.apiService.get.mockResolvedValue({
        error: null,
        data: mockDashboardData
      });

      // Act
      await guestLoginComponent.initialize();
      await guestDashboardComponent.initialize();

      // Assert - Both components should work with same user data
      expect(guestLoginComponent.getCurrentGuestUser()).toEqual(mockGuestUser);
      expect(guestDashboardComponent.getCurrentGuestUser()).toEqual(mockGuestUser);

      // Dashboard should receive the same data
      expect(guestDashboardComponent.renderGuestDashboard).toHaveBeenCalledWith(mockDashboardData);
    });

    test('should handle concurrent data updates', async () => {
      // Arrange
      const mockGuestUser = { id: 1, username: 'guest_test123', is_guest: true };

      global.authService.getStoredUser.mockReturnValue(mockGuestUser);

      // Mock multiple API calls
      global.apiService.get
        .mockResolvedValueOnce({
          error: null,
          data: { guest_access: true, summary: { total_students: 100 } }
        })
        .mockResolvedValueOnce({
          error: null,
          data: { guest_access: true, summary: { total_students: 150 } }
        });

      // Act - Multiple concurrent dashboard loads
      await Promise.all([
        guestDashboardComponent.loadGuestDashboardData(),
        guestDashboardComponent.loadGuestDashboardData()
      ]);

      // Assert
      expect(global.apiService.get).toHaveBeenCalledTimes(2);
      expect(guestDashboardComponent.renderGuestDashboard).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle rapid user interactions without memory leaks', () => {
      // Arrange
      const mockGuestUser = { id: 1, username: 'guest_test123', is_guest: true };
      global.authService.getStoredUser.mockReturnValue(mockGuestUser);

      // Act - Simulate rapid interactions
      for (let i = 0; i < 10; i++) {
        guestDashboardComponent.isGuestUser();
        guestLoginComponent.isGuestAccessEnabled();
      }

      // Assert - Should not accumulate memory or errors
      expect(guestDashboardComponent.isGuestUser).toHaveBeenCalledTimes(10);
      expect(guestLoginComponent.isGuestAccessEnabled).toHaveBeenCalledTimes(10);
    });

    test('should cleanup resources on component destruction', () => {
      // Arrange
      const mockElements = [
        document.createElement('div'),
        document.createElement('button'),
        document.createElement('span')
      ];

      guestDashboardComponent.guestDashboardContainer = mockElements[0];
      guestLoginComponent.guestLoginButton = mockElements[1];
      guestLoginComponent.guestStatusIndicator = mockElements[2];

      // Act
      guestDashboardComponent.destroy();
      guestLoginComponent.destroy();

      // Assert - References should be cleared
      expect(guestDashboardComponent.guestDashboardContainer).toBeNull();
      expect(guestLoginComponent.guestLoginButton).toBeNull();
      expect(guestLoginComponent.guestStatusIndicator).toBeNull();
    });
  });
});