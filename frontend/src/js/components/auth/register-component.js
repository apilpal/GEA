import { BaseComponent } from '@/ts/components/core/index';
export class RegisterComponent extends BaseComponent {
    constructor() {
        super();
        this.usernameInput = null;
        this.emailInput = null;
        this.passwordInput = null;
        this.confirmPasswordInput = null;
        this.submitBtn = null;
        this.errorDiv = null;
        this.loading = false;
        this.bindMethods();
    }
    bindMethods() {
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.clearError = this.clearError.bind(this);
        this.validatePasswordMatch = this.validatePasswordMatch.bind(this);
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

                .register-form {
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
                input[type="email"],
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

            <form class="register-form">
                <h2>Create New Account</h2>

                <div class="form-group">
                    <label for="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        required
                        autocomplete="username"
                        placeholder="Enter a username"
                    >
                </div>

                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        autocomplete="email"
                        placeholder="Enter your email address"
                    >
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        required
                        autocomplete="new-password"
                        placeholder="Enter a password"
                    >
                </div>

                <div class="form-group">
                    <label for="confirm-password">Confirm Password</label>
                    <input
                        type="password"
                        id="confirm-password"
                        name="confirm-password"
                        required
                        autocomplete="new-password"
                        placeholder="Confirm your password"
                    >
                </div>

                <div class="error-message" id="error-message">
                    <!-- Error messages will be displayed here -->
                </div>

                <button type="submit" class="submit-btn" id="submit-btn">
                    <div class="spinner"></div>
                    <span>Create Account</span>
                </button>

                <div class="form-footer">
                    <p>Secure account creation with validation</p>
                </div>
            </form>
        `;
        this.setupElementReferences();
    }
    setupElementReferences() {
        this.usernameInput = this.$('#username');
        this.emailInput = this.$('#email');
        this.passwordInput = this.$('#password');
        this.confirmPasswordInput = this.$('#confirm-password');
        this.submitBtn = this.$('#submit-btn');
        this.errorDiv = this.$('#error-message');
    }
    setupEventListeners() {
        const form = this.$('.register-form');
        if (form) {
            form.addEventListener('submit', this.handleSubmit);
        }
        if (this.usernameInput) {
            this.usernameInput.addEventListener('input', this.handleInputChange);
        }
        if (this.emailInput) {
            this.emailInput.addEventListener('input', this.handleInputChange);
        }
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', this.handleInputChange);
        }
        if (this.confirmPasswordInput) {
            this.confirmPasswordInput.addEventListener('input', this.validatePasswordMatch);
        }
    }
    handleInputChange() {
        this.clearError();
    }
    validatePasswordMatch() {
        if (this.passwordInput && this.confirmPasswordInput) {
            const password = this.passwordInput.value;
            const confirmPassword = this.confirmPasswordInput.value;
            if (confirmPassword && password !== confirmPassword) {
                this.showError('Passwords do not match');
            }
            else {
                this.clearError();
            }
        }
    }
    async handleSubmit(e) {
        e.preventDefault();
        if (this.loading)
            return;
        const credentials = {
            username: this.usernameInput?.value?.trim() || '',
            email: this.emailInput?.value?.trim() || '',
            password: this.passwordInput?.value || ''
        };
        const confirmPassword = this.confirmPasswordInput?.value || '';
        if (!credentials.username || !credentials.email || !credentials.password) {
            this.showError('Please fill in all required fields');
            return;
        }
        if (credentials.password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        if (credentials.password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(credentials.email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        await this.attemptRegistration(credentials);
    }
    async attemptRegistration(credentials) {
        this.setLoading(true);
        this.clearError();
        try {
            const { authService } = await import('../../services/auth-service');
            const registrationData = {
                ...credentials,
                role: 'student'
            };
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(registrationData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }
            const userData = await response.json();
            this.dispatchEvent(new CustomEvent('register-success', {
                bubbles: true,
                composed: true,
                detail: { user: userData }
            }));
        }
        catch (error) {
            this.handleError(error, 'registration attempt');
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
                span.textContent = loading ? 'Creating Account...' : 'Create Account';
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
        if (this.emailInput)
            this.emailInput.value = '';
        if (this.passwordInput)
            this.passwordInput.value = '';
        if (this.confirmPasswordInput)
            this.confirmPasswordInput.value = '';
        this.clearError();
        this.setLoading(false);
    }
    focusUsername() {
        if (this.usernameInput) {
            this.usernameInput.focus();
        }
    }
}
customElements.define('register-component', RegisterComponent);
//# sourceMappingURL=register-component.js.map