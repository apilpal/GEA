import { BaseComponent } from '@/ts/components/core/index';
export class LogoutComponent extends BaseComponent {
    constructor() {
        super();
        this.logoutBtn = null;
        this.confirmDialog = null;
        this.errorDiv = null;
        this.loading = false;
        this.bindMethods();
    }
    bindMethods() {
        this.handleLogoutClick = this.handleLogoutClick.bind(this);
        this.handleConfirmLogout = this.handleConfirmLogout.bind(this);
        this.handleCancelLogout = this.handleCancelLogout.bind(this);
        this.handleDialogClose = this.handleDialogClose.bind(this);
    }
    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .logout-container {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
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
            </style>

            <div class="logout-container">
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
    }
    setupElementReferences() {
        this.logoutBtn = this.$('#logout-btn');
        this.confirmDialog = this.$('#confirm-dialog');
        this.errorDiv = this.$('#error-message');
    }
    setupEventListeners() {
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', this.handleLogoutClick);
        }
        if (this.confirmDialog) {
            this.confirmDialog.addEventListener('close', this.handleDialogClose);
        }
        const confirmBtn = this.$('#confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', this.handleConfirmLogout);
        }
        const cancelBtn = this.$('#cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancelLogout);
        }
    }
    handleLogoutClick() {
        if (this.loading)
            return;
        this.clearError();
        if (this.confirmDialog) {
            this.confirmDialog.showModal();
        }
    }
    async handleConfirmLogout() {
        if (this.confirmDialog) {
            this.confirmDialog.close();
        }
        await this.performLogout();
    }
    handleCancelLogout() {
        if (this.confirmDialog) {
            this.confirmDialog.close();
        }
    }
    handleDialogClose() {
    }
    async performLogout() {
        this.setLoading(true);
        this.clearError();
        try {
            const { authContext } = await import('./auth-context');
            await authContext.logout();
            this.dispatchEvent(new CustomEvent('logout-success', {
                bubbles: true,
                composed: true
            }));
        }
        catch (error) {
            this.handleError(error, 'logout attempt');
        }
        finally {
            this.setLoading(false);
        }
    }
    setLoading(loading) {
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
    showError(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.classList.add('show');
        }
    }
    clearError() {
        if (this.errorDiv) {
            this.errorDiv.textContent = '';
            this.errorDiv.classList.remove('show');
        }
    }
    handleError(error, context) {
        console.error(`Error during ${context}:`, error);
        this.showError('Failed to log out. Please try again.');
    }
}
customElements.define('logout-component', LogoutComponent);
//# sourceMappingURL=logout-component.js.map