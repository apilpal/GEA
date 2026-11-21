// User Session Component - displays current user info and logout button in header/navigation
import { BaseComponent } from '@/ts/components/core/index';
import { AuthState, AuthUser } from './auth-context';

/**
 * Custom web component that displays the currently logged-in user's information
 * and provides a logout button with confirmation dialog. Subscribes to auth context
 * for state changes and updates display accordingly.
 */
export class UserSessionComponent extends BaseComponent {
    private authUnsubscribe: (() => void) | null = null;
    private currentAuthState: AuthState | null = null;
    private logoutBtn: HTMLButtonElement | null = null;
    private confirmDialog: HTMLDialogElement | null = null;
    private errorDiv: HTMLElement | null = null;
    private loading: boolean = false;

    constructor() {
        super();
        this.bindMethods();
    }

    /**
     * Bind methods to maintain proper 'this' context.
     */
    private bindMethods(): void {
        this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
        this.handleLogoutClick = this.handleLogoutClick.bind(this);
        this.handleConfirmLogout = this.handleConfirmLogout.bind(this);
        this.handleCancelLogout = this.handleCancelLogout.bind(this);
        this.handleDialogClose = this.handleDialogClose.bind(this);
    }

    /**
     * Render the user session display and logout button HTML and CSS into the shadow DOM.
     * Includes user info display, logout button, and confirmation dialog.
     */
    protected render(): void {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .session-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.5rem 1rem;
                    background: var(--surface-color, #ffffff);
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .user-info {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                }

                .user-name {
                    font-weight: 500;
                    color: var(--text-color, #333333);
                    font-size: 0.875rem;
                }

                .user-role {
                    font-size: 0.75rem;
                    color: var(--text-secondary, #6c757d);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .logout-btn {
                    padding: 0.5rem 1rem;
                    background: var(--error-color, #dc3545);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .logout-btn:hover:not(:disabled) {
                    background: var(--error-hover, #c82333);
                }

                .logout-btn:disabled {
                    background: var(--disabled-color, #6c757d);
                    cursor: not-allowed;
                }

                .logout-btn.loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    display: none;
                }

                .logout-btn.loading .spinner {
                    display: block;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .logout-icon {
                    width: 16px;
                    height: 16px;
                    fill: currentColor;
                }

                /* Dialog/Modal Styles */
                dialog {
                    border: none;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                }

                dialog::backdrop {
                    background: rgba(0, 0, 0, 0.5);
                }

                .dialog-content {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .dialog-header {
                    text-align: center;
                }

                .dialog-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-color, #333333);
                    margin: 0;
                }

                .dialog-message {
                    color: var(--text-secondary, #6c757d);
                    margin: 0;
                    text-align: center;
                }

                .dialog-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }

                .btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 4px;
                    font-size: 1rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-width: 100px;
                }

                .btn-confirm {
                    background: var(--error-color, #dc3545);
                    color: white;
                }

                .btn-confirm:hover {
                    background: var(--error-hover, #c82333);
                }

                .btn-cancel {
                    background: var(--secondary-color, #6c757d);
                    color: white;
                }

                .btn-cancel:hover {
                    background: var(--secondary-hover, #5a6268);
                }

                .error-message {
                    color: var(--error-color, #dc3545);
                    font-size: 0.875rem;
                    text-align: center;
                    margin: 0;
                    padding: 0.5rem;
                    background: var(--error-bg, #f8d7da);
                    border: 1px solid var(--error-border, #f5c6cb);
                    border-radius: 4px;
                    display: none;
                }

                .error-message.show {
                    display: block;
                }

                /* Hidden state when not authenticated */
                :host(.hidden) {
                    display: none;
                }
            </style>

            <div class="session-container">
                <div class="user-info">
                    <span class="user-name" id="user-name">Loading...</span>
                    <span class="user-role" id="user-role"></span>
                </div>

                <button type="button" class="logout-btn" id="logout-btn">
                    <div class="spinner"></div>
                    <svg class="logout-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"/>
                        <path d="M16 17L21 12L16 7"/>
                        <path d="M21 12H9"/>
                    </svg>
                    <span>Logout</span>
                </button>
            </div>

            <dialog id="confirm-dialog">
                <div class="dialog-content">
                    <div class="dialog-header">
                        <h2 class="dialog-title">Confirm Logout</h2>
                        <p class="dialog-message">Are you sure you want to log out?</p>
                    </div>

                    <div class="error-message" id="error-message">
                        <!-- Error messages will be displayed here -->
                    </div>

                    <div class="dialog-actions">
                        <button type="button" class="btn btn-cancel" id="cancel-btn">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-confirm" id="confirm-btn">
                            Logout
                        </button>
                    </div>
                </div>
            </dialog>
        `;

        this.setupElementReferences();
        this.subscribeToAuth();
    }

    /**
     * Set up references to elements after rendering.
     */
    private setupElementReferences(): void {
        this.logoutBtn = this.$('#logout-btn') as HTMLButtonElement;
        this.confirmDialog = this.$('#confirm-dialog') as HTMLDialogElement;
        this.errorDiv = this.$('#error-message') as HTMLElement;
    }

    /**
     * Set up event listeners for logout button and dialog interactions.
     */
    protected setupEventListeners(): void {
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', this.handleLogoutClick);
        }

        if (this.confirmDialog) {
            this.confirmDialog.addEventListener('close', this.handleDialogClose);
        }

        const confirmBtn = this.$('#confirm-btn') as HTMLButtonElement;
        if (confirmBtn) {
            confirmBtn.addEventListener('click', this.handleConfirmLogout);
        }

        const cancelBtn = this.$('#cancel-btn') as HTMLButtonElement;
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancelLogout);
        }
    }

    /**
     * Subscribe to authentication state changes.
     */
    private subscribeToAuth(): void {
        // Import auth context dynamically to avoid circular dependencies
        import('./auth-context').then(({ authContext }) => {
            this.authUnsubscribe = authContext.subscribe(this.handleAuthStateChange);
        });
    }

    /**
     * Handle authentication state changes by updating the display.
     * @param state - The new authentication state.
     */
    private handleAuthStateChange(state: AuthState): void {
        this.currentAuthState = state;

        if (state.isAuthenticated && state.user) {
            this.updateUserDisplay(state.user);
            this.classList.remove('hidden');
        } else {
            this.classList.add('hidden');
        }
    }

    /**
     * Update the user information display.
     * @param user - The authenticated user data.
    /**
     * Update the user information display.
     * @param user - The authenticated user data.
     */
    private updateUserDisplay(user: AuthUser): void {
        const nameEl = this.$('#user-name') as HTMLElement;
        const roleEl = this.$('#user-role') as HTMLElement;

        if (nameEl) {
            // Check if this is a bypass user
            const isBypassUser = (user as any).is_bypass_user;
            const bypassIndicator = isBypassUser ? ' ⚠️' : '';
            nameEl.textContent = `${user.username}${bypassIndicator}`;
        }

        if (roleEl) {
            roleEl.textContent = user.role.toUpperCase();
            
            // Add bypass warning styling if it's a bypass user
            const isBypassUser = (user as any).is_bypass_user;
            if (isBypassUser) {
                roleEl.style.background = 'var(--warning-color, #ffc107)';
                roleEl.style.color = 'var(--warning-text-color, #000)';
                roleEl.style.padding = '0.125rem 0.25rem';
                roleEl.style.borderRadius = '4px';
                roleEl.style.fontSize = '0.625rem';
                roleEl.title = 'Development/Testing Mode - Bypass User';
            }
        }
    }
     */
    private updateUserDisplay(user: AuthUser): void {
        const nameEl = this.$('#user-name') as HTMLElement;
        const roleEl = this.$('#user-role') as HTMLElement;

        if (nameEl) {
            nameEl.textContent = user.username;
        }

        if (roleEl) {
            roleEl.textContent = user.role.toUpperCase();
        }
    }

    /**
     * Handle logout button click by showing confirmation dialog.
     */
    private handleLogoutClick(): void {
        if (this.loading) return;
        this.clearError();
        if (this.confirmDialog) {
            this.confirmDialog.showModal();
        }
    }

    /**
     * Handle confirmed logout by calling the auth service.
     */
    private async handleConfirmLogout(): Promise<void> {
        if (this.confirmDialog) {
            this.confirmDialog.close();
        }
        await this.performLogout();
    }

    /**
     * Handle cancel logout by closing the dialog.
     */
    private handleCancelLogout(): void {
        if (this.confirmDialog) {
            this.confirmDialog.close();
        }
    }

    /**
     * Handle dialog close event (e.g., clicking outside or ESC).
     */
    private handleDialogClose(): void {
        // Dialog was closed, no action needed
    }

    /**
     * Perform the logout operation via the auth context.
     */
    private async performLogout(): Promise<void> {
        this.setLoading(true);
        this.clearError();

        try {
            // Import auth context dynamically to avoid circular dependencies
            const { authContext } = await import('./auth-context');

            await authContext.logout();

            // Success - emit logout success event
            this.dispatchEvent(new CustomEvent('logout-success', {
                bubbles: true,
                composed: true
            }));

        } catch (error) {
            this.handleError(error as Error, 'logout attempt');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Set the loading state of the logout button, updating UI elements accordingly.
     * @param loading - Whether the logout process is in progress.
     */
    private setLoading(loading: boolean): void {
        this.loading = loading;

        if (this.logoutBtn) {
            this.logoutBtn.disabled = loading;
            this.logoutBtn.classList.toggle('loading', loading);
            const span = this.logoutBtn.querySelector('span');
            if (span) {
                span.textContent = loading ? 'Logging Out...' : 'Logout';
            }
        }
    }

    /**
     * Display an error message in the dialog's error area.
     * @param message - The error message to display.
     */
    private showError(message: string): void {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.classList.add('show');
        }
    }

    /**
     * Clear any displayed error message.
     */
    private clearError(): void {
        if (this.errorDiv) {
            this.errorDiv.textContent = '';
            this.errorDiv.classList.remove('show');
        }
    }

    /**
     * Handle errors during logout process.
     * @param error - The error that occurred.
     * @param context - Context where the error occurred.
     */
    protected handleError(error: Error, context: string): void {
        console.error(`Error during ${context}:`, error);
        this.showError('Failed to log out. Please try again.');
    }

    /**
     * Clean up subscriptions when component is disconnected.
     */
    disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.authUnsubscribe) {
            this.authUnsubscribe();
            this.authUnsubscribe = null;
        }
    }
}

// Auto-register the component
customElements.define('user-session-component', UserSessionComponent);