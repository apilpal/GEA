// Deterministic demo content used when the application is run without seeded data.
// This is clearly marked as sample data and never participates in authentication.
import { authContext } from './components/auth/auth-context';

export const DEMO_DRIVERS = [
    { name: 'Alex Morgan', route: 'North Route', status: 'active', vehicle_number: 'BUS-101', contact_number: '555-0101', total_students: 3 },
    { name: 'Jamie Patel', route: 'East Route', status: 'active', vehicle_number: 'BUS-204', contact_number: '555-0102', total_students: 2 },
    { name: 'Taylor Chen', route: 'West Route', status: 'active', vehicle_number: 'BUS-309', contact_number: '555-0103', total_students: 2 }
];

export const DEMO_STUDENTS = [
    { id: 1, name: 'Avery Johnson', father_name: 'Morgan Johnson', mobile: '555-1001', class: '10', class_: '10', address: '12 Oak Street', fees: 125, route: 'North Route' },
    { id: 2, name: 'Noah Williams', father_name: 'Casey Williams', mobile: '555-1002', class: '8', class_: '8', address: '48 Pine Avenue', fees: 110, route: 'North Route' },
    { id: 3, name: 'Mia Garcia', father_name: 'Riley Garcia', mobile: '555-1003', class: '11', class_: '11', address: '7 Maple Road', fees: 140, route: 'North Route' },
    { id: 4, name: 'Ethan Patel', father_name: 'Jordan Patel', mobile: '555-1004', class: '9', class_: '9', address: '90 Lake Drive', fees: 120, route: 'East Route' },
    { id: 5, name: 'Sofia Kim', father_name: 'Alex Kim', mobile: '555-1005', class: '7', class_: '7', address: '3 Cedar Lane', fees: 105, route: 'East Route' },
    { id: 6, name: 'Lucas Brown', father_name: 'Drew Brown', mobile: '555-1006', class: '12', class_: '12', address: '25 Hill Street', fees: 150, route: 'West Route' },
    { id: 7, name: 'Isla Davis', father_name: 'Sam Davis', mobile: '555-1007', class: '6', class_: '6', address: '61 River Road', fees: 100, route: 'West Route' }
];

const PAGE_TITLES: Record<string, string> = {
    dashboard: 'Dashboard', transport: 'Transport', students: 'Students',
    reports: 'Reports', settings: 'Settings', chat: 'AI Chat'
};

let initialized = false;

/** Start the demo UI after authentication has succeeded. Mock data does not grant access. */
export function initializeDemoData(): void {
    if (initialized) return;
    initialized = true;

    authContext.subscribe((state) => {
        if (state.isLoading) return;
        setAuthenticationVisibility(state.isAuthenticated && !!state.user);
        if (state.isAuthenticated && state.user) {
            showPage(window.location.hash.slice(1) || 'dashboard');
            renderDemoData();
        }
    });

    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        const menuItem = target?.closest<HTMLElement>('.menu-item[data-page]');
        if (menuItem) {
            const page = menuItem.dataset.page;
            if (page && authContext.getState().isAuthenticated) {
                showPage(page);
            }
        }

        // Keep the mobile menu's accessibility state in sync with the existing toggle logic.
        if (target?.closest('#mobile-menu-btn')) {
            window.setTimeout(() => {
                const button = document.getElementById('mobile-menu-btn');
                const sidebar = document.getElementById('sidebar-navigation');
                button?.setAttribute('aria-expanded', String(!!sidebar && !sidebar.classList.contains('collapsed')));
            }, 0);
        }
    });

    document.addEventListener('keydown', (event) => {
        const current = event.target as HTMLElement | null;
        if (!current?.matches('.menu-item[data-page]')) return;
        const items = Array.from(document.querySelectorAll<HTMLElement>('.menu-item[data-page]'));
        const index = items.indexOf(current);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const offset = event.key === 'ArrowDown' ? 1 : -1;
            items[(index + offset + items.length) % items.length]?.focus();
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            current.click();
        }
    });
}

function setAuthenticationVisibility(authenticated: boolean): void {
    const loading = document.getElementById('auth-loading');
    const login = document.getElementById('login-page');
    const main = document.getElementById('main-app');
    const app = document.getElementById('app');
    const logout = document.getElementById('logout-btn');

    loading?.classList.remove('auth-loading-visible');
    loading?.classList.add('auth-loading-hidden');
    login?.classList.toggle('active', !authenticated);
    main?.classList.toggle('main-app-hidden', !authenticated);
    main?.classList.toggle('main-app-visible', authenticated);
    app?.classList.toggle('login-active', !authenticated);
    if (logout) logout.style.display = authenticated ? 'block' : 'none';
}

function showPage(page: string): void {
    if (!PAGE_TITLES[page]) page = 'dashboard';
    document.querySelectorAll<HTMLElement>('.page:not(#login-page)').forEach((element) => {
        element.classList.toggle('active', element.id === `${page}-page`);
    });
    document.querySelectorAll<HTMLElement>('.menu-item[data-page]').forEach((item) => {
        const active = item.dataset.page === page;
        item.classList.toggle('active', active);
        item.setAttribute('tabindex', active ? '0' : '-1');
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    });
    const title = document.getElementById('page-title');
    if (title) title.textContent = PAGE_TITLES[page];
    if (window.location.hash !== `#${page}`) window.location.hash = page;
}

function renderDemoData(): void {
    const totalStudents = DEMO_STUDENTS.length;
    const totalDrivers = DEMO_DRIVERS.length;
    const totalRevenue = DEMO_STUDENTS.reduce((sum, student) => sum + student.fees, 0);

    setText('total-students-dash', totalStudents);
    setText('total-drivers-dash', totalDrivers);
    setText('report-total-students', totalStudents);
    setText('report-total-drivers', totalDrivers);
    setText('report-total-revenue', `$${totalRevenue.toLocaleString()}`);
    setText('total-drivers-stats', totalDrivers);
    setText('total-students-stats', totalStudents);
    setText('avg-students-per-driver', (totalStudents / totalDrivers).toFixed(1));
    setText('dashboard-welcome-subtitle', 'Demo view — sample school transport data is shown below.');

    const welcome = document.querySelector('.welcome-section');
    if (welcome && !welcome.querySelector('[data-demo-data-notice]')) {
        const notice = document.createElement('p');
        notice.dataset.demoDataNotice = 'true';
        notice.textContent = 'Sample demonstration data — replace it with your school data when ready.';
        notice.setAttribute('role', 'note');
        notice.style.cssText = 'margin-top: .75rem; padding: .65rem 1rem; border-radius: .5rem; background: #eef2ff; color: #3730a3;';
        welcome.appendChild(notice);
    }

    const activity = document.querySelector('.activity-list');
    if (activity) {
        activity.replaceChildren();
        [
            `${totalStudents} students assigned across ${totalDrivers} routes`,
            `Monthly transport fees: $${totalRevenue.toLocaleString()}`
        ].forEach((text) => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            const content = document.createElement('div');
            content.className = 'activity-content';
            const title = document.createElement('div');
            title.className = 'activity-title';
            title.textContent = text;
            content.appendChild(title);
            item.appendChild(content);
            activity.appendChild(item);
        });
    }

    renderDrivers();
    renderStudents();
    renderReports(totalRevenue);
}

function renderDrivers(): void {
    const select = document.getElementById('driver-select') as HTMLSelectElement | null;
    if (select) {
        while (select.options.length > 1) select.remove(1);
        DEMO_DRIVERS.forEach((driver) => {
            const option = document.createElement('option');
            option.value = driver.route;
            option.textContent = `${driver.route} — ${driver.name}`;
            select.appendChild(option);
        });
        select.value = DEMO_DRIVERS[0].route;
    }

    const tbody = document.getElementById('drivers-table-body');
    if (tbody) {
        tbody.replaceChildren();
        DEMO_DRIVERS.forEach((driver) => {
            const row = document.createElement('tr');
            [driver.name, driver.route, driver.vehicle_number, driver.contact_number, driver.status.toUpperCase(), String(driver.total_students)]
                .forEach((value) => appendCell(row, value));
            tbody.appendChild(row);
        });
    }

    const selected = document.querySelector('driver-info') as (HTMLElement & { setDriver?: (route: string) => void; setStudentCount?: (count: number) => void }) | null;
    selected?.setDriver?.(DEMO_DRIVERS[0].route);
    selected?.setStudentCount?.(DEMO_STUDENTS.filter((student) => student.route === DEMO_DRIVERS[0].route).length);
    renderDriverStudents(DEMO_DRIVERS[0].route);

    if (select && !select.hasAttribute('data-demo-handler')) {
        select.addEventListener('change', () => {
            const route = select.value;
            const driver = DEMO_DRIVERS.find((item) => item.route === route);
            if (!driver) return;
            selected?.setDriver?.(route);
            selected?.setStudentCount?.(DEMO_STUDENTS.filter((student) => student.route === route).length);
            renderDriverStudents(route);
        });
        select.setAttribute('data-demo-handler', 'true');
    }
}

function renderDriverStudents(route: string): void {
    const tbody = document.getElementById('driver-table-body');
    if (!tbody) return;
    tbody.replaceChildren();
    DEMO_STUDENTS.filter((student) => student.route === route).forEach((student, index) => {
        const row = document.createElement('tr');
        [String(index + 1), student.route, student.name, student.father_name, student.mobile, student.class, student.address, `$${student.fees}`]
            .forEach((value) => appendCell(row, value));
        tbody.appendChild(row);
    });
}

function renderStudents(): void {
    const table = document.querySelector('student-table') as (HTMLElement & { setStudents?: (students: typeof DEMO_STUDENTS) => void }) | null;
    table?.setStudents?.(DEMO_STUDENTS);
}

function renderReports(totalRevenue: number): void {
    const byDriver = DEMO_DRIVERS.map((driver) => ({
        driver_name: driver.name,
        student_count: DEMO_STUDENTS.filter((student) => student.route === driver.route).length,
        revenue: DEMO_STUDENTS.filter((student) => student.route === driver.route).reduce((sum, student) => sum + student.fees, 0)
    }));
    fillRows('driver-student-tbody', byDriver.map((driver) => [driver.driver_name, String(driver.student_count), `$${driver.revenue.toLocaleString()}`]));
    fillRows('driver-stats-tbody', byDriver.map((driver) => [driver.driver_name, String(driver.student_count)]));

    const revenueByDriver: Record<string, number> = {};
    const revenueByClass: Record<string, number> = {};
    DEMO_STUDENTS.forEach((student) => {
        revenueByDriver[student.route] = (revenueByDriver[student.route] || 0) + student.fees;
        revenueByClass[`Grade ${student.class}`] = (revenueByClass[`Grade ${student.class}`] || 0) + student.fees;
    });
    setChartData('#revenue-driver-chart', Object.keys(revenueByDriver), Object.values(revenueByDriver), 'Fees by Route');
    setChartData('#revenue-class-chart', Object.keys(revenueByClass), Object.values(revenueByClass), 'Fees by Grade');
    setChartData('#student-distribution-chart', byDriver.map((driver) => driver.driver_name), byDriver.map((driver) => driver.student_count), 'Students by Driver');
    setText('report-total-revenue', `$${totalRevenue.toLocaleString()}`);
}

function setChartData(selector: string, labels: string[], values: number[], label: string): void {
    const chart = document.querySelector(selector) as (HTMLElement & { setData?: (data: unknown) => void }) | null;
    chart?.setData?.({ labels, datasets: [{ label, data: values, backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16'] }] });
}

function fillRows(id: string, rows: string[][]): void {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    tbody.replaceChildren();
    rows.forEach((values) => {
        const row = document.createElement('tr');
        values.forEach((value) => appendCell(row, value));
        tbody.appendChild(row);
    });
}

function appendCell(row: HTMLTableRowElement, value: string): void {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
}

function setText(id: string, value: string | number): void {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
}

// Register on import so this behavior is available alongside the main app controller.
initializeDemoData();
