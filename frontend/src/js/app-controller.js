import { initializeNavigation } from '@/ts/router';
import { authContext } from './components/auth/auth-context';
import { registerAllComponents } from './components/registry';
registerAllComponents();
let authContextState = null;
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DIAGNOSTIC] AppController DOMContentLoaded fired at:', new Date().toISOString());
    initializeNavigation();
    console.log('[DIAGNOSTIC] Navigation initialized, about to call initializeAuth');
    initializeAuth();
    console.log('[DIAGNOSTIC] initializeAuth called, app initialization sequence complete');
    console.log('[AUTH-DEBUG] AppController: Setting up login transition debugging');
    let authMonitoringActive = true;
    let monitoringStartTime = Date.now();
    const checkAuthState = () => {
        if (!authMonitoringActive)
            return;
        const state = authContext.getState();
        const elapsedTime = Date.now() - monitoringStartTime;
        console.log('[AUTH-DEBUG] AppController: === AUTH STATE CHECK ===');
        console.log('[AUTH-DEBUG] AppController: === GUEST DASHBOARD DEBUG ===');
        console.log('[AUTH-DEBUG] AppController: Timestamp:', new Date().toISOString());
        console.log('[AUTH-DEBUG] AppController: Elapsed time:', elapsedTime, 'ms');
        console.log('[AUTH-DEBUG] AppController: Current auth state:', JSON.stringify(state, null, 2));
        const { authService } = require('@/services/auth-service');
        const isGuestUser = authService.isGuestUser();
        const storedUser = authService.getStoredUser();
        console.log('[AUTH-DEBUG] AppController: AuthService guest user check:', isGuestUser);
        console.log('[AUTH-DEBUG] AppController: AuthService stored user:', storedUser ? JSON.stringify(storedUser, null, 2) : 'null');
        if (!state.isLoading) {
            console.log('[AUTH-DEBUG] AppController: === AUTH LOADING COMPLETED ===');
            console.log('[AUTH-DEBUG] AppController: Auth loading completed after', elapsedTime, 'ms');
            authMonitoringActive = false;
            if (!state.isAuthenticated) {
                console.log('[AUTH-DEBUG] AppController: === NAVIGATING TO LOGIN ===');
                console.log('[AUTH-DEBUG] AppController: User not authenticated after loading completed, navigating to login');
                window.location.hash = 'login';
                setTimeout(() => updateNavigationForInitialState(), 50);
                console.log('[AUTH-DEBUG] AppController: Login page navigation completed');
            }
            else {
                console.log('[AUTH-DEBUG] AppController: === USER ALREADY AUTHENTICATED ===');
                console.log('[AUTH-DEBUG] AppController: User authenticated after loading completed, user:', state.user?.username);
                if (window.location.hash === '' || window.location.hash === '#') {
                    console.log('[AUTH-DEBUG] AppController: No hash present, navigating to dashboard');
                    window.location.hash = 'dashboard';
                }
            }
        }
        else if (elapsedTime > 10000) {
            console.log('[AUTH-DEBUG] AppController: === AUTH TIMEOUT REACHED ===');
            console.log('[AUTH-DEBUG] AppController: Auth taking unusually long (', elapsedTime, 'ms), checking if stuck');
            console.log('[AUTH-DEBUG] AppController: Forcing navigation to login after extended timeout');
            authMonitoringActive = false;
            if (window.location.hash !== 'login') {
                window.location.hash = 'login';
                setTimeout(() => updateNavigationForInitialState(), 50);
            }
            console.log('[AUTH-DEBUG] AppController: Timeout login navigation completed');
        }
        else {
            console.log('[AUTH-DEBUG] AppController: Continuing to monitor auth state...');
            setTimeout(checkAuthState, 200);
        }
    };
    setTimeout(checkAuthState, 100);
    const cleanupAuthMonitoring = () => {
        authMonitoringActive = false;
    };
    window.addEventListener('beforeunload', cleanupAuthMonitoring);
    window.cleanupAuthMonitoring = cleanupAuthMonitoring;
    initializeSidebarToggle();
    setTimeout(() => {
        const state = authContext.getState();
        if (state.isLoading) {
            console.log('[AUTH-DEBUG] AppController: Auth still loading after timeout, forcing login visibility');
            const loginPage = document.getElementById('login-page');
            const appContainer = document.getElementById('app');
            const authLoading = document.getElementById('auth-loading');
            if (loginPage)
                loginPage.classList.add('active');
            if (appContainer)
                appContainer.classList.add('login-active');
            if (authLoading)
                authLoading.style.display = 'none';
            console.log('[AUTH-DEBUG] AppController: Login page activated via fallback timeout');
        }
    }, 15000);
    requestIdleCallback(() => {
        initializeTransportPage();
        initializeChat();
        updateDashboardStats();
    });
});
async function initializeAuth() {
    try {
        console.log('[AUTH-DEBUG] AppController: initializeAuth function called at', new Date().toISOString());
        console.log('[AUTH-DEBUG] AppController: Initializing authentication context...');
        console.log('[AUTH-DEBUG] AppController: Current timestamp:', new Date().toISOString());
        const unsubscribe = authContext.subscribe((state) => {
            console.log('[AUTH-DEBUG] AppController: Auth state changed:', JSON.stringify(state, null, 2));
            console.log('[AUTH-DEBUG] AppController: Auth state change timestamp:', new Date().toISOString());
            authContextState = state;
            updateAuthUI();
            handleAuthStateChange(state);
        });
        console.log('[AUTH-DEBUG] AppController: Auth context subscribed, initializing...');
        const initStartTime = Date.now();
        console.log('[AUTH-DEBUG] AppController: About to call authContext.initialize()');
        await authContext.initialize();
        const initTime = Date.now() - initStartTime;
        console.log('[AUTH-DEBUG] AppController: Auth context initialized successfully in', initTime, 'ms');
        window.authUnsubscribe = unsubscribe;
    }
    catch (error) {
        console.error('[AUTH-DEBUG] AppController: Auth initialization failed:', error);
        console.error('[AUTH-DEBUG] AppController: Auth initialization error details:', error instanceof Error ? error.stack : 'Unknown error type');
        updateAuthUI();
    }
}
function updateAuthUI() {
    const uiUpdateStartTime = performance.now();
    console.log('[AUTH-DEBUG] AppController: updateAuthUI called at', new Date().toISOString());
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    const appContainer = document.getElementById('app');
    const logoutBtn = document.getElementById('logout-btn');
    const authLoading = document.getElementById('auth-loading');
    const state = authContext.getState();
    console.log('[AUTH-DEBUG] AppController: Current auth state for UI update:', JSON.stringify(state, null, 2));
    console.log('[AUTH-DEBUG] AppController: Global auth state - isAuthenticated:', authContextState?.isAuthenticated, 'user:', authContextState?.user?.username || 'none');
    if (state.isLoading) {
        console.log('[AUTH-DEBUG] AppController: Showing loading state, hiding other elements');
        if (authLoading)
            authLoading.style.display = 'block';
        if (loginPage)
            loginPage.classList.remove('active');
        if (mainApp)
            mainApp.style.display = 'none';
        if (appContainer)
            appContainer.classList.remove('login-active');
        if (logoutBtn)
            logoutBtn.style.display = 'none';
    }
    else if (authContextState?.isAuthenticated) {
        console.log('[AUTH-DEBUG] AppController: Showing authenticated state for user:', authContextState?.user?.username);
        console.log('[AUTH-DEBUG] AppController: Hiding login page and showing main app');
        if (authLoading)
            authLoading.style.display = 'none';
        if (loginPage)
            loginPage.classList.remove('active');
        if (mainApp)
            mainApp.style.display = 'block';
        if (appContainer)
            appContainer.classList.remove('login-active');
        if (logoutBtn)
            logoutBtn.style.display = 'block';
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv)
            errorDiv.style.display = 'none';
        const loginComponent = document.querySelector('login-component');
        if (loginComponent && loginComponent.reset) {
            loginComponent.reset();
        }
        console.log('[AUTH-DEBUG] AppController: Updating user display');
        updateUserDisplay();
    }
    else {
        console.log('[AUTH-DEBUG] AppController: Showing login state');
        if (authLoading)
            authLoading.style.display = 'none';
        if (loginPage)
            loginPage.classList.add('active');
        if (mainApp)
            mainApp.style.display = 'none';
        if (appContainer)
            appContainer.classList.add('login-active');
        if (logoutBtn)
            logoutBtn.style.display = 'none';
    }
    const uiUpdateTime = performance.now() - uiUpdateStartTime;
    console.log('[AUTH-DEBUG] AppController: UI update completed in', uiUpdateTime.toFixed(2), 'ms');
}
function updateNavigationForInitialState() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === 'login-page');
    });
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = 'Login';
    }
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
}
function updateUserDisplay() {
    const userInfo = document.getElementById('user-info');
    if (userInfo && authContextState?.user) {
        userInfo.innerHTML = `
            <span class="user-name">${authContextState.user.username}</span>
            <span class="user-role">${authContextState.user.role}</span>
        `;
    }
}
function handleAuthStateChange(state) {
    const changeStartTime = performance.now();
    console.log('[AUTH-DEBUG] AppController: handleAuthStateChange called at', new Date().toISOString());
    console.log('[AUTH-DEBUG] AppController: Auth state change - isAuthenticated:', authContextState?.isAuthenticated, '→', state.isAuthenticated, 'isLoading:', state.isLoading);
    console.log('[AUTH-DEBUG] AppController: Previous auth state - isAuthenticated:', authContextState?.isAuthenticated, 'user:', authContextState?.user?.username || 'none');
    if (state.isAuthenticated && !authContextState?.isAuthenticated) {
        console.log('[AUTH-DEBUG] AppController: *** USER LOGIN DETECTED ***');
        console.log('[AUTH-DEBUG] AppController: User logged in, redirecting to dashboard');
        window.location.hash = 'dashboard';
        setTimeout(async () => {
            console.log('[AUTH-DEBUG] AppController: Triggering dashboard data load after login');
            try {
                await updateDashboardStats();
                console.log('[AUTH-DEBUG] AppController: Dashboard data loaded successfully after login');
            }
            catch (error) {
                console.error('[AUTH-DEBUG] AppController: Failed to load dashboard data after login:', error);
            }
        }, 100);
        const loginNavTime = performance.now() - changeStartTime;
        console.log('[AUTH-DEBUG] AppController: Login navigation completed in', loginNavTime.toFixed(2), 'ms');
    }
    else if (!state.isAuthenticated && authContextState?.isAuthenticated) {
        console.log('[AUTH-DEBUG] AppController: *** USER LOGOUT DETECTED ***');
        console.log('[AUTH-DEBUG] AppController: User logged out, redirecting to login');
        console.log('[AUTH-DEBUG] AppController: Cleaning up dashboard UI elements');
        const mainAppElement = document.getElementById('main-app');
        const logoutBtnElement = document.getElementById('logout-btn');
        if (mainAppElement)
            mainAppElement.style.display = 'none';
        if (logoutBtnElement)
            logoutBtnElement.style.display = 'none';
        const userInfo = document.getElementById('user-info');
        if (userInfo)
            userInfo.innerHTML = '';
        if (window.location.hash !== 'login') {
            window.location.hash = 'login';
        }
        const logoutNavTime = performance.now() - changeStartTime;
        console.log('[AUTH-DEBUG] AppController: Logout navigation completed in', logoutNavTime.toFixed(2), 'ms');
    }
    else if (state.isAuthenticated && authContextState?.isAuthenticated) {
        console.log('[AUTH-DEBUG] AppController: User authenticated, ensuring dashboard navigation');
        if (window.location.hash !== '#dashboard' && window.location.hash !== 'dashboard') {
            window.location.hash = 'dashboard';
        }
    }
    else {
        console.log('[AUTH-DEBUG] AppController: No authentication transition needed');
    }
    const uiUpdateStartTime = performance.now();
    updateAuthUI();
    const uiUpdateTime = performance.now() - uiUpdateStartTime;
    console.log('[AUTH-DEBUG] AppController: UI update completed in', uiUpdateTime.toFixed(2), 'ms');
    if (state.error) {
        console.log('[AUTH-DEBUG] AppController: === AUTH ERROR DETECTED ===');
        console.log('[AUTH-DEBUG] AppController: Auth error detected:', state.error);
        console.log('[AUTH-DEBUG] AppController: Error state - isAuthenticated:', state.isAuthenticated, 'isLoading:', state.isLoading);
        showAuthError(state.error);
        if (state.error.includes('Network') || state.error.includes('fetch')) {
            console.log('[AUTH-DEBUG] AppController: Network error detected, showing network-specific guidance');
        }
        else if (state.error.includes('401') || state.error.includes('Unauthorized')) {
            console.log('[AUTH-DEBUG] AppController: Authentication error detected, ensuring login form is ready');
            setTimeout(() => {
                const loginComponent = document.querySelector('login-component');
                if (loginComponent && loginComponent.focusUsername) {
                    loginComponent.focusUsername();
                }
            }, 100);
        }
    }
    const totalChangeTime = performance.now() - changeStartTime;
    console.log('[AUTH-DEBUG] AppController: Total auth state change handling completed in', totalChangeTime.toFixed(2), 'ms');
}
function showAuthError(error) {
    console.log('[AUTH-DEBUG] AppController: === DISPLAYING AUTH ERROR ===');
    console.log('[AUTH-DEBUG] AppController: Error message:', error);
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) {
        let userFriendlyMessage = error;
        if (error.includes('Network') || error.includes('fetch')) {
            userFriendlyMessage = 'Network error. Please check your connection and try again.';
        }
        else if (error.includes('401') || error.includes('Unauthorized')) {
            userFriendlyMessage = 'Invalid username or password. Please try again.';
        }
        else if (error.includes('500')) {
            userFriendlyMessage = 'Server error. Please try again in a moment.';
        }
        else if (error.includes('timeout')) {
            userFriendlyMessage = 'Request timed out. Please try again.';
        }
        errorDiv.textContent = userFriendlyMessage;
        errorDiv.style.display = 'block';
        console.log('[AUTH-DEBUG] AppController: User-friendly error displayed:', userFriendlyMessage);
        setTimeout(() => {
            errorDiv.style.display = 'none';
            console.log('[AUTH-DEBUG] AppController: Auth error message auto-hidden');
        }, 5000);
    }
    else {
        console.warn('[AUTH-DEBUG] AppController: No auth-error element found to display error');
    }
}
document.addEventListener('login-success', (event) => {
    const { user } = event.detail;
    console.log('Login successful for user:', user.username);
});
async function logout() {
    try {
        await authContext.logout();
    }
    catch (error) {
        console.error('Logout failed:', error);
    }
}
window.logout = logout;
function initializeTransportPage() {
    const transportPage = document.getElementById('transport-page');
    if (transportPage) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.id === 'transport-page' && target.classList.contains('active') && !target.hasAttribute('data-drivers-loaded')) {
                        target.setAttribute('data-drivers-loaded', 'true');
                    }
                }
            });
        });
        observer.observe(transportPage, {
            attributes: true,
            attributeFilter: ['class']
        });
        if (transportPage.classList.contains('active') && !transportPage.hasAttribute('data-drivers-loaded')) {
            transportPage.setAttribute('data-drivers-loaded', 'true');
        }
    }
}
function initializeChat() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    if (!chatInput || !sendBtn || !chatMessages)
        return;
    sendBtn.addEventListener('click', () => sendChatMessage());
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}
async function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    if (!chatInput || !chatMessages)
        return;
    const message = chatInput.value.trim();
    if (!message)
        return;
    chatInput.value = '';
    const userMessage = createChatMessage(message, 'user');
    chatMessages.appendChild(userMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    try {
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
        const botMessage = createChatMessage(data.response || 'Sorry, I encountered an error.', 'bot');
        chatMessages.appendChild(botMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    catch (error) {
        console.error('Chat error:', error);
        const errorMessage = createChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
        chatMessages.appendChild(errorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}
function createChatMessage(content, type) {
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
window.generateAllReports = async () => {
    try {
        const { generateAllReports } = await import('./page-managers/reports-manager');
        await generateAllReports();
    }
    catch (error) {
        console.error('Failed to load reports manager:', error);
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
    }
    catch (error) {
        console.error('Failed to load transport manager:', error);
        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: 'Failed to load driver refresh functionality', type: 'error' }
        }));
        throw error;
    }
};
window.showAddDriverModal = showAddDriverModal;
function showAddDriverModal() {
    alert('Add Driver functionality coming soon! Use the API directly: POST /api/drivers/');
}
async function updateDashboardStats() {
    try {
        const dashboardModule = await import('./page-managers/dashboard-manager');
        await dashboardModule.updateDashboardStats();
    }
    catch (error) {
        console.error('Failed to load dashboard manager:', error);
        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: 'Failed to load dashboard data', type: 'error' }
        }));
        throw error;
    }
}
function initializeSidebarToggle() {
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
            }
            else {
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
            }
            else {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
            }
        });
    }
}
//# sourceMappingURL=app-controller.js.map