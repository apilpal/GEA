// Profile Component - displays and allows editing of user profile information
import { BaseComponent } from '@/ts/components/core/index';

/** User profile interface matching backend User model. */
interface UserProfile {
    /** Unique identifier for the user. */
    id: number;
    /** Username for login. */
    username: string;
    /** Email address of the user. */
    email: string;
    /** Role assigned to the user (e.g., 'admin', 'teacher', 'student'). */
    role: string;
    /** Whether the user account is active. */
    is_active: boolean;
    /** Timestamp when the user was created. */
    created_at?: string;
    /** Timestamp when the user was last updated. */
    updated_at?: string;
}

/** Request payload for updating user profile. */
interface UpdateProfileRequest {
    /** New username (optional). */
    username?: string;
    /** New email address (optional). */
    email?: string;
}

/**
 * Custom web component that displays current user profile information
 * and provides a form for updating profile details. Integrates with
 * /auth/me endpoints for fetching and updating user data.
 */
export class ProfileComponent extends BaseComponent {
    private profileData: UserProfile | null = null;
    private usernameInput: HTMLInputElement | null = null;
    private emailInput: HTMLInputElement | null = null;
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
        this.loadProfile = this.loadProfile.bind(this);
    }

    /**
     * Render the profile display and edit form HTML and CSS into the shadow DOM.
     * Includes styled profile display, form fields, error display, and loading states.
     */
    protected render(): void {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    max-width: 500px;
                    margin: 2rem auto;
                    padding: 2rem;
                    background: var(--surface-color, #ffffff);
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .profile-container {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .profile-info {
                    border-bottom: 1px solid var(--border-color, #e1e5e9);
                    padding-bottom: 1.5rem;
                }

                .profile-info h3 {
                    margin: 0 0 1rem 0;
                    color: var(--text-color, #333333);
                    font-size: 1.25rem;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: auto 1fr;
                    gap: 0.75rem 1rem;
                    align-items: center;
                }

                .info-label {
                    font-weight: 500;
                    color: var(--text-secondary, #6c757d);
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .info-value {
                    color: var(--text-color, #333333);
                    font-size: 1rem;
                }

                .read-only {
                    background: var(--surface-secondary, #f8f9fa);
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 0.875rem;
                }

                .edit-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .edit-form h3 {
                    margin: 0 0 1rem 0;
                    color: var(--text-color, #333333);
                    font-size: 1.25rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                label {
                    font-weight: 500;
                    color: var(--text-color, #333333);
                    font-size: 0.875rem;
                }

                input[type="text"],
                input[type="email"] {
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
                    margin-top: 0.5rem;
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

                .loading-state {
                    text-align: center;
                    padding: 2rem;
                    color: var(--text-secondary, #6c757d);
                }

                .no-profile {
                    text-align: center;
                    padding: 2rem;
                    color: var(--text-secondary, #6c757d);
                }
            </style>

            <div class="profile-container">
                <div class="profile-info">
                    <h3>Your Profile</h3>
                    <div class="info-grid" id="profile-display">
                        <!-- Profile information will be displayed here -->
                    </div>
                </div>

                <form class="edit-form" id="edit-form">
                    <h3>Edit Profile</h3>

                    <div class="form-group">
                        <label for="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            required
                            autocomplete="username"
                            placeholder="Enter username"
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
                            placeholder="Enter email address"
                        >
                    </div>

                    <div class="error-message" id="error-message">
                        <!-- Error messages will be displayed here -->
                    </div>

                    <button type="submit" class="submit-btn" id="submit-btn">
                        <div class="spinner"></div>
                        <span>Update Profile</span>
                    </button>
                </form>
            </div>
        `;

        this.setupElementReferences();
        this.loadProfile();
    }

    /**
     * Set up references to form elements after rendering.
     */
    private setupElementReferences(): void {
        this.usernameInput = this.$('#username') as HTMLInputElement;
        this.emailInput = this.$('#email') as HTMLInputElement;
        this.submitBtn = this.$('#submit-btn') as HTMLButtonElement;
        this.errorDiv = this.$('#error-message') as HTMLElement;
    }

    /**
     * Set up event listeners for form submission and input changes.
     */
    protected setupEventListeners(): void {
        const form = this.$('#edit-form') as HTMLFormElement;
        if (form) {
            form.addEventListener('submit', this.handleSubmit);
        }

        if (this.usernameInput) {
            this.usernameInput.addEventListener('input', this.handleInputChange);
        }

        if (this.emailInput) {
            this.emailInput.addEventListener('input', this.handleInputChange);
        }
    }

    /**
     * Load user profile data from the backend.
     */
    private async loadProfile(): Promise<void> {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load profile: ${response.status}`);
            }

            const profile: UserProfile = await response.json();
            this.profileData = profile;
            this.displayProfile(profile);
            this.populateForm(profile);
        } catch (error) {
            this.handleError(error as Error, 'loading profile');
            this.showNoProfile();
        }
    }

    /**
     * Display profile information in the profile info section.
     * @param profile - The user profile data to display.
     */
    private displayProfile(profile: UserProfile): void {
        const displayDiv = this.$('#profile-display') as HTMLElement;
        if (!displayDiv) return;

        const formatDate = (dateStr?: string): string => {
            if (!dateStr) return 'N/A';
    /**
     * Display profile information in the profile info section.
     * @param profile - The user profile data to display.
     */
    private displayProfile(profile: UserProfile): void {
        const displayDiv = this.$('#profile-display') as HTMLElement;
        if (!displayDiv) return;

        const formatDate = (dateStr?: string): string => {
            if (!dateStr) return 'N/A';
            return new Date(dateStr).toLocaleDateString();
        };

        // Check if this is a bypass user
        const isBypassUser = (profile as any).is_bypass_user;
        const bypassIndicator = isBypassUser ? 
            '<span class="bypass-indicator" title="Development/Testing Mode">⚠️ BYPASS USER</span>' : '';

        displayDiv.innerHTML = `
            <span class="info-label">Username:</span>
            <span class="info-value">
                ${profile.username}
                ${bypassIndicator}
            </span>

            <span class="info-label">Email:</span>
            <span class="info-value">${profile.email}</span>

            <span class="info-label">Role:</span>
            <span class="info-value read-only">${profile.role.toUpperCase()}</span>

            <span class="info-label">Status:</span>
            <span class="info-value read-only">${profile.is_active ? 'Active' : 'Inactive'}</span>

            <span class="info-label">Member Since:</span>
            <span class="info-value">${formatDate(profile.created_at)}</span>

            <span class="info-label">Last Updated:</span>
            <span class="info-value">${formatDate(profile.updated_at)}</span>
        `;

        // Add CSS for bypass indicator
        if (isBypassUser) {
            this.addBypassIndicatorStyles();
        }
    }

    /**
     * Add CSS styles for the bypass indicator.
     */
    private addBypassIndicatorStyles(): void {
        const existingStyle = this.shadow.querySelector('#bypass-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'bypass-styles';
        style.textContent = `
            .bypass-indicator {
                background: var(--warning-color, #ffc107);
                color: var(--warning-text-color, #000);
                padding: 0.125rem 0.5rem;
                border-radius: 12px;
                font-size: 0.625rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-left: 0.5rem;
                border: 1px solid var(--warning-border, #ffb300);
                display: inline-block;
                vertical-align: middle;
            }

            .bypass-indicator:hover {
                background: var(--warning-hover, #ffb300);
                border-color: var(--warning-hover-border, #ff9800);
            }
        `;
        this.shadow.appendChild(style);
    }
            return new Date(dateStr).toLocaleDateString();
        };

        displayDiv.innerHTML = `
            <span class="info-label">Username:</span>
            <span class="info-value">${profile.username}</span>

            <span class="info-label">Email:</span>
            <span class="info-value">${profile.email}</span>

            <span class="info-label">Role:</span>
            <span class="info-value read-only">${profile.role.toUpperCase()}</span>

            <span class="info-label">Status:</span>
            <span class="info-value read-only">${profile.is_active ? 'Active' : 'Inactive'}</span>

            <span class="info-label">Member Since:</span>
            <span class="info-value">${formatDate(profile.created_at)}</span>

            <span class="info-label">Last Updated:</span>
            <span class="info-value">${formatDate(profile.updated_at)}</span>
        `;
    }

    /**
     * Populate the edit form with current profile data.
     * @param profile - The user profile data to populate the form with.
     */
    private populateForm(profile: UserProfile): void {
        if (this.usernameInput) {
            this.usernameInput.value = profile.username;
        }
        if (this.emailInput) {
            this.emailInput.value = profile.email;
        }
    }

    /**
     * Handle input changes by clearing any displayed errors.
     */
    private handleInputChange(): void {
        this.clearError();
    }

    /**
     * Handle form submission by validating inputs and attempting profile update.
     * @param e - The form submit event.
     */
    private async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();

        if (this.loading || !this.profileData) return;

        const formData: UpdateProfileRequest = {
            username: this.usernameInput?.value?.trim(),
            email: this.emailInput?.value?.trim()
        };

        // Only include fields that have changed
        const changes: UpdateProfileRequest = {};
        if (formData.username !== this.profileData.username) {
            changes.username = formData.username;
        }
        if (formData.email !== this.profileData.email) {
            changes.email = formData.email;
        }

        // Check if any changes were made
        if (Object.keys(changes).length === 0) {
            this.showError('No changes detected');
            return;
        }

        // Basic validation
        if (changes.username && !changes.username) {
            this.showError('Username cannot be empty');
            return;
        }

        if (changes.email && !changes.email) {
            this.showError('Email cannot be empty');
            return;
        }

        // Email validation
        if (changes.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(changes.email)) {
                this.showError('Please enter a valid email address');
                return;
            }
        }

        await this.updateProfile(changes);
    }

    /**
     * Update user profile with the provided changes.
     * @param changes - The profile changes to apply.
     */
    private async updateProfile(changes: UpdateProfileRequest): Promise<void> {
        this.setLoading(true);
        this.clearError();

        try {
            const response = await fetch('/api/auth/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(changes)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update profile');
            }

            const updatedProfile: UserProfile = await response.json();
            this.profileData = updatedProfile;
            this.displayProfile(updatedProfile);
            this.populateForm(updatedProfile);

            this.showSuccessToast('Profile updated successfully');

            // Dispatch custom event for other components to react to profile updates
            this.dispatchEvent(new CustomEvent('profile-updated', {
                bubbles: true,
                composed: true,
                detail: { profile: updatedProfile }
            }));

        } catch (error) {
            this.handleError(error as Error, 'updating profile');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Set the loading state of the form, updating UI elements accordingly.
     * @param loading - Whether the form is in a loading state.
     */
    private setLoading(loading: boolean): void {
        this.loading = loading;

        if (this.submitBtn) {
            this.submitBtn.disabled = loading;
            this.submitBtn.classList.toggle('loading', loading);
            const span = this.submitBtn.querySelector('span');
            if (span) {
                span.textContent = loading ? 'Updating...' : 'Update Profile';
            }
        }
    }

    /**
     * Display an error message in the form's error area.
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
     * Show a message when no profile data is available.
     */
    private showNoProfile(): void {
        const container = this.$('.profile-container') as HTMLElement;
        if (container) {
            container.innerHTML = `
                <div class="no-profile">
                    <p>Unable to load profile information.</p>
                    <p>Please try logging in again.</p>
                </div>
            `;
        }
    }

    /**
     * Public method to refresh profile data.
     */
    public refreshProfile(): void {
        this.loadProfile();
    }
}

// Auto-register the component
customElements.define('profile-component', ProfileComponent);