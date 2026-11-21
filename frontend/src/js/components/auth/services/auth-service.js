// Auth Service - handles login/logout/refresh API calls with cookie-based authentication
import { apiService } from './api-service';
/**
 * Service class handling authentication operations including login, logout,
 * token refresh, and user session management using HttpOnly cookies.
 */
class AuthService {
    constructor() {
        this.USER_KEY = 'auth_user';
        this.REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
        this.refreshPromise = null;
        this.lastRefreshCheck = 0;
    }
    /**
     * Authenticate a user with the provided credentials.
     * @param {LoginCredentials} credentials - User's login credentials.
     * @returns {Promise<{data?: AuthUser; error?: string}>} Promise resolving to user data on success or error message on failure.
     */
    async login(credentials) {
        try {
            const response = await apiService.post('/auth/login', credentials);
            if (response.error) {
                return { error: this.parseErrorMessage(response.error) };
            }
            if (!response.data) {
                return { error: 'No data received from server' };
            }
            // Cookies are automatically set by backend, check if login was successful by getting user info
            const userResponse = await this.getCurrentUser();
            if (userResponse.error) {
                return { error: userResponse.error };
            }
            return { data: userResponse.data };
        }
        catch (error) {
            console.error('Login error:', error);
            return { error: 'An unexpected error occurred during login' };
        }
    }
    /**
     * Log out the current user and clear all stored authentication data.
     * @returns {Promise<{error?: string}>} Promise resolving to empty object on success or error message on failure.
     */
    async logout() {
        try {
            await apiService.post('/auth/logout', {});
        }
        catch (error) {
            console.warn('Logout API call failed, but proceeding with local cleanup:', error);
        }
        // Clear local storage regardless of API call result
        this.clearStoredData();
        return {};
    }
    /**
     * Refresh the access token using the refresh token.
     * Prevents multiple concurrent refresh requests.
     * @returns {Promise<{success: boolean; error?: string}>} Promise resolving to success status.
     */
    async refreshToken() {
        // Prevent multiple concurrent refresh requests
        if (this.refreshPromise) {
            return this.refreshPromise.then(() => ({ success: true })).catch(() => ({ success: false, error: 'Token refresh failed' }));
        }
        this.refreshPromise = this.performTokenRefresh();
        try {
            await this.refreshPromise;
            return { success: true };
        }
        catch (error) {
            return { success: false, error: 'Token refresh failed' };
        }
        finally {
            this.refreshPromise = null;
        }
    }
    /**
     * Perform the actual token refresh operation.
     * @returns {Promise<boolean>} Promise resolving to true on success.
     * @throws {Error} When refresh fails.
     */
    async performTokenRefresh() {
        try {
            const response = await apiService.post('/auth/refresh', {});
            if (response.error || !response.data) {
                throw new Error(response.error || 'No refresh token data received');
            }
            // Cookies are automatically refreshed by backend
            this.lastRefreshCheck = Date.now();
            return true;
        }
        catch (error) {
            console.error('Token refresh error:', error);
            // Clear stored user data on refresh failure
            this.clearStoredData();
            throw error;
        }
    }
    /**
     * Get information about the currently authenticated user.
     * Automatically refreshes tokens if they are expired.
     * @returns {Promise<{data?: AuthUser; error?: string}>} Promise resolving to user data on success or error message on failure.
     */
    async getCurrentUser() {
        try {
            console.log('[AUTH-DEBUG] AuthService: Making request to /auth/me');
            const startTime = Date.now();
            // Make authenticated request to get user info (cookies will be sent automatically)
            const response = await apiService.get('/auth/me');
            const requestTime = Date.now() - startTime;
            console.log('[AUTH-DEBUG] AuthService: Response from /auth/me received in', requestTime, 'ms');
            console.log('[AUTH-DEBUG] AuthService: Full response object:', JSON.stringify(response, null, 2));
            if (response.error) {
                console.log('[AUTH-DEBUG] AuthService: Error in response:', response.error, 'Status:', response.status);
                if (response.status === 401) {
                    // No authentication present - this is normal for initial load
                    console.log('[AUTH-DEBUG] AuthService: No authentication present (401), user not logged in');
                    return { error: 'Not authenticated' };
                }
                if (response.status === 403) {
                    // Token might be expired, try refresh
                    console.log('[AUTH-DEBUG] AuthService: Token expired (403), attempting refresh');
                    const refreshResult = await this.refreshToken();
                    console.log('[AUTH-DEBUG] AuthService: Refresh result:', refreshResult);
                    if (refreshResult.error) {
                        console.log('[AUTH-DEBUG] AuthService: Refresh failed, returning auth expired error');
                        return { error: 'Authentication expired' };
                    }
                    // Retry with new token
                    console.log('[AUTH-DEBUG] AuthService: Retrying getCurrentUser after refresh');
                    return this.getCurrentUser();
                }
                console.log('[AUTH-DEBUG] AuthService: Returning error from response');
                return { error: response.error };
            }
            if (response.data) {
                console.log('[AUTH-DEBUG] AuthService: User data received, storing user:', response.data);
                this.storeUser(response.data);
                return { data: response.data };
            }
            console.log('[AUTH-DEBUG] AuthService: No user data received in response');
            return { error: 'No user data received' };
        }
        catch (error) {
            console.error('[AUTH-DEBUG] Get current user error:', error);
            console.error('[AUTH-DEBUG] Get current user error details:', error instanceof Error ? error.stack : 'Unknown error type');
            return { error: 'Failed to get user information' };
        }
    }
    /**
     * Check if the user is currently authenticated by attempting to get user info.
     * @returns {boolean} True if user is authenticated.
     */
    async isAuthenticated() {
        console.log('[AUTH-DEBUG] AuthService: Checking authentication status');
        const user = this.getStoredUser();
        console.log('[AUTH-DEBUG] AuthService: Stored user:', user);
        if (!user) {
            console.log('[AUTH-DEBUG] AuthService: No stored user, returning false');
            return false;
        }
        // Check if we need to refresh tokens proactively (every 5 minutes)
        const timeSinceLastCheck = Date.now() - this.lastRefreshCheck;
        console.log('[AUTH-DEBUG] AuthService: Time since last refresh check:', timeSinceLastCheck, 'ms, threshold:', this.REFRESH_THRESHOLD, 'ms');
        if (timeSinceLastCheck > this.REFRESH_THRESHOLD) {
            console.log('[AUTH-DEBUG] AuthService: Token refresh threshold exceeded, attempting refresh');
            const refreshResult = await this.refreshToken();
            console.log('[AUTH-DEBUG] AuthService: Refresh result:', refreshResult);
            if (refreshResult.error) {
                console.log('[AUTH-DEBUG] AuthService: Refresh failed, clearing stored data and returning false');
                this.clearStoredData();
                return false;
            }
        }
        console.log('[AUTH-DEBUG] AuthService: User is authenticated');
        return true;
    }
    /**
     * Retrieve stored user data from localStorage.
     * @returns {AuthUser | null} The stored user data or null if not found.
     */
    getStoredUser() {
        try {
            const stored = localStorage.getItem(this.USER_KEY);
            return stored ? JSON.parse(stored) : null;
        }
        catch (error) {
            console.error('Error reading stored user:', error);
            return null;
        }
    }
    /**
     * Store user data in localStorage.
     * @param {AuthUser} user - The user data to store.
     */
    storeUser(user) {
        try {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
        catch (error) {
            console.error('Error storing user:', error);
        }
    }
    /**
     * Clear all stored authentication data from localStorage.
     */
    clearStoredData() {
        localStorage.removeItem(this.USER_KEY);
        this.lastRefreshCheck = 0;
    }
    /**
     * Parse error messages from API responses into user-friendly messages.
     * @param {string} error - The raw error message from the API.
     * @returns {string} A user-friendly error message.
     */
    parseErrorMessage(error) {
        // Try to extract meaningful error message
        if (error.includes('401')) {
            return 'Invalid username or password';
        }
        if (error.includes('400')) {
            return 'Bad request - please check your input';
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
}
// Export singleton instance
export const authService = new AuthService();
