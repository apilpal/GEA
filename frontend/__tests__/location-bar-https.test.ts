/**
 * Tests for location bar HTTPS address changes.
 * Focuses on testing URL changes in the browser's location bar for HTTPS addresses.
 * Includes tests for router navigation, config validation, and API service with HTTPS URLs.
 */

import { config } from '../src/ts/config';
import { apiService } from '../src/ts/services/api-service';
import { navigateToPage, initializeNavigation } from '../src/ts/router';

// Mock dependencies
jest.mock('../src/ts/components/auth/auth-context', () => ({
  authContext: {
    getState: jest.fn(() => ({ isAuthenticated: false }))
  }
}));

jest.mock('../src/ts/services/auth-service', () => ({
  authService: {
    isGuestUser: jest.fn(() => false)
  }
}));

jest.mock('../src/ts/page-managers/dashboard-manager', () => ({
  updateDashboardStats: jest.fn(),
  initializeGuestDashboard: jest.fn()
}));

jest.mock('../src/ts/page-managers/transport-manager', () => ({
  loadDriversForTransportPage: jest.fn(),
  loadAllDriversTable: jest.fn(),
  loadStudentsForStudentsPage: jest.fn()
}));

jest.mock('../src/ts/page-managers/students-manager', () => ({
  loadStudentsForStudentsPage: jest.fn()
}));

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('Router Navigation with HTTPS URLs', () => {
  let originalLocation: Location;

  beforeEach(() => {
    // Save original location
    originalLocation = window.location;

    // Mock window.location with HTTPS protocol
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/#dashboard',
        hash: '#dashboard',
        protocol: 'https:',
        host: 'example.com',
        pathname: '/',
        search: '',
        origin: 'https://example.com'
      },
      writable: true
    });

    // Setup DOM
    document.body.innerHTML = `
      <div id="page-title"></div>
      <nav>
        <a class="menu-item" data-page="dashboard" href="#">Dashboard</a>
        <a class="menu-item" data-page="students" href="#">Students</a>
        <a class="menu-item" data-page="login" href="#">Login</a>
      </nav>
      <div id="dashboard-page" class="page active"></div>
      <div id="students-page" class="page"></div>
      <div id="login-page" class="page"></div>
    `;

    // Mock hashchange event listeners
    (global as any).hashChangeListeners = [];
    window.addEventListener = jest.fn((event, listener) => {
      if (event === 'hashchange') {
        (global as any).hashChangeListeners.push(listener);
      }
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true
    });
  });

  /**
   * Tests navigation when the current URL is HTTPS.
   */
  it('should navigate to pages correctly with HTTPS protocol', () => {
    // Initialize navigation
    initializeNavigation();

    // Navigate to students page
    navigateToPage('students');

    // Verify hash was updated
    expect(window.location.hash).toBe('#students');

    // Verify navigation UI was updated
    const studentsMenuItem = document.querySelector('[data-page="students"]');
    const dashboardMenuItem = document.querySelector('[data-page="dashboard"]');
    const studentsPage = document.getElementById('students-page');
    const dashboardPage = document.getElementById('dashboard-page');

    expect(studentsMenuItem?.classList.contains('active')).toBe(true);
    expect(dashboardMenuItem?.classList.contains('active')).toBe(false);
    expect(studentsPage?.classList.contains('active')).toBe(true);
    expect(dashboardPage?.classList.contains('active')).toBe(false);
  });

  /**
   * Tests hash change handling with HTTPS URLs.
   */
  it('should handle hash changes correctly with HTTPS protocol', () => {
    // Simulate hash change to students
    window.location.hash = '#students';
    (global as any).hashChangeListeners.forEach((listener: any) => listener());

    // Verify page title was updated
    const pageTitle = document.getElementById('page-title');
    expect(pageTitle?.textContent).toBe('Students');

    // Verify navigation UI
    const studentsPage = document.getElementById('students-page');
    const dashboardPage = document.getElementById('dashboard-page');
    expect(studentsPage?.classList.contains('active')).toBe(true);
    expect(dashboardPage?.classList.contains('active')).toBe(false);
  });

  /**
   * Tests navigation to login page with HTTPS URL.
   */
  it('should redirect to login with HTTPS protocol when authentication required', () => {
    // Mock authentication check to return false
    jest.doMock('../src/ts/components/auth/auth-context', () => ({
      authContext: {
        getState: jest.fn(() => ({ isAuthenticated: false }))
      }
    }));

    // Try to navigate to students (requires auth)
    navigateToPage('students');

    // Verify redirected to login
    expect(window.location.hash).toBe('#login');

    // Verify login page is active
    const loginPage = document.getElementById('login-page');
    const dashboardPage = document.getElementById('dashboard-page');
    expect(loginPage?.classList.contains('active')).toBe(true);
    expect(dashboardPage?.classList.contains('active')).toBe(false);
  });

  /**
   * Tests error case: invalid page navigation with HTTPS URL.
   */
  it('should handle invalid page navigation gracefully with HTTPS protocol', () => {
    // Try to navigate to non-existent page
    navigateToPage('nonexistent');

    // Should still update hash but not crash
    expect(window.location.hash).toBe('#nonexistent');

    // Page title should fallback to dashboard
    const pageTitle = document.getElementById('page-title');
    expect(pageTitle?.textContent).toBe('Dashboard');
  });
});

describe('Config Validation with HTTPS API URLs', () => {
  let originalEnv: any;

  beforeEach(() => {
    // Save original environment
    originalEnv = (global as any).import.meta.env;

    // Mock environment variables with HTTPS API URL
    (global as any).import.meta.env = {
      VITE_API_BASE_URL: 'https://api.example.com/api',
      VITE_API_TIMEOUT: '10000',
      VITE_APP_NAME: 'Test App',
      VITE_APP_VERSION: '1.0.0',
      VITE_APP_ENV: 'production',
      VITE_AUTH_REFRESH_THRESHOLD: '517300',
      VITE_ENABLE_DEBUG_MODE: 'false',
      VITE_ENABLE_ANALYTICS: 'false',
      VITE_ENABLE_ERROR_REPORTING: 'false',
      VITE_DEFAULT_THEME: 'light',
      VITE_ENABLE_DARK_MODE: 'true',
      VITE_ENABLE_SERVICE_WORKER: 'false',
      VITE_CACHE_EXPIRY: '3600000',
      VITE_API_RATE_LIMIT: '100',
      VITE_API_RATE_WINDOW: '60000'
    };
  });

  afterEach(() => {
    // Restore original environment
    (global as any).import.meta.env = originalEnv;
  });

  /**
   * Tests config initialization with valid HTTPS API URL.
   */
  it('should initialize config correctly with HTTPS API base URL', () => {
    // Re-import config to pick up new env
    jest.resetModules();
    const { config: newConfig } = require('../src/ts/config');

    expect(newConfig.apiBaseUrl).toBe('https://api.example.com/api');
    expect(newConfig.appEnv).toBe('production');
    expect(newConfig.isProduction).toBe(true);
  });

  /**
   * Tests config validation for HTTPS URL in production.
   */
  it('should validate HTTPS API URL correctly in production', () => {
    jest.resetModules();
    const { config: newConfig } = require('../src/ts/config');

    // Should not throw error for valid HTTPS URL
    expect(() => newConfig.validateApiBaseUrl()).not.toThrow();

    // Should warn about HTTP in production (but since it's HTTPS, no warning)
    expect(console.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('WARNING: Using HTTP in production')
    );
  });

  /**
   * Tests error case: invalid HTTPS URL format.
   */
  it('should throw error for invalid HTTPS URL format', () => {
    // Mock invalid HTTPS URL
    (global as any).import.meta.env.VITE_API_BASE_URL = 'https://';

    jest.resetModules();

    expect(() => {
      const { config: newConfig } = require('../src/ts/config');
    }).toThrow('Invalid API base URL: https://');
  });

  /**
   * Tests error case: HTTP URL in production should warn.
   */
  it('should warn for HTTP URL in production environment', () => {
    // Mock HTTP URL in production
    (global as any).import.meta.env.VITE_API_BASE_URL = 'http://api.example.com/api';

    jest.resetModules();
    const { config: newConfig } = require('../src/ts/config');

    // Should warn about HTTP in production
    expect(console.warn).toHaveBeenCalledWith(
      'WARNING: Using HTTP in production environment. Consider using HTTPS.'
    );
  });
});

describe('API Service with HTTPS Base URL', () => {
  let originalEnv: any;

  beforeEach(() => {
    originalEnv = (global as any).import.meta.env;

    // Mock environment with HTTPS API URL
    (global as any).import.meta.env = {
      VITE_API_BASE_URL: 'https://api.example.com/api',
      VITE_API_TIMEOUT: '10000'
    };

    // Mock fetch
    global.fetch = jest.fn();

    // Reset config module
    jest.resetModules();
  });

  afterEach(() => {
    (global as any).import.meta.env = originalEnv;
    jest.restoreAllMocks();
  });

  /**
   * Tests API GET request with HTTPS base URL.
   */
  it('should make GET request correctly with HTTPS base URL', async () => {
    const mockResponse = { data: { message: 'Success' } };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse.data)
    });

    const response = await apiService.get('/test');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/json'
        }),
        credentials: 'include'
      })
    );

    expect(response.data).toEqual(mockResponse.data);
  });

  /**
   * Tests API POST request with HTTPS base URL.
   */
  it('should make POST request correctly with HTTPS base URL', async () => {
    const mockResponse = { data: { id: 1 } };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn().mockResolvedValue(mockResponse.data)
    });

    const response = await apiService.post('/test', { name: 'Test' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/test',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ name: 'Test' }),
        credentials: 'include'
      })
    );

    expect(response.data).toEqual(mockResponse.data);
  });

  /**
   * Tests error handling for HTTPS API requests.
   */
  it('should handle errors correctly with HTTPS base URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: jest.fn().mockResolvedValue('Not found')
    });

    const response = await apiService.get('/nonexistent');

    expect(response.error).toBe('HTTP 404: Not found');
    expect(response.status).toBe(404);
  });

  /**
   * Tests authentication error handling with HTTPS URL.
   */
  it('should handle 401 errors correctly with HTTPS base URL', async () => {
    // Mock auth service for refresh
    jest.doMock('../src/ts/services/auth-service', () => ({
      authService: {
        refreshToken: jest.fn().mockResolvedValue({ success: false })
      }
    }));

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    const response = await apiService.get('/protected');

    expect(response.error).toBe('Authentication expired. Please log in again.');
    expect(response.status).toBe(401);
  });

  /**
   * Tests timeout handling with HTTPS API URL.
   */
  it('should handle timeout correctly with HTTPS base URL', async () => {
    // Mock fetch to never resolve
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const response = await apiService.get('/slow', {}, { timeout: 100 });

    expect(response.error).toBe('Request timeout after 100ms');
  });
});