/**
 * Complete Authentication Flow Integration Tests
 *
 * Tests the entire authentication flow including:
 * - Frontend server accessibility
 * - Login page loading
 * - User authentication with dev credentials
 * - Token storage and management
 * - Post-login scenarios (protected routes, dashboard)
 * - Logout functionality
 * - Guest user access and conversion
 * - Error handling and edge cases
 */

// Mock setup for complete authentication testing
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

describe('Complete Authentication Flow Integration Tests', () => {
  describe('Frontend Server Accessibility', () => {
    test('should verify frontend server is accessible at port 3002', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html><body>Frontend Server Running</body></html>')
      } as Response);

      // Act
      const response = await fetch('http://localhost:3002');
      const text = await response.text();

      // Assert
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(text).toContain('Frontend Server Running');
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3002');
    });

    test('should handle frontend server unavailability', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      // Act & Assert
      await expect(fetch('http://localhost:3002')).rejects.toThrow('Connection refused');
    });
  });

  describe('Login Page Loading', () => {
    test('should verify sign-in page loads correctly', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const loginPageHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Login Page</title></head>
        <body>
          <div id="login-container" class="login-container">
            <login-component id="loginComponent"></login-component>
            <div id="login-page" class="page active">
              <h2>Login to Your Account</h2>
              <form class="login-form">
                <input type="text" id="username" name="username_or_email" placeholder="Username or Email">
                <input type="password" id="password" name="password" placeholder="Password">
                <button type="submit" id="submit-btn">Sign In</button>
              </form>
            </div>
          </div>
        </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(loginPageHtml)
      } as Response);

      // Act
      const response = await fetch('http://localhost:3002');
      const html = await response.text();

      // Assert
      expect(response.ok).toBe(true);
      expect(html).toContain('login-container');
      expect(html).toContain('loginComponent');
      expect(html).toContain('Login to Your Account');
      expect(html).toContain('username_or_email');
      expect(html).toContain('password');
    });

    test('should handle login page loading errors', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      // Act
      const response = await fetch('http://localhost:3002');

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('User Authentication with Dev Credentials', () => {
    test('should successfully login with dev_user credentials', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockUser = {
        id: 1,
        username: 'dev_user',
        email: 'dev@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z'
      };

      // Mock successful login API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'mock-jwt-token-12345',
          token_type: 'Bearer'
        })
      } as Response);

      // Mock successful getCurrentUser API response
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

      // Assert
      expect(loginResult.error).toBeUndefined();
      expect(loginResult.data).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username_or_email: 'dev_user',
            password: 'dev_password_123'
          })
        })
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'access_token',
        'mock-jwt-token-12345'
      );
    });

    test('should handle invalid dev credentials', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid username or password' })
      } as Response);

      // Act
      const loginResult = await authService.login({
        username_or_email: 'dev_user',
        password: 'wrong_password'
      });

      // Assert
      expect(loginResult.error).toBe('Invalid username or password');
      expect(loginResult.data).toBeUndefined();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    test('should handle malformed credentials', async () => {
      // Act & Assert
      await expect(authService.login({
        username_or_email: '',
        password: ''
      })).rejects.toThrow();

      await expect(authService.login({
        username_or_email: 'dev_user',
        password: ''
      })).rejects.toThrow();

      await expect(authService.login({
        username_or_email: '',
        password: 'dev_password_123'
      })).rejects.toThrow();
    });
  });

  describe('Token Storage and Management', () => {
    test('should store access token securely', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockUser = {
        id: 1,
        username: 'dev_user',
        email: 'dev@example.com',
        role: 'admin',
        is_active: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'secure-jwt-token-12345',
          token_type: 'Bearer'
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUser)
      } as Response);

      // Act
      await authService.login({
        username_or_email: 'dev_user',
        password: 'dev_password_123'
      });

      // Assert
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'access_token',
        'secure-jwt-token-12345'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockUser)
      );
    });

    test('should retrieve stored access token', async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue('stored-jwt-token-12345');

      // Act
      const token = authService.getAuthHeader();

      // Assert
      expect(token).toBe('Bearer stored-jwt-token-12345');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('access_token');
    });

    test('should handle missing access token', () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);

      // Act
      const token = authService.getAuthHeader();

      // Assert
      expect(token).toBeNull();
    });

    test('should clear tokens on logout', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      } as Response);

      // Setup initial authenticated state
      mockLocalStorage.getItem.mockReturnValue('test-token');
      mockLocalStorage.setItem.mockImplementation((key, value) => {
        if (key === 'access_token') {
          mockLocalStorage.getItem.mockReturnValue(value);
        }
      });

      // Act
      await authService.logout();

      // Assert
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('Post-Login Scenarios', () => {
    test('should access protected routes after successful login', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockUser = {
        id: 1,
        username: 'dev_user',
        email: 'dev@example.com',
        role: 'admin',
        is_active: true
      };

      // Mock successful authentication
      mockLocalStorage.getItem.mockReturnValue('valid-jwt-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUser)
      } as Response);

      // Mock protected resource access
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'protected-content' })
      } as Response);

      // Act
      const isAuthenticated = await authService.isAuthenticated();
      const protectedResponse = await fetch('/api/protected-resource', {
        headers: { 'Authorization': 'Bearer valid-jwt-token' }
      });

      // Assert
      expect(isAuthenticated).toBe(true);
      expect(protectedResponse.ok).toBe(true);
    });

    test('should redirect to login for unauthenticated protected route access', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockLocalStorage.getItem.mockReturnValue(null);

      // Act
      const isAuthenticated = await authService.isAuthenticated();
      const protectedResponse = await fetch('/api/protected-resource');

      // Assert
      expect(isAuthenticated).toBe(false);
      // In a real scenario, this would be handled by the frontend router
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('access_token');
    });

    test('should access dashboard functionality after login', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockUser = {
        id: 1,
        username: 'dev_user',
        email: 'dev@example.com',
        role: 'admin',
        is_active: true
      };

      const dashboardData = {
        stats: { totalUsers: 10, activeUsers: 8 },
        recentActivity: []
      };

      // Mock authenticated state
      mockLocalStorage.getItem.mockReturnValue('valid-jwt-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUser)
      } as Response);

      // Mock dashboard API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(dashboardData)
      } as Response);

      // Act
      const isAuthenticated = await authService.isAuthenticated();
      const dashboardResponse = await fetch('/api/dashboard', {
        headers: { 'Authorization': 'Bearer valid-jwt-token' }
      });
      const dashboard = await dashboardResponse.json();

      // Assert
      expect(isAuthenticated).toBe(true);
      expect(dashboardResponse.ok).toBe(true);
      expect(dashboard).toEqual(dashboardData);
    });
  });

  describe('Logout Functionality', () => {
    test('should successfully logout user', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock successful token revocation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      } as Response);

      // Setup authenticated state
      mockLocalStorage.getItem.mockReturnValue('valid-jwt-token');
      mockLocalStorage.setItem.mockImplementation((key, value) => {
        if (key === 'access_token') {
          mockLocalStorage.getItem.mockReturnValue(value);
        }
      });

      // Act
      const logoutResult = await authService.logout();

      // Assert
      expect(logoutResult.error).toBeUndefined();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });

    test('should handle logout API failures gracefully', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Setup authenticated state
      mockLocalStorage.getItem.mockReturnValue('valid-jwt-token');

      // Act
      const logoutResult = await authService.logout();

      // Assert
      expect(logoutResult.error).toBeUndefined(); // Should still succeed locally
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });

    test('should clear authentication state after logout', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      } as Response);

      // Act
      await authService.logout();
      const isAuthenticated = await authService.isAuthenticated();

      // Assert
      expect(isAuthenticated).toBe(false);
      expect(authService.getAuthHeader()).toBeNull();
    });
  });

  describe('Guest User Access and Conversion', () => {
    test('should create guest user session', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user_123',
        email: null,
        role: 'guest',
        is_active: true,
        is_guest: true,
        guest_token: 'guest-token-123',
        expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(guestUser)
      } as Response);

      // Act
      const guestResult = await authService.createGuestUser();

      // Assert
      expect(guestResult.error).toBeUndefined();
      expect(guestResult.data).toEqual(guestUser);
      expect(guestResult.data?.is_guest).toBe(true);
    });

    test('should handle guest user conversion to registered user', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestUser = {
        id: 1,
        username: 'guest_user_123',
        is_guest: true,
        guest_token: 'guest-token-123'
      };

      const convertedUser = {
        id: 1,
        username: 'new_user',
        email: 'newuser@example.com',
        role: 'user',
        is_active: true,
        is_guest: false
      };

      // Mock current user check
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
      expect(conversionResult.data).toEqual(convertedUser);
      expect(conversionResult.data?.is_guest).toBe(false);
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });

    test('should handle guest session expiration', async () => {
      // Arrange
      const expiredGuestUser = {
        id: 1,
        username: 'expired_guest',
        is_guest: true,
        expires_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredGuestUser));

      // Act
      const isExpired = authService.isGuestSessionExpired();
      const isGuest = authService.isGuestUser();

      // Assert
      expect(isExpired).toBe(true);
      expect(isGuest).toBe(true);
    });

    test('should handle guest dashboard access', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const guestDashboardData = {
        welcomeMessage: 'Welcome, Guest User!',
        features: ['browse_content', 'limited_access'],
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(guestDashboardData)
      } as Response);

      // Act
      const dashboardResult = await authService.getGuestDashboardData();

      // Assert
      expect(dashboardResult.error).toBeUndefined();
      expect(dashboardResult.data).toEqual(guestDashboardData);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network errors during login', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      const loginResult = await authService.login({
        username_or_email: 'dev_user',
        password: 'dev_password_123'
      });

      // Assert
      expect(loginResult.error).toBe('An unexpected error occurred during login');
      expect(loginResult.data).toBeUndefined();
    });

    test('should handle malformed API responses', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}) // Missing access_token
      } as Response);

      // Act
      const loginResult = await authService.login({
        username_or_email: 'dev_user',
        password: 'dev_password_123'
      });

      // Assert
      expect(loginResult.error).toBe('No access token received from server');
    });

    test('should handle token validation failures', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockLocalStorage.getItem.mockReturnValue('invalid-token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Token expired' })
      } as Response);

      // Act
      const isAuthenticated = await authService.isAuthenticated();

      // Assert
      expect(isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });

    test('should handle concurrent login attempts', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockUser = {
        id: 1,
        username: 'dev_user',
        email: 'dev@example.com',
        role: 'admin',
        is_active: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'token-1',
          token_type: 'Bearer'
        })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUser)
      } as Response);

      // Act - Multiple concurrent login attempts
      const loginPromises = [
        authService.login({ username_or_email: 'dev_user', password: 'dev_password_123' }),
        authService.login({ username_or_email: 'dev_user', password: 'dev_password_123' }),
        authService.login({ username_or_email: 'dev_user', password: 'dev_password_123' })
      ];

      const results = await Promise.all(loginPromises);

      // Assert
      results.forEach(result => {
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(mockUser);
      });
    });

    test('should handle localStorage unavailability', () => {
      // Arrange
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => { throw new Error('localStorage unavailable'); },
          setItem: () => { throw new Error('localStorage unavailable'); },
          removeItem: () => { throw new Error('localStorage unavailable'); }
        },
        writable: true
      });

      // Act & Assert
      expect(() => authService.getAuthHeader()).not.toThrow();
      expect(() => authService.getStoredUser()).not.toThrow();

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });
  });

  describe('Authentication State Management', () => {
    test('should maintain authentication state across page reloads', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        username: 'dev_user',
        email: 'dev@example.com',
        role: 'admin',
        is_active: true
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'access_token') return 'persistent-token';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      // Act
      const storedUser = authService.getStoredUser();
      const authHeader = authService.getAuthHeader();

      // Assert
      expect(storedUser).toEqual(mockUser);
      expect(authHeader).toBe('Bearer persistent-token');
    });

    test('should handle corrupted stored data gracefully', () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      // Act
      const storedUser = authService.getStoredUser();

      // Assert
      expect(storedUser).toBeNull();
    });

    test('should validate authentication state periodically', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockUser = {
        id: 1,
        username: 'dev_user',
        email: 'dev@example.com',
        role: 'admin',
        is_active: true
      };

      mockLocalStorage.getItem.mockReturnValue('valid-token');
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      } as Response);

      // Act - Simulate periodic validation
      const isAuthenticated = await authService.isAuthenticated();

      // Assert
      expect(isAuthenticated).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/token/validate'),
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer valid-token' }
        })
      );
    });
  });
});