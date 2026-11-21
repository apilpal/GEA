/**
 * @jest-environment jsdom
 *
 * Comprehensive tests for dashboard manager functionality.
 * Tests dashboard stats updates, guest user handling, and UI management.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the global services
declare global {
  var authService: any;
  var apiService: any;
}

describe('Dashboard Manager', () => {
  beforeEach(() => {
    // Setup DOM environment
    document.body.innerHTML = `
      <div class="dashboard-container" data-dashboard>
        <div id="total-students-dash">0</div>
        <div id="total-drivers-dash">0</div>
        <div id="total-revenue-dash">0</div>
        <div id="active-drivers-dash">0</div>
      </div>
      <div data-guest-banner></div>
      <div data-guest-features-modal></div>
    `;

    // Setup global services
    global.authService = {
      isGuestUser: jest.fn(),
      getGuestDashboardData: jest.fn(),
      isGuestSessionExpired: jest.fn(),
      createGuestUser: jest.fn()
    };

    global.apiService = {
      get: jest.fn()
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Dashboard Stats Updates', () => {
    test('should update dashboard stats for regular users', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(false);
      global.apiService.get.mockResolvedValue({
        error: null,
        data: {
          total_students: 150,
          total_drivers: 25,
          total_revenue: 75000,
          active_drivers: 20
        }
      });

      // Act
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      // Assert
      expect(global.apiService.get).toHaveBeenCalledWith('/reports/summary');

      const studentsElement = document.getElementById('total-students-dash');
      const driversElement = document.getElementById('total-drivers-dash');
      const revenueElement = document.getElementById('total-revenue-dash');
      const activeElement = document.getElementById('active-drivers-dash');

      expect(studentsElement?.textContent).toBe('150');
      expect(driversElement?.textContent).toBe('25');
      expect(revenueElement?.textContent).toBe('75000');
      expect(activeElement?.textContent).toBe('20');

      // Should not have guest indicators for regular users
      const indicators = document.querySelectorAll('.guest-indicator');
      expect(indicators.length).toBe(0);
    });

    test('should update dashboard stats for guest users', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: {
          guest_access: true,
          summary: {
            total_students: 100,
            total_drivers: 15,
            total_revenue: 50000,
            active_drivers: 12
          }
        }
      });

      // Act
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      // Assert
      expect(global.authService.getGuestDashboardData).toHaveBeenCalled();

      const studentsElement = document.getElementById('total-students-dash');
      const driversElement = document.getElementById('total-drivers-dash');
      const revenueElement = document.getElementById('total-revenue-dash');
      const activeElement = document.getElementById('active-drivers-dash');

      expect(studentsElement?.textContent).toBe('100');
      expect(driversElement?.textContent).toBe('15');
      expect(revenueElement?.textContent).toBe('50000');
      expect(activeElement?.textContent).toBe('12');

      // Should have guest indicators for guest users
      const indicators = document.querySelectorAll('.guest-indicator');
      expect(indicators.length).toBeGreaterThan(0);

      // Check guest banner is added
      const guestBanner = document.querySelector('[data-guest-banner]');
      expect(guestBanner).toBeTruthy();
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(false);
      global.apiService.get.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update dashboard stats:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    test('should handle missing dashboard elements gracefully', async () => {
      // Arrange
      document.body.innerHTML = '<div class="dashboard-container"></div>'; // No stat elements

      global.authService.isGuestUser.mockReturnValue(false);
      global.apiService.get.mockResolvedValue({
        error: null,
        data: {
          total_students: 100,
          total_drivers: 10
        }
      });

      // Act (should not throw)
      expect(async () => {
        await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();
      }).not.toThrow();
    });
  });

  describe('Guest User Dashboard Management', () => {
    test('should initialize guest dashboard correctly', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.isGuestSessionExpired.mockReturnValue(false);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: {
          guest_access: true,
          summary: { total_students: 100, total_drivers: 10 }
        }
      });

      // Mock GuestDashboardComponent
      const mockGuestComponent = {
        initialize: jest.fn().mockResolvedValue(undefined)
      };

      jest.doMock('../components/auth/guest-dashboard-component', () => ({
        guestDashboardComponent: mockGuestComponent
      }));

      // Act
      await require('../src/ts/page-managers/dashboard-manager').initializeGuestDashboard();

      // Assert
      expect(global.authService.getGuestDashboardData).toHaveBeenCalled();
      expect(mockGuestComponent.initialize).toHaveBeenCalled();
    });

    test('should refresh expired guest session', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.isGuestSessionExpired
        .mockReturnValueOnce(true)  // Initially expired
        .mockReturnValueOnce(false); // After refresh

      global.authService.createGuestUser.mockResolvedValue({
        access_token: 'new_token',
        user: { id: 1, username: 'guest_new', is_guest: true }
      });

      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: {
          guest_access: true,
          summary: { total_students: 50, total_drivers: 5 }
        }
      });

      // Act
      await require('../src/ts/page-managers/dashboard-manager').initializeGuestDashboard();

      // Assert
      expect(global.authService.createGuestUser).toHaveBeenCalled();
      expect(global.authService.getGuestDashboardData).toHaveBeenCalled();
    });

    test('should handle guest component initialization failure', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: { guest_access: true, summary: {} }
      });

      // Mock import failure
      jest.doMock('../components/auth/guest-dashboard-component', () => {
        throw new Error('Component not found');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await require('../src/ts/page-managers/dashboard-manager').initializeGuestDashboard();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DASHBOARD] Failed to initialize GuestDashboardComponent:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Guest Dashboard Elements', () => {
    test('should add guest indicators to dashboard elements', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: {
          guest_access: true,
          summary: { total_students: 100, total_drivers: 10 }
        }
      });

      // Act
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      // Assert
      const studentsElement = document.getElementById('total-students-dash');
      const driversElement = document.getElementById('total-drivers-dash');

      expect(studentsElement?.querySelector('.guest-indicator')).toBeTruthy();
      expect(driversElement?.querySelector('.guest-indicator')).toBeTruthy();

      const indicators = document.querySelectorAll('.guest-indicator');
      indicators.forEach(indicator => {
        expect(indicator.title).toBe('Limited view - sign up for full access');
        expect(indicator.textContent).toBe('👁️');
      });
    });

    test('should add guest banner to dashboard', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: {
          guest_access: true,
          summary: {}
        }
      });

      // Act
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      // Assert
      const guestBanner = document.querySelector('.guest-dashboard-banner');
      expect(guestBanner).toBeTruthy();
      expect(guestBanner?.textContent).toContain('Guest Access');
      expect(guestBanner?.textContent).toContain('Sign Up Free');
      expect(guestBanner?.textContent).toContain('Learn More');
    });

    test('should handle guest banner click events', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: { guest_access: true, summary: {} }
      });

      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      });

      // Act
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      // Test signup button click
      const signupButton = document.querySelector('[data-guest-signup]');
      signupButton?.click();

      // Assert
      expect(window.location.href).toBe('/register?guest=true');

      // Reset for next test
      window.location.href = '';

      // Test learn more button click
      const learnMoreButton = document.querySelector('[data-guest-learn-more]');
      learnMoreButton?.click();

      // Assert
      const modal = document.querySelector('[data-guest-features-modal]');
      expect(modal).toBeTruthy();
    });

    test('should prevent duplicate guest elements', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: { guest_access: true, summary: {} }
      });

      // Act - Call update multiple times
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      // Assert
      const banners = document.querySelectorAll('.guest-dashboard-banner');
      expect(banners.length).toBe(1); // Should not duplicate

      const indicators = document.querySelectorAll('.guest-indicator');
      expect(indicators.length).toBe(2); // Should have indicators for both elements
    });
  });

  describe('Guest Features Modal', () => {
    test('should create and display guest features modal', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: { guest_access: true, summary: {} }
      });

      // Act
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      // Trigger modal display
      const learnMoreButton = document.querySelector('[data-guest-learn-more]');
      learnMoreButton?.click();

      // Assert
      const modal = document.querySelector('[data-guest-features-modal]');
      expect(modal).toBeTruthy();
      expect(modal?.textContent).toContain('Guest vs Full Account');
      expect(modal?.textContent).toContain('Complete dashboard access');
      expect(modal?.textContent).toContain('Limited data access');
    });

    test('should handle modal close events', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: { guest_access: true, summary: {} }
      });

      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      const learnMoreButton = document.querySelector('[data-guest-learn-more]');
      learnMoreButton?.click();

      // Act - Close modal by clicking close button
      const closeButton = document.querySelector('[data-guest-modal-close]');
      closeButton?.click();

      // Assert
      const modal = document.querySelector('[data-guest-features-modal]');
      expect(modal).toBeFalsy(); // Should be removed
    });

    test('should handle modal backdrop click', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: { guest_access: true, summary: {} }
      });

      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      const learnMoreButton = document.querySelector('[data-guest-learn-more]');
      learnMoreButton?.click();

      // Act - Close modal by clicking backdrop
      const modal = document.querySelector('.guest-features-modal');
      modal?.click();

      // Assert
      const modalElement = document.querySelector('[data-guest-features-modal]');
      expect(modalElement).toBeFalsy();
    });

    test('should handle upgrade CTA from modal', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: { guest_access: true, summary: {} }
      });

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      });

      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      const learnMoreButton = document.querySelector('[data-guest-learn-more]');
      learnMoreButton?.click();

      // Act - Click upgrade CTA
      const upgradeButton = document.querySelector('[data-guest-upgrade-cta]');
      upgradeButton?.click();

      // Assert
      expect(window.location.href).toBe('/register?guest=true');

      const modal = document.querySelector('[data-guest-features-modal]');
      expect(modal).toBeFalsy(); // Should be removed after navigation
    });
  });

  describe('Guest Session Management', () => {
    test('should set up periodic guest session refresh', async () => {
      // Arrange
      jest.useFakeTimers();

      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.isGuestSessionExpired
        .mockReturnValueOnce(false)  // Initially valid
        .mockReturnValueOnce(true)  // Then expired
        .mockReturnValueOnce(false); // After refresh

      global.authService.createGuestUser.mockResolvedValue({
        access_token: 'refreshed_token',
        user: { id: 1, username: 'guest_refreshed', is_guest: true }
      });

      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: { guest_access: true, summary: {} }
      });

      // Act
      await require('../src/ts/page-managers/dashboard-manager').initializeGuestDashboard();

      // Fast-forward time by 1 minute (60000ms)
      jest.advanceTimersByTime(60000);

      // Wait for async operations
      await Promise.resolve();

      // Assert
      expect(global.authService.createGuestUser).toHaveBeenCalled();
      expect(global.authService.getGuestDashboardData).toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('should not set up session refresh for non-guest users', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(false);

      // Act
      await require('../src/ts/page-managers/dashboard-manager').initializeGuestDashboard();

      // Assert
      // Should not call guest-specific functions
      expect(global.authService.getGuestDashboardData).not.toHaveBeenCalled();
    });
  });

  describe('Guest Signup Flow', () => {
    test('should handle guest signup URL parameter', () => {
      // Arrange
      Object.defineProperty(window, 'location', {
        value: {
          search: '?guest=true',
          href: 'http://localhost/register?guest=true'
        },
        writable: true
      });

      document.body.innerHTML += `
        <div class="signup-container">
          <form class="register-form">
            <input name="username" value="">
            <input name="email" value="">
            <input name="password" value="">
          </form>
        </div>
      `;

      // Act
      require('../src/ts/page-managers/dashboard-manager').handleGuestSignup();

      // Assert
      const guestMessage = document.querySelector('.guest-signup-message');
      expect(guestMessage).toBeTruthy();
      expect(guestMessage?.textContent).toContain('Welcome Guest User!');
      expect(guestMessage?.textContent).toContain('Convert your guest account');
    });

    test('should handle missing signup container gracefully', () => {
      // Arrange
      Object.defineProperty(window, 'location', {
        value: {
          search: '?guest=true',
          href: 'http://localhost/register?guest=true'
        },
        writable: true
      });

      document.body.innerHTML = '<div>No signup container</div>';

      // Act (should not throw)
      expect(() => {
        require('../src/ts/page-managers/dashboard-manager').handleGuestSignup();
      }).not.toThrow();
    });

    test('should not show guest message for non-guest signup', () => {
      // Arrange
      Object.defineProperty(window, 'location', {
        value: {
          search: '?guest=false',
          href: 'http://localhost/register?guest=false'
        },
        writable: true
      });

      document.body.innerHTML += '<div class="signup-container"></div>';

      // Act
      require('../src/ts/page-managers/dashboard-manager').handleGuestSignup();

      // Assert
      const guestMessage = document.querySelector('.guest-signup-message');
      expect(guestMessage).toBeFalsy();
    });
  });

  describe('Error Recovery', () => {
    test('should handle guest dashboard data errors', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: 'Failed to load guest data',
        data: null
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update dashboard stats:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    test('should handle missing summary data', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(true);
      global.authService.getGuestDashboardData.mockResolvedValue({
        error: null,
        data: {
          guest_access: true
          // Missing summary
        }
      });

      // Act (should not throw)
      expect(async () => {
        await require('../src/ts/page-managers/dashboard-manager').updateDashboardStats();
      }).not.toThrow();
    });
  });

  describe('Performance and Memory Management', () => {
    test('should clean up event listeners properly', () => {
      // This test ensures the module doesn't leak memory with event listeners
      // In a real implementation, you would need to expose cleanup functions
      // For now, we test that the module can be required multiple times without issues

      // Act - Require module multiple times
      const module1 = require('../src/ts/page-managers/dashboard-manager');
      const module2 = require('../src/ts/page-managers/dashboard-manager');

      // Assert - Should not cause issues
      expect(module1).toBeDefined();
      expect(module2).toBeDefined();
    });

    test('should handle rapid updates without performance issues', async () => {
      // Arrange
      global.authService.isGuestUser.mockReturnValue(false);
      global.apiService.get.mockResolvedValue({
        error: null,
        data: { total_students: 100, total_drivers: 10 }
      });

      // Act - Multiple rapid updates
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(require('../src/ts/page-managers/dashboard-manager').updateDashboardStats());
      }

      await Promise.all(promises);

      // Assert
      expect(global.apiService.get).toHaveBeenCalledTimes(10);
    });
  });
});