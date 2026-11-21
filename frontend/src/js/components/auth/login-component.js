import { BaseComponent } from '@/ts/components/core/index';
import { authContext } from './auth-context';
export class LoginComponent extends BaseComponent {
    constructor() {
        super();
        this.usernameInput = null;
        this.passwordInput = null;
        this.submitBtn = null;
        this.errorDiv = null;
        this.loading = false;
        this.bindMethods();
    }
    bindMethods() {
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.clearError = this.clearError.bind(this);
    }
    render() {
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

                <div class="form-footer">
                    <p>Secure login with HttpOnly cookies</p>
                </div>
            </form>
        `;
        this.setupElementReferences();
    }
    setupElementReferences() {
        this.usernameInput = this.$('#username');
        this.passwordInput = this.$('#password');
        this.submitBtn = this.$('#submit-btn');
        this.errorDiv = this.$('#error-message');
    }
    setupEventListeners() {
        const form = this.$('.login-form');
        if (form) {
            form.addEventListener('submit', this.handleSubmit);
        }
        if (this.usernameInput) {
            this.usernameInput.addEventListener('input', this.handleInputChange);
        }
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', this.handleInputChange);
        }
    }
    handleInputChange() {
        this.clearError();
    }
    async handleSubmit(e) {
        e.preventDefault();
        if (this.loading)
            return;
        const credentials = {
            username_or_email: this.usernameInput?.value?.trim() || '',
            password: this.passwordInput?.value || ''
        };
        if (!credentials.username_or_email || !credentials.password) {
            this.showError('Please enter both username/email and password');
            return;
        }
        await this.attemptLogin(credentials);
    }
    async attemptLogin(credentials) {
        this.setLoading(true);
        this.clearError();
        try {
            await authContext.login(credentials);
        }
        catch (error) {
            this.showError(error.message || 'Login failed');
        }
        finally {
            this.setLoading(false);
        }
    }
    setLoading(loading) {
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
    reset() {
        if (this.usernameInput)
            this.usernameInput.value = '';
        if (this.passwordInput)
            this.passwordInput.value = '';
        this.clearError();
        this.setLoading(false);
    }
    focusUsername() {
        if (this.usernameInput) {
            this.usernameInput.focus();
        }
    }
}
//# sourceMappingURL=login-component.js.map