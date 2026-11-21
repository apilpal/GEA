// Dashboard page manager
import { apiService } from '@/ts/services/api-service';
import { authService } from '@/ts/services/auth-service';

/**
 * Fetches and updates dashboard statistics from the reports API.
 * Updates the displayed counts for total students and total drivers on the dashboard.
 * Supports both regular users and guest users with appropriate data handling.
 * @returns {Promise<void>} Resolves when dashboard stats are successfully updated.
 */
export async function updateDashboardStats(): Promise<void> {
    try {
        // Data endpoints require login; skip quietly when logged out.
        const isAuthenticated = await authService.isAuthenticated();
        if (!isAuthenticated) {
            return;
        }
        const summaryResponse = await apiService.get('/reports/summary');
        if (summaryResponse.data) {
            updateDashboardElements(summaryResponse.data as any, false, false);
        }
    } catch (error) {
        console.error('Failed to update dashboard stats:', error);
    }
}

/**
 * Update dashboard elements with summary data.
 * @param {any} summary - Summary data from API.
 * @param {boolean} isGuest - Whether this is for a guest user.
 * @param {boolean} isUnauthenticated - Whether this is for an unauthenticated user.
 */
function updateDashboardElements(summary: any, isGuest: boolean, isUnauthenticated: boolean = false): void {
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

    // Add user-specific dashboard elements
    if (isUnauthenticated) {
        addUnauthenticatedDashboardElements();
    } else if (isGuest) {
        addGuestDashboardElements();
    }
}

/**
 * Show login modal for unauthenticated users.
 */
function showLoginModal(): void {
    // Create modal if it doesn't exist
    let modal = document.querySelector('[data-login-modal]') as HTMLElement;
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'login-modal';
        modal.setAttribute('data-login-modal', '');
        modal.innerHTML = `
            <div class="login-modal-content">
                <div class="login-modal-header">
                    <h3>Sign In</h3>
                    <button class="login-modal-close" data-login-modal-close>&times;</button>
                </div>
                <div class="login-modal-body">
                    <login-component id="modalLoginComponent"></login-component>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Set up modal event listeners
        modal.addEventListener('click', (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.matches('[data-login-modal-close]') || target.matches('.login-modal')) {
                modal.remove();
            }
        });

        // Listen for successful login to close modal
        const handleLoginSuccess = () => {
            console.log('[DASHBOARD] Login successful, closing modal');
            modal.remove();
            document.removeEventListener('login-success', handleLoginSuccess);
        };
        document.addEventListener('login-success', handleLoginSuccess);

        // Also listen for auth state changes in case login happens through other means
        const handleAuthStateChange = async () => {
            // Check if user is now authenticated
            const isAuthenticated = await authService.isAuthenticated();
            if (isAuthenticated) {
                console.log('[DASHBOARD] User authenticated, closing modal');
                modal.remove();
                document.removeEventListener('auth-state-changed', handleAuthStateChange);
            }
        };
        document.addEventListener('auth-state-changed', handleAuthStateChange);
    }

    console.log('[DASHBOARD] Login modal displayed');
}

/**
 * Add guest-specific indicators to dashboard elements.
 * @param {Element} element - Element to add indicator to.
 * @param {string} tooltip - Tooltip text for the indicator.
 */
function addGuestIndicator(element: Element, tooltip: string): void {
    // Remove existing guest indicators
    const existingIndicator = element.querySelector('.guest-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    const indicator = document.createElement('span');
    indicator.className = 'guest-indicator';
    indicator.title = tooltip;
    indicator.textContent = '👁️';

    (element as HTMLElement).style.position = 'relative';
    element.appendChild(indicator);
}

/**
 * Add guest-specific elements to the dashboard for unauthenticated users.
 */
function addUnauthenticatedDashboardElements(): void {
    const dashboardContainer = document.querySelector('.dashboard-container, [data-dashboard]');
    if (!dashboardContainer) {
        console.warn('[DASHBOARD] No dashboard container found for unauthenticated elements');
        return;
    }

    // Check if unauthenticated elements already exist
    if (document.querySelector('[data-unauth-banner]')) {
        return;
    }

    // Create unauthenticated banner with login button
    const unauthBanner = document.createElement('div');
    unauthBanner.className = 'unauthenticated-dashboard-banner';
    unauthBanner.setAttribute('data-unauth-banner', '');
    unauthBanner.innerHTML = `
        <div class="unauth-banner-content">
            <div class="unauth-banner-text">
                <h3>Welcome to School Management System</h3>
                <p>Sign in to access all features, manage your school data, and get full functionality.</p>
            </div>
            <div class="unauth-banner-actions">
                <button class="auth-login-btn" data-auth-login>
                    <icon-sign-in size="16"></icon-sign-in>
                    Sign In
                </button>
                <button class="auth-signup-btn" data-auth-signup>Sign Up</button>
            </div>
        </div>
    `;

    // Insert unauthenticated banner at the beginning of dashboard
    dashboardContainer.insertBefore(unauthBanner, dashboardContainer.firstChild);

    // Set up event listeners for unauthenticated banner
    unauthBanner.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement;

        if (target.matches('[data-auth-login]')) {
            event.preventDefault();
            // Trigger login modal or redirect to login
            showLoginModal();
        }

        if (target.matches('[data-auth-signup]')) {
            event.preventDefault();
            window.location.href = '/register';
        }
    });

    console.log('[DASHBOARD] Unauthenticated dashboard elements added');
}

/**
 * Add guest-specific elements to the dashboard.
 */
function addGuestDashboardElements(): void {
    const dashboardContainer = document.querySelector('.dashboard-container, [data-dashboard]');
    if (!dashboardContainer) {
        console.warn('[DASHBOARD] No dashboard container found for guest elements');
        return;
    }

    // Check if guest elements already exist
    if (document.querySelector('[data-guest-banner]')) {
        return;
    }

    // Create guest banner
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

    // Insert guest banner at the beginning of dashboard
    dashboardContainer.insertBefore(guestBanner, dashboardContainer.firstChild);

    // Set up event listeners for guest banner
    guestBanner.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement;

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

/**
 * Show modal explaining guest vs full account features.
 */
function showGuestFeatureModal(): void {
    // Create modal if it doesn't exist
    let modal = document.querySelector('[data-guest-features-modal]') as HTMLElement;
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

        // Set up modal event listeners
        modal.addEventListener('click', (event: Event) => {
            const target = event.target as HTMLElement;

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

/**
 * Handle guest user signup flow.
 */
export function handleGuestSignup(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const isGuestSignup = urlParams.get('guest') === 'true';

    if (isGuestSignup) {
        console.log('[DASHBOARD] Guest signup flow detected');

        // Show special messaging for guest users
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