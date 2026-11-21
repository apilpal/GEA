import { apiService } from '@/ts/services/api-service';
export async function generateAllReports() {
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
        const { updateDashboardStats } = await import('./dashboard-manager');
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
//# sourceMappingURL=reports-manager.js.map