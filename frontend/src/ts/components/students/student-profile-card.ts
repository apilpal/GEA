// Custom Element: Student Profile Card
import { BaseComponent } from '@/ts/components/core/index';
import type { Student, ContactInfo, LocationDetails } from './types';

/**
 * Custom web component that displays detailed student profile information in a card format.
 * Shows student avatar, basic info, contact details, and location information in an organized layout.
 */
class StudentProfileCard extends BaseComponent {
    /** Current student data being displayed in the profile card */
    private student: Student | null = null;

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
    }

    /**
     * Renders the student profile card with avatar, basic information, contact details, and location info.
     * Validates student data and handles missing information gracefully.
     */
    protected render(): void {
        const shadow = this.shadowRoot!;
        if (!this.student) {
            shadow.innerHTML = '<p>No student data available</p>';
            return;
        }

        // Validate that student has a name before proceeding
        if (!this.student.name || typeof this.student.name !== 'string') {
            shadow.innerHTML = '<p>Invalid student data: missing or invalid name</p>';
            return;
        }

        const contactInfo: ContactInfo = this.student.contact_info || {} as ContactInfo;
        const locationDetails: LocationDetails = this.student.location_details || {} as LocationDetails;

        shadow.innerHTML = `
            <article class="profile-card" role="region" aria-labelledby="student-name" aria-live="polite">
                <header class="profile-header">
                    <span class="student-avatar" role="img" aria-label="Avatar for ${this.student.name}">${this.student.name.charAt(0).toUpperCase()}</span>
                    <div class="student-name-section">
                        <h1 id="student-name">${this.student.name}</h1>
                        <p class="student-route" aria-label="Transport route">Route: ${this.student.route || 'N/A'}</p>
                    </div>
                </header>
                <div class="profile-details-grid">
                    <section class="detail-card basic-info" aria-labelledby="basic-info-heading">
                        <h2 id="basic-info-heading">Basic Information</h2>
                        <dl>
                            <div>
                                <dt>Father's Name:</dt>
                                <dd>${this.student.father_name || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt>Class:</dt>
                                <dd>${this.student.class || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt>Fees:</dt>
                                <dd>${this.student.fees ? `₹${this.student.fees}` : 'N/A'}</dd>
                            </div>
                        </dl>
                    </section>
                    <section class="detail-card contact-info" aria-labelledby="contact-info-heading">
                        <h2 id="contact-info-heading">Contact Details</h2>
                        <dl>
                            <div>
                                <dt>Primary Mobile:</dt>
                                <dd>
                                    ${contactInfo.primary_mobile || this.student.mobile ? `
                                        <a href="tel:${contactInfo.primary_mobile || this.student.mobile}"
                                           aria-label="Call primary mobile number: ${contactInfo.primary_mobile || this.student.mobile}">
                                            ${contactInfo.primary_mobile || this.student.mobile}
                                        </a>
                                    ` : 'N/A'}
                                </dd>
                            </div>
                            ${contactInfo.secondary_mobile ? `
                                <div>
                                    <dt>Secondary Mobile:</dt>
                                    <dd>
                                        <a href="tel:${contactInfo.secondary_mobile}"
                                           aria-label="Call secondary mobile number: ${contactInfo.secondary_mobile}">
                                            ${contactInfo.secondary_mobile}
                                        </a>
                                    </dd>
                                </div>
                            ` : ''}
                            <div>
                                <dt>Father Contact:</dt>
                                <dd>
                                    ${contactInfo.father_contact ? `
                                        <a href="tel:${contactInfo.father_contact}"
                                           aria-label="Call father's contact number: ${contactInfo.father_contact}">
                                            ${contactInfo.father_contact}
                                        </a>
                                    ` : 'N/A'}
                                </dd>
                            </div>
                        </dl>
                    </section>
                    <section class="detail-card location-info" aria-labelledby="location-info-heading">
                        <h2 id="location-info-heading">Location Details</h2>
                        <dl>
                            <div>
                                <dt>Route Number:</dt>
                                <dd>${locationDetails.route_number || this.student.route || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt>Area:</dt>
                                <dd>${locationDetails.area || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt>Full Address:</dt>
                                <dd>${locationDetails.full_address || this.student.address || 'N/A'}</dd>
                            </div>
                        </dl>
                    </section>
                </div>
            </article>
        `;
    }

    /**
     * Sets up event listeners for the profile card component.
     * Includes keyboard navigation, touch interactions, and accessibility enhancements.
     */
    protected setupEventListeners(): void {
        const shadow = this.shadowRoot!;
        const profileCard = shadow.querySelector('.profile-card') as HTMLElement;

        if (!profileCard) return;

        // Keyboard navigation support
        profileCard.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Touch interactions for mobile
        profileCard.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        profileCard.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

        // Make the card focusable for keyboard navigation
        profileCard.setAttribute('tabindex', '0');

        // Focus management for dynamic content updates
        profileCard.addEventListener('focusin', this.handleFocusIn.bind(this));
        profileCard.addEventListener('focusout', this.handleFocusOut.bind(this));
    }

    /**
     * Handles keyboard navigation within the profile card.
     * @param event - The keyboard event
     */
    private handleKeyDown(event: KeyboardEvent): void {
        const target = event.target as HTMLElement;
        const sections = this.shadowRoot!.querySelectorAll('section.detail-card');

        if (!sections.length) return;

        const currentIndex = Array.from(sections).indexOf(target.closest('section.detail-card') as HTMLElement);

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                const nextIndex = (currentIndex + 1) % sections.length;
                (sections[nextIndex] as HTMLElement).focus();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                const prevIndex = currentIndex - 1 < 0 ? sections.length - 1 : currentIndex - 1;
                (sections[prevIndex] as HTMLElement).focus();
                break;
            case 'Home':
                event.preventDefault();
                (sections[0] as HTMLElement).focus();
                break;
            case 'End':
                event.preventDefault();
                (sections[sections.length - 1] as HTMLElement).focus();
                break;
        }
    }

    /**
     * Handles focus entering the profile card.
     * Announce content changes to screen readers.
     */
    private handleFocusIn(): void {
        // Announce dynamic content updates if student data changed
        if (this.student) {
            this.announceToScreenReader(`Student profile for ${this.student.name} loaded`);
        }
    }

    /**
     * Handles focus leaving the profile card.
     */
    private handleFocusOut(): void {
        // Reset any focus-related states if needed
    }

    /**
     * Handles touch start events for mobile interactions.
     * Provides haptic feedback and prevents default scrolling on touch.
     * @param event - The touch event
     */
    private handleTouchStart(event: TouchEvent): void {
        // Prevent default behavior that might interfere with touch interactions
        if (event.touches.length > 1) {
            return; // Ignore multi-touch
        }

        const target = event.target as HTMLElement;
        if (target.closest('a')) {
            // Allow normal link behavior
            return;
        }

        // Add visual feedback for touch
        const card = event.currentTarget as HTMLElement;
        card.style.transform = 'scale(0.98)';
        card.style.transition = 'transform 0.1s ease-out';
    }

    /**
     * Handles touch end events for mobile interactions.
     * Resets visual feedback after touch.
     * @param event - The touch event
     */
    private handleTouchEnd(event: TouchEvent): void {
        const card = event.currentTarget as HTMLElement;

        // Reset transform with a slight delay for better UX
        setTimeout(() => {
            card.style.transform = '';
            card.style.transition = '';
        }, 150);
    }

    /**
     * Announces content to screen readers using ARIA live regions.
     * @param message - The message to announce
     */
    private announceToScreenReader(message: string): void {
        const liveRegion = this.shadowRoot!.querySelector('[aria-live]');
        if (liveRegion) {
            liveRegion.setAttribute('aria-live', 'assertive');
            liveRegion.textContent = message;
            // Reset after announcement
            setTimeout(() => {
                liveRegion.setAttribute('aria-live', 'polite');
            }, 1000);
        }
    }

    /**
     * Sets the student data to display in the profile card.
     * Only re-renders if the student data has actually changed.
     * Announces changes to screen readers for dynamic content updates.
     * @param {Student} student - The student data object to display
     */
    setStudent(student: Student) {
        if (this.student === student || (this.student && student && JSON.stringify(this.student) === JSON.stringify(student))) {
            return; // No change, skip render
        }

        const wasEmpty = !this.student;
        this.student = student;

        // Announce student change to screen readers
        if (student) {
            const announcement = wasEmpty
                ? `Student profile loaded for ${student.name}`
                : `Student profile updated to ${student.name}`;
            this.announceToScreenReader(announcement);
        }

        this.markForRender();
    }

}

// Export for use in other modules
export { StudentProfileCard };
export type { Student, ContactInfo, LocationDetails };