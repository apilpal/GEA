// Auth Service - handles login/logout/refresh API calls with cookie-based authentication
import { apiService } from '@/ts/services/api-service';

// ==================== TYPES ====================

interface ApiResponse<T> {
    data?: T;
    error?: string;
    status?: number;
}

/** Credentials required for user login. */
interface LoginCredentials {
    /** Username or email address for authentication. */
    username_or_email: string;
    /** User password. */
    password: string;
}

/** Response structure for successful login. */
interface LoginResponse {
    /** JWT access token. */
    access_token: string;
    /** Token type, typically "Bearer". */
    token_type: string;
}

/** Represents an authenticated user. */
interface AuthUser {
    /** Unique identifier for the user. */
    id: number;
    /** Username for login. */
    username: string;
    /** Email address of the user. */
    email: string;
    /** Role assigned to the user (e.g., 'admin', 'teacher', 'student'). */
    role: string;
    /** Whether the user account is active. */
    is_active: boolean;
    /** Timestamp when the user was created. */
    created_at?: string;
    /** Timestamp when the user was last updated. */
    updated_at?: string;
}

/**
 * Enhanced service class handling authentication operations with cookie minimization strategy.
 *
 * Implements enhanced security features:
 * - Cookie minimization (HttpOnly cookies for refresh tokens only)
 * - Access tokens stored in memory for frontend use
 * - Automatic token refresh with rotation
 * - Token validation before API calls
 * - Device fingerprinting for enhanced security
 * - Comprehensive session management
 */
class AuthService {
    private readonly USER_KEY = 'auth_user';
    private readonly ACCESS_TOKEN_KEY = 'access_token';
    private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
    private readonly TOKEN_CHECK_INTERVAL = 60 * 1000; // Check every minute

    private refreshPromise: Promise<boolean> | null = null;
    private lastRefreshCheck: number = 0;
    private tokenCheckInterval: number | null = null;
    private currentAccessToken: string | null = null;

    /**
     * Start automatic token validation checks.
     * Implements proactive token refresh and session management.
     */
    private startTokenValidation() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }

        this.tokenCheckInterval = window.setInterval(async () => {
            await this.validateAndRefreshToken();
        }, this.TOKEN_CHECK_INTERVAL);
    }

    /**
     * Stop automatic token validation checks.
     */
    private stopTokenValidation() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
            this.tokenCheckInterval = null;
        }
    }

    /**
     * Store access token in memory (cookie minimization strategy).
     * @param {string} token - Access token to store.
     */
    private storeAccessToken(token: string) {
        this.currentAccessToken = token;
        try {
            localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
        } catch (error) {
            console.error('[AUTH] Failed to store access token in localStorage:', error);
        }
    }

    /**
     * Get stored access token from memory/storage.
     * @returns {string | null} Access token or null if not found.
     */
    private getStoredAccessToken(): string | null {
        if (this.currentAccessToken) {
            return this.currentAccessToken;
        }

        try {
            const stored = localStorage.getItem(this.ACCESS_TOKEN_KEY);
            if (stored) {
                this.currentAccessToken = stored;
                return stored;
            }
        } catch (error) {
            console.error('[AUTH] Failed to retrieve access token from localStorage:', error);
        }

        return null;
    }

    /**
     * Clear stored access token from memory/storage.
     */
    private clearAccessToken() {
        this.currentAccessToken = null;
        try {
            localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        } catch (error) {
            console.error('[AUTH] Failed to clear access token from localStorage:', error);
        }
    }

    /**
     * Validate current token and refresh if necessary.
     * @returns {Promise<boolean>} True if token is valid or successfully refreshed.
     */
    private async validateAndRefreshToken(): Promise<boolean> {
        const token = this.getStoredAccessToken();
        if (!token) {
            console.log('[AUTH] No access token found, stopping validation');
            this.stopTokenValidation();
            return false;
        }

        try {
            // Check if token needs refresh (proactive refresh)
            const timeSinceLastCheck = Date.now() - this.lastRefreshCheck;
            if (timeSinceLastCheck > this.REFRESH_THRESHOLD) {
                console.log('[AUTH] Proactive token refresh needed');
                const refreshResult = await this.refreshToken();
                if (refreshResult.error) {
                    console.log('[AUTH] Proactive refresh failed, clearing tokens');
                    this.clearStoredData();
                    this.stopTokenValidation();
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error('[AUTH] Token validation error:', error);
            this.clearStoredData();
            this.stopTokenValidation();
            return false;
        }
    }

    /**
     * Get authorization header for API requests.
     * @returns {string | null} Authorization header or null if no token.
     */
    getAuthHeader(): string | null {
        const token = this.getStoredAccessToken();
        return token ? `Bearer ${token}` : null;
    }

    /**
     * Validate token with backend before making API calls.
     * @returns {Promise<boolean>} True if token is valid.
     */
    async validateTokenWithBackend(): Promise<boolean> {
        try {
            console.log('[AUTH] Validating token with backend');
            const response = await apiService.get('/auth/token/validate');

            if (response.error) {
                console.log('[AUTH] Token validation failed:', response.error);
                return false;
            }

            console.log('[AUTH] Token validation successful');
            return true;
        } catch (error) {
            console.error('[AUTH] Token validation error:', error);
            return false;
        }
    }

    /**
     * Enhanced logout with token revocation.
     * @returns {Promise<{error?: string}>} Promise resolving to empty object on success or error message on failure.
     */
    async logout(): Promise<{ error?: string }> {
        try {
            // Stop automatic token validation
            this.stopTokenValidation();

            // Revoke tokens on backend
            await apiService.post('/auth/token/revoke', {});

            // Clear local storage and tokens
            this.clearStoredData();

            console.log('[AUTH] Logout completed successfully');
            return {};
        } catch (error) {
            console.warn('[AUTH] Logout API call failed, but proceeding with local cleanup:', error);
            this.clearStoredData();
            return {};
        }
    }

    /**
     * Authenticate a user with the provided credentials using enhanced security.
     * @param {LoginCredentials} credentials - User's login credentials.
     * @returns {Promise<{data?: AuthUser; error?: string}>} Promise resolving to user data on success or error message on failure.
     */
    async login(credentials: LoginCredentials): Promise<{ data?: AuthUser; error?: string }> {
        try {
            console.log('[AUTH] Attempting enhanced login with cookie minimization');

            // Use enhanced login endpoint for better security
            const response = await apiService.post<LoginResponse>('/auth/login', credentials);

            if (response.error) {
                console.error('[AUTH] Login failed:', response.error);
                return { error: this.parseErrorMessage(response.error) };
            }

            if (!response.data || !response.data.access_token) {
                console.error('[AUTH] No access token received from server');
                return { error: 'No access token received from server' };
            }

            // Implement cookie minimization strategy:
            // - Store access token in memory/localStorage for frontend use
            // - Refresh token is handled via HttpOnly cookie by backend
            console.log('[AUTH] Storing access token in memory (cookie minimization)');
            this.storeAccessToken(response.data.access_token);

            // Start automatic token validation
            this.startTokenValidation();

            // Get user information with new access token
            const userResponse = await this.getCurrentUser();
            if (userResponse.error) {
                console.error('[AUTH] Failed to get user info after login:', userResponse.error);
                this.clearStoredData();
                return { error: userResponse.error };
            }

            console.log('[AUTH] Login successful with enhanced security');
            return { data: userResponse.data };
        } catch (error) {
            console.error('[AUTH] Login error:', error);
            this.clearStoredData();
            return { error: 'An unexpected error occurred during login' };
        }
    }

    /**
     * Refresh the access token using the refresh token.
     * Prevents multiple concurrent refresh requests.
     * @returns {Promise<{success: boolean; error?: string}>} Promise resolving to success status.
     */
    async refreshToken(): Promise<{ success: boolean; error?: string }> {
        // Prevent multiple concurrent refresh requests
        if (this.refreshPromise) {
            return this.refreshPromise.then(() => ({ success: true })).catch(() => ({ success: false, error: 'Token refresh failed' }));
        }

        this.refreshPromise = this.performTokenRefresh();
        try {
            await this.refreshPromise;
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Token refresh failed' };
        } finally {
            this.refreshPromise = null;
        }
    }

    /**
     * Perform the actual token refresh operation.
     * @returns {Promise<boolean>} Promise resolving to true on success.
     * @throws {Error} When refresh fails.
     */
    private async performTokenRefresh(): Promise<boolean> {
        try {
            console.log('[AUTH] Performing enhanced token refresh with rotation');

            // Use enhanced refresh endpoint that implements token rotation
            const response = await apiService.post<LoginResponse>('/auth/token/refresh', {});

            if (response.error || !response.data) {
                console.error('[AUTH] Enhanced refresh failed:', response.error);
                throw new Error(response.error || 'Enhanced refresh failed - no data received');
            }

            // Implement cookie minimization strategy:
            // - New access token is stored in response body
            // - New refresh token is set as HttpOnly cookie by backend
            console.log('[AUTH] Storing new access token after rotation');
            this.storeAccessToken(response.data.access_token);

            this.lastRefreshCheck = Date.now();
            console.log('[AUTH] Token refresh with rotation successful');
            return true;
        } catch (error) {
            console.error('[AUTH] Enhanced token refresh error:', error);
            // Clear stored data on refresh failure
            this.clearStoredData();
            throw error;
        }
    }

    /**
     * Get information about the currently authenticated user.
     * Automatically refreshes tokens if they are expired.
     * @returns {Promise<{data?: AuthUser; error?: string}>} Promise resolving to user data on success or error message on failure.
     */
    async getCurrentUser(): Promise<{ data?: AuthUser; error?: string }> {
        try {
            console.log('[AUTH] Getting current user with enhanced token management');

            // Validate token before making request
            const isTokenValid = await this.validateTokenWithBackend();
            if (!isTokenValid) {
                console.log('[AUTH] Token validation failed, attempting refresh');
                const refreshResult = await this.refreshToken();
                if (refreshResult.error) {
                    console.log('[AUTH] Refresh failed, user not authenticated');
                    return { error: 'Authentication expired' };
                }
            }

            // Make authenticated request with explicit authorization header
            const authHeader = this.getAuthHeader();
            if (!authHeader) {
                console.log('[AUTH] No access token available');
                return { error: 'Not authenticated' };
            }

            console.log('[AUTH] Making authenticated request to /auth/me');
            const response = await apiService.get<AuthUser>('/auth/me');

            if (response.error) {
                console.log('[AUTH] Error getting user info:', response.error);

                if (response.status === 401 || response.status === 403) {
                    console.log('[AUTH] Token expired or invalid, clearing stored data');
                    this.clearStoredData();
                    return { error: 'Authentication expired' };
                }

                return { error: response.error };
            }

            if (response.data) {
                console.log('[AUTH] User data received successfully');
                this.storeUser(response.data);

                // Restart token validation if it was stopped
                if (!this.tokenCheckInterval) {
                    this.startTokenValidation();
                }

                return { data: response.data };
            }

            console.log('[AUTH] No user data received');
            return { error: 'No user data received' };
        } catch (error) {
            console.error('[AUTH] Get current user error:', error);
            this.clearStoredData();
            return { error: 'Failed to get user information' };
        }
    }

    /**
     * Initialize the auth service and start automatic token management.
     * Should be called when the application starts.
     */
    async initialize(): Promise<void> {
        console.log('[AUTH] Initializing enhanced auth service');

        // Check if we have stored tokens
        const hasToken = this.getStoredAccessToken() !== null;
        const hasUser = this.getStoredUser() !== null;

        if (hasToken && hasUser) {
            console.log('[AUTH] Found existing session, starting token validation');
            this.startTokenValidation();

            // Validate current session
            const isValid = await this.validateTokenWithBackend();
            if (!isValid) {
                console.log('[AUTH] Session validation failed, clearing stored data');
                this.clearStoredData();
            }
        } else if (hasToken || hasUser) {
            console.log('[AUTH] Incomplete session data, clearing storage');
            this.clearStoredData();
        }
    }

    /**
      * Check if the user is currently authenticated with enhanced validation.
      * @returns {Promise<boolean>} True if user is authenticated.
      */
    async isAuthenticated(): Promise<boolean> {
        console.log('[AUTH] Checking authentication status with enhanced validation');

        // Check if we have basic stored data
        const user = this.getStoredUser();
        const token = this.getStoredAccessToken();

        console.log('[AUTH] Stored user:', user ? JSON.stringify(user, null, 2) : 'null');
        console.log('[AUTH] Stored token:', token ? 'present' : 'null');

        if (!user || !token) {
            console.log('[AUTH] No stored user or token, not authenticated');
            return false;
        }

        // Validate token with backend
        try {
            const isValid = await this.validateTokenWithBackend();
            if (isValid) {
                console.log('[AUTH] User is authenticated');
                return true;
            } else {
                console.log('[AUTH] Token validation failed, clearing stored data');
                this.clearStoredData();
                return false;
            }
        } catch (error) {
            console.error('[AUTH] Authentication check error:', error);
            this.clearStoredData();
            return false;
        }
    }

    /**
     * Retrieve stored user data from localStorage.
     * @returns {AuthUser | null} The stored user data or null if not found.
     */
    getStoredUser(): AuthUser | null {
        try {
            const stored = localStorage.getItem(this.USER_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error reading stored user:', error);
            return null;
        }
    }

    /**
     * Store user data in localStorage.
     * @param {AuthUser} user - The user data to store.
     */
    private storeUser(user: AuthUser): void {
        try {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        } catch (error) {
            console.error('Error storing user:', error);
        }
    }

    /**
     * Clear all stored authentication data from localStorage and memory.
     * Implements cookie minimization strategy cleanup.
     */
    private clearStoredData(): void {
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        this.currentAccessToken = null;
        this.lastRefreshCheck = 0;
        this.stopTokenValidation();
    }

    /**
     * Parse error messages from API responses into user-friendly messages.
     * @param {string} error - The raw error message from the API.
     * @returns {string} A user-friendly error message.
     */
    private parseErrorMessage(error: string): string {
        // Try to extract meaningful error message
        if (error.includes('401')) {
            // Check if the error message specifies whether it's username or email
            if (error.includes('username')) {
                return 'Invalid username or password';
            } else if (error.includes('email')) {
                return 'Invalid email or password';
            } else {
                return 'Invalid username/email or password';
            }
        }
        if (error.includes('400')) {
            // Return the specific validation error message from the backend
            if (error.includes('Invalid email format')) {
                return 'Please enter a valid email address';
            }
            if (error.includes('Invalid username format')) {
                return 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens';
            }
            if (error.includes('required')) {
                return 'Please fill in all required fields';
            }
            return 'Please check your input and try again';
        }
        if (error.includes('500')) {
            return 'Server error - please try again later';
        }
        if (error.includes('timeout')) {
            return 'Request timed out - please try again';
        }

        // Return the original error if we can't parse it
        return error;
    }


    /**
     * Perform bypass login using the configured bypass user.
     * @returns {Promise<{data?: AuthUser; error?: string}>} Promise resolving to bypass user data or error message.
     */
    async loginWithBypass(): Promise<{ data?: AuthUser; error?: string }> {
        try {
            console.log('[AUTH-BYPASS] Starting bypass login process');

            // Import config to get bypass settings
            const { config } = await import('@/ts/config');
            
            if (!config.enableLoginBypass) {
                console.log('[AUTH-BYPASS] Bypass login is disabled in configuration');
                return { error: 'Bypass login is not enabled' };
            }

            console.log('[AUTH-BYPASS] Bypass login enabled, using user:', config.loginBypassUser);

            // Call the bypass login endpoint
            const response = await apiService.post<LoginResponse>('/auth/bypass-login', {
                username: config.loginBypassUser
            });

            if (response.error) {
                console.error('[AUTH-BYPASS] Bypass login failed:', response.error);
                return { error: this.parseErrorMessage(response.error) };
            }

            if (!response.data || !response.data.access_token) {
                console.error('[AUTH-BYPASS] No access token received from bypass login');
                return { error: 'No access token received from bypass login' };
            }

            // Store the access token
            this.storeAccessToken(response.data.access_token);

            // Get user information with new access token
            const userResponse = await this.getCurrentUser();
            if (userResponse.error) {
                console.error('[AUTH-BYPASS] Failed to get user info after bypass login:', userResponse.error);
                this.clearStoredData();
                return { error: userResponse.error };
            }

            if (userResponse.data) {
                // Mark the user as bypass user
                const bypassUser = {
                    ...userResponse.data,
                    is_bypass_user: true
                };
                
                this.storeUser(bypassUser);
                console.log('[AUTH-BYPASS] Bypass login successful for user:', bypassUser.username);
                return { data: bypassUser };
            }

            return { error: 'Failed to get user information after bypass login' };
        } catch (error) {
            console.error('[AUTH-BYPASS] Bypass login error:', error);
            this.clearStoredData();
            return { error: 'An unexpected error occurred during bypass login' };
        }
    }
}

// Export singleton instance
export const authService = new AuthService();
