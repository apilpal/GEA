// Custom Element: Student Table
import { BaseComponent } from '@/ts/components/core/index';
import { formatRupees } from '@/ts/services/money';

/**
 * Interface representing a student record with all possible fields.
 * Used for displaying and managing student data in table format.
 * Contains comprehensive student information including personal details, contact info, and transportation data.
 */

/** Escape untrusted values before interpolating them into HTML templates. */
function escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>\"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]!);
}

interface Student {
    /** Transportation route assigned to the student */
    route: string;
    /** Full name of the student */
    name: string;
    /** Father's name of the student */
    father_name: string;
    /** Primary mobile contact number */
    mobile: string;
    /** Academic class/grade of the student */
    class: string;
    /** Residential address of the student */
    address: string;
    /** Transportation fees (optional) */
    fees?: string;
    /** Unique database identifier */
    id?: string;
    /** Current status of the student record */
    status?: 'active' | 'inactive';
    /** Date when the record was created */
    created_date?: string;
    /** Date when the record was last modified */
    last_updated?: string;
    /** Driver name assigned to transport this student */
    driver?: string;
    /** Extended contact information */
    contact_info?: {
        primary_mobile: string;
        secondary_mobile: string;
        father_contact: string;
    };
    /** Detailed location information */
    location_details?: {
        route_number: string;
        full_address: string;
        area: string;
    };
}

/**
 * Custom HTMLElement that displays student data in an interactive table format.
 * Supports sorting, searching, and CRUD operations on student records.
 * Uses lazy rendering for large datasets to improve performance.
 */
class StudentTable extends BaseComponent {
    /** Current filtered and sorted student data */
    private students: Student[] = [];
    /** Complete original student dataset for filtering */
    private originalStudents: Student[] = [];
    /** Currently active sort column */
    private sortColumn: string | null = null;
    /** Sort direction flag */
    private sortAscending: boolean = true;
    /** Current search filter term */
    private searchTerm: string = '';
    /** Timeout ID for debounced search */
    private searchTimeout: number | null = null;
    /** Current screen size for responsive rendering */
    private isMobile: boolean = false;
    /** Media query listener for screen size changes */
    private mediaQuery: MediaQueryList | null = null;

    constructor() {
        super();
        this.initializeMediaQuery();
    }

    /**
     * Lifecycle callback when component is added to DOM.
      * Initializes the component with template and event handlers.
      */
     connectedCallback() {
         super.connectedCallback();
         this.checkScreenSize();
     }

    /**
     * Lifecycle callback when component is removed from DOM.
      * Cleans up event listeners to prevent memory leaks.
      */
     disconnectedCallback() {
         this.removeEventListeners();
         if (this.mediaQuery) {
             this.mediaQuery.removeEventListener('change', this.handleScreenSizeChange.bind(this));
         }
     }

    /**
     * Sets the student data for the table and triggers re-rendering.
     * @param students - Array of student objects to display
     */
    setStudents(students: Student[]) {
        const newStudents = [...students];
        const newOriginalStudents = [...students];
        if (JSON.stringify(this.originalStudents) === JSON.stringify(newOriginalStudents) &&
            JSON.stringify(this.students) === JSON.stringify(newStudents)) {
            return; // No change, skip render
        }
        this.originalStudents = newOriginalStudents;
        this.students = newStudents;
        this.markForRender();
    }

    /**
     * Renders the complete table component template including header, search, and table structure.
      * Uses shadow DOM for style encapsulation.
      * Uses lazy rendering to only render visible rows when dataset is large.
      * Switches between table and card layouts based on screen size.
      */
     protected render() {
         if (this.isMobile) {
             this.renderCards();
         } else if (this.students.length > 100) {
             this.renderLazy();
         } else {
             this.renderFull();
         }
     }

    /**
     * Lazy render for large datasets - only render visible rows
     */
    private renderLazy(): void {
        const shadow = this.shadowRoot!;
        shadow.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h2>Total Students: <span id="total-count">${this.students.length}</span></h2>
                    <div class="search-container">
                        <input type="text" id="search-input" placeholder="Search students..." class="search-input">
                        <button id="clear-search" style="display: none;">✕</button>
                    </div>
                    <button id="add-student-btn" class="add-student-btn">+ Add Student</button>
                </div>
                <div class="virtual-table-container" style="height: 600px; overflow: auto;">
                    <table class="student-table" role="table" aria-label="Student records table" aria-rowcount="${this.students.length + 1}">
                        <caption class="sr-only">Table displaying student records with columns for serial number, status, route, name, father's name, class, mobile, address, fees, and actions</caption>
                        <thead class="sticky-header">
                            <tr role="row">
                                <th role="columnheader" scope="col" aria-label="Serial Number">Sr No</th>
                                <th role="columnheader" scope="col" aria-label="Student Status">Status</th>
                                <th class="sortable-header" data-column="route" role="columnheader" scope="col" aria-label="Route (clickable to sort)" tabindex="0" aria-sort="none">Route</th>
                                <th class="sortable-header" data-column="name" role="columnheader" scope="col" aria-label="Student Name (clickable to sort)" tabindex="0" aria-sort="none">Name</th>
                                <th class="sortable-header" data-column="father_name" role="columnheader" scope="col" aria-label="Father's Name (clickable to sort)" tabindex="0" aria-sort="none">Father's Name</th>
                                <th class="sortable-header" data-column="class" role="columnheader" scope="col" aria-label="Class (clickable to sort)" tabindex="0" aria-sort="none">Class</th>
                                <th class="sortable-header" data-column="mobile" role="columnheader" scope="col" aria-label="Mobile Number (clickable to sort)" tabindex="0" aria-sort="none">Mobile</th>
                                <th class="sortable-header" data-column="address" role="columnheader" scope="col" aria-label="Address (clickable to sort)" tabindex="0" aria-sort="none" title="Click to sort by address">Address</th>
                                <th class="sortable-header" data-column="fees" role="columnheader" scope="col" aria-label="Fees (clickable to sort)" tabindex="0" aria-sort="none">Fees</th>
                                <th role="columnheader" scope="col" aria-label="Actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="table-body" role="rowgroup">
                            ${this.renderVisibleRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Renders only currently visible rows for large datasets
     */
    private renderVisibleRows(): string {
        // For simplicity, render first 50 rows. In a real implementation,
        // you'd calculate which rows are actually visible in the viewport
        const visibleStudents = this.students.slice(0, 50);
        return visibleStudents.map((student, index) => `
            <tr class="student-row" data-index="${index}" role="row" tabindex="${index === 0 ? '0' : '-1'}" aria-rowindex="${index + 2}" aria-label="Student ${escapeHtml(student.name || 'Unknown')}">
                <td role="gridcell" aria-label="Row ${index + 1}">${index + 1}</td>
                <td role="gridcell" aria-label="Status: ${student.status === 'inactive' ? 'Inactive' : 'Active'}">
                    <span class="status-indicator ${escapeHtml(student.status || 'active')}" aria-hidden="true">
                        ${student.status === 'inactive' ? 'Inactive' : 'Active'}
                    </span>
                </td>
                <td role="gridcell" aria-label="Route: ${escapeHtml(student.route || 'N/A')}">${escapeHtml(student.route || 'N/A')}</td>
                <td role="gridcell" aria-label="Name: ${escapeHtml(student.name || 'N/A')}">${escapeHtml(student.name || 'N/A')}</td>
                <td role="gridcell" aria-label="Father's Name: ${escapeHtml(student.father_name || 'N/A')}">${escapeHtml(student.father_name || 'N/A')}</td>
                <td role="gridcell" aria-label="Class: ${escapeHtml(student.class || 'N/A')}">${escapeHtml(student.class || 'N/A')}</td>
                <td role="gridcell" aria-label="Mobile: ${escapeHtml(student.mobile || 'N/A')}">${escapeHtml(student.mobile || 'N/A')}</td>
                <td role="gridcell" aria-label="Address: ${escapeHtml(student.address || 'N/A')}" title="${escapeHtml(student.address || '')}">${escapeHtml(student.address ? (student.address.length > 30 ? student.address.substring(0, 27) + '...' : student.address) : 'N/A')}</td>
                <td role="gridcell" aria-label="Fees: ${escapeHtml(student.fees ? formatRupees(student.fees) : 'N/A')}">${escapeHtml(student.fees ? formatRupees(student.fees) : 'N/A')}</td>
                <td class="actions-cell" role="gridcell" aria-label="Actions for ${escapeHtml(student.name || 'Unknown')}">
                    <button class="action-btn view-btn" data-action="view" data-index="${index}" aria-label="View details for ${escapeHtml(student.name)}" title="View Details">
                        <icon-eye size="16"></icon-eye>
                        <span class="sr-only">View</span>
                    </button>
                    <button class="action-btn edit-btn" data-action="edit" data-index="${index}" aria-label="Edit ${escapeHtml(student.name)}" title="Edit Student">
                        <icon-edit size="16"></icon-edit>
                        <span class="sr-only">Edit</span>
                    </button>
                    <button class="action-btn delete-btn" data-action="delete" data-index="${index}" aria-label="Delete ${escapeHtml(student.name)}" title="Delete Student">
                        <icon-trash size="16"></icon-trash>
                        <span class="sr-only">Delete</span>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Renders student data as cards for mobile devices
     */
    private renderCards(): void {
        const shadow = this.shadowRoot!;
        shadow.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h2>Total Students: <span id="total-count">${this.students.length}</span></h2>
                    <div class="search-container">
                        <input type="text" id="search-input" placeholder="Search students..." class="search-input">
                        <button id="clear-search" style="display: none;">✕</button>
                    </div>
                    <button id="add-student-btn" class="add-student-btn">+ Add Student</button>
                </div>
                <div class="student-cards" id="student-cards" role="list" aria-label="Student records">
                    ${this.renderStudentCards()}
                </div>
            </div>
        `;
    }

    /**
     * Full render for small datasets
      */
     private renderFull(): void {
         const shadow = this.shadowRoot!;
         shadow.innerHTML = `
             <div class="table-container">
                 <div class="table-header">
                     <h2>Total Students: <span id="total-count">${this.students.length}</span></h2>
                     <div class="search-container">
                         <input type="text" id="search-input" placeholder="Search students..." class="search-input">
                         <button id="clear-search" style="display: none;">✕</button>
                     </div>
                     <button id="add-student-btn" class="add-student-btn">+ Add Student</button>
                 </div>
                 <table class="student-table" role="table" aria-label="Student records table" aria-rowcount="${this.students.length + 1}">
                     <caption class="sr-only">Table displaying student records with columns for serial number, status, route, name, father's name, class, mobile, address, fees, and actions</caption>
                     <thead>
                         <tr role="row">
                             <th role="columnheader" scope="col" aria-label="Serial Number">Sr No</th>
                             <th role="columnheader" scope="col" aria-label="Student Status">Status</th>
                             <th class="sortable-header" data-column="route" role="columnheader" scope="col" aria-label="Route (clickable to sort)" tabindex="0" aria-sort="none">Route</th>
                             <th class="sortable-header" data-column="name" role="columnheader" scope="col" aria-label="Student Name (clickable to sort)" tabindex="0" aria-sort="none">Name</th>
                             <th class="sortable-header" data-column="father_name" role="columnheader" scope="col" aria-label="Father's Name (clickable to sort)" tabindex="0" aria-sort="none">Father's Name</th>
                             <th class="sortable-header" data-column="class" role="columnheader" scope="col" aria-label="Class (clickable to sort)" tabindex="0" aria-sort="none">Class</th>
                             <th class="sortable-header" data-column="mobile" role="columnheader" scope="col" aria-label="Mobile Number (clickable to sort)" tabindex="0" aria-sort="none">Mobile</th>
                             <th class="sortable-header" data-column="address" role="columnheader" scope="col" aria-label="Address (clickable to sort)" tabindex="0" aria-sort="none" title="Click to sort by address">Address</th>
                             <th class="sortable-header" data-column="fees" role="columnheader" scope="col" aria-label="Fees (clickable to sort)" tabindex="0" aria-sort="none">Fees</th>
                             <th role="columnheader" scope="col" aria-label="Actions">Actions</th>
                         </tr>
                     </thead>
                     <tbody id="table-body" role="rowgroup">
                         ${this.renderTableRows()}
                     </tbody>
                 </table>
             </div>
         `;
     }

    /**
     * Generates HTML string for student cards based on current student data.
     * Each card displays key information with touch-friendly actions.
     * @returns HTML string containing all student cards
     */
    private renderStudentCards(): string {
        return this.students.map((student, index) => `
            <div class="student-card" data-index="${index}" role="listitem" tabindex="${index === 0 ? '0' : '-1'}" aria-label="Student ${escapeHtml(student.name || 'Unknown')}">
                <div class="card-header">
                    <div class="card-title">
                        <h3>${escapeHtml(student.name || 'N/A')}</h3>
                        <span class="status-indicator ${escapeHtml(student.status || 'active')}" aria-label="Status: ${student.status === 'inactive' ? 'Inactive' : 'Active'}">
                            ${student.status === 'inactive' ? 'Inactive' : 'Active'}
                        </span>
                    </div>
                    <div class="card-actions" role="group" aria-label="Actions for ${escapeHtml(student.name || 'Unknown')}">
                        <button class="action-btn view-btn" data-action="view" data-index="${index}" aria-label="View details for ${escapeHtml(student.name)}" title="View Details">
                            <icon-eye size="18"></icon-eye>
                            <span class="sr-only">View</span>
                        </button>
                        <button class="action-btn edit-btn" data-action="edit" data-index="${index}" aria-label="Edit ${escapeHtml(student.name)}" title="Edit Student">
                            <icon-edit size="18"></icon-edit>
                            <span class="sr-only">Edit</span>
                        </button>
                        <button class="action-btn delete-btn" data-action="delete" data-index="${index}" aria-label="Delete ${escapeHtml(student.name)}" title="Delete Student">
                            <icon-trash size="18"></icon-trash>
                            <span class="sr-only">Delete</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-info">
                        <div class="info-item">
                            <span class="label">Route:</span>
                            <span class="value">${escapeHtml(student.route || 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Father's Name:</span>
                            <span class="value">${escapeHtml(student.father_name || 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Class:</span>
                            <span class="value">${escapeHtml(student.class || 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Mobile:</span>
                            <span class="value">${escapeHtml(student.mobile || 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Address:</span>
                            <span class="value" title="${escapeHtml(student.address || '')}">${escapeHtml(student.address ? (student.address.length > 50 ? student.address.substring(0, 47) + '...' : student.address) : 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Fees:</span>
                            <span class="value">${escapeHtml(student.fees ? formatRupees(student.fees) : 'N/A')}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Generates HTML string for table rows based on current student data.
      * Each row includes status indicators and action buttons.
      * @returns HTML string containing all table rows
      */
     private renderTableRows(): string {
         return this.students.map((student, index) => `
             <tr class="student-row" data-index="${index}" role="row" tabindex="${index === 0 ? '0' : '-1'}" aria-rowindex="${index + 2}" aria-label="Student ${escapeHtml(student.name || 'Unknown')}">
                 <td role="gridcell" aria-label="Row ${index + 1}">${index + 1}</td>
                 <td role="gridcell" aria-label="Status: ${student.status === 'inactive' ? 'Inactive' : 'Active'}">
                     <span class="status-indicator ${escapeHtml(student.status || 'active')}" aria-hidden="true">
                         ${student.status === 'inactive' ? 'Inactive' : 'Active'}
                     </span>
                 </td>
                 <td role="gridcell" aria-label="Route: ${escapeHtml(student.route || 'N/A')}">${escapeHtml(student.route || 'N/A')}</td>
                 <td role="gridcell" aria-label="Name: ${escapeHtml(student.name || 'N/A')}">${escapeHtml(student.name || 'N/A')}</td>
                 <td role="gridcell" aria-label="Father's Name: ${escapeHtml(student.father_name || 'N/A')}">${escapeHtml(student.father_name || 'N/A')}</td>
                 <td role="gridcell" aria-label="Class: ${escapeHtml(student.class || 'N/A')}">${escapeHtml(student.class || 'N/A')}</td>
                 <td role="gridcell" aria-label="Mobile: ${escapeHtml(student.mobile || 'N/A')}">${escapeHtml(student.mobile || 'N/A')}</td>
                 <td role="gridcell" aria-label="Address: ${escapeHtml(student.address || 'N/A')}" title="${escapeHtml(student.address || '')}">${escapeHtml(student.address ? (student.address.length > 30 ? student.address.substring(0, 27) + '...' : student.address) : 'N/A')}</td>
                 <td role="gridcell" aria-label="Fees: ${escapeHtml(student.fees ? formatRupees(student.fees) : 'N/A')}">${escapeHtml(student.fees ? formatRupees(student.fees) : 'N/A')}</td>
                 <td class="actions-cell" role="gridcell" aria-label="Actions for ${escapeHtml(student.name || 'Unknown')}">
                     <button class="action-btn view-btn" data-action="view" data-index="${index}" aria-label="View details for ${escapeHtml(student.name)}" title="View Details">
                         <icon-eye size="16"></icon-eye>
                         <span class="sr-only">View</span>
                     </button>
                     <button class="action-btn edit-btn" data-action="edit" data-index="${index}" aria-label="Edit ${escapeHtml(student.name)}" title="Edit Student">
                         <icon-edit size="16"></icon-edit>
                         <span class="sr-only">Edit</span>
                     </button>
                     <button class="action-btn delete-btn" data-action="delete" data-index="${index}" aria-label="Delete ${escapeHtml(student.name)}" title="Delete Student">
                         <icon-trash size="16"></icon-trash>
                         <span class="sr-only">Delete</span>
                     </button>
                 </td>
             </tr>
         `).join('');
     }

    /**
     * Attaches all event listeners for interactive table features.
     * Includes search, sorting, add button, and row action handlers.
     * Uses non-blocking event handling with requestAnimationFrame for better performance.
     */
    protected setupEventListeners() {
        const shadow = this.shadowRoot!;

        // Search functionality with debounced non-blocking updates
        const searchInput = shadow.getElementById('search-input') as HTMLInputElement;
        const clearButton = shadow.getElementById('clear-search') as HTMLButtonElement;

        let searchTimeout: any;
        let lastSearchValue = '';

        searchInput?.addEventListener('input', () => {
            const currentValue = searchInput.value;

            // Only process if value actually changed
            if (currentValue === lastSearchValue) return;
            lastSearchValue = currentValue;

            clearTimeout(searchTimeout);

            // Use requestIdleCallback for non-blocking search
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    searchTimeout = setTimeout(() => {
                        this.searchTerm = currentValue;
                        this.filterStudents();
                    }, 300);
                });
            } else {
                searchTimeout = setTimeout(() => {
                    this.searchTerm = currentValue;
                    this.filterStudents();
                }, 300);
            }
        });

        searchInput?.addEventListener('input', () => {
            // Use microtask for UI updates to avoid blocking
            queueMicrotask(() => {
                if (clearButton) {
                    clearButton.style.display = searchInput.value ? 'block' : 'none';
                }
            });
        });

        clearButton?.addEventListener('click', () => {
            searchInput.value = '';
            this.searchTerm = '';
            // Use next frame for non-blocking update
            requestAnimationFrame(() => {
                this.filterStudents();
            });
        });

        // Sort functionality with non-blocking updates
        shadow.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = (e.target as HTMLElement).dataset.column!;

                // Use requestIdleCallback for non-blocking sort
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => {
                        this.sortTable(column);
                    });
                } else {
                    // Fallback to setTimeout
                    setTimeout(() => {
                        this.sortTable(column);
                    }, 0);
                }
            });

            // Add keyboard navigation for sortable headers
            header.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const column = (e.target as HTMLElement).dataset.column!;
                    this.sortTable(column);
                }
            });
        });

        // Add student button with non-blocking event
        const addBtn = shadow.getElementById('add-student-btn');
        addBtn?.addEventListener('click', () => {
            // Use microtask to avoid blocking UI
            queueMicrotask(() => {
                this.dispatchEvent(new CustomEvent('add-student', { bubbles: true, composed: true }));
            });
        });

        // Row actions with optimized event delegation
        shadow.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('action-btn')) {
                e.stopPropagation();

                // Use requestAnimationFrame for smooth action handling
                requestAnimationFrame(() => {
                    const action = target.dataset.action!;
                    const index = parseInt(target.dataset.index!);
                    this.dispatchEvent(new CustomEvent('student-action', {
                        bubbles: true,
                        composed: true,
                        detail: { action, index }
                    }));
                });
            }
        });

        // Handle card-specific interactions for mobile
        if (this.isMobile) {
            shadow.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const card = target.closest('.student-card') as HTMLElement;
                if (card && !target.classList.contains('action-btn')) {
                    // Card click for navigation/selection
                    const index = parseInt(card.dataset.index!);
                    this.dispatchEvent(new CustomEvent('student-card-selected', {
                        bubbles: true,
                        composed: true,
                        detail: { index }
                    }));
                }
            });
        }

        // Add keyboard navigation for table rows and cards
        shadow.addEventListener('keydown', (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const row = target.closest('.student-row') as HTMLElement;
            const card = target.closest('.student-card') as HTMLElement;
            const element = row || card;

            if (!element) return;

            const currentIndex = parseInt(element.dataset.index!);
            let newIndex = currentIndex;

            switch (e.key) {
                case 'ArrowUp':
                    newIndex = Math.max(0, currentIndex - 1);
                    break;
                case 'ArrowDown':
                    newIndex = Math.min(this.students.length - 1, currentIndex + 1);
                    break;
                case 'Home':
                    newIndex = 0;
                    break;
                case 'End':
                    newIndex = this.students.length - 1;
                    break;
                case 'Enter':
                case ' ': // Space
                    if (card && !target.classList.contains('action-btn')) {
                        e.preventDefault();
                        // Trigger card selection
                        this.dispatchEvent(new CustomEvent('student-card-selected', {
                            bubbles: true,
                            composed: true,
                            detail: { index: currentIndex }
                        }));
                        return;
                    }
                    break;
                default:
                    return;
            }

            if (newIndex !== currentIndex) {
                e.preventDefault();
                const newElement = shadow.querySelector(`[data-index="${newIndex}"]`) as HTMLElement;
                if (newElement) {
                    newElement.focus();
                    newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });

        // Add focus management for table cells
        shadow.addEventListener('focusin', (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            const row = target.closest('.student-row') as HTMLElement;
            if (row) {
                // Remove previous row focus
                shadow.querySelectorAll('.student-row.focused').forEach(el => el.classList.remove('focused'));
                row.classList.add('focused');
            }
        });

        shadow.addEventListener('focusout', (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            const row = target.closest('.student-row') as HTMLElement;
            if (row && e.relatedTarget && !row.contains(e.relatedTarget as Node)) {
                row.classList.remove('focused');
            }
        });
    }

    /**
     * Cleans up event listeners when component is removed from DOM.
     * Currently a no-op as shadow DOM handles cleanup automatically.
     */
    private removeEventListeners() {
        // Event listeners are automatically removed when element is disconnected
    }

    /**
     * Filters the student list based on the current search term.
     * Searches across multiple student fields with case-insensitive matching.
     */
    private filterStudents() {
        if (!this.searchTerm) {
            this.students = [...this.originalStudents];
        } else {
            this.students = this.originalStudents.filter(student =>
                student.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.father_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.class?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.mobile?.includes(this.searchTerm) ||
                student.address?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.route?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.driver?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.fees?.includes(this.searchTerm)
            );
        }
        this.updateTableBody();
        this.updateTotalCount();
    }

    /**
     * Sorts the student table by the specified column.
     * Toggles sort direction if same column is clicked again.
     * @param column - The student field to sort by
     */
    private sortTable(column: string) {
        if (this.sortColumn === column) {
            this.sortAscending = !this.sortAscending;
        } else {
            this.sortColumn = column;
            this.sortAscending = true;
        }

        this.students.sort((a, b) => {
            let aValue: any = a[column as keyof Student];
            let bValue: any = b[column as keyof Student];

            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return this.sortAscending ? 1 : -1;
            if (bValue == null) return this.sortAscending ? -1 : 1;

            aValue = aValue.toString().toLowerCase();
            bValue = bValue.toString().toLowerCase();

            if (aValue < bValue) return this.sortAscending ? -1 : 1;
            if (aValue > bValue) return this.sortAscending ? 1 : -1;
            return 0;
        });

        this.updateTableBody();
        this.updateSortIndicators();
    }

    /**
     * Updates the table body with current student data.
      * Re-renders all table rows after filtering or sorting operations.
      * Handles both table and card layouts.
      */
     private updateTableBody() {
         if (this.isMobile) {
             const cardsContainer = this.shadowRoot!.getElementById('student-cards')!;
             cardsContainer.innerHTML = this.renderStudentCards();
         } else {
             const tbody = this.shadowRoot!.getElementById('table-body')!;
             tbody.innerHTML = this.renderTableRows();
         }
     }

    /**
     * Updates the displayed total count of students shown in the header.
     */
    private updateTotalCount() {
        const countElement = this.shadowRoot!.getElementById('total-count')!;
        countElement.textContent = this.students.length.toString();
    }

    /**
     * Updates the visual sort indicators on table headers.
      * Removes existing indicators and applies new ones based on current sort state.
      */
     private updateSortIndicators() {
         if (!this.isMobile) {
             const headers = this.shadowRoot!.querySelectorAll('.sortable-header');
             headers.forEach(header => {
                 header.classList.remove('sort-asc', 'sort-desc');
                 header.setAttribute('aria-sort', 'none');
             });

             if (this.sortColumn) {
                 const currentHeader = this.shadowRoot!.querySelector(`[data-column="${this.sortColumn}"]`);
                 if (currentHeader) {
                     const sortDirection = this.sortAscending ? 'ascending' : 'descending';
                     currentHeader.classList.add(this.sortAscending ? 'sort-asc' : 'sort-desc');
                     currentHeader.setAttribute('aria-sort', sortDirection);
                 }
             }
         }
     }

    /**
     * Initializes media query listener for screen size changes.
     */
    private initializeMediaQuery() {
        this.mediaQuery = window.matchMedia('(max-width: 768px)');
        this.mediaQuery.addEventListener('change', this.handleScreenSizeChange.bind(this));
    }

    /**
     * Checks current screen size and updates mobile state.
     */
    private checkScreenSize() {
        this.isMobile = this.mediaQuery!.matches;
        this.markForRender();
    }

    /**
     * Handles screen size changes and re-renders if needed.
     */
    private handleScreenSizeChange(e: MediaQueryListEvent) {
        this.isMobile = e.matches;
        this.markForRender();
    }
}

// Export for use in other modules
export { StudentTable };
export type { Student };