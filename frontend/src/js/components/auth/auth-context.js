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
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.state);
        return () => {
            this.listeners.delete(listener);
        };
    }
    getState() {
        return { ...this.state };
    }
    setState(newState) {
        const oldState = { ...this.state };
        const updatedState = { ...this.state, ...newState };
        this.state = updatedState;
        console.log('[AUTH-DEBUG] AuthContext: State transition from:', oldState, 'to:', updatedState);
        console.log('[AUTH-DEBUG] AuthContext: State change details - isAuthenticated:', oldState.isAuthenticated, '→', updatedState.isAuthenticated, 'isLoading:', oldState.isLoading, '→', updatedState.isLoading);
        if (oldState.isAuthenticated !== updatedState.isAuthenticated) {
            console.log('[AUTH-DEBUG] AuthContext: *** AUTHENTICATION STATE CHANGED ***');
            if (updatedState.isAuthenticated) {
                console.log('[AUTH-DEBUG] AuthContext: User logged IN - triggering navigation update');
            }
            else {
                console.log('[AUTH-DEBUG] AuthContext: User logged OUT - triggering navigation update');
            }
        }
        this.notifyListeners();
    }
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
    async initialize() {
        const initStartTime = performance.now();
        console.log('[AUTH-DEBUG] AuthContext: Starting initialization at', new Date().toISOString());
        console.log('[AUTH-DEBUG] AuthContext: Init timestamp:', Date.now());
        console.log('[AUTH-DEBUG] AuthContext: === GUEST DASHBOARD DEBUG ===');
        console.log('[AUTH-DEBUG] AuthContext: Checking for guest user authentication state...');
        this.setState({ isLoading: true, error: null });
        const INIT_TIMEOUT = 10000;
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Authentication initialization timeout')), INIT_TIMEOUT);
        });
        try {
            const importStartTime = performance.now();
            console.log('[AUTH-DEBUG] AuthContext: Importing auth service');
            const { authService } = await import('../../services/auth-service');
            const importTime = performance.now() - importStartTime;
            console.log('[AUTH-DEBUG] AuthContext: Auth service imported successfully in', importTime.toFixed(2), 'ms');
            const guestCheckStartTime = performance.now();
            console.log('[AUTH-DEBUG] AuthContext: Checking for guest user first');
            const isGuestUser = authService.isGuestUser();
            const storedUser = authService.getStoredUser();
            const guestCheckTime = performance.now() - guestCheckStartTime;
            console.log('[AUTH-DEBUG] AuthContext: Guest user check completed in', guestCheckTime.toFixed(2), 'ms');
            console.log('[AUTH-DEBUG] AuthContext: Guest user check result:', isGuestUser);
            console.log('[AUTH-DEBUG] AuthContext: Stored user data:', storedUser);
            if (isGuestUser && storedUser) {
                console.log('[AUTH-DEBUG] AuthContext: Guest user detected, setting as authenticated');
                const guestAuthStartTime = performance.now();
                this.setState({
                    user: storedUser,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                });
                const guestAuthTime = performance.now() - guestAuthStartTime;
                console.log('[AUTH-DEBUG] AuthContext: Guest user authentication completed in', guestAuthTime.toFixed(2), 'ms');
                return;
            }
            const authCheckStartTime = performance.now();
            console.log('[AUTH-DEBUG] AuthContext: Checking regular user authentication status');
            const authCheckPromise = authService.isAuthenticated();
            const isAuth = await Promise.race([authCheckPromise, timeoutPromise]);
            const authCheckTime = performance.now() - authCheckStartTime;
            console.log('[AUTH-DEBUG] AuthContext: Authentication status result:', isAuth, 'in', authCheckTime.toFixed(2), 'ms');
            if (isAuth) {
                console.log('[AUTH-DEBUG] AuthContext: User authenticated, getting user info');
                const userInfoStartTime = performance.now();
                const userInfoPromise = authService.getCurrentUser();
                const userResponse = await Promise.race([userInfoPromise, timeoutPromise]);
                const userInfoTime = performance.now() - userInfoStartTime;
                console.log('[AUTH-DEBUG] AuthContext: User response received in', userInfoTime.toFixed(2), 'ms:', JSON.stringify(userResponse, null, 2));
                if (userResponse && userResponse.data) {
                    console.log('[AUTH-DEBUG] AuthContext: Setting user as authenticated with data:', userResponse.data);
                    const stateUpdateStartTime = performance.now();
                    this.setState({
                        user: userResponse.data,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });
                    const stateUpdateTime = performance.now() - stateUpdateStartTime;
                    console.log('[AUTH-DEBUG] AuthContext: Authenticated state update completed in', stateUpdateTime.toFixed(2), 'ms');
                }
                else {
                    console.log('[AUTH-DEBUG] AuthContext: No user data received, checking for guest user fallback');
                    const guestUser = authService.getCurrentGuestUser();
                    console.log('[AUTH-DEBUG] AuthContext: Guest user check result:', !!guestUser);
                    if (guestUser) {
                        console.log('[AUTH-DEBUG] AuthContext: Guest user found but not handled by auth service, setting as authenticated');
                        this.setState({
                            user: guestUser,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null
                        });
                    }
                    else {
                        console.log('[AUTH-DEBUG] AuthContext: Attempting to ensure guest access');
                        const guestResponse = await authService.ensureGuestAccess();
                        if (guestResponse.data) {
                            console.log('[AUTH-DEBUG] AuthContext: Guest user created successfully, setting as authenticated');
                            this.setState({
                                user: guestResponse.data,
                                isAuthenticated: true,
                                isLoading: false,
                                error: null
                            });
                        }
                        else {
                            console.log('[AUTH-DEBUG] AuthContext: Failed to create guest user, falling back to login');
                            this.setState({
                                user: null,
                                isAuthenticated: false,
                                isLoading: false,
                                error: null
                            });
                        }
                    }
                }
            }
            else {
                console.log('[AUTH-DEBUG] AuthContext: User not authenticated, checking for guest user fallback');
                const guestUser = authService.getCurrentGuestUser();
                console.log('[AUTH-DEBUG] AuthContext: Guest user check result:', !!guestUser);
                if (guestUser) {
                    console.log('[AUTH-DEBUG] AuthContext: Guest user found despite auth service saying not authenticated, setting as authenticated');
                    this.setState({
                        user: guestUser,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });
                }
                else {
                    console.log('[AUTH-DEBUG] AuthContext: Attempting to ensure guest access');
                    const guestResponse = await authService.ensureGuestAccess();
                    if (guestResponse.data) {
                        console.log('[AUTH-DEBUG] AuthContext: Guest user created successfully, setting as authenticated');
                        this.setState({
                            user: guestResponse.data,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null
                        });
                    }
                    else {
                        console.log('[AUTH-DEBUG] AuthContext: Failed to create guest user, falling back to login');
                        this.setState({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            error: null
                        });
                    }
                }
            }
        }
        catch (error) {
            console.error('[AUTH-DEBUG] Auth initialization error:', error);
            console.error('[AUTH-DEBUG] Auth initialization error details:', error instanceof Error ? error.stack : 'Unknown error type');
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('timeout') || errorMessage === 'Authentication initialization timeout') {
                console.log('[AUTH-DEBUG] AuthContext: Initialization timeout - falling back to login');
                console.log('[AUTH-DEBUG] AuthContext: This prevents the app from being stuck in loading state');
            }
            else if (errorMessage === 'Not authenticated' || errorMessage === 'Failed to fetch' || errorMessage.includes('NetworkError')) {
                console.log('[AUTH-DEBUG] AuthContext: Network or authentication error during initialization - this is expected for initial load');
            }
            else {
                console.log('[AUTH-DEBUG] AuthContext: Unexpected error during initialization:', errorMessage);
            }
            console.log('[AUTH-DEBUG] AuthContext: Falling back to login state after error');
            const stateUpdateStartTime = performance.now();
            this.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
            });
            const stateUpdateTime = performance.now() - stateUpdateStartTime;
            console.log('[AUTH-DEBUG] AuthContext: Fallback state update completed in', stateUpdateTime.toFixed(2), 'ms');
        }
        const totalInitTime = performance.now() - initStartTime;
        console.log('[AUTH-DEBUG] AuthContext: Initialization complete at', new Date().toISOString(), 'total time:', totalInitTime.toFixed(2), 'ms');
    }
    async login(credentials) {
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
        }
        catch (error) {
            this.setState({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Login failed'
            });
            throw error;
        }
    }
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
            this.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
            });
        }
    }
    async refreshAuth() {
        this.setState({ isLoading: true, error: null });
        try {
            const { authService } = await import('../../services/auth-service');
            const refreshResult = await authService.refreshToken();
            if (!refreshResult.success) {
                this.setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                });
                return;
            }
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
    clearError() {
        this.setState({ error: null });
    }
    hasRole(role) {
        return this.state.user?.role === role;
    }
    hasAnyRole(roles) {
        return this.state.user ? roles.includes(this.state.user.role) : false;
    }
    isAdmin() {
        return this.hasRole('admin');
    }
    isTeacherOrAdmin() {
        return this.hasAnyRole(['admin', 'teacher']);
    }
    async createGuestUserForBypass() {
        console.log('[AUTH-DEBUG] AuthContext: Creating guest user for bypass mode');
        try {
            const { authService } = await import('../../services/auth-service');
            const guestResponse = await authService.createGuestUser();
            if (guestResponse.error) {
                console.log('[AUTH-DEBUG] AuthContext: Guest user creation failed:', guestResponse.error);
                this.setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                });
                return;
            }
            if (guestResponse.data) {
                console.log('[AUTH-DEBUG] AuthContext: Guest user created successfully, setting as authenticated');
                this.setState({
                    user: guestResponse.data,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                });
            }
            else {
                console.log('[AUTH-DEBUG] AuthContext: No guest user data received, falling back to login');
                this.setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                });
            }
        }
        catch (error) {
            console.error('[AUTH-DEBUG] AuthContext: Guest user creation error:', error);
            this.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
            });
        }
    }
}
const authContext = new AuthContext();
export function useAuth() {
    return {
        state: authContext.getState(),
        login: authContext.login.bind(authContext),
        logout: authContext.logout.bind(authContext),
        refreshAuth: authContext.refreshAuth.bind(authContext),
        clearError: authContext.clearError.bind(authContext)
    };
}
export { authContext };
//# sourceMappingURL=auth-context.js.map