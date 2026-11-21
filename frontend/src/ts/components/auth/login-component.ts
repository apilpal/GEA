// Login Component - main authentication form component
import { BaseComponent } from '@/ts/components/core/index';
import { authContext } from './auth-context';
import { config } from '@/ts/config';

/** Credentials required for user login. */
interface LoginCredentials {
    /** Username or email address for authentication. */
    username_or_email: string;
    /** User password. */
    password: string;
}

/**
 * Custom web component that provides a login form with username/email and password fields.
 * Handles form submission, validation, loading states, and authentication via auth service.
 */
export class LoginComponent extends BaseComponent {
    private usernameInput: HTMLInputElement | null = null;
    private passwordInput: HTMLInputElement | null = null;
    private submitBtn: HTMLButtonElement | null = null;
    private errorDiv: HTMLElement | null = null;
    private bypassBtn: HTMLButtonElement | null = null;
    private loading: boolean = false;

    constructor() {
        super();
        this.bindMethods();
    }

    /**
     * Bind methods to maintain proper 'this' context.
     */
    private bindMethods(): void {
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.clearError = this.clearError.bind(this);
        this.handleBypassLogin = this.handleBypassLogin.bind(this);
    }

    /**
     * Render the login form HTML and CSS into the shadow DOM.
     * Includes styled form fields, error display, and loading states.
     */
    protected performRender(): void {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    max-width: 400px;
                    margin: 2rem auto;
                    padding: 2rem;
                    background: var(--surface-color, #ffffff);
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                label {
                    font-weight: 500;
                    color: var(--text-color, #333333);
                }

                input[type="text"],
                input[type="password"] {
                    padding: 0.75rem;
                    border: 2px solid var(--border-color, #e1e5e9);
                    border-radius: 4px;
                    font-size: 1rem;
                    transition: border-color 0.2s;
                }

                input:focus {
                    outline: none;
                    border-color: var(--primary-color, #007bff);
                }

                .error-message {
                    color: var(--error-color, #dc3545);
                    font-size: 0.875rem;
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

                .submit-btn {
                    padding: 0.75rem 1.5rem;
                    background: var(--primary-color, #007bff);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    font-size: 1rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .submit-btn:hover:not(:disabled) {
                    background: var(--primary-hover, #0056b3);
                }

                .submit-btn:disabled {
                    background: var(--disabled-color, #6c757d);
                    cursor: not-allowed;
                }

                .submit-btn.loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    display: none;
                }

                .submit-btn.loading .spinner {
                    display: block;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .form-footer {
                    text-align: center;
                    margin-top: 1rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary, #6c757d);
                }

                .bypass-btn {
                    padding: 0.5rem 1rem;
                    background: var(--warning-color, #ffc107);
                    color: var(--warning-text-color, #000);
                    border: 2px solid var(--warning-border, #ffb300);
                    border-radius: 4px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-top: 0.5rem;
                }

                .bypass-btn:hover:not(:disabled) {
                    background: var(--warning-hover, #ffb300);
                    border-color: var(--warning-hover-border, #ff9800);
                }

                .bypass-btn:disabled {
                    background: var(--disabled-color, #6c757d);
                    color: var(--disabled-text-color, #fff);
                    border-color: var(--disabled-color, #6c757d);
                    cursor: not-allowed;
                }

                .bypass-warning {
                    background: var(--warning-bg, #fff3cd);
                    border: 1px solid var(--warning-border, #ffeaa7);
                    color: var(--warning-text-color, #856404);
                    padding: 0.75rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    margin-top: 0.5rem;
                    text-align: center;
                }
            </style>

            <form class="login-form">
                <h2>Login to Your Account</h2>

                <div class="form-group">
                    <label for="username">Username or Email</label>
                    <input
                        type="text"
                        id="username"
                        name="username_or_email"
                        required
                        autocomplete="username"
                        placeholder="Enter your username or email"
                    >
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        required
                        autocomplete="current-password"
                        placeholder="Enter your password"
                    >
                </div>

                <div class="error-message" id="error-message">
                    <!-- Error messages will be displayed here -->
                </div>

                <button type="submit" class="submit-btn" id="submit-btn">
                    <div class="spinner"></div>
                    <span>Sign In</span>
                </button>

                <div id="bypass-section" style="display: none;">
                    <button type="button" class="bypass-btn" id="bypass-btn">
                        ⚠️ Bypass Login (Dev Mode)
                    </button>
                    <div class="bypass-warning">
                        ⚠️ Development/Testing Mode - Use only in development environments
                    </div>
                </div>

                <div class="form-footer">
                    <p>Secure login with HttpOnly cookies</p>
                </div>
            </form>
        `;

        this.setupElementReferences();
    }

    /**
     * Set up references to form elements after rendering.
     */
    private setupElementReferences(): void {
        this.usernameInput = this.$('#username') as HTMLInputElement;
        this.passwordInput = this.$('#password') as HTMLInputElement;
        this.submitBtn = this.$('#submit-btn') as HTMLButtonElement;
        this.errorDiv = this.$('#error-message') as HTMLElement;
        this.bypassBtn = this.$('#bypass-btn') as HTMLButtonElement;
        
        // Show bypass section if enabled
        this.updateBypassSectionVisibility();
    }

    /**
     * Update the visibility of the bypass section based on configuration.
     */
    private updateBypassSectionVisibility(): void {
        const bypassSection = this.$('#bypass-section') as HTMLElement;
        if (bypassSection) {
            bypassSection.style.display = config.enableLoginBypass ? 'block' : 'none';
            
            if (config.enableLoginBypass) {
                console.log('Bypass login enabled, showing bypass button for user:', config.loginBypassUser);
            }
        }
    }

    /**
     * Set up event listeners for form submission and input changes.
     */
    protected setupEventListeners(): void {
        const form = this.$('.login-form') as HTMLFormElement;
        if (form) {
            form.addEventListener('submit', this.handleSubmit);
        }

        if (this.usernameInput) {
            this.usernameInput.addEventListener('input', this.handleInputChange);
        }

        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', this.handleInputChange);
        }

        if (this.bypassBtn) {
            this.bypassBtn.addEventListener('click', this.handleBypassLogin);
        }
    }

    /**
     * Handle input changes by clearing any displayed errors.
     */
    private handleInputChange(): void {
        // Clear error when user starts typing
        this.clearError();
    }

    /**
     * Handle form submission by validating inputs and attempting login.
     * @param {Event} e - The form submit event.
     */
    private async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();

        if (this.loading) return;

        const credentials: LoginCredentials = {
            username_or_email: this.usernameInput?.value?.trim() || '',
            password: this.passwordInput?.value || ''
        };

        if (!credentials.username_or_email || !credentials.password) {
            this.showError('Please enter both username/email and password');
            return;
        }

        await this.attemptLogin(credentials);
    }

    /**
     * Attempt to log in with the provided credentials via the auth context.
     * @param {LoginCredentials} credentials - User login credentials.
     */
    private async attemptLogin(credentials: LoginCredentials): Promise<void> {
        this.setLoading(true);
        this.clearError();

        try {
            await authContext.login(credentials);
            // Login successful - auth context handles state updates
        } catch (error) {
            this.showError((error as Error).message || 'Login failed');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle bypass login button click.
     */
    private async handleBypassLogin(): Promise<void> {
        if (this.loading) return;

        console.log('Bypass login clicked');
        this.setLoading(true);
        this.clearError();

        try {
            await authContext.loginWithBypass();
            // Bypass login successful - auth context handles state updates
        } catch (error) {
            this.showError((error as Error).message || 'Bypass login failed');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Set the loading state of the form, updating UI elements accordingly.
     * @param {boolean} loading - Whether the form is in a loading state.
     */
    private setLoading(loading: boolean): void {
        this.loading = loading;

        if (this.submitBtn) {
            this.submitBtn.disabled = loading;
            this.submitBtn.classList.toggle('loading', loading);
            const span = this.submitBtn.querySelector('span');
            if (span) {
                span.textContent = loading ? 'Signing In...' : 'Sign In';
            }
        }
    }

    /**
     * Display an error message in the form's error area.
     * @param {string} message - The error message to display.
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
     * Reset the form to its initial state, clearing inputs and errors.
     */
    public reset(): void {
        if (this.usernameInput) this.usernameInput.value = '';
        if (this.passwordInput) this.passwordInput.value = '';
        this.clearError();
        this.setLoading(false);
    }

    /**
     * Focus the username input field for accessibility.
     */
    public focusUsername(): void {
        if (this.usernameInput) {
            this.usernameInput.focus();
        }
    }
}

// Component is now registered via the unified registry system
// customElements.define('login-component', LoginComponent); // Removed - handled by registry.ts
