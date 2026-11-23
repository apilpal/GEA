// Router module for navigation functionality

import { authContext } from '@/ts/components/auth/auth-context';

/**
 * Interface representing the current state of page navigation.
 */
interface PageState {
    /** The currently active page identifier. */
    currentPage: string;
    /** Set of currently active DOM elements. */
    activeElements: Set<string>;
    /** Set of pages that have had their data loaded. */
    loadedPages: Set<string>;
    /** Set of pages currently being loaded. */
    loadingPages: Set<string>;
}

/**
 * Configuration for navigation to different pages.
 */
interface NavigationConfig {
    [key: string]: {
        /** Display title for the page. */
        title: string;
        /** Whether authentication is required to access this page. */
        requiresAuth?: boolean;
        /** Whether to allow access when authenticated (for login page). */
        allowWhenAuthed?: boolean;
        /** Optional function to load page-specific data. */
        loadData?: () => Promise<void>;
    };
}

// Application state management
const appState: PageState = {
    currentPage: 'dashboard',
    activeElements: new Set(),
    loadedPages: new Set(),
    loadingPages: new Set()
};

// Navigation configuration with authentication requirements
const navigationConfig: NavigationConfig = {
    dashboard: {
        title: 'Dashboard',
        requiresAuth: false,
        loadData: async () => {
            await updateDashboardStats();
            // Also load driver data for dashboard display
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
    attendance: {
        title: 'Attendance',
        requiresAuth: true,
        loadData: async () => {
            const { loadAttendancePage } = await import('@/ts/page-managers/attendance-manager');
            await loadAttendancePage();
        }
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
        allowWhenAuthed: false // Redirect to dashboard if already authenticated
    }
};

/**
 * Initializes the navigation system by setting up event listeners
 * for menu items and hash changes.
 */
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

    // Handle initial load with authentication awareness
    handleInitialLoad();
}

/**
 * Navigates to the specified page, handling authentication checks and data loading.
 * @param {string} page - The page identifier to navigate to.
 */
export async function navigateToPage(page: string) {
    if (page === appState.currentPage) {
        return;
    }

    // Check authentication requirements before navigation
    const config = navigationConfig[page];
    const isAuthenticated = await checkAuthentication();

    if (config?.requiresAuth && !isAuthenticated) {
        showToast('Please log in to access this page', 'info');
        window.location.hash = 'login';
        updateNavigation();
        appState.currentPage = 'login';
        return;
    }

    if (config?.allowWhenAuthed === false && isAuthenticated) {
        showToast('You are already logged in', 'info');
        window.location.hash = 'dashboard';
        updateNavigation();
        appState.currentPage = 'dashboard';
        return;
    }

    window.location.hash = page;
    updateNavigation();
    appState.currentPage = page;

    // Lazy load page-specific data using config
    if (config?.loadData && !appState.loadedPages.has(page) && !appState.loadingPages.has(page)) {
        appState.loadingPages.add(page);
        requestIdleCallback(async () => {
            try {
                await config.loadData!();
                appState.loadedPages.add(page);
            } catch (error) {
                console.error(`Failed to load data for page ${page}:`, error);
                showToast(`Failed to load ${page} data`, 'error');
            } finally {
                appState.loadingPages.delete(page);
            }
        });
    }
}

/**
 * Handles the initial page load with authentication awareness.
 * Sets the appropriate default page based on authentication state.
 * Prioritizes dashboard-first experience for guest users.
 */
async function handleInitialLoad() {
    const hashPage = window.location.hash.substring(1);
    
    // If no hash is present, default to dashboard for everyone
    if (!hashPage) {
        window.location.hash = 'dashboard';
        appState.currentPage = 'dashboard';
        updateNavigation();
        return;
    }

    // Handle existing hash with authentication checks
    await handleHashChange();
}

/**
 * Handles changes to the URL hash for navigation.
 * Validates authentication and loads page data as needed.
 */
async function handleHashChange() {
    const activePage = window.location.hash.substring(1) || 'dashboard';

    if (activePage === appState.currentPage) {
        return;
    }

    // Check authentication requirements before navigation
    const config = navigationConfig[activePage];
    const isAuthenticated = await checkAuthentication();

    if (config?.requiresAuth && !isAuthenticated) {
        showToast('Please log in to access this page', 'info');
        window.location.hash = 'login';
        updateNavigation();
        appState.currentPage = 'login';
        return;
    }

    if (config?.allowWhenAuthed === false && isAuthenticated) {
        showToast('You are already logged in', 'info');
        window.location.hash = 'dashboard';
        updateNavigation();
        appState.currentPage = 'dashboard';
        return;
    }

    updateNavigation();
    appState.currentPage = activePage;

    // Handle page-specific loading
    if (config?.loadData && !appState.loadedPages.has(activePage) && !appState.loadingPages.has(activePage)) {
        appState.loadingPages.add(activePage);
        requestIdleCallback(async () => {
            try {
                await config.loadData!();
                appState.loadedPages.add(activePage);
            } catch (error) {
                console.error(`Failed to load data for page ${activePage}:`, error);
                showToast(`Failed to load ${activePage} data`, 'error');
            } finally {
                appState.loadingPages.delete(activePage);
            }
        });
    }
}

/**
 * Checks if the current user is logged in.
 * @returns {Promise<boolean>} True if authenticated, false otherwise.
 */
async function checkAuthentication(): Promise<boolean> {
    const state = authContext.getState();
    return !!(state.isAuthenticated && state.user);
}

/**
 * Updates the navigation UI to reflect the current active page.
 */
function updateNavigation() {
    const activePage = window.location.hash.substring(1) || 'dashboard';

    // Update menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === activePage);
    });

    // Update page visibility (skip login-page as it's managed by app controller)
    document.querySelectorAll('.page:not(#login-page)').forEach(page => {
        page.classList.toggle('active', page.id === activePage + '-page');
    });

    // Update page title
    const pageTitle = document.getElementById('page-title');
    const config = navigationConfig[activePage];
    if (pageTitle && config) {
        pageTitle.textContent = config.title;
    }
}

/**
 * Updates dashboard statistics by delegating to the dashboard manager.
 * @returns {Promise<void>} A promise that resolves when stats are updated.
 */
async function updateDashboardStats(): Promise<void> {
    try {
        const { updateDashboardStats: updateStats } = await import('@/ts/page-managers/dashboard-manager');
        await updateStats();
    } catch (error) {
        console.error('Failed to load dashboard manager:', error);
        showToast('Failed to load dashboard data', 'error');
        throw error; // Re-throw to maintain error propagation
    }
}

/**
 * Loads driver data for the transport page by delegating to the transport manager.
 * @returns {Promise<void>} A promise that resolves when drivers are loaded.
 */
async function loadDriversForTransportPage(): Promise<void> {
    try {
        const { loadDriversForTransportPage: loadDrivers } = await import('@/ts/page-managers/transport-manager');
        await loadDrivers();
    } catch (error) {
        console.error('Failed to load transport manager:', error);
        showToast('Failed to load transport data', 'error');
        throw error;
    }
}

/**
 * Loads all drivers table data by delegating to the transport manager.
 * @returns {Promise<void>} A promise that resolves when the table is loaded.
 */
async function loadAllDriversTable(): Promise<void> {
    try {
        const { loadAllDriversTable: loadDriversTable } = await import('@/ts/page-managers/transport-manager');
        await loadDriversTable();
    } catch (error) {
        console.error('Failed to load transport manager for drivers table:', error);
        showToast('Failed to load drivers table', 'error');
        throw error;
    }
}

/**
 * Loads student data for the students page by delegating to the students manager.
 * @returns {Promise<void>} A promise that resolves when students are loaded.
 */
async function loadStudentsForStudentsPage(): Promise<void> {
    try {
        const { loadStudentsForStudentsPage: loadStudents } = await import('@/ts/page-managers/students-manager');
        await loadStudents();
    } catch (error) {
        console.error('Failed to load students manager:', error);
        showToast('Failed to load students data', 'error');
        throw error;
    }
}

/**
 * Displays a toast notification with the specified message and type.
 * @param {string} message - The message to display in the toast.
 * @param {'success' | 'error' | 'info'} type - The type of toast notification.
 */
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

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

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}