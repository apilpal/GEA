// Reports page manager
import { apiService } from '@/ts/services/api-service';
import { formatRupees } from '@/ts/services/money';

/**
 * Generates and updates all reports on the reports page.
 * Fetches summary, driver-student statistics, and revenue analysis data concurrently,
 * then updates the UI with the retrieved information.
 * @returns {Promise<void>} Resolves when all reports have been generated and UI updated.
 */
export async function generateAllReports(): Promise<void> {
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
        const { updateDashboardStats } = await import('./dashboard-manager');
        await updateDashboardStats();

        showToast('Reports updated successfully', 'success');
    } catch (error) {
        console.error('Failed to generate reports:', error);
        showToast('Failed to update reports', 'error');
    }
}

/**
 * Updates the reports summary section with the fetched data.
 * Displays total counts and populates the driver-student statistics table.
 * @param {any} summary - The summary data from the API response.
 */
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

/**
 * Updates the driver-student statistics section with detailed stats.
 * @param {any} stats - The driver-student statistics data from the API.
 */
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

/**
 * Updates the revenue analysis charts with the fetched data.
 * @param {any} revenue - The revenue analysis data from the API.
 */
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