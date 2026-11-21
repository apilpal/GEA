import { apiService } from '@/ts/services/api-service';
import { authService } from '@/ts/services/auth-service';
export async function updateDashboardStats() {
    try {
        const isGuestUser = authService.isGuestUser();
        if (isGuestUser) {
            console.log('[DASHBOARD] Updating stats for guest user');
            const guestResponse = await authService.getGuestDashboardData();
            if (guestResponse.data && guestResponse.data.summary) {
                const summary = guestResponse.data.summary;
                updateDashboardElements(summary, true);
            }
        }
        else {
            console.log('[DASHBOARD] Updating stats for regular user');
            const summaryResponse = await apiService.get('/reports/summary');
            if (summaryResponse.data) {
                const summary = summaryResponse.data;
                updateDashboardElements(summary, false);
            }
        }
    }
    catch (error) {
        console.error('Failed to update dashboard stats:', error);
    }
}
function updateDashboardElements(summary, isGuest) {
    const totalStudentsDash = document.getElementById('total-students-dash');
    const totalDriversDash = document.getElementById('total-drivers-dash');
    if (totalStudentsDash) {
        const studentCount = summary.total_students || 0;
        totalStudentsDash.textContent = studentCount.toString();
        if (isGuest) {
            addGuestIndicator(totalStudentsDash, 'Limited view - sign up for full access');
        }
    }
    if (totalDriversDash) {
        const driverCount = summary.total_drivers || 0;
        totalDriversDash.textContent = driverCount.toString();
        if (isGuest) {
            addGuestIndicator(totalDriversDash, 'Limited view - sign up for full access');
        }
    }
    if (isGuest) {
        addGuestDashboardElements();
    }
}
function addGuestIndicator(element, tooltip) {
    const existingIndicator = element.querySelector('.guest-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    const indicator = document.createElement('span');
    indicator.className = 'guest-indicator';
    indicator.title = tooltip;
    indicator.textContent = '👁️';
    element.style.position = 'relative';
    element.appendChild(indicator);
}
function addGuestDashboardElements() {
    const dashboardContainer = document.querySelector('.dashboard-container, [data-dashboard]');
    if (!dashboardContainer) {
        console.warn('[DASHBOARD] No dashboard container found for guest elements');
        return;
    }
    if (document.querySelector('[data-guest-banner]')) {
        return;
    }
    const guestBanner = document.createElement('div');
    guestBanner.className = 'guest-dashboard-banner';
    guestBanner.setAttribute('data-guest-banner', '');
    guestBanner.innerHTML = `
        <div class="guest-banner-content">
            <div class="guest-banner-text">
                <h3>Guest Access</h3>
                <p>You're viewing limited dashboard data. Sign up for a full account to access all features and data.</p>
            </div>
            <div class="guest-banner-actions">
                <button class="guest-signup-btn" data-guest-signup>Sign Up Free</button>
                <button class="guest-learn-more-btn" data-guest-learn-more>Learn More</button>
            </div>
        </div>
    `;
    dashboardContainer.insertBefore(guestBanner, dashboardContainer.firstChild);
    guestBanner.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('[data-guest-signup]')) {
            event.preventDefault();
            window.location.href = '/register?guest=true';
        }
        if (target.matches('[data-guest-learn-more]')) {
            event.preventDefault();
            showGuestFeatureModal();
        }
    });
    console.log('[DASHBOARD] Guest dashboard elements added');
}
function showGuestFeatureModal() {
    let modal = document.querySelector('[data-guest-features-modal]');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'guest-features-modal';
        modal.setAttribute('data-guest-features-modal', '');
        modal.innerHTML = `
            <div class="guest-modal-content">
                <div class="guest-modal-header">
                    <h3>Guest vs Full Account</h3>
                    <button class="guest-modal-close" data-guest-modal-close>&times;</button>
                </div>
                <div class="guest-modal-body">
                    <div class="guest-features-comparison">
                        <div class="guest-feature-column">
                            <h4>Guest Access</h4>
                            <ul>
                                <li>✅ View basic dashboard stats</li>
                                <li>❌ Limited data access</li>
                                <li>❌ No data export</li>
                                <li>❌ No advanced reports</li>
                                <li>⏰ 24-hour session limit</li>
                            </ul>
                        </div>
                        <div class="guest-feature-column">
                            <h4>Full Account</h4>
                            <ul>
                                <li>✅ Complete dashboard access</li>
                                <li>✅ All data and reports</li>
                                <li>✅ Data export capabilities</li>
                                <li>✅ Advanced analytics</li>
                                <li>✅ Permanent account</li>
                            </ul>
                        </div>
                    </div>
                    <div class="guest-upgrade-cta">
                        <button class="guest-upgrade-cta-btn" data-guest-upgrade-cta>
                            Upgrade to Full Account
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (event) => {
            const target = event.target;
            if (target.matches('[data-guest-modal-close]') || target.matches('.guest-features-modal')) {
                modal.remove();
            }
            if (target.matches('[data-guest-upgrade-cta]')) {
                modal.remove();
                window.location.href = '/register?guest=true';
            }
        });
    }
    console.log('[DASHBOARD] Guest features modal displayed');
}
export async function initializeGuestDashboard() {
    const isGuestUser = authService.isGuestUser();
    if (isGuestUser) {
        console.log('[DASHBOARD] Initializing guest dashboard');
        if (authService.isGuestSessionExpired()) {
            console.log('[DASHBOARD] Guest session expired, creating new session');
            await authService.createGuestUser();
        }
        await updateDashboardStats();
        try {
            const { guestDashboardComponent } = await import('../components/auth/guest-dashboard-component');
            await guestDashboardComponent.initialize();
            console.log('[DASHBOARD] GuestDashboardComponent initialized');
        }
        catch (error) {
            console.error('[DASHBOARD] Failed to initialize GuestDashboardComponent:', error);
        }
        setInterval(async () => {
            if (authService.isGuestUser() && authService.isGuestSessionExpired()) {
                console.log('[DASHBOARD] Refreshing expired guest session');
                await authService.createGuestUser();
                await updateDashboardStats();
            }
        }, 60000);
        console.log('[DASHBOARD] Guest dashboard initialized');
    }
    else {
        await updateDashboardStats();
    }
}
export function handleGuestSignup() {
    const urlParams = new URLSearchParams(window.location.search);
    const isGuestSignup = urlParams.get('guest') === 'true';
    if (isGuestSignup) {
        console.log('[DASHBOARD] Guest signup flow detected');
        const signupContainer = document.querySelector('.signup-container, .register-form');
        if (signupContainer) {
            const guestMessage = document.createElement('div');
            guestMessage.className = 'guest-signup-message';
            guestMessage.innerHTML = `
                <div class="guest-signup-welcome">
                    <h3>Welcome Guest User!</h3>
                    <p>Convert your guest account to a full account to keep your progress and access all features.</p>
                </div>
            `;
            signupContainer.insertBefore(guestMessage, signupContainer.firstChild);
        }
    }
}
//# sourceMappingURL=dashboard-manager.js.map