// Register Component - main user registration form component
import { BaseComponent } from '@/ts/components/core/index';

/** Registration credentials required for user creation. */
interface RegisterCredentials {
    /** Username for the new account. */
    username: string;
    /** Email address for the new account. */
    email: string;
    /** Password for the new account. */
    password: string;
}

/** Response structure for successful registration. */
interface RegisterResponse {
    /** Unique identifier for the created user. */
    id: number;
    /** Username of the created user. */
    username: string;
    /** Email address of the created user. */
    email: string;
    /** Role assigned to the user. */
    role: string;
    /** Whether the user account is active. */
    is_active: boolean;
    /** Account creation timestamp. */
    created_at: string;
    /** Account last update timestamp. */
    updated_at: string;
}

/**
 * Custom web component that provides a user registration form with username, email,
 * password, and password confirmation fields. Handles form submission, validation,
 * loading states, and user creation via the auth service.
 */
export class RegisterComponent extends BaseComponent {
    private usernameInput: HTMLInputElement | null = null;
    private emailInput: HTMLInputElement | null = null;
    private passwordInput: HTMLInputElement | null = null;
    private confirmPasswordInput: HTMLInputElement | null = null;
    private submitBtn: HTMLButtonElement | null = null;
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
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.clearError = this.clearError.bind(this);
        this.validatePasswordMatch = this.validatePasswordMatch.bind(this);
    }

    /**
     * Render the registration form HTML and CSS into the shadow DOM.
     * Includes styled form fields, validation, error display, and loading states.
     */
    protected render(): void {
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

    /**
     * Set up references to form elements after rendering.
     */
    private setupElementReferences(): void {
        this.usernameInput = this.$('#username') as HTMLInputElement;
        this.emailInput = this.$('#email') as HTMLInputElement;
        this.passwordInput = this.$('#password') as HTMLInputElement;
        this.confirmPasswordInput = this.$('#confirm-password') as HTMLInputElement;
        this.submitBtn = this.$('#submit-btn') as HTMLButtonElement;
        this.errorDiv = this.$('#error-message') as HTMLElement;
    }

    /**
     * Set up event listeners for form submission and input changes.
     */
    protected setupEventListeners(): void {
        const form = this.$('.register-form') as HTMLFormElement;
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

    /**
     * Handle input changes by clearing any displayed errors.
     */
    private handleInputChange(): void {
        // Clear error when user starts typing
        this.clearError();
    }

    /**
     * Validate that password and confirm password fields match.
     */
    private validatePasswordMatch(): void {
        if (this.passwordInput && this.confirmPasswordInput) {
            const password = this.passwordInput.value;
            const confirmPassword = this.confirmPasswordInput.value;

            if (confirmPassword && password !== confirmPassword) {
                this.showError('Passwords do not match');
            } else {
                this.clearError();
            }
        }
    }

    /**
     * Handle form submission by validating inputs and attempting registration.
     * @param {Event} e - The form submit event.
     */
    private async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();

        if (this.loading) return;

        const credentials: RegisterCredentials = {
            username: this.usernameInput?.value?.trim() || '',
            email: this.emailInput?.value?.trim() || '',
            password: this.passwordInput?.value || ''
        };

        const confirmPassword = this.confirmPasswordInput?.value || '';

        // Basic validation
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

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(credentials.email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        await this.attemptRegistration(credentials);
    }

    /**
     * Attempt to register a new user with the provided credentials via the auth service.
     * @param {RegisterCredentials} credentials - User registration credentials.
     */
    private async attemptRegistration(credentials: RegisterCredentials): Promise<void> {
        this.setLoading(true);
        this.clearError();

        try {
            // Import auth service dynamically to avoid circular dependencies
            const { authService } = await import('../../services/auth-service');

            // For this implementation, we'll assume admin role for new registrations
            // In a real application, you might have role selection or default to a specific role
            const registrationData = {
                ...credentials,
                role: 'student'  // Default role, adjust as needed
            };

            // Note: This assumes the auth service has a register method
            // Since the backend requires admin auth, this component should be used by admins
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include auth headers if available
                },
                credentials: 'include',
                body: JSON.stringify(registrationData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }

            const userData = await response.json();

            // Success - emit registration success event
            this.dispatchEvent(new CustomEvent('register-success', {
                bubbles: true,
                composed: true,
                detail: { user: userData }
            }));

        } catch (error) {
            this.handleError(error as Error, 'registration attempt');
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
                span.textContent = loading ? 'Creating Account...' : 'Create Account';
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
        if (this.emailInput) this.emailInput.value = '';
        if (this.passwordInput) this.passwordInput.value = '';
        if (this.confirmPasswordInput) this.confirmPasswordInput.value = '';
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

// Auto-register the component
customElements.define('register-component', RegisterComponent);