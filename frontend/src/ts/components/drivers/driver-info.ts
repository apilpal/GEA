// Custom Element: Driver Info
import { BaseComponent } from '@/ts/components/core/index';
import type { DriverInfoData } from './types';

/**
 * Custom web component that displays driver information in a card format.
 * Shows driver name, avatar, student count, route, and status information.
 */
class DriverInfo extends BaseComponent {
    /** Current driver data being displayed */
    private driver: DriverInfoData | null = null;
    /** Number of students assigned to this driver */
    private studentCount: number = 0;

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
    }

    /**
     * Renders the driver information card with avatar, name, student count, route, and status.
     * Creates a visual card layout using shadow DOM.
     */
    protected render(): void {
        const shadow = this.shadowRoot!;
        const driverName = this.driver ? this.driver.name.charAt(0).toUpperCase() + this.driver.name.slice(1) : 'Unknown';

        shadow.innerHTML = `
            <div class="driver-info-card">
                <div class="driver-header">
                    <div class="driver-avatar">${driverName.charAt(0)}</div>
                    <div class="driver-details">
                        <h3>${driverName} Driver</h3>
                        <p class="student-count">${this.studentCount} Students</p>
                    </div>
                </div>
                <div class="driver-stats">
                    <div class="stat-item">
                        <span class="stat-label">Route:</span>
                        <span class="stat-value">${this.driver?.route || 'N/A'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Status:</span>
                        <span class="stat-value status-${this.driver?.status || 'active'}">${(this.driver?.status || 'active').charAt(0).toUpperCase() + (this.driver?.status || 'active').slice(1)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Sets up event listeners for the component.
     * Currently empty but can be extended for interactive features.
     */
    protected setupEventListeners(): void {
        // Add any event listeners if needed
    }

    /**
     * Sets the driver information using just a driver name string.
     * Creates a basic driver object with default values and the provided name.
     * @param {string} driver - The driver name to set
     */
    setDriver(driver: string) {
        const newDriver = {
            name: driver,
            route: driver,
            status: 'active' as const,
            total_students: this.studentCount
        };
        if (this.driver === newDriver || (this.driver && JSON.stringify(this.driver) === JSON.stringify(newDriver))) {
            return; // No change, skip render
        }
        this.driver = newDriver;
        this.markForRender();
    }

    /**
     * Updates the student count for this driver and triggers re-render.
     * @param {number} count - The number of students assigned to this driver
     */
    setStudentCount(count: number) {
        if (this.studentCount === count) {
            return; // No change, skip render
        }
        this.studentCount = count;
        if (this.driver) {
            this.driver.total_students = count;
            this.markForRender();
        }
    }

    /**
     * Sets complete driver information from a DriverInfoData object.
     * @param {DriverInfoData} info - Complete driver information object
     */
    setDriverInfo(info: DriverInfoData) {
        if (this.driver === info || (this.driver && JSON.stringify(this.driver) === JSON.stringify(info))) {
            return; // No change, skip render
        }
        this.driver = info;
        this.studentCount = info.total_students || 0;
        this.markForRender();
    }

}

// Export for use in other modules
export { DriverInfo };
export type { DriverInfoData };