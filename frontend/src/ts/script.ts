// Import components and services
import { ChartComponent } from './components/charts/index';
import { StudentTable, StudentProfileCard } from './components/students/index';
import { DriverInfo } from './components/drivers/index';
import { apiService } from './services/api-service';
import { formatRupees } from './services/money';

// Debug: Log the import to confirm it's working
console.log('DriverInfo imported successfully:', DriverInfo);

/** Represents the current application state for page navigation. */
interface PageState {
    /** The identifier of the currently active page. */
    currentPage: string;
    /** Set of currently active DOM elements. */
    activeElements: Set<string>;
}

/** Configuration for navigation to different application pages. */
interface NavigationConfig {
    [key: string]: {
        /** Display title for the page. */
        title: string;
        /** Optional function to load page-specific data. */
        loadData?: () => Promise<void>;
    };
}

// Register custom elements
customElements.define('chart-component', ChartComponent);
customElements.define('student-table', StudentTable);
customElements.define('student-profile-card', StudentProfileCard);
customElements.define('driver-info', DriverInfo);

console.log('All custom elements loaded successfully');

// Application state management
const appState: PageState = {
    currentPage: 'dashboard',
    activeElements: new Set()
};

// Navigation configuration
const navigationConfig: NavigationConfig = {
    dashboard: {
        title: 'Dashboard',
        loadData: async () => await updateDashboardStats()
    },
    transport: {
        title: 'Transport',
        loadData: async () => {
            await loadDriversForTransportPage();
            await loadAllDriversTable();
        }
    },
    students: {
        title: 'Students',
        loadData: async () => await loadStudentsForStudentsPage()
    },
    reports: { title: 'Reports' },
    settings: { title: 'Settings' },
    chat: { title: 'AI Chat' }
};

/**
 * Initialize the application when the DOM is fully loaded.
 * Sets up navigation and lazy-loads additional features during idle time.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize critical navigation first
    initializeNavigation();

    // Lazy load other features
    requestIdleCallback(() => {
        initializeTransportPage();
        initializeChat();
        updateDashboardStats();
    });
});

/**
 * Initialize the navigation system by setting up event listeners for menu items and hash changes.
 */
function initializeNavigation() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page) {
                navigateToPage(page);
            }
        });

        // Add keyboard support
        item.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) {
                    navigateToPage(page);
                }
            }
        });
    });

    // Mobile menu button functionality
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar') as HTMLElement;
    const mainContent = document.querySelector('.main-content') as HTMLElement;

    if (mobileMenuBtn && sidebar && mainContent) {
        mobileMenuBtn.addEventListener('click', () => {
            const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            const newExpanded = !isExpanded;

            mobileMenuBtn.setAttribute('aria-expanded', newExpanded.toString());
            sidebar.classList.toggle('collapsed', !newExpanded);

            // Focus management for mobile
            if (newExpanded) {
                const firstMenuItem = sidebar.querySelector('.menu-item') as HTMLElement;
                if (firstMenuItem) {
                    firstMenuItem.focus();
                }
            } else {
                // Return focus to main content
                const mainHeading = mainContent.querySelector('h1') as HTMLElement;
                if (mainHeading) {
                    mainHeading.focus();
                }
            }
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                !sidebar.contains(e.target as Node) &&
                !mobileMenuBtn.contains(e.target as Node) &&
                !sidebar.classList.contains('collapsed')) {
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                sidebar.classList.add('collapsed');
            }
        });
    }

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial load
}

/**
 * Navigate to the specified page and load its data if configured.
 * @param {string} page - The page identifier to navigate to.
 */
function navigateToPage(page: string) {
    window.location.hash = page;
    updateNavigation();

    // Lazy load page-specific data using config
    const config = navigationConfig[page];
    if (config?.loadData) {
        requestIdleCallback(async () => {
            try {
                await config.loadData!();
            } catch (error) {
                console.error(`Failed to load data for page ${page}:`, error);
                showToast(`Failed to load ${page} data`, 'error');
            }
        });
    }
}

/**
 * Handle URL hash changes for browser navigation (back/forward buttons).
 * Updates the UI and loads page data as needed.
 */
function handleHashChange() {
    const activePage = window.location.hash.substring(1) || 'dashboard';
    updateNavigation();

    // Handle page-specific loading
    const config = navigationConfig[activePage];
    if (config?.loadData && activePage !== appState.currentPage) {
        requestIdleCallback(async () => {
            try {
                await config.loadData!();
            } catch (error) {
                console.error(`Failed to load data for page ${activePage}:`, error);
                showToast(`Failed to load ${activePage} data`, 'error');
            }
        });
    }

    appState.currentPage = activePage;
}

/**
 * Update the navigation UI to reflect the current active page.
 * Toggles menu item active states, page visibility, and updates the page title.
 */
function updateNavigation() {
    const activePage = window.location.hash.substring(1) || 'dashboard';

    // Update menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        const isActive = item.getAttribute('data-page') === activePage;
        item.classList.toggle('active', isActive);

        // Update ARIA attributes for accessibility
        item.setAttribute('aria-current', isActive ? 'page' : 'false');
        item.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Update page visibility
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === activePage + '-page');
    });

    // Update page title
    const pageTitle = document.getElementById('page-title');
    const config = navigationConfig[activePage];
    if (pageTitle && config) {
        pageTitle.textContent = config.title;
    }
}

// Transport page functionality
async function loadDriversForTransportPage() {
    try {
        const response = await apiService.get('/drivers/');
        const drivers = (response.data as any)?.drivers || response.data;

        const driverSelect = document.getElementById('driver-select') as HTMLSelectElement;
        if (driverSelect && drivers && Array.isArray(drivers)) {
            // Clear existing options except the first one
            while (driverSelect.options.length > 1) {
                driverSelect.remove(1);
            }

            // Add driver options
            drivers.forEach((driver: any) => {
                const option = document.createElement('option');
                option.value = driver.name || driver.route || '';
                option.textContent = driver.name || driver.route || '';
                driverSelect.appendChild(option);
            });

            // Setup change handler once
            if (!driverSelect.hasAttribute('data-handler-attached')) {
                driverSelect.addEventListener('change', handleDriverSelection);
                driverSelect.setAttribute('data-handler-attached', 'true');
            }
        }
    } catch (error) {
        console.error('Failed to load drivers:', error);
    }
}

function handleDriverSelection(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedDriver = select.value;

    if (selectedDriver) {
        // Update driver info component
        const driverInfo = document.querySelector('driver-info') as any;
        if (driverInfo) {
            driverInfo.setDriver(selectedDriver);
        }

        // Load students for this driver
        loadDriverStudents(selectedDriver);
    }
}

async function loadDriverStudents(driverName: string) {
    try {
        const response = await apiService.get(`/drivers/${encodeURIComponent(driverName)}`);
        const students = response.data;

        // Update the driver table with students
        const tableBody = document.getElementById('driver-table-body');
        if (tableBody && students && Array.isArray(students)) {
            tableBody.innerHTML = '';

            students.forEach((student: any, index: number) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${student.route || ''}</td>
                    <td>${student.name || ''}</td>
                    <td>${student.father_name || ''}</td>
                    <td>${student.mobile || ''}</td>
                    <td>${student.class || ''}</td>
                    <td>${student.address || ''}</td>
                    <td>₹${student.fees || 0}</td>
                `;
                tableBody.appendChild(row);
            });

            // Update driver info with student count
            const driverInfo = document.querySelector('driver-info') as any;
            if (driverInfo) {
                driverInfo.setStudentCount(students.length);
            }
        }
    } catch (error) {
        console.error('Failed to load driver students:', error);
        const tableBody = document.getElementById('driver-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-cell">
                        Failed to load student data. Please try again.
                    </td>
                </tr>
            `;
        }
    }
}

// Initialize transport page
function initializeTransportPage() {
    const transportPage = document.getElementById('transport-page');
    if (transportPage) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target as HTMLElement;
                    if (target.id === 'transport-page' && target.classList.contains('active') && !target.hasAttribute('data-drivers-loaded')) {
                        target.setAttribute('data-drivers-loaded', 'true');
                        loadDriversForTransportPage();
                        loadAllDriversTable();
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
            loadDriversForTransportPage();
            loadAllDriversTable();
        }
    }
}

// Chat functionality
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
        const response = await apiService.post('/chat', { message });

        // Add bot response
        const botMessage = createChatMessage((response.data as any)?.response || 'Sorry, I encountered an error.', 'bot');
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

// Reports functionality with improved error handling
async function generateAllReports() {
    try {
        showToast('Generating reports...', 'info');

        // Fetch all reports concurrently for better performance
        const [summaryResponse, statsResponse, revenueResponse] = await Promise.allSettled([
            apiService.get('/reports/summary'),
            apiService.get('/reports/driver-student-stats'),
            apiService.get('/reports/revenue-analysis')
        ]);

        // Handle summary report
        if (summaryResponse.status === 'fulfilled' && summaryResponse.value.data) {
            updateReportsSummary(summaryResponse.value.data);
        } else {
            console.warn('Failed to fetch summary report:', summaryResponse);
        }

        // Handle driver-student statistics
        if (statsResponse.status === 'fulfilled' && statsResponse.value.data) {
            updateDriverStudentStats(statsResponse.value.data);
        } else {
            console.warn('Failed to fetch driver stats:', statsResponse);
        }

        // Handle revenue analysis
        if (revenueResponse.status === 'fulfilled' && revenueResponse.value.data) {
            updateRevenueAnalysis(revenueResponse.value.data);
        } else {
            console.warn('Failed to fetch revenue analysis:', revenueResponse);
        }

        // Update dashboard stats
        await updateDashboardStats();

        showToast('Reports updated successfully', 'success');
    } catch (error) {
        console.error('Failed to generate reports:', error);
        showToast('Failed to update reports', 'error');
    }
}

function updateReportsSummary(summary: any) {
    const totalStudentsEl = document.getElementById('report-total-students');
    const totalDriversEl = document.getElementById('report-total-drivers');
    const totalRevenueEl = document.getElementById('report-total-revenue');

    if (totalStudentsEl) totalStudentsEl.textContent = summary.total_students || 0;
    if (totalDriversEl) totalDriversEl.textContent = summary.total_drivers || 0;
    if (totalRevenueEl) totalRevenueEl.textContent = formatRupees(summary.total_revenue);

    // Update driver-student table
    const tbody = document.getElementById('driver-student-tbody');
    if (tbody && summary.drivers) {
        tbody.innerHTML = '';
        summary.drivers.forEach((driver: any) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${driver.driver_name}</td>
                <td>${driver.student_count}</td>
                <td>${formatRupees(driver.revenue)}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function updateDriverStudentStats(stats: any) {
    const totalDriversEl = document.getElementById('total-drivers-stats');
    const totalStudentsEl = document.getElementById('total-students-stats');
    const avgStudentsEl = document.getElementById('avg-students-per-driver');
    const statsTbody = document.getElementById('driver-stats-tbody');

    if (totalDriversEl) totalDriversEl.textContent = stats.total_drivers || 0;
    if (totalStudentsEl) totalStudentsEl.textContent = stats.total_students || 0;
    if (avgStudentsEl && totalStudentsEl) totalStudentsEl.textContent = stats.average_students_per_driver || 0;

    // Update driver stats table
    if (statsTbody && stats.driver_statistics) {
        statsTbody.innerHTML = '';
        stats.driver_statistics.forEach((driver: any) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${driver.driver_name}</td>
                <td>${driver.student_count}</td>
            `;
            statsTbody.appendChild(row);
        });
    }
}

function updateRevenueAnalysis(revenue: any) {
    // Update charts if available
    const driverChart = document.querySelector('#revenue-driver-chart') as any;
    const classChart = document.querySelector('#revenue-class-chart') as any;

    if (driverChart && revenue.revenue_by_driver) {
        const driverData = {
            labels: Object.keys(revenue.revenue_by_driver),
            datasets: [{
                label: 'Revenue by Driver',
                data: Object.values(revenue.revenue_by_driver),
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
                ]
            }]
        };
        driverChart.setData(driverData);
    }

    if (classChart && revenue.revenue_by_class) {
        const classData = {
            labels: Object.keys(revenue.revenue_by_class),
            datasets: [{
                label: 'Revenue by Class',
                data: Object.values(revenue.revenue_by_class),
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
                ]
            }]
        };
        classChart.setData(classData);
    }
}

async function updateDashboardStats() {
    try {
        const summaryResponse = await apiService.get('/reports/summary');
        if (summaryResponse.data) {
            const summary = summaryResponse.data as any;
            const totalStudentsDash = document.getElementById('total-students-dash');
            const totalDriversDash = document.getElementById('total-drivers-dash');

            if (totalStudentsDash) totalStudentsDash.textContent = (summary.total_students || 0).toString();
            if (totalDriversDash) totalDriversDash.textContent = (summary.total_drivers || 0).toString();
        }
    } catch (error) {
        console.error('Failed to update dashboard stats:', error);
    }
}

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

// Global functions exposure with better type safety
declare global {
    interface Window {
        generateAllReports: () => Promise<void>;
        refreshDrivers: () => Promise<void>;
        showAddDriverModal: () => void;
    }
}

window.generateAllReports = generateAllReports;
window.refreshDrivers = refreshDrivers;
window.showAddDriverModal = showAddDriverModal;

// Export services for use in the application
export { apiService };

// Add driver modal function
function showAddDriverModal() {
    // Create a simple alert for now - can be enhanced later
    alert('Add Driver functionality coming soon! Use the API directly: POST /api/drivers/');
}

// Students page functionality
async function loadStudentsForStudentsPage() {
    try {
        const response = await apiService.get('/students/');
        const studentsData = (response.data as any)?.students || (response.data as any).students || response.data || [];

        const studentTable = document.querySelector('student-table') as any;
        if (studentTable && Array.isArray(studentsData)) {
            studentTable.setStudents(studentsData);
        }
    } catch (error) {
        console.error('Failed to load students:', error);
    }
}

// Load all drivers for the drivers table
async function loadAllDriversTable() {
    try {
        const response = await apiService.get('/drivers/');
        const drivers = (response.data as any)?.drivers || response.data;

        const tableBody = document.getElementById('drivers-table-body');
        if (tableBody && drivers && Array.isArray(drivers)) {
            tableBody.innerHTML = '';

            drivers.forEach((driver: any) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${driver.name || 'N/A'}</td>
                    <td>${driver.route || 'N/A'}</td>
                    <td>${driver.vehicle_number || 'N/A'}</td>
                    <td>${driver.contact_number || 'N/A'}</td>
                    <td><span class="status-${driver.status || 'active'}">${(driver.status || 'active').toUpperCase()}</span></td>
                    <td>${driver.total_students || 0}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Failed to load drivers table:', error);
        const tableBody = document.getElementById('drivers-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        Failed to load drivers data. Please try again.
                    </td>
                </tr>
            `;
        }
    }
}

// Refresh drivers function with proper async return
async function refreshDrivers(): Promise<void> {
    const refreshBtn = document.getElementById('refresh-drivers-btn') as HTMLButtonElement;
    if (!refreshBtn) return;

    // Show loading state
    const originalContent = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<icon-spinner size="16"></icon-spinner> Refreshing...';
    refreshBtn.disabled = true;

    try {
        // Reload drivers
        await loadDriversForTransportPage();
        showToast('Drivers refreshed successfully', 'success');
    } catch (error) {
        console.error('Failed to refresh drivers:', error);
        showToast('Failed to refresh drivers', 'error');
    } finally {
        // Restore original state
        refreshBtn.innerHTML = originalContent;
        refreshBtn.disabled = false;
    }
}