import { BaseComponent } from '@/ts/components/core/index';
class StudentProfileCard extends BaseComponent {
    constructor() {
        super();
        this.student = null;
    }
    connectedCallback() {
        super.connectedCallback();
    }
    render() {
        const shadow = this.shadowRoot;
        if (!this.student) {
            shadow.innerHTML = '<p>No student data available</p>';
            return;
        }
        if (!this.student.name || typeof this.student.name !== 'string') {
            shadow.innerHTML = '<p>Invalid student data: missing or invalid name</p>';
            return;
        }
        const contactInfo = this.student.contact_info || {};
        const locationDetails = this.student.location_details || {};
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
    setupEventListeners() {
        const shadow = this.shadowRoot;
        const profileCard = shadow.querySelector('.profile-card');
        if (!profileCard)
            return;
        profileCard.addEventListener('keydown', this.handleKeyDown.bind(this));
        profileCard.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        profileCard.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        profileCard.setAttribute('tabindex', '0');
        profileCard.addEventListener('focusin', this.handleFocusIn.bind(this));
        profileCard.addEventListener('focusout', this.handleFocusOut.bind(this));
    }
    handleKeyDown(event) {
        const target = event.target;
        const sections = this.shadowRoot.querySelectorAll('section.detail-card');
        if (!sections.length)
            return;
        const currentIndex = Array.from(sections).indexOf(target.closest('section.detail-card'));
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                const nextIndex = (currentIndex + 1) % sections.length;
                sections[nextIndex].focus();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                const prevIndex = currentIndex - 1 < 0 ? sections.length - 1 : currentIndex - 1;
                sections[prevIndex].focus();
                break;
            case 'Home':
                event.preventDefault();
                sections[0].focus();
                break;
            case 'End':
                event.preventDefault();
                sections[sections.length - 1].focus();
                break;
        }
    }
    handleFocusIn() {
        if (this.student) {
            this.announceToScreenReader(`Student profile for ${this.student.name} loaded`);
        }
    }
    handleFocusOut() {
    }
    handleTouchStart(event) {
        if (event.touches.length > 1) {
            return;
        }
        const target = event.target;
        if (target.closest('a')) {
            return;
        }
        const card = event.currentTarget;
        card.style.transform = 'scale(0.98)';
        card.style.transition = 'transform 0.1s ease-out';
    }
    handleTouchEnd(event) {
        const card = event.currentTarget;
        setTimeout(() => {
            card.style.transform = '';
            card.style.transition = '';
        }, 150);
    }
    announceToScreenReader(message) {
        const liveRegion = this.shadowRoot.querySelector('[aria-live]');
        if (liveRegion) {
            liveRegion.setAttribute('aria-live', 'assertive');
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.setAttribute('aria-live', 'polite');
            }, 1000);
        }
    }
    setStudent(student) {
        if (this.student === student || (this.student && student && JSON.stringify(this.student) === JSON.stringify(student))) {
            return;
        }
        const wasEmpty = !this.student;
        this.student = student;
        if (student) {
            const announcement = wasEmpty
                ? `Student profile loaded for ${student.name}`
                : `Student profile updated to ${student.name}`;
            this.announceToScreenReader(announcement);
        }
        this.markForRender();
    }
}
export { StudentProfileCard };
//# sourceMappingURL=student-profile-card.js.map