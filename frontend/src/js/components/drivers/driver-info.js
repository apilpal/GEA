import { BaseComponent } from '@/ts/components/core/index';
class DriverInfo extends BaseComponent {
    constructor() {
        super();
        this.driver = null;
        this.studentCount = 0;
    }
    connectedCallback() {
        super.connectedCallback();
    }
    render() {
        const shadow = this.shadowRoot;
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
    setupEventListeners() {
    }
    setDriver(driver) {
        const newDriver = {
            name: driver,
            route: driver,
            status: 'active',
            total_students: this.studentCount
        };
        if (this.driver === newDriver || (this.driver && JSON.stringify(this.driver) === JSON.stringify(newDriver))) {
            return;
        }
        this.driver = newDriver;
        this.markForRender();
    }
    setStudentCount(count) {
        if (this.studentCount === count) {
            return;
        }
        this.studentCount = count;
        if (this.driver) {
            this.driver.total_students = count;
            this.markForRender();
        }
    }
    setDriverInfo(info) {
        if (this.driver === info || (this.driver && JSON.stringify(this.driver) === JSON.stringify(info))) {
            return;
        }
        this.driver = info;
        this.studentCount = info.total_students || 0;
        this.markForRender();
    }
}
export { DriverInfo };
//# sourceMappingURL=driver-info.js.map