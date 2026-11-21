import { apiService } from '@/ts/services/api-service';
export async function loadDriversForTransportPage() {
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
export async function loadDriverStudents(driverName) {
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
export async function loadAllDriversTable() {
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
export async function refreshDrivers() {
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
//# sourceMappingURL=transport-manager.js.map