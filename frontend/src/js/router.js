import { authContext } from '@/ts/components/auth/auth-context';
const appState = {
    currentPage: 'dashboard',
    activeElements: new Set(),
    loadedPages: new Set(),
    loadingPages: new Set()
};
const navigationConfig = {
    dashboard: {
        title: 'Dashboard',
        requiresAuth: false,
        allowWhenGuest: true,
        loadData: async () => {
            await updateDashboardStats();
            const { loadDriversForTransportPage } = await import('@/ts/page-managers/transport-manager');
            await loadDriversForTransportPage();
        }
    },
    transport: {
        title: 'Transport',
        requiresAuth: true,
        loadData: async () => {
            await loadDriversForTransportPage();
            await loadAllDriversTable();
        }
    },
    students: {
        title: 'Students',
        requiresAuth: true,
        loadData: async () => await loadStudentsForStudentsPage()
    },
    reports: {
        title: 'Reports',
        requiresAuth: true
    },
    settings: {
        title: 'Settings',
        requiresAuth: true
    },
    chat: {
        title: 'AI Chat',
        requiresAuth: true
    },
    login: {
        title: 'Login',
        requiresAuth: false,
        allowWhenAuthed: false
    }
};
export function initializeNavigation() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page) {
                navigateToPage(page);
            }
        });
    });
    window.addEventListener('hashchange', handleHashChange);
    handleInitialLoad();
}
export function navigateToPage(page) {
    const navStartTime = performance.now();
    console.log('[ROUTER-DEBUG] navigateToPage called at', new Date().toISOString(), 'for page:', page);
    console.log('[ROUTER-DEBUG] Current page state:', appState.currentPage);
    if (page === appState.currentPage) {
        console.log('[ROUTER-DEBUG] Page already active, skipping navigation');
        return;
    }
    const config = navigationConfig[page];
    console.log('[ROUTER-DEBUG] Navigation config for', page, ':', JSON.stringify(config, null, 2));
    const authCheckStartTime = performance.now();
    const isAuthenticated = checkAuthentication();
    const authCheckTime = performance.now() - authCheckStartTime;
    console.log('[ROUTER-DEBUG] Authentication check completed in', authCheckTime.toFixed(2), 'ms, result:', isAuthenticated);
    if (config?.requiresAuth && !isAuthenticated) {
        console.log('[ROUTER-DEBUG] Authentication required but user not authenticated, redirecting to login');
        showToast('Please log in to access this page', 'info');
        window.location.hash = 'login';
        updateNavigation();
        appState.currentPage = 'login';
        const redirectTime = performance.now() - navStartTime;
        console.log('[ROUTER-DEBUG] Redirect to login completed in', redirectTime.toFixed(2), 'ms');
        return;
    }
    if (config?.allowWhenAuthed === false && isAuthenticated) {
        console.log('[ROUTER-DEBUG] User already authenticated trying to access login page, redirecting to dashboard');
        showToast('You are already logged in', 'info');
        window.location.hash = 'dashboard';
        updateNavigation();
        appState.currentPage = 'dashboard';
        const redirectTime = performance.now() - navStartTime;
        console.log('[ROUTER-DEBUG] Redirect to dashboard completed in', redirectTime.toFixed(2), 'ms');
        return;
    }
    console.log('[ROUTER-DEBUG] Setting hash and updating navigation for page:', page);
    window.location.hash = page;
    updateNavigation();
    appState.currentPage = page;
    const totalNavTime = performance.now() - navStartTime;
    console.log('[ROUTER-DEBUG] Navigation to', page, 'completed in', totalNavTime.toFixed(2), 'ms');
    if (config?.loadData && !appState.loadedPages.has(page) && !appState.loadingPages.has(page)) {
        appState.loadingPages.add(page);
        requestIdleCallback(async () => {
            try {
                await config.loadData();
                appState.loadedPages.add(page);
            }
            catch (error) {
                console.error(`Failed to load data for page ${page}:`, error);
                showToast(`Failed to load ${page} data`, 'error');
            }
            finally {
                appState.loadingPages.delete(page);
            }
        });
    }
}
function handleInitialLoad() {
    const hashPage = window.location.hash.substring(1);
    const isAuthenticated = checkAuthentication();
    if (!hashPage) {
        console.log('[ROUTER] No hash present, defaulting to dashboard');
        window.location.hash = 'dashboard';
        appState.currentPage = 'dashboard';
        updateNavigation();
        if (!isAuthenticated) {
            const { initializeGuestDashboard } = require('@/page-managers/dashboard-manager');
            initializeGuestDashboard();
        }
        return;
    }
    handleHashChange();
}
function handleHashChange() {
    const hashChangeStartTime = performance.now();
    const activePage = window.location.hash.substring(1) || 'dashboard';
    console.log('[ROUTER-DEBUG] handleHashChange triggered at', new Date().toISOString());
    console.log('[ROUTER-DEBUG] Hash changed to:', window.location.hash, 'extracted page:', activePage);
    console.log('[ROUTER-DEBUG] Current app state:', appState.currentPage);
    if (activePage === appState.currentPage) {
        console.log('[ROUTER-DEBUG] Page already active, skipping hash change processing');
        return;
    }
    const config = navigationConfig[activePage];
    console.log('[ROUTER-DEBUG] Navigation config for', activePage, ':', JSON.stringify(config, null, 2));
    const authCheckStartTime = performance.now();
    const isAuthenticated = checkAuthentication();
    const authCheckTime = performance.now() - authCheckStartTime;
    console.log('[ROUTER-DEBUG] Authentication check completed in', authCheckTime.toFixed(2), 'ms, result:', isAuthenticated);
    if (config?.requiresAuth && !isAuthenticated) {
        console.log('[ROUTER-DEBUG] Authentication required but user not authenticated, redirecting to login');
        showToast('Please log in to access this page', 'info');
        window.location.hash = 'login';
        updateNavigation();
        appState.currentPage = 'login';
        const redirectTime = performance.now() - hashChangeStartTime;
        console.log('[ROUTER-DEBUG] Hash change redirect to login completed in', redirectTime.toFixed(2), 'ms');
        return;
    }
    if (config?.allowWhenAuthed === false && isAuthenticated) {
        console.log('[ROUTER-DEBUG] User already authenticated trying to access login page, redirecting to dashboard');
        showToast('You are already logged in', 'info');
        window.location.hash = 'dashboard';
        updateNavigation();
        appState.currentPage = 'dashboard';
        const redirectTime = performance.now() - hashChangeStartTime;
        console.log('[ROUTER-DEBUG] Hash change redirect to dashboard completed in', redirectTime.toFixed(2), 'ms');
        return;
    }
    console.log('[ROUTER-DEBUG] Processing hash change for page:', activePage);
    updateNavigation();
    appState.currentPage = activePage;
    const totalHashChangeTime = performance.now() - hashChangeStartTime;
    console.log('[ROUTER-DEBUG] Hash change processing completed in', totalHashChangeTime.toFixed(2), 'ms');
    if (config?.loadData && !appState.loadedPages.has(activePage) && !appState.loadingPages.has(activePage)) {
        appState.loadingPages.add(activePage);
        requestIdleCallback(async () => {
            try {
                await config.loadData();
                appState.loadedPages.add(activePage);
            }
            catch (error) {
                console.error(`Failed to load data for page ${activePage}:`, error);
                showToast(`Failed to load ${activePage} data`, 'error');
            }
            finally {
                appState.loadingPages.delete(activePage);
            }
        });
    }
}
function checkAuthentication() {
    const authService = require('@/services/auth-service').authService;
    return authContext.getState().isAuthenticated || authService.isGuestUser();
}
function updateNavigation() {
    const navUpdateStartTime = performance.now();
    const activePage = window.location.hash.substring(1) || 'dashboard';
    console.log('[ROUTER-DEBUG] updateNavigation called at', new Date().toISOString(), 'for page:', activePage);
    const menuUpdateStartTime = performance.now();
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === activePage);
    });
    const menuUpdateTime = performance.now() - menuUpdateStartTime;
    console.log('[ROUTER-DEBUG] Menu items updated in', menuUpdateTime.toFixed(2), 'ms');
    const pageUpdateStartTime = performance.now();
    document.querySelectorAll('.page:not(#login-page)').forEach(page => {
        page.classList.toggle('active', page.id === activePage + '-page');
    });
    const pageUpdateTime = performance.now() - pageUpdateStartTime;
    console.log('[ROUTER-DEBUG] Page visibility updated in', pageUpdateTime.toFixed(2), 'ms');
    const titleUpdateStartTime = performance.now();
    const pageTitle = document.getElementById('page-title');
    const config = navigationConfig[activePage];
    if (pageTitle && config) {
        pageTitle.textContent = config.title;
        console.log('[ROUTER-DEBUG] Page title updated to:', config.title);
    }
    const titleUpdateTime = performance.now() - titleUpdateStartTime;
    console.log('[ROUTER-DEBUG] Title update completed in', titleUpdateTime.toFixed(2), 'ms');
    const totalNavUpdateTime = performance.now() - navUpdateStartTime;
    console.log('[ROUTER-DEBUG] Navigation update completed in', totalNavUpdateTime.toFixed(2), 'ms');
}
async function updateDashboardStats() {
    try {
        const { updateDashboardStats: updateStats } = await import('@/ts/page-managers/dashboard-manager');
        await updateStats();
    }
    catch (error) {
        console.error('Failed to load dashboard manager:', error);
        showToast('Failed to load dashboard data', 'error');
        throw error;
    }
}
async function loadDriversForTransportPage() {
    try {
        const { loadDriversForTransportPage: loadDrivers } = await import('@/ts/page-managers/transport-manager');
        await loadDrivers();
    }
    catch (error) {
        console.error('Failed to load transport manager:', error);
        showToast('Failed to load transport data', 'error');
        throw error;
    }
}
async function loadAllDriversTable() {
    try {
        const { loadAllDriversTable: loadDriversTable } = await import('@/ts/page-managers/transport-manager');
        await loadDriversTable();
    }
    catch (error) {
        console.error('Failed to load transport manager for drivers table:', error);
        showToast('Failed to load drivers table', 'error');
        throw error;
    }
}
async function loadStudentsForStudentsPage() {
    try {
        const { loadStudentsForStudentsPage: loadStudents } = await import('@/ts/page-managers/students-manager');
        await loadStudents();
    }
    catch (error) {
        console.error('Failed to load students manager:', error);
        showToast('Failed to load students data', 'error');
        throw error;
    }
}
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer)
        return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconMap = {
        success: 'check-circle',
        error: 'exclamation-circle',
        info: 'info-circle'
    };
    toast.innerHTML = `
        <icon-${iconMap[type]} size="16"></icon-${iconMap[type]}>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <icon-times size="12"></icon-times>
        </button>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}
//# sourceMappingURL=router.js.map