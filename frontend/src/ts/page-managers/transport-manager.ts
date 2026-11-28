// Transport page manager
import { apiService } from '@/ts/services/api-service';

/**
 * Loads available drivers for the transport page and populates the driver selection dropdown.
 * Sets up change event handler for driver selection if not already attached.
 * @returns {Promise<void>} Resolves when drivers are loaded and dropdown populated.
 */

/** Escape untrusted values before interpolating them into HTML templates. */
function escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>\"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]!);
}

export async function loadDriversForTransportPage(): Promise<void> {
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

/**
 * Handles driver selection changes from the dropdown.
 * Updates the driver info component and loads students for the selected driver.
 * @param {Event} event - The change event from the select element.
 */
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

/**
 * Loads and displays students assigned to a specific driver.
 * Updates the driver table with student information and driver info component with student count.
 * @param {string} driverName - The name of the driver to load students for.
 * @returns {Promise<void>} Resolves when students are loaded and UI updated.
 */
export async function loadDriverStudents(driverName: string): Promise<void> {
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
                    <td>${escapeHtml(student.route || '')}</td>
                    <td>${escapeHtml(student.name || '')}</td>
                    <td>${escapeHtml(student.father_name || '')}</td>
                    <td>${escapeHtml(student.mobile || '')}</td>
                    <td>${escapeHtml(student.class || '')}</td>
                    <td>${escapeHtml(student.address || '')}</td>
                    <td>₹${escapeHtml(student.fees || 0)}</td>
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

/**
 * Loads and displays all drivers in the drivers table.
 * Populates the table with driver information including name, route, vehicle, contact, status, and student count.
 * @returns {Promise<void>} Resolves when drivers table is loaded and populated.
 */
export async function loadAllDriversTable(): Promise<void> {
    try {
        const response = await apiService.get('/drivers/');
        const drivers = (response.data as any)?.drivers || response.data;

        const tableBody = document.getElementById('drivers-table-body');
        if (tableBody && drivers && Array.isArray(drivers)) {
            tableBody.innerHTML = '';

            drivers.forEach((driver: any) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${escapeHtml(driver.name || 'N/A')}</td>
                    <td>${escapeHtml(driver.route || 'N/A')}</td>
                    <td>${escapeHtml(driver.vehicle_number || 'N/A')}</td>
                    <td>${escapeHtml(driver.contact_number || 'N/A')}</td>
                    <td><span class="status-${escapeHtml(driver.status || 'active')}">${escapeHtml((driver.status || 'active').toUpperCase())}</span></td>
                    <td>${escapeHtml(driver.total_students || 0)}</td>
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

/**
 * Refreshes the drivers data and updates the UI.
 * Shows loading state on the refresh button during the operation.
 * @returns {Promise<void>} Resolves when drivers are refreshed successfully.
 */
export async function refreshDrivers(): Promise<void> {
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
        <span>${escapeHtml(message)}</span>
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