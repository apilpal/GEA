// Deterministic demo content used when the application is run without seeded data.
// This is clearly marked as sample data and never participates in authentication.
import { authContext } from './components/auth/auth-context';
import { formatRupees } from './services/money';

/** Monthly transport fee charged to every demo student. */
export const MONTHLY_FEE = 500;

// Money is always shown in rupees (₹).
const formatMoney = (amount: number): string => formatRupees(amount);

export const DEMO_STUDENTS = [
    { id: 1, name: 'Avery Johnson', father_name: 'Morgan Johnson', mobile: '555-1001', class: '10', class_: '10', address: '12 Oak Street', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 2, name: 'Noah Williams', father_name: 'Casey Williams', mobile: '555-1002', class: '8', class_: '8', address: '48 Pine Avenue', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 3, name: 'Mia Garcia', father_name: 'Riley Garcia', mobile: '555-1003', class: '11', class_: '11', address: '7 Maple Road', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 4, name: 'Ethan Patel', father_name: 'Jordan Patel', mobile: '555-1004', class: '9', class_: '9', address: '90 Lake Drive', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 5, name: 'Sofia Kim', father_name: 'Alex Kim', mobile: '555-1005', class: '7', class_: '7', address: '3 Cedar Lane', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 6, name: 'Lucas Brown', father_name: 'Drew Brown', mobile: '555-1006', class: '12', class_: '12', address: '25 Hill Street', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 7, name: 'Isla Davis', father_name: 'Sam Davis', mobile: '555-1007', class: '6', class_: '6', address: '61 River Road', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 8, name: 'Liam Johnson', father_name: 'Morgan Johnson', mobile: '555-1008', class: '6', class_: '6', address: '59 Oak Street', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 9, name: 'Emma Williams', father_name: 'Casey Williams', mobile: '555-1009', class: '9', class_: '9', address: '66 Pine Avenue', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 10, name: 'Oliver Garcia', father_name: 'Riley Garcia', mobile: '555-1010', class: '12', class_: '12', address: '73 Maple Road', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 11, name: 'Ava Patel', father_name: 'Jordan Patel', mobile: '555-1011', class: '8', class_: '8', address: '80 Lake Drive', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 12, name: 'Elijah Kim', father_name: 'Alex Kim', mobile: '555-1012', class: '11', class_: '11', address: '87 Cedar Lane', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 13, name: 'Charlotte Brown', father_name: 'Drew Brown', mobile: '555-1013', class: '7', class_: '7', address: '4 Hill Street', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 14, name: 'James Davis', father_name: 'Sam Davis', mobile: '555-1014', class: '10', class_: '10', address: '11 River Road', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 15, name: 'Amelia Martin', father_name: 'Chris Martin', mobile: '555-1015', class: '6', class_: '6', address: '18 Park Avenue', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 16, name: 'Benjamin Lopez', father_name: 'Pat Lopez', mobile: '555-1016', class: '9', class_: '9', address: '25 Elm Street', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 17, name: 'Harper Nguyen', father_name: 'Dana Nguyen', mobile: '555-1017', class: '12', class_: '12', address: '32 Sunset Boulevard', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 18, name: 'Henry Walker', father_name: 'Kelly Walker', mobile: '555-1018', class: '8', class_: '8', address: '39 Willow Way', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 19, name: 'Evelyn Hall', father_name: 'Robin Hall', mobile: '555-1019', class: '11', class_: '11', address: '46 Garden Road', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 20, name: 'Theo Young', father_name: 'Jesse Young', mobile: '555-1020', class: '7', class_: '7', address: '53 Oak Street', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 21, name: 'Luna Allen', father_name: 'Taylor Allen', mobile: '555-1021', class: '10', class_: '10', address: '60 Pine Avenue', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 22, name: 'Jack King', father_name: 'Lee King', mobile: '555-1022', class: '6', class_: '6', address: '67 Maple Road', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 23, name: 'Ella Wright', father_name: 'Cameron Wright', mobile: '555-1023', class: '9', class_: '9', address: '74 Lake Drive', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 24, name: 'Owen Scott', father_name: 'Skyler Scott', mobile: '555-1024', class: '12', class_: '12', address: '81 Cedar Lane', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 25, name: 'Aria Johnson', father_name: 'Quinn Johnson', mobile: '555-1025', class: '8', class_: '8', address: '88 Hill Street', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 26, name: 'Leo Williams', father_name: 'Avery Williams', mobile: '555-1026', class: '11', class_: '11', address: '5 River Road', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 27, name: 'Chloe Garcia', father_name: 'Rowan Garcia', mobile: '555-1027', class: '7', class_: '7', address: '12 Park Avenue', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 28, name: 'Caleb Patel', father_name: 'Blake Patel', mobile: '555-1028', class: '10', class_: '10', address: '19 Elm Street', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 29, name: 'Layla Kim', father_name: 'Reese Kim', mobile: '555-1029', class: '6', class_: '6', address: '26 Sunset Boulevard', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 30, name: 'Ryan Brown', father_name: 'Parker Brown', mobile: '555-1030', class: '9', class_: '9', address: '33 Willow Way', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 31, name: 'Zoe Davis', father_name: 'Hayden Davis', mobile: '555-1031', class: '12', class_: '12', address: '40 Garden Road', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 32, name: 'Nathan Martin', father_name: 'Sidney Martin', mobile: '555-1032', class: '8', class_: '8', address: '47 Oak Street', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 33, name: 'Nora Lopez', father_name: 'Morgan Lopez', mobile: '555-1033', class: '11', class_: '11', address: '54 Pine Avenue', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 34, name: 'Isaac Nguyen', father_name: 'Casey Nguyen', mobile: '555-1034', class: '7', class_: '7', address: '61 Maple Road', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 35, name: 'Hazel Walker', father_name: 'Riley Walker', mobile: '555-1035', class: '10', class_: '10', address: '68 Lake Drive', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 36, name: 'Adam Hall', father_name: 'Jordan Hall', mobile: '555-1036', class: '6', class_: '6', address: '75 Cedar Lane', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 37, name: 'Lily Young', father_name: 'Alex Young', mobile: '555-1037', class: '9', class_: '9', address: '82 Hill Street', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 38, name: 'Aaron Allen', father_name: 'Drew Allen', mobile: '555-1038', class: '12', class_: '12', address: '89 River Road', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 39, name: 'Violet King', father_name: 'Sam King', mobile: '555-1039', class: '8', class_: '8', address: '6 Park Avenue', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 40, name: 'Daniel Wright', father_name: 'Chris Wright', mobile: '555-1040', class: '11', class_: '11', address: '13 Elm Street', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 41, name: 'Aurora Scott', father_name: 'Pat Scott', mobile: '555-1041', class: '7', class_: '7', address: '20 Sunset Boulevard', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 42, name: 'Samuel Johnson', father_name: 'Dana Johnson', mobile: '555-1042', class: '10', class_: '10', address: '27 Willow Way', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 43, name: 'Stella Williams', father_name: 'Kelly Williams', mobile: '555-1043', class: '6', class_: '6', address: '34 Garden Road', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 44, name: 'Joshua Garcia', father_name: 'Robin Garcia', mobile: '555-1044', class: '9', class_: '9', address: '41 Oak Street', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 45, name: 'Ruby Patel', father_name: 'Jesse Patel', mobile: '555-1045', class: '12', class_: '12', address: '48 Pine Avenue', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 46, name: 'Wyatt Kim', father_name: 'Taylor Kim', mobile: '555-1046', class: '8', class_: '8', address: '55 Maple Road', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 47, name: 'Penelope Brown', father_name: 'Lee Brown', mobile: '555-1047', class: '11', class_: '11', address: '62 Lake Drive', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 48, name: 'Eli Davis', father_name: 'Cameron Davis', mobile: '555-1048', class: '7', class_: '7', address: '69 Cedar Lane', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 49, name: 'Maya Martin', father_name: 'Skyler Martin', mobile: '555-1049', class: '10', class_: '10', address: '76 Hill Street', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 50, name: 'Julian Lopez', father_name: 'Quinn Lopez', mobile: '555-1050', class: '6', class_: '6', address: '83 River Road', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 51, name: 'Naomi Nguyen', father_name: 'Avery Nguyen', mobile: '555-1051', class: '9', class_: '9', address: '90 Park Avenue', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 52, name: 'Hudson Walker', father_name: 'Rowan Walker', mobile: '555-1052', class: '12', class_: '12', address: '7 Elm Street', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 53, name: 'Clara Hall', father_name: 'Blake Hall', mobile: '555-1053', class: '8', class_: '8', address: '14 Sunset Boulevard', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 54, name: 'Levi Young', father_name: 'Reese Young', mobile: '555-1054', class: '11', class_: '11', address: '21 Willow Way', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 55, name: 'Alice Allen', father_name: 'Parker Allen', mobile: '555-1055', class: '7', class_: '7', address: '28 Garden Road', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 56, name: 'Mason King', father_name: 'Hayden King', mobile: '555-1056', class: '10', class_: '10', address: '35 Oak Street', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 57, name: 'Grace Wright', father_name: 'Sidney Wright', mobile: '555-1057', class: '6', class_: '6', address: '42 Pine Avenue', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 58, name: 'Carter Scott', father_name: 'Morgan Scott', mobile: '555-1058', class: '9', class_: '9', address: '49 Maple Road', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 59, name: 'Ivy Johnson', father_name: 'Casey Johnson', mobile: '555-1059', class: '12', class_: '12', address: '56 Lake Drive', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 60, name: 'Dylan Williams', father_name: 'Riley Williams', mobile: '555-1060', class: '8', class_: '8', address: '63 Cedar Lane', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 61, name: 'Emilia Garcia', father_name: 'Jordan Garcia', mobile: '555-1061', class: '11', class_: '11', address: '70 Hill Street', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 62, name: 'Gabriel Patel', father_name: 'Alex Patel', mobile: '555-1062', class: '7', class_: '7', address: '77 River Road', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 63, name: 'Willow Kim', father_name: 'Drew Kim', mobile: '555-1063', class: '10', class_: '10', address: '84 Park Avenue', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 64, name: 'Asher Brown', father_name: 'Sam Brown', mobile: '555-1064', class: '6', class_: '6', address: '91 Elm Street', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 65, name: 'Eliana Davis', father_name: 'Chris Davis', mobile: '555-1065', class: '9', class_: '9', address: '8 Sunset Boulevard', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 66, name: 'Jaxon Martin', father_name: 'Pat Martin', mobile: '555-1066', class: '12', class_: '12', address: '15 Willow Way', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 67, name: 'Piper Lopez', father_name: 'Dana Lopez', mobile: '555-1067', class: '8', class_: '8', address: '22 Garden Road', fees: MONTHLY_FEE, route: 'Central Route' },
    { id: 68, name: 'Miles Nguyen', father_name: 'Kelly Nguyen', mobile: '555-1068', class: '11', class_: '11', address: '29 Oak Street', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 69, name: 'Sadie Walker', father_name: 'Robin Walker', mobile: '555-1069', class: '7', class_: '7', address: '36 Pine Avenue', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 70, name: 'Felix Hall', father_name: 'Jesse Hall', mobile: '555-1070', class: '10', class_: '10', address: '43 Maple Road', fees: MONTHLY_FEE, route: 'West Route' },
    { id: 71, name: 'Iris Young', father_name: 'Taylor Young', mobile: '555-1071', class: '6', class_: '6', address: '50 Lake Drive', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 72, name: 'Roman Allen', father_name: 'Lee Allen', mobile: '555-1072', class: '9', class_: '9', address: '57 Cedar Lane', fees: MONTHLY_FEE, route: 'North Route' },
    { id: 73, name: 'Jade King', father_name: 'Cameron King', mobile: '555-1073', class: '12', class_: '12', address: '64 Hill Street', fees: MONTHLY_FEE, route: 'East Route' },
    { id: 74, name: 'Ezra Wright', father_name: 'Skyler Wright', mobile: '555-1074', class: '8', class_: '8', address: '71 River Road', fees: MONTHLY_FEE, route: 'South Route' },
    { id: 75, name: 'Freya Scott', father_name: 'Quinn Scott', mobile: '555-1075', class: '11', class_: '11', address: '78 Park Avenue', fees: MONTHLY_FEE, route: 'North Route' }
];

const DEMO_DRIVER_LIST = [
    { name: 'Alex Morgan', route: 'North Route', status: 'active', vehicle_number: 'BUS-101', contact_number: '555-0101' },
    { name: 'Jamie Patel', route: 'East Route', status: 'active', vehicle_number: 'BUS-204', contact_number: '555-0102' },
    { name: 'Taylor Chen', route: 'West Route', status: 'active', vehicle_number: 'BUS-309', contact_number: '555-0103' },
    { name: 'Jordan Rivera', route: 'South Route', status: 'active', vehicle_number: 'BUS-412', contact_number: '555-0104' },
    { name: 'Sam Okafor', route: 'Central Route', status: 'active', vehicle_number: 'BUS-515', contact_number: '555-0105' }
];

export const DEMO_DRIVERS = DEMO_DRIVER_LIST.map((driver) => ({
    ...driver,
    total_students: DEMO_STUDENTS.filter((student) => student.route === driver.route).length
}));

const PAGE_TITLES: Record<string, string> = {
    dashboard: 'Dashboard', transport: 'Transport', students: 'Students',
    attendance: 'Attendance', marks: 'Marks', scorecard: 'Scorecard', analytics: 'Analytics', collection: 'Fee collection', fees: 'Fees', reports: 'Reports', settings: 'Settings', chat: 'AI Chat'
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
    setText('report-total-revenue', formatMoney(totalRevenue));
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
            `Monthly transport fees: ${formatMoney(totalRevenue)}`
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
        [String(index + 1), student.route, student.name, student.father_name, student.mobile, student.class, student.address, formatMoney(student.fees)]
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
    fillRows('driver-student-tbody', byDriver.map((driver) => [driver.driver_name, String(driver.student_count), formatMoney(driver.revenue)]));
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
    setText('report-total-revenue', formatMoney(totalRevenue));
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
