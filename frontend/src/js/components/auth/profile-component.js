import { BaseComponent } from '@/ts/components/core/index';
export class ProfileComponent extends BaseComponent {
    constructor() {
        super();
        this.profileData = null;
        this.usernameInput = null;
        this.emailInput = null;
        this.submitBtn = null;
        this.errorDiv = null;
        this.loading = false;
        this.bindMethods();
    }
    bindMethods() {
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.clearError = this.clearError.bind(this);
        this.loadProfile = this.loadProfile.bind(this);
    }
    render() {
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
    setupElementReferences() {
        this.usernameInput = this.$('#username');
        this.emailInput = this.$('#email');
        this.submitBtn = this.$('#submit-btn');
        this.errorDiv = this.$('#error-message');
    }
    setupEventListeners() {
        const form = this.$('#edit-form');
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
    async loadProfile() {
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
            const profile = await response.json();
            this.profileData = profile;
            this.displayProfile(profile);
            this.populateForm(profile);
        }
        catch (error) {
            this.handleError(error, 'loading profile');
            this.showNoProfile();
        }
    }
    displayProfile(profile) {
        const displayDiv = this.$('#profile-display');
        if (!displayDiv)
            return;
        const formatDate = (dateStr) => {
            if (!dateStr)
                return 'N/A';
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
    populateForm(profile) {
        if (this.usernameInput) {
            this.usernameInput.value = profile.username;
        }
        if (this.emailInput) {
            this.emailInput.value = profile.email;
        }
    }
    handleInputChange() {
        this.clearError();
    }
    async handleSubmit(e) {
        e.preventDefault();
        if (this.loading || !this.profileData)
            return;
        const formData = {
            username: this.usernameInput?.value?.trim(),
            email: this.emailInput?.value?.trim()
        };
        const changes = {};
        if (formData.username !== this.profileData.username) {
            changes.username = formData.username;
        }
        if (formData.email !== this.profileData.email) {
            changes.email = formData.email;
        }
        if (Object.keys(changes).length === 0) {
            this.showError('No changes detected');
            return;
        }
        if (changes.username && !changes.username) {
            this.showError('Username cannot be empty');
            return;
        }
        if (changes.email && !changes.email) {
            this.showError('Email cannot be empty');
            return;
        }
        if (changes.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(changes.email)) {
                this.showError('Please enter a valid email address');
                return;
            }
        }
        await this.updateProfile(changes);
    }
    async updateProfile(changes) {
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
            const updatedProfile = await response.json();
            this.profileData = updatedProfile;
            this.displayProfile(updatedProfile);
            this.populateForm(updatedProfile);
            this.showSuccessToast('Profile updated successfully');
            this.dispatchEvent(new CustomEvent('profile-updated', {
                bubbles: true,
                composed: true,
                detail: { profile: updatedProfile }
            }));
        }
        catch (error) {
            this.handleError(error, 'updating profile');
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
                span.textContent = loading ? 'Updating...' : 'Update Profile';
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
    showNoProfile() {
        const container = this.$('.profile-container');
        if (container) {
            container.innerHTML = `
                <div class="no-profile">
                    <p>Unable to load profile information.</p>
                    <p>Please try logging in again.</p>
                </div>
            `;
        }
    }
    refreshProfile() {
        this.loadProfile();
    }
}
customElements.define('profile-component', ProfileComponent);
//# sourceMappingURL=profile-component.js.map