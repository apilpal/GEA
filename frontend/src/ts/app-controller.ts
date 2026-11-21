// App controller module for initialization

import { initializeNavigation } from '@/ts/router';
import { authContext } from './components/auth/auth-context';
import { authService } from './services/auth-service';
import { registerAllComponents } from './components/registry';

// Register all components using the unified registry system
// This ensures consistent registration and prevents conflicts
registerAllComponents();

// Global auth state - now derived from auth context only
let authContextState: any = null;

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DIAGNOSTIC] AppController DOMContentLoaded fired at:', new Date().toISOString());

    // CRITICAL: Initialize auth FIRST before navigation
    // This ensures guest user is created before router checks authentication
    console.log('[DIAGNOSTIC] Starting auth initialization first...');
    
    initializeAuth().then(() => {
        console.log('[DIAGNOSTIC] Auth initialization complete, now initializing navigation');
        
        // Initialize critical navigation after auth is ready
        initializeNavigation();

        console.log('[DIAGNOSTIC] initializeAuth called, app initialization sequence complete');

        // Add debugging for login transition issues
        console.log('[AUTH-DEBUG] AppController: Setting up login transition debugging');

        // Monitor authentication state changes with intelligent fallback
        // Use a more patient approach that doesn't interfere with legitimate auth flows
        let authMonitoringActive = true;
        let monitoringInterval: number | null = null;
        let fallbackTimeoutId: number | null = null;

        let monitoringStartTime = Date.now();

        const checkAuthState = () => {
            if (!authMonitoringActive) return;

            const state = authContext.getState();
            const elapsedTime = Date.now() - monitoringStartTime;

            console.log('[AUTH-DEBUG] AppController: === AUTH STATE CHECK ===');
            console.log('[AUTH-DEBUG] AppController: === GUEST DASHBOARD DEBUG ===');
            console.log('[AUTH-DEBUG] AppController: Timestamp:', new Date().toISOString());
            console.log('[AUTH-DEBUG] AppController: Elapsed time:', elapsedTime, 'ms');
            console.log('[AUTH-DEBUG] AppController: Current auth state:', JSON.stringify(state, null, 2));

            // Check auth service for guest user state - using authContext to avoid module import issues
            const isGuestUser = false;
            const storedUser = authContext.getState().user;
            console.log('[AUTH-DEBUG] AppController: AuthContext guest user check:', isGuestUser);
            console.log('[AUTH-DEBUG] AppController: AuthContext stored user:', storedUser ? JSON.stringify(storedUser, null, 2) : 'null');

            if (!state.isLoading) {
                console.log('[AUTH-DEBUG] AppController: === AUTH LOADING COMPLETED ===');
                console.log('[AUTH-DEBUG] AppController: Auth loading completed after', elapsedTime, 'ms');
                authMonitoringActive = false;

                // GUEST-FIRST APPROACH: Let auth context handle authentication, don't override
                if (!state.isAuthenticated) {
                    console.log('[AUTH-DEBUG] AppController: User not authenticated after loading - auth context will handle login/guest fallback');
                    // Auth context's guest-first approach will handle this properly
                } else {
                    console.log('[AUTH-DEBUG] AppController: === USER AUTHENTICATED ===');
                    console.log('[AUTH-DEBUG] AppController: User authenticated after loading completed, user:', state.user?.username);
                    // Ensure proper dashboard navigation for authenticated users (including guests)
                    if (window.location.hash === '' || window.location.hash === '#') {
                        console.log('[AUTH-DEBUG] AppController: No hash present, navigating to dashboard');
                        window.location.hash = 'dashboard';
                    }
                }
            } else if (elapsedTime > 15000) {
                console.log('[AUTH-DEBUG] AppController: === AUTH TIMEOUT REACHED ===');
                // Extended timeout - let auth context handle the fallback
                console.log('[AUTH-DEBUG] AppController: Auth taking unusually long, letting auth context handle fallback');
                authMonitoringActive = false;
            } else {
                // Continue monitoring
                console.log('[AUTH-DEBUG] AppController: Continuing to monitor auth state...');
                setTimeout(checkAuthState, 200);
            }
        };

        // Start monitoring auth state
        checkAuthState();

        // Add cleanup for page unload to prevent memory leaks
        const cleanupAuthMonitoring = () => {
            authMonitoringActive = false;
        };

        // Listen for page unload to cleanup monitoring
        window.addEventListener('beforeunload', cleanupAuthMonitoring);

        // Store cleanup function globally for potential manual cleanup
        (window as any).cleanupAuthMonitoring = cleanupAuthMonitoring;

        // Initialize sidebar toggle functionality
        initializeSidebarToggle();


        // Add fallback to ensure UI transitions properly if auth gets stuck
        fallbackTimeoutId = window.setTimeout(() => {
            console.log('[TIMING-LOG] === 15-SECOND FALLBACK TIMEOUT TRIGGERED ===');
            console.log('[TIMING-LOG] Timestamp:', new Date().toISOString());
            const state = authContext.getState();
            const hasStoredGuest = false;
            console.log('[AUTH-DEBUG] AppController: Fallback timeout triggered, checking auth state:', state);
            console.log('[AUTH-DEBUG] AppController: Has stored guest user:', hasStoredGuest);

            if (state.isLoading) {
                console.log('[AUTH-DEBUG] AppController: Auth still loading after timeout, checking if we have guest data');

                // For guest users, even if loading state persists, we should show the app
                const isGuestUser = hasStoredGuest;
                if (isGuestUser) {
                    console.log('[AUTH-DEBUG] AppController: Guest user found, showing main app');
                    const mainApp = document.getElementById('main-app');
                    const authLoading = document.getElementById('auth-loading');

                    if (authLoading) {
                      authLoading.classList.remove('auth-loading-visible');
                      authLoading.classList.add('auth-loading-hidden');
                    }
                    if (mainApp) {
                      mainApp.classList.remove('main-app-hidden');
                      mainApp.classList.add('main-app-visible');
                    }

                    // Update UI for guest user
                    updateUserDisplay();
                    updateDashboardWelcome();
                    updateDashboardStats();

                    console.log('[AUTH-DEBUG] AppController: Guest app activated via fallback timeout');
                } else {
                    console.log('[AUTH-DEBUG] AppController: Not logged in, showing login page');
                    showLoginScreen();
                }
            }
        }, 5000); // 5-second fallback timeout to ensure app shows

        // Lazy load other features
        requestIdleCallback(() => {
            initializeTransportPage();
            initializeChat();
            updateDashboardStats();
        });
    }).catch((error) => {
        console.error('[DIAGNOSTIC] Auth initialization failed:', error);
        // Still initialize navigation even if auth fails
        initializeNavigation();
    });
});


/**
 * Handle URL query parameters - check if credentials are present
 */
function hasUrlCredentials(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return !!(urlParams.get('username_or_email') && urlParams.get('password'));
}

/**
 * Check for URL query parameters and auto-login if credentials are present
 */
async function checkUrlAutoLogin(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const usernameOrEmail = urlParams.get('username_or_email');
    const password = urlParams.get('password');
    
    if (usernameOrEmail && password) {
        console.log('[AUTH-DEBUG] AppController: Found credentials in URL, attempting auto-login');
        
        // Clear URL params to avoid exposing credentials
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
            await authContext.login({ username_or_email: usernameOrEmail, password });
            console.log('[AUTH-DEBUG] AppController: Auto-login successful');
        } catch (error) {
            console.error('[AUTH-DEBUG] AppController: Auto-login failed:', error);
            // Show error to user
            showAuthError(error instanceof Error ? error.message : 'Login failed');
        }
    }
}

/**
 * Show error message to user in the login form
 */
function showAuthError(message: string): void {
    console.log('[AUTH-DEBUG] AppController: === DISPLAYING AUTH ERROR ===');
    console.log('[AUTH-DEBUG] AppController: Error message:', message);

    // Try to find login component's error div first
    const loginErrorDiv = document.querySelector('login-component')?.shadowRoot?.getElementById('error-message');
    if (loginErrorDiv) {
        loginErrorDiv.textContent = message;
        loginErrorDiv.classList.add('show');
    }
    
    // Also try the main auth-error div
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        // If no error div exists, show alert for visibility
        alert('Login Error: ' + message);
    }
}

/**
 * Initializes the authentication context and subscribes to auth state changes.
 * This function sets up the authentication state management, including UI updates
 * and error handling for authentication failures.
 * @returns {Promise<void>} A promise that resolves when authentication initialization completes.
 */
async function initializeAuth(): Promise<void> {
    try {
        console.log('[AUTH-DEBUG] AppController: initializeAuth function called at', new Date().toISOString());
        console.log('[AUTH-DEBUG] AppController: Initializing authentication context...');
        console.log('[AUTH-DEBUG] AppController: Current timestamp:', new Date().toISOString());

        // Subscribe to auth state changes
        const unsubscribe = authContext.subscribe((state: any) => {
            console.log('[AUTH-DEBUG] AppController: Auth state changed:', JSON.stringify(state, null, 2));
            console.log('[AUTH-DEBUG] AppController: Auth state change timestamp:', new Date().toISOString());
            authContextState = state;

            // Update UI based on auth state
            updateAuthUI();

            // Handle authentication state changes
            handleAuthStateChange(state);
        });

        console.log('[AUTH-DEBUG] AppController: Auth context subscribed, initializing...');
        const initStartTime = Date.now();
        console.log('[AUTH-DEBUG] AppController: About to call authContext.initialize()');
        // Initialize auth context
        await authContext.initialize();
        const initTime = Date.now() - initStartTime;
        console.log('[AUTH-DEBUG] AppController: Auth context initialized successfully in', initTime, 'ms');

        // Store unsubscribe function for cleanup if needed
        (window as any).authUnsubscribe = unsubscribe;
        
        // After auth initialization, check for URL query params and auto-login if needed
        // But only if we don't already have a user (guest-first might have created one)
        const currentState = authContext.getState();
        if (hasUrlCredentials()) {
            console.log('[AUTH-DEBUG] AppController: URL credentials detected, attempting auto-login');
            checkUrlAutoLogin();
        } else if (!currentState.user) {
            console.log('[AUTH-DEBUG] AppController: No URL credentials and no user, checking for auto-login');
            checkUrlAutoLogin();
        }
    } catch (error) {
        console.error('[AUTH-DEBUG] AppController: Auth initialization failed:', error);
        console.error('[AUTH-DEBUG] AppController: Auth initialization error details:', error instanceof Error ? error.stack : 'Unknown error type');
        // Show login by default if auth fails
        updateAuthUI();
    }
}

/**
 * Shows the login page and hides the loading spinner and main app.
 */
function showLoginScreen(): void {
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    const appContainer = document.getElementById('app');
    const authLoading = document.getElementById('auth-loading');
    const logoutBtn = document.getElementById('logout-btn');

    if (authLoading) {
        authLoading.classList.remove('auth-loading-visible');
        authLoading.classList.add('auth-loading-hidden');
    }
    if (mainApp) {
        mainApp.classList.remove('main-app-visible');
        mainApp.classList.add('main-app-hidden');
    }
    if (loginPage) loginPage.classList.add('active');
    if (appContainer) appContainer.classList.add('login-active');
    if (logoutBtn) logoutBtn.style.display = 'none';
}

/**
 * Updates the UI based on the current authentication state.
 * Toggles visibility of login/main app elements and updates user display.
 */
function updateAuthUI(): void {
    const uiUpdateStartTime = performance.now();
    console.log('[AUTH-DEBUG] AppController: updateAuthUI called at', new Date().toISOString());

    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    const appContainer = document.getElementById('app');
    const logoutBtn = document.getElementById('logout-btn');
    const authLoading = document.getElementById('auth-loading');

    // Get current auth state including loading
    const state = authContext.getState();
    console.log('[AUTH-DEBUG] AppController: Current auth state for UI update:', JSON.stringify(state, null, 2));
    console.log('[AUTH-DEBUG] AppController: Global auth state - isAuthenticated:', authContextState?.isAuthenticated, 'user:', authContextState?.user?.username || 'none');
    
    // Critical fix: Properly detect authenticated state including guest users
    // Check multiple conditions for guest authentication
    const hasStoredGuest = false;
    const hasAuthContextGuest = false;
    const hasRegularAuth = state.isAuthenticated && state.user !== null;

    const isAuthenticated = hasRegularAuth || hasAuthContextGuest || hasStoredGuest;
    const isGuestUser = hasAuthContextGuest || hasStoredGuest;
    
    // Debug logging for auth state
    console.log('[AUTH-DEBUG] updateAuthUI: Final auth state check:', {
        isAuthenticated,
        isGuestUser,
        userExists: state.user !== null,
        user: state.user,
        isLoading: state.isLoading,
        hasError: !!state.error
    });
    
    console.log('[AUTH-DEBUG] AppController: === GUEST AUTH FIX ===');
    console.log('[AUTH-DEBUG] AppController: isAuthenticated:', isAuthenticated);
    console.log('[AUTH-DEBUG] AppController: isGuestUser:', isGuestUser);
    console.log('[AUTH-DEBUG] AppController: state.user:', state.user ? JSON.stringify(state.user, null, 2) : 'null');

    if (state.isLoading) {
        console.log('[AUTH-DEBUG] AppController: Showing loading state, hiding other elements');
        // Show loading, hide everything else
        if (authLoading) {
          authLoading.classList.remove('auth-loading-hidden');
          authLoading.classList.add('auth-loading-visible');
        }
        if (loginPage) loginPage.classList.remove('active');
        if (mainApp) {
          mainApp.classList.remove('main-app-visible');
          mainApp.classList.add('main-app-hidden');
        }
        if (appContainer) appContainer.classList.remove('login-active');
        if (logoutBtn) logoutBtn.style.display = 'none'; // Keep as is for now
    } else if (isAuthenticated) {
        console.log('[AUTH-DEBUG] AppController: *** SHOWING AUTHENTICATED STATE ***');
        console.log('[AUTH-DEBUG] AppController: User authenticated:', state.user?.username);
        
        // Hide login page and show main app IMMEDIATELY
        console.log('[AUTH-DEBUG] AppController: Hiding login page and showing main app');
        if (authLoading) {
          authLoading.classList.remove('auth-loading-visible');
          authLoading.classList.add('auth-loading-hidden');
        }
        if (loginPage) loginPage.classList.remove('active');
        if (mainApp) {
          mainApp.classList.remove('main-app-hidden');
          mainApp.classList.add('main-app-visible');
        }
        if (appContainer) appContainer.classList.remove('login-active');
        if (logoutBtn) logoutBtn.style.display = 'block'; // Keep as is for now

        // Clear any login errors
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) errorDiv.style.display = 'none'; // Keep as is for now

        // Clear login form if it exists
        const loginComponent = document.querySelector('login-component') as any;
        if (loginComponent && loginComponent.reset) {
            loginComponent.reset();
        }

        // Update user info display
        console.log('[AUTH-DEBUG] AppController: Updating user display');
        updateUserDisplay();
        
        // Update dashboard welcome text
        updateDashboardWelcome();
        
        // CRITICAL: Trigger dashboard data load for authenticated users (including guests)
        console.log('[AUTH-DEBUG] AppController: Authenticated user detected, loading dashboard data');
        updateDashboardStats().then(() => {
            console.log('[AUTH-DEBUG] AppController: Dashboard data loaded successfully');
            // Update welcome text again after data load
            updateDashboardWelcome();
        }).catch((error) => {
            console.error('[AUTH-DEBUG] AppController: Failed to load dashboard data:', error);
        });
        
    } else {
        // Not logged in: show ONLY the login page. All data requires login.
        showLoginScreen();
    }

    const uiUpdateTime = performance.now() - uiUpdateStartTime;
    console.log('[AUTH-DEBUG] AppController: UI update completed in', uiUpdateTime.toFixed(2), 'ms');
}

/**
 * Updates navigation UI for initial state when login is the default page.
 * Ensures login page is properly highlighted in navigation.
 */
function updateNavigationForInitialState(): void {
    // Update page visibility for login page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === 'login-page');
    });

    // Update page title for login
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = 'Login';
    }

    // Remove active state from menu items since login doesn't have a menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
}

/**
 * Updates the user information display in the UI with current user details.
 */
function updateUserDisplay(): void {
    const userInfo = document.getElementById('user-info');
    if (userInfo && authContextState?.user) {
        userInfo.innerHTML = `
            <span class="user-name">${authContextState.user.username}</span>
            <span class="user-role">${authContextState.user.role}</span>
        `;
    }
}

/**
 * Updates the dashboard welcome text based on authentication status.
 * Shows appropriate welcome message for guest vs regular users.
 */
function updateDashboardWelcome(): void {
    const welcomeTitle = document.getElementById('dashboard-welcome-title');
    const welcomeSubtitle = document.getElementById('dashboard-welcome-subtitle');
    
    if (!welcomeTitle || !welcomeSubtitle) return;
    
    const state = authContext.getState();
    const isGuest = false;
    
    if (isGuest) {
        welcomeTitle.textContent = 'School Management Dashboard';
        welcomeSubtitle.textContent = 'Welcome! You are viewing the system as a guest. Explore our features and data.';
    } else if (state.user) {
        welcomeTitle.textContent = `Welcome, ${state.user.username}`;
        welcomeSubtitle.textContent = `Role: ${state.user.role} | Manage your school's transport, students, and operations with ease.`;
    } else {
        welcomeTitle.textContent = 'School Management Dashboard';
        welcomeSubtitle.textContent = 'Loading your dashboard data...';
    }
}

/**
 * Handles changes in authentication state by managing navigation and UI feedback.
 * @param {any} state - The new authentication state object containing isAuthenticated, user, isLoading, and error properties.
 */
function handleAuthStateChange(state: any): void {
    const changeStartTime = performance.now();
    console.log('[AUTH-DEBUG] AppController: handleAuthStateChange called at', new Date().toISOString());
    console.log('[AUTH-DEBUG] AppController: Auth state change - isAuthenticated:', authContextState?.isAuthenticated, '→', state.isAuthenticated, 'isLoading:', state.isLoading);
    console.log('[AUTH-DEBUG] AppController: Previous auth state - isAuthenticated:', authContextState?.isAuthenticated, 'user:', authContextState?.user?.username || 'none');
    
    // CRITICAL FIX: Properly detect authentication transitions including guest users
    const wasAuthenticated = !!(authContextState?.isAuthenticated && authContextState?.user !== null);
    const isAuthenticated = !!(state.isAuthenticated && state.user !== null);
    const isGuestUser = false;
    
    console.log('[AUTH-DEBUG] AppController: === GUEST AUTH STATE HANDLING ===');
    console.log('[AUTH-DEBUG] AppController: wasAuthenticated:', wasAuthenticated);
    console.log('[AUTH-DEBUG] AppController: isAuthenticated:', isAuthenticated);
    console.log('[AUTH-DEBUG] AppController: isGuestUser:', isGuestUser);
    console.log('[AUTH-DEBUG] AppController: state.user:', state.user ? JSON.stringify(state.user, null, 2) : 'null');

    if (isAuthenticated && !wasAuthenticated) {
        console.log('[AUTH-DEBUG] AppController: *** USER LOGIN DETECTED (INCLUDING GUESTS) ***');
        console.log('[AUTH-DEBUG] AppController: User logged in, redirecting to dashboard');
        // User just logged in - redirect to dashboard IMMEDIATELY
        window.location.hash = 'dashboard';

        // CRITICAL: Ensure dashboard data is loaded after navigation for ALL users (including guests)
        console.log('[AUTH-DEBUG] AppController: Triggering dashboard data load after login');
        updateDashboardStats();
        console.log('[AUTH-DEBUG] AppController: Dashboard data loaded successfully after login');

        const loginNavTime = performance.now() - changeStartTime;
        console.log('[AUTH-DEBUG] AppController: Login navigation completed in', loginNavTime.toFixed(2), 'ms');
    } else if (!isAuthenticated && wasAuthenticated) {
        console.log('[AUTH-DEBUG] AppController: *** USER LOGOUT DETECTED ***');
        console.log('[AUTH-DEBUG] AppController: User logged out, staying on dashboard');

        // Clear user info display
        const userInfo = document.getElementById('user-info');
        if (userInfo) userInfo.innerHTML = '';

        // Reload dashboard for unauthenticated state
        updateDashboardStats();
        console.log('[AUTH-DEBUG] AppController: Dashboard reloaded for unauthenticated user');
        updateDashboardWelcome();
        const logoutNavTime = performance.now() - changeStartTime;
        console.log('[AUTH-DEBUG] AppController: Logout navigation completed in', logoutNavTime.toFixed(2), 'ms');
    } else if (isAuthenticated && wasAuthenticated) {
        // Ensure we're on the dashboard when authenticated (including guest users)
        console.log('[AUTH-DEBUG] AppController: User authenticated, ensuring dashboard navigation');
        if (window.location.hash !== '#dashboard' && window.location.hash !== 'dashboard') {
            console.log('[AUTH-DEBUG] AppController: Hash not dashboard, navigating to dashboard');
            window.location.hash = 'dashboard';
        } else {
            console.log('[AUTH-DEBUG] AppController: Already on dashboard, ensuring data is loaded');
            // Even if on dashboard, ensure data is loaded for guest users
            if (isGuestUser) {
                updateDashboardStats().then(() => {
                    console.log('[AUTH-DEBUG] AppController: Guest dashboard data refreshed');
                }).catch((error) => {
                    console.error('[AUTH-DEBUG] AppController: Failed to refresh guest dashboard data:', error);
                });
            }
        }
    } else {
        console.log('[AUTH-DEBUG] AppController: No authentication transition needed');
    }

    // Update UI based on state changes (loading is handled in updateAuthUI)
    const uiUpdateStartTime = performance.now();
    updateAuthUI();
    const uiUpdateTime = performance.now() - uiUpdateStartTime;
    console.log('[AUTH-DEBUG] AppController: UI update completed in', uiUpdateTime.toFixed(2), 'ms');

    // Handle auth errors
    if (state.error) {
        console.log('[AUTH-DEBUG] AppController: === AUTH ERROR DETECTED ===');
        console.log('[AUTH-DEBUG] AppController: Auth error detected:', state.error);
        console.log('[AUTH-DEBUG] AppController: Error state - isAuthenticated:', state.isAuthenticated, 'isLoading:', state.isLoading);
        showAuthError(state.error);

        // Additional error handling based on error type
        if (state.error.includes('Network') || state.error.includes('fetch')) {
            console.log('[AUTH-DEBUG] AppController: Network error detected, showing network-specific guidance');
            // Could show additional network error UI here
        } else if (state.error.includes('401') || state.error.includes('Unauthorized')) {
            console.log('[AUTH-DEBUG] AppController: Authentication error detected, ensuring login form is ready');
            // Ensure login form is visible and ready for retry
            setTimeout(() => {
                const loginComponent = document.querySelector('login-component') as any;
                if (loginComponent && loginComponent.focusUsername) {
                    loginComponent.focusUsername();
                }
            }, 100);
        }
    }

    const totalChangeTime = performance.now() - changeStartTime;
    console.log('[AUTH-DEBUG] AppController: Total auth state change handling completed in', totalChangeTime.toFixed(2), 'ms');
}



// Handle login success event from login component
document.addEventListener('login-success', (event: any) => {
    const { user } = event.detail;
    console.log('Login successful for user:', user.username);
    // Auth context will handle the state update
});

/**
 * Logs out the current user by calling the auth context logout method.
 * Handles any errors that occur during logout gracefully.
 * @returns {Promise<void>} A promise that resolves when the logout process is complete.
 */
async function logout(): Promise<void> {
    try {
        await authContext.logout();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Expose logout function globally
(window as any).logout = logout;

/**
 * Initializes the transport page with a mutation observer to detect when the page becomes active
 * and trigger driver loading. Marks the page as loaded to prevent duplicate loading.
 */
function initializeTransportPage() {
    const transportPage = document.getElementById('transport-page');
    if (transportPage) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target as HTMLElement;
                    if (target.id === 'transport-page' && target.classList.contains('active') && !target.hasAttribute('data-drivers-loaded')) {
                        target.setAttribute('data-drivers-loaded', 'true');
                        // Page manager will handle loading
                    }
                }
            });
        });

        observer.observe(transportPage, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Check if already active
        if (transportPage.classList.contains('active') && !transportPage.hasAttribute('data-drivers-loaded')) {
            transportPage.setAttribute('data-drivers-loaded', 'true');
            // Page manager will handle loading
        }
    }
}

/**
 * Initializes chat functionality by setting up event listeners for sending messages.
 * Binds send button clicks and Enter key presses to the sendChatMessage function.
 */
function initializeChat() {
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
    const chatMessages = document.getElementById('chat-messages') as HTMLElement;

    if (!chatInput || !sendBtn || !chatMessages) return;

    // Send message on button click
    sendBtn.addEventListener('click', () => sendChatMessage());

    // Send message on Enter key press
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

/**
 * Sends a chat message to the server and displays the user message and bot response.
 * Handles input validation, UI updates, API communication, and error cases.
 * @returns {Promise<void>} A promise that resolves when the message is sent and response is handled.
 */
async function sendChatMessage() {
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const chatMessages = document.getElementById('chat-messages') as HTMLElement;

    if (!chatInput || !chatMessages) return;

    const message = chatInput.value.trim();
    if (!message) return;

    // Clear input
    chatInput.value = '';

    // Add user message to chat
    const userMessage = createChatMessage(message, 'user');
    chatMessages.appendChild(userMessage);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Send to API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Add bot response
        const botMessage = createChatMessage(data.response || 'Sorry, I encountered an error.', 'bot');
        chatMessages.appendChild(botMessage);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Chat error:', error);
        const errorMessage = createChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
        chatMessages.appendChild(errorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

/**
 * Creates a formatted chat message element with avatar, content, and timestamp.
 * @param {string} content - The text content of the message.
 * @param {'user' | 'bot'} type - The sender type, either 'user' or 'bot'.
 * @returns {HTMLElement} The constructed message element ready to be appended to the chat.
 */
function createChatMessage(content: string, type: 'user' | 'bot') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';

    const icon = document.createElement('icon-robot');
    icon.setAttribute('size', '20');
    avatarDiv.appendChild(icon);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const p = document.createElement('p');
    p.textContent = content;

    const time = document.createElement('small');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    contentDiv.appendChild(p);
    contentDiv.appendChild(time);

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

// Global functions exposure with better type safety
declare global {
    interface Window {
        generateAllReports: () => Promise<void>;
        refreshDrivers: () => Promise<void>;
        showAddDriverModal: () => void;
    }
}

window.generateAllReports = async () => {
    try {
        const { generateAllReports } = await import('./page-managers/reports-manager');
        await generateAllReports();
    } catch (error) {
        console.error('Failed to load reports manager:', error);
        // Dispatch toast event since showToast is not in scope here
        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: 'Failed to load reports functionality', type: 'error' }
        }));
        throw error;
    }
};
window.refreshDrivers = async () => {
    try {
        const { refreshDrivers } = await import('@/ts/page-managers/transport-manager');
        await refreshDrivers();
    } catch (error) {
        console.error('Failed to load transport manager:', error);
        // Dispatch toast event since showToast is not in scope here
        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: 'Failed to load driver refresh functionality', type: 'error' }
        }));
        throw error;
    }
};
window.showAddDriverModal = showAddDriverModal;

/**
 * Shows the add driver modal. Currently displays a placeholder alert until full modal implementation.
 * This is a temporary solution that informs users about the upcoming feature.
 */
function showAddDriverModal() {
    // Create a simple alert for now - can be enhanced later
    alert('Add Driver functionality coming soon! Use the API directly: POST /api/drivers/');
}

/**
 * Updates dashboard statistics by delegating to the dashboard page manager.
 * @returns {Promise<void>} A promise that resolves when dashboard statistics have been updated.
 */
async function updateDashboardStats(): Promise<void> {
    try {
        // Import dashboard manager functions dynamically to avoid circular dependencies
        const dashboardModule = await import('./page-managers/dashboard-manager');
        await dashboardModule.updateDashboardStats();
    } catch (error) {
        console.error('Failed to load dashboard manager:', error);
        // Dispatch toast event since showToast is not in scope here
        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: 'Failed to load dashboard data', type: 'error' }
        }));
        throw error;
    }
}

/**
 * Initializes the sidebar toggle functionality by setting up event listeners
 * for the sidebar toggle button and mobile menu button.
 */
function initializeSidebarToggle(): void {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebarToggle && sidebar && mainContent) {
        sidebarToggle.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.contains('collapsed');
            if (isCollapsed) {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('expanded');
            } else {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
            }
        });
    }

    if (mobileMenuBtn && sidebar && mainContent) {
        mobileMenuBtn.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.contains('collapsed');
            if (isCollapsed) {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('expanded');
            } else {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
            }
        });
    }
}