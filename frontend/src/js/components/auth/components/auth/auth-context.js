// Auth Context - provides authentication state management
/**
 * Singleton class that manages authentication state across the application.
 * Provides subscription-based state updates and authentication operations.
 */
class AuthContext {
    constructor() {
        this.state = {
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
        };
        this.listeners = new Set();
    }
    /**
     * Subscribe to authentication state changes.
     * @param {function(AuthState): void} listener - Callback function called when auth state changes.
     * @returns {function(): void} Unsubscribe function to remove the listener.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        // Immediately call listener with current state
        listener(this.state);
        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }
    /**
     * Get a copy of the current authentication state.
     * @returns {AuthState} Current authentication state.
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Update authentication state and notify all listeners.
     * @param {Partial<AuthState>} newState - Partial state object to merge with current state.
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    }
    /**
     * Notify all registered listeners of state changes.
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            }
            catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }
    /**
     * Initialize authentication state on app startup by checking existing session.
     * @returns {Promise<void>} Resolves when initialization is complete.
     */
    async initialize() {
        console.log('[AUTH-DEBUG] AuthContext: Starting initialization at', new Date().toISOString());
        this.setState({ isLoading: true, error: null });
        try {
            // Import auth service dynamically to avoid circular dependencies
            console.log('[AUTH-DEBUG] AuthContext: Importing auth service');
            const { authService } = await import('../../services/auth-service');
            console.log('[AUTH-DEBUG] AuthContext: Auth service imported successfully');
            // Check if user is already authenticated
            console.log('[AUTH-DEBUG] AuthContext: Checking authentication status');
            const isAuth = await authService.isAuthenticated();
            console.log('[AUTH-DEBUG] AuthContext: Authentication status result:', isAuth);
            if (isAuth) {
                console.log('[AUTH-DEBUG] AuthContext: User authenticated, getting user info');
                const userResponse = await authService.getCurrentUser();
                console.log('[AUTH-DEBUG] AuthContext: User response received:', JSON.stringify(userResponse, null, 2));
                if (userResponse.data) {
                    console.log('[AUTH-DEBUG] AuthContext: Setting user as authenticated with data:', userResponse.data);
                    this.setState({
                        user: userResponse.data,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });
                }
                else {
                    console.log('[AUTH-DEBUG] AuthContext: No user data received or not authenticated, setting as not authenticated');
                    this.setState({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: null
                    });
                }
            }
            else {
                console.log('[AUTH-DEBUG] AuthContext: User not authenticated, showing login');
                this.setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                });
            }
        }
        catch (error) {
            console.error('[AUTH-DEBUG] Auth initialization error:', error);
            console.error('[AUTH-DEBUG] Auth initialization error details:', error instanceof Error ? error.stack : 'Unknown error type');
            // Check if this is a "Not authenticated" error, which is expected for initial load
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage === 'Not authenticated') {
                console.log('[AUTH-DEBUG] AuthContext: Not authenticated error during initialization - this is expected');
                this.setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                });
            }
            else {
                this.setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: 'Failed to initialize authentication'
                });
            }
        }
        console.log('[AUTH-DEBUG] AuthContext: Initialization complete at', new Date().toISOString());
    }
    /**
     * Log in a user with the provided credentials.
     * @param {object} credentials - Login credentials containing username/email and password.
     * @param {string} credentials.username_or_email - Username or email for login.
     * @param {string} credentials.password - Password for login.
     * @returns {Promise<void>} Resolves when login is successful, rejects on failure.
     * @throws {Error} When login fails with the error message.
     */
    async login(credentials) {
        this.setState({ isLoading: true, error: null });
        try {
            const { authService } = await import('../../services/auth-service');
            const response = await authService.login(credentials);
            if (response.error) {
                this.setState({
                    isLoading: false,
                    error: response.error
                });
                throw new Error(response.error);
            }
            if (response.data) {
                this.setState({
                    user: response.data,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                });
            }
        }
        catch (error) {
            this.setState({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Login failed'
            });
            throw error;
        }
    }
    /**
     * Log out the current user and clear authentication state.
     * @returns {Promise<void>} Resolves when logout is complete.
     */
    async logout() {
        this.setState({ isLoading: true, error: null });
        try {
            const { authService } = await import('../../services/auth-service');
            await authService.logout();
            this.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            console.error('Logout error:', error);
            // Even if logout fails, clear local state
            this.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
            });
        }
    }
    /**
     * Refresh the authentication token and update user information.
     * @returns {Promise<void>} Resolves when authentication refresh is complete.
     */
    async refreshAuth() {
        this.setState({ isLoading: true, error: null });
        try {
            const { authService } = await import('../../services/auth-service');
            // Try to refresh token
            const refreshResult = await authService.refreshToken();
            if (!refreshResult.success) {
                // Refresh failed, user needs to login again
                this.setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                });
                return;
            }
            // Get updated user info
            const userResponse = await authService.getCurrentUser();
            if (userResponse.data) {
                this.setState({
                    user: userResponse.data,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                });
            }
            else {
                this.setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                });
            }
        }
        catch (error) {
            console.error('Auth refresh error:', error);
            this.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'Failed to refresh authentication'
            });
        }
    }
    /**
     * Clear the current error message.
     */
    clearError() {
        this.setState({ error: null });
    }
    /**
     * Check if the current user has a specific role.
     * @param {string} role - The role to check for.
     * @returns {boolean} True if the user has the specified role.
     */
    hasRole(role) {
        return this.state.user?.role === role;
    }
    /**
     * Check if the current user has any of the specified roles.
     * @param {string[]} roles - Array of roles to check for.
     * @returns {boolean} True if the user has any of the specified roles.
     */
    hasAnyRole(roles) {
        return this.state.user ? roles.includes(this.state.user.role) : false;
    }
    /**
     * Check if the current user is an admin.
     * @returns {boolean} True if the user has admin role.
     */
    isAdmin() {
        return this.hasRole('admin');
    }
    /**
     * Check if the current user is a teacher or admin.
     * @returns {boolean} True if the user has teacher or admin role.
     */
    isTeacherOrAdmin() {
        return this.hasAnyRole(['admin', 'teacher']);
    }
}
// Create singleton instance
const authContext = new AuthContext();
/**
 * React-like hook pattern for accessing authentication context in components.
 * @returns {AuthContextValue} Object containing auth state and methods.
 */
export function useAuth() {
    return {
        state: authContext.getState(),
        login: authContext.login.bind(authContext),
        logout: authContext.logout.bind(authContext),
        refreshAuth: authContext.refreshAuth.bind(authContext),
        clearError: authContext.clearError.bind(authContext)
    };
}
// Export the context instance and types
export { authContext };
