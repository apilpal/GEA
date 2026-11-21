import { ChartComponent } from './components/charts/index';
import { StudentTable, StudentProfileCard } from './components/students/index';
import { DriverInfo } from './components/drivers/index';
import { apiService } from './services/api-service';
console.log('DriverInfo imported successfully:', DriverInfo);
customElements.define('chart-component', ChartComponent);
customElements.define('student-table', StudentTable);
customElements.define('student-profile-card', StudentProfileCard);
customElements.define('driver-info', DriverInfo);
console.log('All custom elements loaded successfully');
const appState = {
    currentPage: 'dashboard',
    activeElements: new Set()
};
const navigationConfig = {
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
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    requestIdleCallback(() => {
        initializeTransportPage();
        initializeChat();
        updateDashboardStats();
    });
});
function initializeNavigation() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page) {
                navigateToPage(page);
            }
        });
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) {
                    navigateToPage(page);
                }
            }
        });
    });
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (mobileMenuBtn && sidebar && mainContent) {
        mobileMenuBtn.addEventListener('click', () => {
            const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            const newExpanded = !isExpanded;
            mobileMenuBtn.setAttribute('aria-expanded', newExpanded.toString());
            sidebar.classList.toggle('collapsed', !newExpanded);
            if (newExpanded) {
                const firstMenuItem = sidebar.querySelector('.menu-item');
                if (firstMenuItem) {
                    firstMenuItem.focus();
                }
            }
            else {
                const mainHeading = mainContent.querySelector('h1');
                if (mainHeading) {
                    mainHeading.focus();
                }
            }
        });
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                !sidebar.contains(e.target) &&
                !mobileMenuBtn.contains(e.target) &&
                !sidebar.classList.contains('collapsed')) {
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                sidebar.classList.add('collapsed');
            }
        });
    }
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
}
function navigateToPage(page) {
    window.location.hash = page;
    updateNavigation();
    const config = navigationConfig[page];
    if (config?.loadData) {
        requestIdleCallback(async () => {
            try {
                await config.loadData();
            }
            catch (error) {
                console.error(`Failed to load data for page ${page}:`, error);
                showToast(`Failed to load ${page} data`, 'error');
            }
        });
    }
}
function handleHashChange() {
    const activePage = window.location.hash.substring(1) || 'dashboard';
    updateNavigation();
    const config = navigationConfig[activePage];
    if (config?.loadData && activePage !== appState.currentPage) {
        requestIdleCallback(async () => {
            try {
                await config.loadData();
            }
            catch (error) {
                console.error(`Failed to load data for page ${activePage}:`, error);
                showToast(`Failed to load ${activePage} data`, 'error');
            }
        });
    }
    appState.currentPage = activePage;
}
function updateNavigation() {
    const activePage = window.location.hash.substring(1) || 'dashboard';
    document.querySelectorAll('.menu-item').forEach(item => {
        const isActive = item.getAttribute('data-page') === activePage;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-current', isActive ? 'page' : 'false');
        item.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === activePage + '-page');
    });
    const pageTitle = document.getElementById('page-title');
    const config = navigationConfig[activePage];
    if (pageTitle && config) {
        pageTitle.textContent = config.title;
    }
}
async function loadDriversForTransportPage() {
    try {
        const response = await apiService.get('/drivers/');
        const drivers = response.data?.drivers || response.data;
        const driverSelect = document.getElementById('driver-select');
        if (driverSelect && drivers && Array.isArray(drivers)) {
            while (driverSelect.options.length > 1) {
                driverSelect.remove(1);
            }
            drivers.forEach((driver) => {
                const option = document.createElement('option');
                option.value = driver.name || driver.route || '';
                option.textContent = driver.name || driver.route || '';
                driverSelect.appendChild(option);
            });
            if (!driverSelect.hasAttribute('data-handler-attached')) {
                driverSelect.addEventListener('change', handleDriverSelection);
                driverSelect.setAttribute('data-handler-attached', 'true');
            }
        }
    }
    catch (error) {
        console.error('Failed to load drivers:', error);
    }
}
function handleDriverSelection(event) {
    const select = event.target;
    const selectedDriver = select.value;
    if (selectedDriver) {
        const driverInfo = document.querySelector('driver-info');
        if (driverInfo) {
            driverInfo.setDriver(selectedDriver);
        }
        loadDriverStudents(selectedDriver);
    }
}
async function loadDriverStudents(driverName) {
    try {
        const response = await apiService.get(`/drivers/${encodeURIComponent(driverName)}`);
        const students = response.data;
        const tableBody = document.getElementById('driver-table-body');
        if (tableBody && students && Array.isArray(students)) {
            tableBody.innerHTML = '';
            students.forEach((student, index) => {
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
            const driverInfo = document.querySelector('driver-info');
            if (driverInfo) {
                driverInfo.setStudentCount(students.length);
            }
        }
    }
    catch (error) {
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
function initializeTransportPage() {
    const transportPage = document.getElementById('transport-page');
    if (transportPage) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
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
        if (transportPage.classList.contains('active') && !transportPage.hasAttribute('data-drivers-loaded')) {
            transportPage.setAttribute('data-drivers-loaded', 'true');
            loadDriversForTransportPage();
            loadAllDriversTable();
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
        const response = await apiService.post('/chat', { message });
        const botMessage = createChatMessage(response.data?.response || 'Sorry, I encountered an error.', 'bot');
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
async function generateAllReports() {
    try {
        showToast('Generating reports...', 'info');
        const [summaryResponse, statsResponse, revenueResponse] = await Promise.allSettled([
            apiService.get('/reports/summary'),
            apiService.get('/reports/driver-student-stats'),
            apiService.get('/reports/revenue-analysis')
        ]);
        if (summaryResponse.status === 'fulfilled' && summaryResponse.value.data) {
            updateReportsSummary(summaryResponse.value.data);
        }
        else {
            console.warn('Failed to fetch summary report:', summaryResponse);
        }
        if (statsResponse.status === 'fulfilled' && statsResponse.value.data) {
            updateDriverStudentStats(statsResponse.value.data);
        }
        else {
            console.warn('Failed to fetch driver stats:', statsResponse);
        }
        if (revenueResponse.status === 'fulfilled' && revenueResponse.value.data) {
            updateRevenueAnalysis(revenueResponse.value.data);
        }
        else {
            console.warn('Failed to fetch revenue analysis:', revenueResponse);
        }
        await updateDashboardStats();
        showToast('Reports updated successfully', 'success');
    }
    catch (error) {
        console.error('Failed to generate reports:', error);
        showToast('Failed to update reports', 'error');
    }
}
function updateReportsSummary(summary) {
    const totalStudentsEl = document.getElementById('report-total-students');
    const totalDriversEl = document.getElementById('report-total-drivers');
    const totalRevenueEl = document.getElementById('report-total-revenue');
    if (totalStudentsEl)
        totalStudentsEl.textContent = summary.total_students || 0;
    if (totalDriversEl)
        totalDriversEl.textContent = summary.total_drivers || 0;
    if (totalRevenueEl)
        totalRevenueEl.textContent = `$${(summary.total_revenue || 0).toLocaleString()}`;
    const tbody = document.getElementById('driver-student-tbody');
    if (tbody && summary.drivers) {
        tbody.innerHTML = '';
        summary.drivers.forEach((driver) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${driver.driver_name}</td>
                <td>${driver.student_count}</td>
                <td>$${(driver.revenue || 0).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }
}
function updateDriverStudentStats(stats) {
    const totalDriversEl = document.getElementById('total-drivers-stats');
    const totalStudentsEl = document.getElementById('total-students-stats');
    const avgStudentsEl = document.getElementById('avg-students-per-driver');
    const statsTbody = document.getElementById('driver-stats-tbody');
    if (totalDriversEl)
        totalDriversEl.textContent = stats.total_drivers || 0;
    if (totalStudentsEl)
        totalStudentsEl.textContent = stats.total_students || 0;
    if (avgStudentsEl && totalStudentsEl)
        totalStudentsEl.textContent = stats.average_students_per_driver || 0;
    if (statsTbody && stats.driver_statistics) {
        statsTbody.innerHTML = '';
        stats.driver_statistics.forEach((driver) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${driver.driver_name}</td>
                <td>${driver.student_count}</td>
            `;
            statsTbody.appendChild(row);
        });
    }
}
function updateRevenueAnalysis(revenue) {
    const driverChart = document.querySelector('#revenue-driver-chart');
    const classChart = document.querySelector('#revenue-class-chart');
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
            const summary = summaryResponse.data;
            const totalStudentsDash = document.getElementById('total-students-dash');
            const totalDriversDash = document.getElementById('total-drivers-dash');
            if (totalStudentsDash)
                totalStudentsDash.textContent = (summary.total_students || 0).toString();
            if (totalDriversDash)
                totalDriversDash.textContent = (summary.total_drivers || 0).toString();
        }
    }
    catch (error) {
        console.error('Failed to update dashboard stats:', error);
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
window.generateAllReports = generateAllReports;
window.refreshDrivers = refreshDrivers;
window.showAddDriverModal = showAddDriverModal;
export { apiService };
function showAddDriverModal() {
    alert('Add Driver functionality coming soon! Use the API directly: POST /api/drivers/');
}
async function loadStudentsForStudentsPage() {
    try {
        const response = await apiService.get('/students/');
        const studentsData = response.data?.students || response.data.students || response.data || [];
        const studentTable = document.querySelector('student-table');
        if (studentTable && Array.isArray(studentsData)) {
            studentTable.setStudents(studentsData);
        }
    }
    catch (error) {
        console.error('Failed to load students:', error);
    }
}
async function loadAllDriversTable() {
    try {
        const response = await apiService.get('/drivers/');
        const drivers = response.data?.drivers || response.data;
        const tableBody = document.getElementById('drivers-table-body');
        if (tableBody && drivers && Array.isArray(drivers)) {
            tableBody.innerHTML = '';
            drivers.forEach((driver) => {
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
    }
    catch (error) {
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
async function refreshDrivers() {
    const refreshBtn = document.getElementById('refresh-drivers-btn');
    if (!refreshBtn)
        return;
    const originalContent = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<icon-spinner size="16"></icon-spinner> Refreshing...';
    refreshBtn.disabled = true;
    try {
        await loadDriversForTransportPage();
        showToast('Drivers refreshed successfully', 'success');
    }
    catch (error) {
        console.error('Failed to refresh drivers:', error);
        showToast('Failed to refresh drivers', 'error');
    }
    finally {
        refreshBtn.innerHTML = originalContent;
        refreshBtn.disabled = false;
    }
}
//# sourceMappingURL=script.js.map