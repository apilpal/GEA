// Auth Context - provides authentication state management

/** Represents a user in the authentication system. */
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

/** Represents the current authentication state. */
interface AuthState {
    /** Currently authenticated user or null if not authenticated. */
    user: AuthUser | null;
    /** Whether the user is currently authenticated. */
    isAuthenticated: boolean;
    /** Whether an authentication operation is in progress. */
    isLoading: boolean;
    /** Current error message or null if no error. */
    error: string | null;
}

/** Value object for auth context providing state and methods. */
interface AuthContextValue {
    /** Current authentication state. */
    state: AuthState;
    /** Function to log in a user with credentials. */
    login: (credentials: { username_or_email: string; password: string }) => Promise<void>;
    /** Function to log out the current user. */
    logout: () => Promise<void>;
    /** Function to refresh authentication token. */
    refreshAuth: () => Promise<void>;
    /** Function to clear the current error. */
    clearError: () => void;
    /** Function to log in using bypass authentication (development/testing only). */
    loginWithBypass: () => Promise<void>;
}

/**
 * Singleton class that manages authentication state across the application.
 * Provides subscription-based state updates and authentication operations.
 */
class AuthContext {
    private state: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
    };

    private listeners: Set<(state: AuthState) => void> = new Set();

    /**
     * Subscribe to authentication state changes.
     * @param {function(AuthState): void} listener - Callback function called when auth state changes.
     * @returns {function(): void} Unsubscribe function to remove the listener.
     */
    subscribe(listener: (state: AuthState) => void): () => void {
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
    getState(): AuthState {
        return { ...this.state };
    }

    /**
     * Update authentication state and notify all listeners.
     * @param {Partial<AuthState>} newState - Partial state object to merge with current state.
     */
    private setState(newState: Partial<AuthState>): void {
        const oldState = { ...this.state };
        const updatedState = { ...this.state, ...newState };
        this.state = updatedState;

        console.log('[AUTH-DEBUG] AuthContext: State transition from:', oldState, 'to:', updatedState);
        console.log('[AUTH-DEBUG] AuthContext: State change details - isAuthenticated:', oldState.isAuthenticated, '→', updatedState.isAuthenticated, 'isLoading:', oldState.isLoading, '→', updatedState.isLoading);

        if (oldState.isAuthenticated !== updatedState.isAuthenticated) {
            console.log('[AUTH-DEBUG] AuthContext: *** AUTHENTICATION STATE CHANGED ***');
            if (updatedState.isAuthenticated) {
                console.log('[AUTH-DEBUG] AuthContext: User logged IN - triggering navigation update');
            } else {
                console.log('[AUTH-DEBUG] AuthContext: User logged OUT - triggering navigation update');
            }
        }

        this.notifyListeners();
    }

    /**
     * Notify all registered listeners of state changes.
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }

    /**
       * Initialize authentication state on app startup by checking existing session.
       * @returns {Promise<void>} Resolves when initialization is complete.
       */
    async initialize(): Promise<void> {
        const initStartTime = performance.now();
        console.log('[AUTH-DEBUG] AuthContext: Starting initialization at', new Date().toISOString());
        this.setState({ isLoading: true, error: null });

        // Check if login bypass is enabled via environment variable
        const enableLoginBypass = (import.meta.env as any)?.VITE_ENABLE_LOGIN_BYPASS === 'true';
        console.log('[AUTH-DEBUG] AuthContext: Login bypass enabled:', enableLoginBypass);

        // If login bypass is enabled, use it
        if (enableLoginBypass) {
            console.log('[AUTH-DEBUG] AuthContext: Login bypass enabled, attempting bypass login');
            try {
                const { authService } = await import('../../services/auth-service');
                const bypassResponse = await authService.loginWithBypass();
                
                if (bypassResponse.data) {
                    console.log('[AUTH-DEBUG] AuthContext: Bypass login successful');
                    this.setState({
                        user: bypassResponse.data,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });
                    return;
                } else {
                    console.log('[AUTH-DEBUG] AuthContext: Bypass login failed, falling back to regular authentication');
                }
            } catch (error) {
                console.error('[AUTH-DEBUG] AuthContext: Bypass login error:', error);
                // Continue with regular authentication on error
            }
        }

        // Regular authentication flow (no guest access)
        try {
            console.log('[AUTH-DEBUG] AuthContext: Checking for existing authenticated user');
            const { authService } = await import('../../services/auth-service');
            
            // Check if user is already authenticated
            const isAuth = await authService.isAuthenticated();
            
            if (isAuth) {
                console.log('[AUTH-DEBUG] AuthContext: User already authenticated, getting user info');
                const userResponse = await authService.getCurrentUser();
                
                if (userResponse.data) {
                    console.log('[AUTH-DEBUG] AuthContext: User data received, setting as authenticated');
                    this.setState({
                        user: userResponse.data,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });
                    return;
                }
            }

            // No valid authentication found
            console.log('[AUTH-DEBUG] AuthContext: No valid authentication found, user not logged in');
            this.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
            });

        } catch (error) {
            console.error('[AUTH-DEBUG] Auth initialization error:', error);
            
            // Clear loading state and set not authenticated
            this.setState({
                isLoading: false,
                error: null
            });
            
            this.setState({
                user: null,
                isAuthenticated: false,
                error: null
            });
        }

        const totalInitTime = performance.now() - initStartTime;
        console.log('[AUTH-DEBUG] AuthContext: Authentication initialization complete in', totalInitTime.toFixed(2), 'ms');
    }

    /**
     * Log in a user with the provided credentials.
     * @param {object} credentials - Login credentials containing username/email and password.
     * @param {string} credentials.username_or_email - Username or email for login.
     * @param {string} credentials.password - Password for login.
     * @returns {Promise<void>} Resolves when login is successful, rejects on failure.
     * @throws {Error} When login fails with the error message.
     */
    async login(credentials: { username_or_email: string; password: string }): Promise<void> {
        const loginStartTime = performance.now();
        console.log('[AUTH-DEBUG] AuthContext: Login process started at', new Date().toISOString());
        console.log('[AUTH-DEBUG] AuthContext: Login credentials received for:', credentials.username_or_email);

        this.setState({ isLoading: true, error: null });

        try {
            const { authService } = await import('../../services/auth-service');

            console.log('[AUTH-DEBUG] AuthContext: Calling authService.login()');
            const loginServiceStartTime = performance.now();
            const response = await authService.login(credentials);
            const loginServiceTime = performance.now() - loginServiceStartTime;
            console.log('[AUTH-DEBUG] AuthContext: AuthService login completed in', loginServiceTime.toFixed(2), 'ms');

            if (response.error) {
                console.log('[AUTH-DEBUG] AuthContext: Login failed with error:', response.error);
                const stateUpdateStartTime = performance.now();
                this.setState({
                    isLoading: false,
                    error: response.error
                });
                const stateUpdateTime = performance.now() - stateUpdateStartTime;
                console.log('[AUTH-DEBUG] AuthContext: Login error state update completed in', stateUpdateTime.toFixed(2), 'ms');
                throw new Error(response.error);
            }

            if (response.data) {
                console.log('[AUTH-DEBUG] AuthContext: Login successful, user data received:', response.data.username);
                const stateUpdateStartTime = performance.now();
                this.setState({
                    user: response.data,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                });
                const stateUpdateTime = performance.now() - stateUpdateStartTime;
                const totalLoginTime = performance.now() - loginStartTime;
                console.log('[AUTH-DEBUG] AuthContext: Login state update completed in', stateUpdateTime.toFixed(2), 'ms');
                console.log('[AUTH-DEBUG] AuthContext: Total login process completed in', totalLoginTime.toFixed(2), 'ms');
            }
        } catch (error) {
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
    async logout(): Promise<void> {
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
        } catch (error) {
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
    async refreshAuth(): Promise<void> {
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
            } else {
                this.setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                });
            }
        } catch (error) {
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
    clearError(): void {
        this.setState({ error: null });
    }

    /**
     * Log in using bypass authentication (development/testing only).
     * @returns {Promise<void>} Resolves when bypass login is successful.
     * @throws {Error} When bypass login fails.
     */
    async loginWithBypass(): Promise<void> {
        const bypassStartTime = performance.now();
        console.log('[AUTH-DEBUG] AuthContext: Bypass login process started at', new Date().toISOString());

        this.setState({ isLoading: true, error: null });

        try {
            const { authService } = await import('../../services/auth-service');

            console.log('[AUTH-DEBUG] AuthContext: Calling authService.loginWithBypass()');
            const bypassServiceStartTime = performance.now();
            const response = await authService.loginWithBypass();
            const bypassServiceTime = performance.now() - bypassServiceStartTime;
            console.log('[AUTH-DEBUG] AuthService bypass login completed in', bypassServiceTime.toFixed(2), 'ms');

            if (response.error) {
                console.log('[AUTH-DEBUG] AuthContext: Bypass login failed with error:', response.error);
                const stateUpdateStartTime = performance.now();
                this.setState({
                    isLoading: false,
                    error: response.error
                });
                const stateUpdateTime = performance.now() - stateUpdateStartTime;
                console.log('[AUTH-DEBUG] AuthContext: Bypass login error state update completed in', stateUpdateTime.toFixed(2), 'ms');
                throw new Error(response.error);
            }

            if (response.data) {
                console.log('[AUTH-DEBUG] AuthContext: Bypass login successful, user data received:', response.data.username);
                const stateUpdateStartTime = performance.now();
                this.setState({
                    user: response.data,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                });
                const stateUpdateTime = performance.now() - stateUpdateStartTime;
                const totalBypassTime = performance.now() - bypassStartTime;
                console.log('[AUTH-DEBUG] AuthContext: Bypass login state update completed in', stateUpdateTime.toFixed(2), 'ms');
                console.log('[AUTH-DEBUG] AuthContext: Total bypass login process completed in', totalBypassTime.toFixed(2), 'ms');
            }
        } catch (error) {
            this.setState({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Bypass login failed'
            });
            throw error;
        }
    }

    /**
     * Check if the current user has a specific role.
     * @param {string} role - The role to check for.
     * @returns {boolean} True if the user has the specified role.
     */
    hasRole(role: string): boolean {
        return this.state.user?.role === role;
    }

    /**
     * Check if the current user has any of the specified roles.
     * @param {string[]} roles - Array of roles to check for.
     * @returns {boolean} True if the user has any of the specified roles.
     */
    hasAnyRole(roles: string[]): boolean {
        return this.state.user ? roles.includes(this.state.user.role) : false;
    }

    /**
     * Check if the current user is an admin.
     * @returns {boolean} True if the user has admin role.
     */
    isAdmin(): boolean {
        return this.hasRole('admin');
    }

    /**
     * Check if the current user is a teacher or admin.
     * @returns {boolean} True if the user has teacher or admin role.
     */
    isTeacherOrAdmin(): boolean {
        return this.hasAnyRole(['admin', 'teacher']);
    }
}

// Create singleton instance
const authContext = new AuthContext();

/**
 * React-like hook pattern for accessing authentication context in components.
 * @returns {AuthContextValue} Object containing auth state and methods.
 */
export function useAuth(): AuthContextValue {
    return {
        state: authContext.getState(),
        login: authContext.login.bind(authContext),
        logout: authContext.logout.bind(authContext),
        refreshAuth: authContext.refreshAuth.bind(authContext),
        clearError: authContext.clearError.bind(authContext),
        loginWithBypass: authContext.loginWithBypass.bind(authContext)
    };
}

// Export the context instance and types
export { authContext };
export type { AuthUser, AuthState, AuthContextValue };