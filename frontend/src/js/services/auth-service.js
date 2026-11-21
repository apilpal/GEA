import { apiService } from '@/ts/services/api-service';
class AuthService {
    constructor() {
        this.USER_KEY = 'auth_user';
        this.ACCESS_TOKEN_KEY = 'access_token';
        this.REFRESH_THRESHOLD = 5 * 60 * 1000;
        this.TOKEN_CHECK_INTERVAL = 60 * 1000;
        this.refreshPromise = null;
        this.lastRefreshCheck = 0;
        this.tokenCheckInterval = null;
        this.currentAccessToken = null;
    }
    startTokenValidation() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
        this.tokenCheckInterval = window.setInterval(async () => {
            await this.validateAndRefreshToken();
        }, this.TOKEN_CHECK_INTERVAL);
    }
    stopTokenValidation() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
            this.tokenCheckInterval = null;
        }
    }
    storeAccessToken(token) {
        this.currentAccessToken = token;
        try {
            localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
        }
        catch (error) {
            console.error('[AUTH] Failed to store access token in localStorage:', error);
        }
    }
    getStoredAccessToken() {
        if (this.currentAccessToken) {
            return this.currentAccessToken;
        }
        try {
            const stored = localStorage.getItem(this.ACCESS_TOKEN_KEY);
            if (stored) {
                this.currentAccessToken = stored;
                return stored;
            }
        }
        catch (error) {
            console.error('[AUTH] Failed to retrieve access token from localStorage:', error);
        }
        return null;
    }
    clearAccessToken() {
        this.currentAccessToken = null;
        try {
            localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        }
        catch (error) {
            console.error('[AUTH] Failed to clear access token from localStorage:', error);
        }
    }
    async validateAndRefreshToken() {
        const token = this.getStoredAccessToken();
        if (!token) {
            console.log('[AUTH] No access token found, stopping validation');
            this.stopTokenValidation();
            return false;
        }
        try {
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
        }
        catch (error) {
            console.error('[AUTH] Token validation error:', error);
            this.clearStoredData();
            this.stopTokenValidation();
            return false;
        }
    }
    getAuthHeader() {
        const token = this.getStoredAccessToken();
        return token ? `Bearer ${token}` : null;
    }
    async validateTokenWithBackend() {
        try {
            console.log('[AUTH] Validating token with backend');
            const response = await apiService.get('/auth/token/validate');
            if (response.error) {
                console.log('[AUTH] Token validation failed:', response.error);
                return false;
            }
            console.log('[AUTH] Token validation successful');
            return true;
        }
        catch (error) {
            console.error('[AUTH] Token validation error:', error);
            return false;
        }
    }
    async logout() {
        try {
            this.stopTokenValidation();
            await apiService.post('/auth/token/revoke', {});
            this.clearStoredData();
            console.log('[AUTH] Logout completed successfully');
            return {};
        }
        catch (error) {
            console.warn('[AUTH] Logout API call failed, but proceeding with local cleanup:', error);
            this.clearStoredData();
            return {};
        }
    }
    async login(credentials) {
        try {
            console.log('[AUTH] Attempting enhanced login with cookie minimization');
            const response = await apiService.post('/auth/login', credentials);
            if (response.error) {
                console.error('[AUTH] Login failed:', response.error);
                return { error: this.parseErrorMessage(response.error) };
            }
            if (!response.data || !response.data.access_token) {
                console.error('[AUTH] No access token received from server');
                return { error: 'No access token received from server' };
            }
            console.log('[AUTH] Storing access token in memory (cookie minimization)');
            this.storeAccessToken(response.data.access_token);
            this.startTokenValidation();
            const userResponse = await this.getCurrentUser();
            if (userResponse.error) {
                console.error('[AUTH] Failed to get user info after login:', userResponse.error);
                this.clearStoredData();
                return { error: userResponse.error };
            }
            console.log('[AUTH] Login successful with enhanced security');
            return { data: userResponse.data };
        }
        catch (error) {
            console.error('[AUTH] Login error:', error);
            this.clearStoredData();
            return { error: 'An unexpected error occurred during login' };
        }
    }
    async refreshToken() {
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
    async performTokenRefresh() {
        try {
            console.log('[AUTH] Performing enhanced token refresh with rotation');
            const response = await apiService.post('/auth/token/refresh', {});
            if (response.error || !response.data) {
                console.error('[AUTH] Enhanced refresh failed:', response.error);
                throw new Error(response.error || 'Enhanced refresh failed - no data received');
            }
            console.log('[AUTH] Storing new access token after rotation');
            this.storeAccessToken(response.data.access_token);
            this.lastRefreshCheck = Date.now();
            console.log('[AUTH] Token refresh with rotation successful');
            return true;
        }
        catch (error) {
            console.error('[AUTH] Enhanced token refresh error:', error);
            this.clearStoredData();
            throw error;
        }
    }
    async getCurrentUser() {
        try {
            console.log('[AUTH] Getting current user with enhanced token management');
            const isTokenValid = await this.validateTokenWithBackend();
            if (!isTokenValid) {
                console.log('[AUTH] Token validation failed, attempting refresh');
                const refreshResult = await this.refreshToken();
                if (refreshResult.error) {
                    console.log('[AUTH] Refresh failed, user not authenticated');
                    return { error: 'Authentication expired' };
                }
            }
            const authHeader = this.getAuthHeader();
            if (!authHeader) {
                console.log('[AUTH] No access token available');
                return { error: 'Not authenticated' };
            }
            console.log('[AUTH] Making authenticated request to /auth/me');
            const response = await apiService.get('/auth/me');
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
                if (!this.tokenCheckInterval) {
                    this.startTokenValidation();
                }
                return { data: response.data };
            }
            console.log('[AUTH] No user data received');
            return { error: 'No user data received' };
        }
        catch (error) {
            console.error('[AUTH] Get current user error:', error);
            this.clearStoredData();
            return { error: 'Failed to get user information' };
        }
    }
    async initialize() {
        console.log('[AUTH] Initializing enhanced auth service');
        const hasToken = this.getStoredAccessToken() !== null;
        const hasUser = this.getStoredUser() !== null;
        if (hasToken && hasUser) {
            console.log('[AUTH] Found existing session, starting token validation');
            this.startTokenValidation();
            const isValid = await this.validateTokenWithBackend();
            if (!isValid) {
                console.log('[AUTH] Session validation failed, clearing stored data');
                this.clearStoredData();
            }
        }
        else if (hasToken || hasUser) {
            console.log('[AUTH] Incomplete session data, clearing storage');
            this.clearStoredData();
        }
    }
    async isAuthenticated() {
        console.log('[AUTH] Checking authentication status with enhanced validation');
        console.log('[AUTH] === GUEST DASHBOARD DEBUG ===');
        const user = this.getStoredUser();
        const token = this.getStoredAccessToken();
        console.log('[AUTH] Stored user:', user ? JSON.stringify(user, null, 2) : 'null');
        console.log('[AUTH] Stored token:', token ? 'present' : 'null');
        if (!user || !token) {
            console.log('[AUTH] No stored user or token, checking for guest user');
            const isGuest = this.isGuestUser();
            console.log('[AUTH] Guest user check result:', isGuest);
            if (isGuest) {
                console.log('[AUTH] Guest user found, returning authenticated');
                return true;
            }
            console.log('[AUTH] No guest user found, not authenticated');
            return false;
        }
        try {
            const isValid = await this.validateTokenWithBackend();
            if (isValid) {
                console.log('[AUTH] User is authenticated');
                return true;
            }
            else {
                console.log('[AUTH] Token validation failed, checking for guest user fallback');
                const isGuest = this.isGuestUser();
                console.log('[AUTH] Guest user check after token failure:', isGuest);
                if (isGuest) {
                    console.log('[AUTH] Guest user found after token failure, returning authenticated');
                    return true;
                }
                console.log('[AUTH] Token validation failed, clearing stored data');
                this.clearStoredData();
                return false;
            }
        }
        catch (error) {
            console.error('[AUTH] Authentication check error:', error);
            console.log('[AUTH] Error occurred, checking for guest user fallback');
            const isGuest = this.isGuestUser();
            console.log('[AUTH] Guest user check after error:', isGuest);
            if (isGuest) {
                console.log('[AUTH] Guest user found after error, returning authenticated');
                return true;
            }
            this.clearStoredData();
            return false;
        }
    }
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
    storeUser(user) {
        try {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
        catch (error) {
            console.error('Error storing user:', error);
        }
    }
    clearStoredData() {
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        this.currentAccessToken = null;
        this.lastRefreshCheck = 0;
        this.stopTokenValidation();
    }
    parseErrorMessage(error) {
        if (error.includes('401')) {
            if (error.includes('username')) {
                return 'Invalid username or password';
            }
            else if (error.includes('email')) {
                return 'Invalid email or password';
            }
            else {
                return 'Invalid username/email or password';
            }
        }
        if (error.includes('400')) {
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
        return error;
    }
    async createGuestUser() {
        try {
            console.log('[AUTH-GUEST] Creating guest user session');
            const response = await apiService.post('/auth/guest', {});
            if (response.error) {
                return { error: this.parseErrorMessage(response.error) };
            }
            if (!response.data) {
                return { error: 'No guest user data received' };
            }
            const userResponse = await this.getCurrentUser();
            if (userResponse.error) {
                return { error: userResponse.error };
            }
            return { data: userResponse.data };
        }
        catch (error) {
            console.error('[AUTH-GUEST] Guest user creation error:', error);
            return { error: 'Failed to create guest user session' };
        }
    }
    async getGuestDashboardData() {
        try {
            console.log('[AUTH-GUEST] Fetching guest dashboard data from public endpoints');
            const statsResponse = await apiService.get('/api/dashboard/public/stats');
            const chartsResponse = await apiService.get('/api/dashboard/public/charts');
            if (statsResponse.error || chartsResponse.error) {
                return { error: 'Failed to get public dashboard data' };
            }
            const combinedData = {
                summary: statsResponse.data,
                charts: chartsResponse.data,
                guest_access: true,
                message: 'Guest dashboard data loaded successfully'
            };
            return { data: combinedData };
        }
        catch (error) {
            console.error('[AUTH-GUEST] Guest dashboard data error:', error);
            return { error: 'Failed to get guest dashboard data' };
        }
    }
    async convertGuestToUser(username, email, password) {
        try {
            console.log('[AUTH-GUEST] Converting guest user to registered user');
            const currentUser = this.getStoredUser();
            if (!currentUser || !currentUser.is_guest) {
                return { error: 'No guest user session found' };
            }
            const guestId = currentUser.guest_token || 'unknown';
            const response = await apiService.post('/auth/convert-guest', {
                guest_id: guestId,
                username: username,
                email: email,
                password: password
            });
            if (response.error) {
                return { error: this.parseErrorMessage(response.error) };
            }
            this.clearStoredData();
            const userResponse = await this.getCurrentUser();
            if (userResponse.error) {
                return { error: userResponse.error };
            }
            return { data: userResponse.data };
        }
        catch (error) {
            console.error('[AUTH-GUEST] Guest conversion error:', error);
            return { error: 'Failed to convert guest user' };
        }
    }
    isGuestUser() {
        const user = this.getStoredUser();
        console.log('[AUTH] === GUEST DASHBOARD DEBUG ===');
        console.log('[AUTH] isGuestUser() called');
        console.log('[AUTH] Stored user:', user ? JSON.stringify(user, null, 2) : 'null');
        const result = user ? !!user.is_guest : false;
        console.log('[AUTH] Guest user check result:', result);
        return result;
    }
    getCurrentGuestUser() {
        const user = this.getStoredUser();
        if (user && user.is_guest) {
            return user;
        }
        return null;
    }
    isGuestSessionExpired() {
        const guestUser = this.getCurrentGuestUser();
        if (!guestUser || !guestUser.expires_at) {
            return false;
        }
        try {
            const expiresAt = new Date(guestUser.expires_at);
            return expiresAt < new Date();
        }
        catch (error) {
            console.error('[AUTH-GUEST] Error checking guest session expiry:', error);
            return true;
        }
    }
    async ensureGuestAccess() {
        console.log('[AUTH-GUEST] Ensuring guest access');
        if (await this.isAuthenticated()) {
            console.log('[AUTH-GUEST] User already authenticated');
            return { data: this.getStoredUser() || undefined };
        }
        const currentPath = window.location.pathname;
        const publicPaths = ['/', '/dashboard', '/login', '/register'];
        if (publicPaths.some(path => currentPath.startsWith(path))) {
            console.log('[AUTH-GUEST] Auto-creating guest user for public path');
            return await this.createGuestUser();
        }
        console.log('[AUTH-GUEST] Not on a public path, skipping guest creation');
        return { error: 'Not on a public page' };
    }
}
export const authService = new AuthService();
//# sourceMappingURL=auth-service.js.map