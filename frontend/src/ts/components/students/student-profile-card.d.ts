import { BaseComponent } from '@/ts/components/core/index';
import type { Student, ContactInfo, LocationDetails } from './types';
declare class StudentProfileCard extends BaseComponent {
    private student;
    constructor();
    connectedCallback(): void;
    protected render(): void;
    protected setupEventListeners(): void;
    private handleKeyDown;
    private handleFocusIn;
    private handleFocusOut;
    private handleTouchStart;
    private handleTouchEnd;
    private announceToScreenReader;
    setStudent(student: Student): void;
}
export { StudentProfileCard };
export type { Student, ContactInfo, LocationDetails };
//# sourceMappingURL=student-profile-card.d.ts.map